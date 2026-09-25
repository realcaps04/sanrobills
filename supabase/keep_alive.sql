-- Keep-alive ping target for Free Plan pause prevention.
-- Run once in Supabase SQL Editor.
-- GitHub Actions (or any cron) should GET /rest/v1/keep_alive?select=id&limit=1
-- with the anon key. That hits Postgres through PostgREST (auth/v1/health does not).

create table if not exists public.keep_alive (
  id int primary key default 1 check (id = 1),
  touched_at timestamptz not null default now()
);

insert into public.keep_alive (id) values (1)
on conflict (id) do nothing;

alter table public.keep_alive enable row level security;

drop policy if exists "Public can ping keep_alive" on public.keep_alive;
create policy "Public can ping keep_alive"
  on public.keep_alive
  for select
  to anon, authenticated
  using (true);
