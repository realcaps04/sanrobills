-- Sanro Billing — Supabase / PostgreSQL schema
-- Run in Supabase SQL editor. Enable RLS policies as needed.

create extension if not exists "pgcrypto";

create type user_role as enum ('owner', 'manager', 'staff');
create type payment_status as enum ('paid', 'partial', 'pending');
create type payment_method as enum ('cash', 'upi', 'bank_transfer', 'card', 'credit', 'partial');
create type customer_type as enum ('retail', 'dealer', 'contractor');
create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'staff',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  address text,
  phone text,
  email text,
  gstin text,
  logo_url text,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  invoice_prefix text not null default 'INV',
  starting_invoice_number integer not null default 1,
  default_gst numeric(5,2) not null default 18,
  terms_conditions text,
  updated_at timestamptz not null default now()
);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  gstin text,
  customer_type customer_type not null default 'retail',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_phone_idx on customers (phone);
create index customers_name_idx on customers (name);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_code text not null unique,
  category_id uuid references product_categories (id),
  door_type text,
  size text,
  material text,
  colour text,
  finish text,
  hsn_code text,
  gst_rate numeric(5,2) not null default 18,
  mrp numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  dealer_price numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  minimum_stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers (id),
  invoice_date date not null default current_date,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  taxable_amount numeric(12,2) not null default 0,
  cgst numeric(12,2) not null default 0,
  sgst numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  payment_status payment_status not null default 'pending',
  payment_method payment_method,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_customer_idx on invoices (customer_id);
create index invoices_date_idx on invoices (invoice_date);
create index invoices_status_idx on invoices (payment_status);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  product_id uuid references products (id),
  product_name text not null,
  size text,
  quantity numeric(12,2) not null default 1,
  rate numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 18,
  total numeric(12,2) not null default 0,
  door_size text,
  height text,
  width text,
  thickness text,
  colour text,
  finish text,
  frame_type text,
  glass_type text,
  lock_type text,
  handle_type text,
  opening_direction text,
  custom_instructions text
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  customer_id uuid not null references customers (id),
  invoice_id uuid not null references invoices (id),
  amount numeric(12,2) not null,
  payment_date date not null default current_date,
  method payment_method not null,
  reference text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  txn_type text not null check (txn_type in ('purchase', 'sale', 'adjustment')),
  quantity integer not null,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table inventory_transactions enable row level security;
alter table company_settings enable row level security;

create policy "Authenticated read profiles" on profiles
  for select to authenticated using (true);

create policy "Users upsert own profile" on profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on email signup or Google OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'User'
    ),
    coalesce(new.email, ''),
    'staff',
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "Authenticated manage business data" on customers
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage products" on products
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage categories" on product_categories
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage invoices" on invoices
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage invoice items" on invoice_items
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage payments" on payments
  for all to authenticated using (true) with check (true);

create policy "Authenticated manage inventory txns" on inventory_transactions
  for all to authenticated using (true) with check (true);

create policy "Authenticated read settings" on company_settings
  for select to authenticated using (true);

create policy "Owner update settings" on company_settings
  for update to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );
