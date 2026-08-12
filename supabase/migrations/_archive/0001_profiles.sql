-- Profiles: one row per auth.users, holds plan/credits/preferences.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  credits_balance integer not null default 0,
  locale text not null default 'en',
  theme text not null default 'light' check (theme in ('light', 'system')),
  notify_on_completion boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
