-- Sales invoice support for the New Bill / Edit Invoice screens.
-- Run in the Supabase SQL editor after schema.sql. Safe to run more than once.

-- Extra customer details captured by the New Customer dialog
alter table public.customers
  add column if not exists contact_person text,
  add column if not exists alt_phone text,
  add column if not exists city text,
  add column if not exists state_code text,
  add column if not exists pincode text,
  add column if not exists gst_registration text,
  add column if not exists pan text,
  add column if not exists payment_terms_days integer not null default 0,
  add column if not exists credit_limit numeric(12,2) not null default 0,
  add column if not exists opening_balance numeric(12,2) not null default 0,
  add column if not exists notes text;

-- GST details needed on a tax invoice
alter table public.invoices
  add column if not exists billing_address text,
  add column if not exists customer_gstin text,
  add column if not exists place_of_supply text,
  add column if not exists igst numeric(12,2) not null default 0,
  add column if not exists round_off numeric(12,2) not null default 0;

alter table public.invoice_items
  add column if not exists hsn_code text,
  add column if not exists description text;

create or replace function public.is_uuid(p_value text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    false
  );
$$;

-- Finds the customer by id or phone, otherwise creates them. Returns the id.
create or replace function public.resolve_sales_customer(p_customer jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if is_uuid(p_customer->>'id') then
    select id into v_customer_id from customers where id = (p_customer->>'id')::uuid;
  end if;

  if v_customer_id is null and nullif(p_customer->>'phone', '') is not null then
    select id into v_customer_id
    from customers
    where phone = p_customer->>'phone'
    order by created_at
    limit 1;
  end if;

  if v_customer_id is null then
    if nullif(p_customer->>'name', '') is null then
      raise exception 'Customer name is required';
    end if;

    insert into customers (
      name, phone, email, address, gstin, customer_type,
      contact_person, alt_phone, city, state_code, pincode,
      gst_registration, pan, payment_terms_days, credit_limit, opening_balance, notes
    ) values (
      p_customer->>'name',
      coalesce(p_customer->>'phone', ''),
      nullif(p_customer->>'email', ''),
      nullif(p_customer->>'address', ''),
      nullif(p_customer->>'gstin', ''),
      coalesce(nullif(p_customer->>'customer_type', ''), 'retail')::customer_type,
      nullif(p_customer->>'contact_person', ''),
      nullif(p_customer->>'alt_phone', ''),
      nullif(p_customer->>'city', ''),
      nullif(p_customer->>'state_code', ''),
      nullif(p_customer->>'pincode', ''),
      nullif(p_customer->>'gst_registration', ''),
      nullif(p_customer->>'pan', ''),
      coalesce((p_customer->>'payment_terms_days')::integer, 0),
      coalesce((p_customer->>'credit_limit')::numeric, 0),
      coalesce((p_customer->>'opening_balance')::numeric, 0),
      nullif(p_customer->>'notes', '')
    )
    returning id into v_customer_id;
  end if;

  return v_customer_id;
end;
$$;

create or replace function public.insert_sales_invoice_items(p_invoice_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'An invoice needs at least one item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into invoice_items (
      invoice_id, product_id, product_name, description, size, hsn_code,
      quantity, rate, discount, gst_rate, total
    ) values (
      p_invoice_id,
      coalesce(
        (select id from products
          where is_uuid(v_item->>'product_id') and id = (v_item->>'product_id')::uuid),
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

-- Saves a complete sale in one transaction.
create or replace function public.create_sales_invoice(
  p_customer jsonb,
  p_invoice jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_invoice_id uuid;
  v_paid numeric := coalesce((p_invoice->>'amount_paid')::numeric, 0);
begin
  v_customer_id := resolve_sales_customer(p_customer);

  insert into invoices (
    invoice_number, customer_id, invoice_date,
    subtotal, discount, taxable_amount, cgst, sgst, igst, round_off, grand_total,
    amount_paid, balance_due, payment_status, payment_method, notes,
    billing_address, customer_gstin, place_of_supply, created_by
  ) values (
    p_invoice->>'invoice_number',
    v_customer_id,
    (p_invoice->>'invoice_date')::date,
    coalesce((p_invoice->>'subtotal')::numeric, 0),
    coalesce((p_invoice->>'discount')::numeric, 0),
    coalesce((p_invoice->>'taxable_amount')::numeric, 0),
    coalesce((p_invoice->>'cgst')::numeric, 0),
    coalesce((p_invoice->>'sgst')::numeric, 0),
    coalesce((p_invoice->>'igst')::numeric, 0),
    coalesce((p_invoice->>'round_off')::numeric, 0),
    coalesce((p_invoice->>'grand_total')::numeric, 0),
    v_paid,
    coalesce((p_invoice->>'balance_due')::numeric, 0),
    (p_invoice->>'payment_status')::payment_status,
    nullif(p_invoice->>'payment_method', '')::payment_method,
    nullif(p_invoice->>'notes', ''),
    nullif(p_invoice->>'billing_address', ''),
    nullif(p_invoice->>'customer_gstin', ''),
    nullif(p_invoice->>'place_of_supply', ''),
    auth.uid()
  )
  returning id into v_invoice_id;

  perform insert_sales_invoice_items(v_invoice_id, p_items);

  if v_paid > 0 then
    insert into payments (
      payment_id, customer_id, invoice_id, amount, payment_date, method, created_by
    ) values (
      'PAY-' || (p_invoice->>'invoice_number'),
      v_customer_id,
      v_invoice_id,
      v_paid,
      (p_invoice->>'invoice_date')::date,
      coalesce(nullif(nullif(p_invoice->>'payment_method', ''), 'partial'), 'cash')::payment_method,
      auth.uid()
    );
  end if;

  return jsonb_build_object('invoice_id', v_invoice_id, 'customer_id', v_customer_id);
end;
$$;

-- Updates an existing invoice and replaces its line items in one transaction.
create or replace function public.update_sales_invoice(
  p_invoice_id uuid,
  p_customer jsonb,
  p_invoice jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_paid numeric := coalesce((p_invoice->>'amount_paid')::numeric, 0);
begin
  if not exists (select 1 from invoices where id = p_invoice_id) then
    raise exception 'Invoice not found';
  end if;

  v_customer_id := resolve_sales_customer(p_customer);

  update invoices set
    invoice_number = p_invoice->>'invoice_number',
    customer_id = v_customer_id,
    invoice_date = (p_invoice->>'invoice_date')::date,
    subtotal = coalesce((p_invoice->>'subtotal')::numeric, 0),
    discount = coalesce((p_invoice->>'discount')::numeric, 0),
    taxable_amount = coalesce((p_invoice->>'taxable_amount')::numeric, 0),
    cgst = coalesce((p_invoice->>'cgst')::numeric, 0),
    sgst = coalesce((p_invoice->>'sgst')::numeric, 0),
    igst = coalesce((p_invoice->>'igst')::numeric, 0),
    round_off = coalesce((p_invoice->>'round_off')::numeric, 0),
    grand_total = coalesce((p_invoice->>'grand_total')::numeric, 0),
    amount_paid = v_paid,
    balance_due = coalesce((p_invoice->>'balance_due')::numeric, 0),
    payment_status = (p_invoice->>'payment_status')::payment_status,
    payment_method = nullif(p_invoice->>'payment_method', '')::payment_method,
    notes = nullif(p_invoice->>'notes', ''),
    billing_address = nullif(p_invoice->>'billing_address', ''),
    customer_gstin = nullif(p_invoice->>'customer_gstin', ''),
    place_of_supply = nullif(p_invoice->>'place_of_supply', ''),
    updated_at = now()
  where id = p_invoice_id;

  delete from invoice_items where invoice_id = p_invoice_id;
  perform insert_sales_invoice_items(p_invoice_id, p_items);

  delete from payments where invoice_id = p_invoice_id;
  if v_paid > 0 then
    insert into payments (
      payment_id, customer_id, invoice_id, amount, payment_date, method, created_by
    ) values (
      'PAY-' || (p_invoice->>'invoice_number'),
      v_customer_id,
      p_invoice_id,
      v_paid,
      (p_invoice->>'invoice_date')::date,
      coalesce(nullif(nullif(p_invoice->>'payment_method', ''), 'partial'), 'cash')::payment_method,
      auth.uid()
    );
  end if;

  return jsonb_build_object('invoice_id', p_invoice_id, 'customer_id', v_customer_id);
end;
$$;

grant execute on function public.is_uuid(text) to authenticated;
grant execute on function public.resolve_sales_customer(jsonb) to authenticated;
grant execute on function public.insert_sales_invoice_items(uuid, jsonb) to authenticated;
grant execute on function public.create_sales_invoice(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_sales_invoice(uuid, jsonb, jsonb, jsonb) to authenticated;
