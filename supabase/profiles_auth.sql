-- Profiles + auth sync for email and Google users
-- Run this in Supabase SQL Editor (after schema.sql if tables are not created yet).

-- Ensure profiles table exists (safe if already created)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Recreate policies idempotently
drop policy if exists "Authenticated read profiles" on public.profiles;
drop policy if exists "Users upsert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

create policy "Authenticated read profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users upsert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create / update profile whenever a user signs up (email or Google)
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

-- Backfill profiles for any existing auth users
insert into public.profiles (id, full_name, email, role, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'User'
  ),
  coalesce(u.email, ''),
  'staff',
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  updated_at = now();
