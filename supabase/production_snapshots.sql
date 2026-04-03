-- Supabase SQL Editor'da bir kez çalıştırın.

create table if not exists public.production_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  work_date date not null,
  person_name text not null default '',
  groups jsonb not null default '[]'::jsonb
);

create index if not exists production_snapshots_user_created_idx
  on public.production_snapshots (user_id, created_at desc);

alter table public.production_snapshots enable row level security;

drop policy if exists "production_snapshots_select_own" on public.production_snapshots;
drop policy if exists "production_snapshots_insert_own" on public.production_snapshots;
drop policy if exists "production_snapshots_update_own" on public.production_snapshots;
drop policy if exists "production_snapshots_delete_own" on public.production_snapshots;

create policy "production_snapshots_select_own"
  on public.production_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

create policy "production_snapshots_insert_own"
  on public.production_snapshots for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "production_snapshots_update_own"
  on public.production_snapshots for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "production_snapshots_delete_own"
  on public.production_snapshots for delete
  to authenticated
  using (auth.uid() = user_id);
