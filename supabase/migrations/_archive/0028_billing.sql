-- Dodo Payments billing: one-time payments per billing cycle (not Dodo's native
-- Subscription object — see decision log), tracked and enforced entirely in Supabase.
-- payment.succeeded grants credits + stamps a period; a scheduled Edge Function
-- (expire-subscriptions, see 0029) downgrades anyone past their 3-day grace period.

-- --------------------------------------------------------------------------
-- Security hardening, done here because the columns added below make it urgent:
-- `profiles_update_own` (0001) is `for update using (auth.uid() = id)` with no
-- column restriction, and Postgres never restricted columns either — meaning any
-- signed-in user could already call the Supabase client directly (bypassing the
-- Next.js app entirely) and set their own credits_balance/plan/is_admin to
-- anything. This was a latent gap before (credits_balance, plan, is_admin already
-- existed); it becomes a direct financial exploit once plan/plan_period_end/
-- plan_grace_end drive real billing entitlement. Fix: revoke the blanket column
-- grant and re-grant only the fields /api/profile's own EDITABLE_FIELDS allows a
-- user to self-edit. SECURITY DEFINER functions (spend_credits) and the
-- service-role key (webhook/cron) are unaffected — both bypass column grants.
revoke update on public.profiles from authenticated;
grant update (full_name, username, avatar_url) on public.profiles to authenticated;

-- --------------------------------------------------------------------------
-- profiles: billing fields + the new resting "free" plan value.
alter table public.profiles
  add column dodo_customer_id text,
  add column plan_period_end timestamptz,
  add column plan_grace_end timestamptz;

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'pro', 'custom'));

-- 'starter'/'pro' now mean "currently within a paid period" (set only by the
-- dodo-webhook Edge Function). No user has ever actually paid before this
-- migration (no billing existed), so every existing row's 'starter' value was
-- always just the old cosmetic default, not a real entitlement — safe to
-- backfill everyone to 'free' and change the column default to match. 'custom'
-- rows are untouched (Contact-Us plan, admin-set only, unrelated to Dodo).
update public.profiles set plan = 'free' where plan in ('starter', 'pro');
alter table public.profiles alter column plan set default 'free';

-- --------------------------------------------------------------------------
-- payments: append-only ledger of successful one-time payments. Each row is one
-- paid period (period_end = payment time + 30 days, grace_end = +3 more days).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro')),
  dodo_payment_id text not null unique,
  dodo_customer_id text,
  amount_cents integer not null,
  currency text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  grace_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index payments_user_id_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- No insert/update policy: only the dodo-webhook Edge Function (service-role,
-- bypasses RLS) ever writes here — same reasoning as contact_submissions (R-046).

-- --------------------------------------------------------------------------
-- dodo_webhook_events: idempotency log. Dodo retries webhooks up to 8 times: the
-- Edge Function inserts the webhook-id here before processing and no-ops on
-- conflict, so a retried delivery can never double-grant credits.
create table public.dodo_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.dodo_webhook_events enable row level security;
-- No policies at all — service-role only, same pattern as error_logs/contact_submissions.
