-- Eski tabloda "category" kolonu varken bir kez çalıştırın.

alter table public.software_work_logs
  add column if not exists tur text not null default '';

alter table public.software_work_logs
  add column if not exists proje text not null default '';

update public.software_work_logs
set tur = coalesce(nullif(trim(tur), ''), category, '')
where tur = '' or tur is null;

alter table public.software_work_logs
  drop constraint if exists software_work_logs_category_check;

alter table public.software_work_logs
  drop column if exists category;
