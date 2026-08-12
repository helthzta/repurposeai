-- Central error log (Admin Feature: Error logging). Writes go through the
-- service-role client from server code, so this only needs owner-read policies.
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  scope text not null,
  message text not null,
  stack text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index error_logs_user_id_idx on public.error_logs (user_id, created_at desc);

alter table public.error_logs enable row level security;

create policy "error_logs_select_own" on public.error_logs
  for select using (auth.uid() = user_id);
