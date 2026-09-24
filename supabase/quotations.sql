-- Quotations support. Run after schema.sql and sales_invoice.sql. Safe to re-run.

do $$ begin
  create type quotation_status as enum ('draft', 'pending', 'converted', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type quotation_type as enum ('standard', 'dealer', 'project', 'estimation');
exception when duplicate_object then null;
end $$;

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  customer_id uuid not null references customers (id),
  quotation_date date not null default current_date,
  valid_till date,
  quotation_type quotation_type not null default 'standard',
  reference text,
  sales_person text,
  billing_address text,
  customer_gstin text,
  place_of_supply text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  taxable_amount numeric(12,2) not null default 0,
  cgst numeric(12,2) not null default 0,
  sgst numeric(12,2) not null default 0,
  igst numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  status quotation_status not null default 'draft',
  notes text,
  terms text,
  remarks text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotations_customer_idx on quotations (customer_id);
create index if not exists quotations_date_idx on quotations (quotation_date);
create index if not exists quotations_status_idx on quotations (status);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations (id) on delete cascade,
  product_id uuid references products (id),
  product_name text not null,
  description text,
  size text,
  hsn_code text,
  quantity numeric(12,2) not null default 1,
  rate numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 18,
  total numeric(12,2) not null default 0
);

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

drop policy if exists "Authenticated manage quotations" on public.quotations;
create policy "Authenticated manage quotations" on public.quotations
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage quotation items" on public.quotation_items;
create policy "Authenticated manage quotation items" on public.quotation_items
  for all to authenticated using (true) with check (true);

create or replace function public.insert_quotation_items(p_quotation_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'A quotation needs at least one item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into quotation_items (
      quotation_id, product_id, product_name, description, size, hsn_code,
      quantity, rate, discount, gst_rate, total
    ) values (
      p_quotation_id,
      coalesce(
        (select id from products
          where public.is_uuid(v_item->>'product_id') and id = (v_item->>'product_id')::uuid),
        (select id from products where product_code = v_item->>'product_code' limit 1)
      ),
      v_item->>'product_name',
      nullif(v_item->>'description', ''),
      nullif(v_item->>'size', ''),
      nullif(v_item->>'hsn_code', ''),
      coalesce((v_item->>'quantity')::numeric, 1),
      coalesce((v_item->>'rate')::numeric, 0),
      coalesce((v_item->>'discount')::numeric, 0),
      coalesce((v_item->>'gst_rate')::numeric, 0),
      coalesce((v_item->>'total')::numeric, 0)
    );
  end loop;
end;
$$;

create or replace function public.create_quotation(
  p_customer jsonb,
  p_quotation jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_quotation_id uuid;
begin
  v_customer_id := resolve_sales_customer(p_customer);

  insert into quotations (
    quotation_number, customer_id, quotation_date, valid_till, quotation_type,
    reference, sales_person, billing_address, customer_gstin, place_of_supply,
    subtotal, discount, taxable_amount, cgst, sgst, igst, grand_total,
    status, notes, terms, remarks, created_by
  ) values (
    p_quotation->>'quotation_number',
    v_customer_id,
    (p_quotation->>'quotation_date')::date,
    nullif(p_quotation->>'valid_till', '')::date,
    coalesce(nullif(p_quotation->>'quotation_type', ''), 'standard')::quotation_type,
    nullif(p_quotation->>'reference', ''),
    nullif(p_quotation->>'sales_person', ''),
    nullif(p_quotation->>'billing_address', ''),
    nullif(p_quotation->>'customer_gstin', ''),
    nullif(p_quotation->>'place_of_supply', ''),
    coalesce((p_quotation->>'subtotal')::numeric, 0),
    coalesce((p_quotation->>'discount')::numeric, 0),
    coalesce((p_quotation->>'taxable_amount')::numeric, 0),
    coalesce((p_quotation->>'cgst')::numeric, 0),
    coalesce((p_quotation->>'sgst')::numeric, 0),
    coalesce((p_quotation->>'igst')::numeric, 0),
    coalesce((p_quotation->>'grand_total')::numeric, 0),
    coalesce(nullif(p_quotation->>'status', ''), 'pending')::quotation_status,
    nullif(p_quotation->>'notes', ''),
    nullif(p_quotation->>'terms', ''),
    nullif(p_quotation->>'remarks', ''),
    auth.uid()
  )
  returning id into v_quotation_id;

  perform insert_quotation_items(v_quotation_id, p_items);

  return jsonb_build_object('quotation_id', v_quotation_id, 'customer_id', v_customer_id);
end;
$$;

create or replace function public.update_quotation(
  p_quotation_id uuid,
  p_customer jsonb,
  p_quotation jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if not exists (select 1 from quotations where id = p_quotation_id) then
    raise exception 'Quotation not found';
  end if;

  v_customer_id := resolve_sales_customer(p_customer);

  update quotations set
    quotation_number = p_quotation->>'quotation_number',
    customer_id = v_customer_id,
    quotation_date = (p_quotation->>'quotation_date')::date,
    valid_till = nullif(p_quotation->>'valid_till', '')::date,
    quotation_type = coalesce(nullif(p_quotation->>'quotation_type', ''), 'standard')::quotation_type,
    reference = nullif(p_quotation->>'reference', ''),
    sales_person = nullif(p_quotation->>'sales_person', ''),
    billing_address = nullif(p_quotation->>'billing_address', ''),
    customer_gstin = nullif(p_quotation->>'customer_gstin', ''),
    place_of_supply = nullif(p_quotation->>'place_of_supply', ''),
    subtotal = coalesce((p_quotation->>'subtotal')::numeric, 0),
    discount = coalesce((p_quotation->>'discount')::numeric, 0),
    taxable_amount = coalesce((p_quotation->>'taxable_amount')::numeric, 0),
    cgst = coalesce((p_quotation->>'cgst')::numeric, 0),
    sgst = coalesce((p_quotation->>'sgst')::numeric, 0),
    igst = coalesce((p_quotation->>'igst')::numeric, 0),
    grand_total = coalesce((p_quotation->>'grand_total')::numeric, 0),
    status = coalesce(nullif(p_quotation->>'status', ''), status::text)::quotation_status,
    notes = nullif(p_quotation->>'notes', ''),
    terms = nullif(p_quotation->>'terms', ''),
    remarks = nullif(p_quotation->>'remarks', ''),
    updated_at = now()
  where id = p_quotation_id;

  delete from quotation_items where quotation_id = p_quotation_id;
  perform insert_quotation_items(p_quotation_id, p_items);

  return jsonb_build_object('quotation_id', p_quotation_id, 'customer_id', v_customer_id);
end;
$$;

grant execute on function public.insert_quotation_items(uuid, jsonb) to authenticated;
grant execute on function public.create_quotation(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_quotation(uuid, jsonb, jsonb, jsonb) to authenticated;
