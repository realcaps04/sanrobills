-- Add / verify Sanro login user in profiles + confirm auth email
-- Run in Supabase SQL Editor

-- 1) Confirm the auth user email (allows password login)
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', 'Sanro Admin',
    'role', 'owner'
  )
where email = 'sanrodoorssaji@gmail.com';

-- 2) Upsert into public.profiles for verification / app use
insert into public.profiles (id, full_name, email, role, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    'Sanro Admin'
  ),
  u.email,
  'owner',
  null
from auth.users u
where u.email = 'sanrodoorssaji@gmail.com'
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  updated_at = now();

-- 3) Verify rows
select id, email, email_confirmed_at is not null as email_confirmed
from auth.users
where email = 'sanrodoorssaji@gmail.com';

select id, full_name, email, role, created_at
from public.profiles
where email = 'sanrodoorssaji@gmail.com';
