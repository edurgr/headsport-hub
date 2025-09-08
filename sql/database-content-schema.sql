-- HEAD Hub - Content Module (Uploads)
-- Run in Supabase SQL Editor after applying the Core schema

-- 1) Enums
do $$ begin
  create type upload_status as enum ('uploading','processing','completed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type file_type as enum ('image','video','document','other');
exception when duplicate_object then null; end $$;

-- 2) Tables
create table if not exists public.upload_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status upload_status not null default 'uploading',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.upload_files (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.upload_sessions(id) on delete cascade,
  filename text not null,
  file_path text not null,
  file_size bigint,
  file_type file_type not null default 'other',
  mime_type text,
  created_at timestamptz default now()
);

-- 3) Indexes
create index if not exists idx_upload_sessions_user_id on public.upload_sessions(user_id);
create index if not exists idx_upload_sessions_status on public.upload_sessions(status);
create index if not exists idx_upload_files_session_id on public.upload_files(session_id);

-- 4) RLS
alter table public.upload_sessions enable row level security;
alter table public.upload_files enable row level security;

-- Upload sessions policies
drop policy if exists "Users can view their own upload sessions" on public.upload_sessions;
create policy "Users can view their own upload sessions"
on public.upload_sessions for select
using (auth.uid() = user_id);

drop policy if exists "Users can manage their own upload sessions" on public.upload_sessions;
create policy "Users can manage their own upload sessions"
on public.upload_sessions for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Upload files policies
drop policy if exists "Users can view files from their own sessions" on public.upload_files;
create policy "Users can view files from their own sessions"
on public.upload_files for select
using (exists (
  select 1 from public.upload_sessions s
  where s.id = upload_files.session_id and s.user_id = auth.uid()
));

drop policy if exists "Users can manage files in their own sessions" on public.upload_files;
create policy "Users can manage files in their own sessions"
on public.upload_files for all
using (exists (
  select 1 from public.upload_sessions s
  where s.id = upload_files.session_id and s.user_id = auth.uid()
)) with check (exists (
  select 1 from public.upload_sessions s
  where s.id = upload_files.session_id and s.user_id = auth.uid()
));

-- 5) updated_at trigger function (idempotent)
drop function if exists public.update_updated_at_column() cascade;
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
drop trigger if exists update_upload_sessions_updated_at on public.upload_sessions;
create trigger update_upload_sessions_updated_at before update on public.upload_sessions
for each row execute function public.update_updated_at_column();

-- Done

