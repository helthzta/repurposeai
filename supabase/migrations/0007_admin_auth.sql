-- 0007 · Separate admin accounts, sessions and audit log.
--
-- Admins are no longer app users with profiles.is_admin = true (that column is dropped in 0009,
-- after the code that reads it is gone). They sign in at /admin/login with their own credentials,
-- checked by src/lib/admin-auth.ts. Every table here is service-role only: RLS on, no policies,
-- and table privileges revoked from the browser roles, so not even a leaked anon key can read a
-- password hash or session.

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  -- scrypt$<N>$<r>$<p>$<salt b64>$<hash b64> — see hashPassword() in src/lib/admin-auth.ts.
  password_hash text not null,
  -- Account lockout: 5 consecutive failures lock the account for 15 minutes (per-account, on top
  -- of the per-IP rate limit on the login route).
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_users (id) on delete cascade,
  -- sha256 of the random cookie token; the token itself is never stored.
  token_hash text not null unique,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index admin_sessions_admin_id_idx on public.admin_sessions (admin_id);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users (id) on delete set null,
  -- e.g. login.success, login.failed, logout, user.credits_adjusted, user.plan_changed
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.admin_users, public.admin_sessions, public.admin_audit_log from anon, authenticated;
