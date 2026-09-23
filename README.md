# Sanro Billing

Desktop-first billing and business management app for **Sanro Fibre Glass Industries**.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + PostgreSQL) — optional; demo mode works without credentials

## Quick start

```bash
npm install
npm run dev
```

Open the app, sign in with any email/password (demo mode), and use the Kanakku-style dashboard.

## Supabase

1. Copy `.env.example` to `.env`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in the Supabase SQL editor
