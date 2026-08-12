-- API keys for the public /api/v1 integration surface.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

create policy "api_keys_all_own" on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
