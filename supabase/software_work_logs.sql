-- Yeni kurulum: Supabase SQL Editor'da bir kez çalıştırın.
-- Daha önce eski şema (category) oluşturduysanız: software_work_logs_migrate_to_tur_proje.sql dosyasını çalıştırın.

create table if not exists public.software_work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  work_date date not null,
  title text not null default '',
  hours numeric(8, 2) not null default 0 check (hours >= 0),
  tur text not null default '',
  proje text not null default '',
  description text not null default ''
);

create index if not exists software_work_logs_user_created_idx
  on public.software_work_logs (user_id, created_at desc);

alter table public.software_work_logs enable row level security;

drop policy if exists "software_work_logs_select_own" on public.software_work_logs;
drop policy if exists "software_work_logs_insert_own" on public.software_work_logs;
drop policy if exists "software_work_logs_update_own" on public.software_work_logs;
drop policy if exists "software_work_logs_delete_own" on public.software_work_logs;

create policy "software_work_logs_select_own"
  on public.software_work_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "software_work_logs_insert_own"
  on public.software_work_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "software_work_logs_update_own"
  on public.software_work_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "software_work_logs_delete_own"
  on public.software_work_logs for delete
  to authenticated
  using (auth.uid() = user_id);
