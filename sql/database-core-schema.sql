-- HEAD Hub - Core Schema (Minimal & Functional)
-- This script is safe to run in Supabase SQL Editor on a new project.

-- 1) Required extensions (idempotent)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2) Roles enum
do $$ begin
  create type user_role as enum ('athlete','manager','admin');
exception when duplicate_object then null; end $$;

-- 3) Profiles table (simple & robust)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  role user_role not null default 'athlete',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- 4) RLS & Policies (minimal)
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "Managers and admins can view all profiles" on public.profiles;
create policy "Managers and admins can view all profiles"
on public.profiles for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('manager','admin')
));

-- Allow system roles to insert (used by Supabase internals on signup/admin)
drop policy if exists "Allow insert via service role" on public.profiles;
create policy "Allow insert via service role"
on public.profiles for insert to service_role with check (true);

drop policy if exists "Allow insert via auth admin" on public.profiles;
create policy "Allow insert via auth admin"
on public.profiles for insert to supabase_auth_admin with check (true);

-- 5) Cleanup any default/example triggers/functions from templates
drop trigger if exists handle_new_user on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_user_profile() cascade;

-- 6) Robust signup trigger: creates/updates profile; resolves email conflicts; bypasses RLS
drop trigger if exists create_profile_on_signup on auth.users;
drop function if exists public.create_profile_for_user() cascade;

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Avoid UNIQUE(email) conflicts if a row with same email but different id exists
  delete from public.profiles
  where email = new.email and id <> new.id;

  -- Create or update profile for the new auth user
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'athlete')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

alter function public.create_profile_for_user() owner to postgres;

create trigger create_profile_on_signup
after insert on auth.users
for each row execute function public.create_profile_for_user();

-- 7) Done. Auth email/password can now be used safely.
-- Ensure in Auth settings:
--   - Site URL: http://localhost:3000
--   - Redirect URLs: http://localhost:3000/auth/callback

