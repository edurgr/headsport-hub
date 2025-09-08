-- Content Module Migration 1: thumbnails and flexible metadata

-- Add thumbnail_path and metadata to upload_files (idempotent)
alter table if exists public.upload_files
  add column if not exists thumbnail_path text,
  add column if not exists metadata jsonb;

-- Optional index for searching by session quickly (already exists), keep for clarity
create index if not exists idx_upload_files_session_id on public.upload_files(session_id);

-- Extend RLS to allow managers/admins to view/manage all content
-- Using role from profiles; no need for helper functions

-- upload_sessions: additional policies for manager/admin
drop policy if exists "Managers/admins can view all upload sessions" on public.upload_sessions;
create policy "Managers/admins can view all upload sessions"
on public.upload_sessions for select to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
));

drop policy if exists "Managers/admins can manage all upload sessions" on public.upload_sessions;
create policy "Managers/admins can manage all upload sessions"
on public.upload_sessions for all to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
));

-- upload_files: additional policies for manager/admin
drop policy if exists "Managers/admins can view all upload files" on public.upload_files;
create policy "Managers/admins can view all upload files"
on public.upload_files for select to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
));

drop policy if exists "Managers/admins can manage all upload files" on public.upload_files;
create policy "Managers/admins can manage all upload files"
on public.upload_files for all to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager','admin')
));



