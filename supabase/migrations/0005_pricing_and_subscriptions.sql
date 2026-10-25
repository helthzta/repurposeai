-- 0005 · Pricing in the database + Dodo native subscriptions (monthly and yearly).
--
-- Additive only: new tables/columns/functions, nothing dropped. Safe to apply before the app build
-- that uses it is live (old code never reads these).
--
-- Numbers are from "ESTIMATE ADIY ai.xlsx" (column C "should be" for credits, column F "actual
-- cost" for est_cost_usd). They live here, not in code, because provider cost fluctuates after
-- launch — change a row, not a deploy. The dodo-webhook Edge Function reads the same rows, so the
-- old hand-kept PLAN_CREDITS copy in Deno is gone.

-- ── Plans ────────────────────────────────────────────────────────────────────────────────────────
-- One row per (plan, interval). price_cents is what Dodo charges once per interval: yearly is the
-- monthly MRP less 20%, rounded to whole dollars per month ($19 → $15/mo = $180/yr, $39 → $31/mo =
-- $372/yr). credits_per_month is granted every month on both intervals (yearly refills monthly via
-- billing_sweep() in 0008).
create table public.billing_plans (
  id text primary key,
  plan text not null check (plan in ('starter', 'pro')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  credits_per_month integer not null check (credits_per_month >= 0),
  -- Filled by `npm run setup:dodo` (scripts/setup-dodo-products.ts). Checkout refuses a plan
  -- whose product id is still null.
  dodo_product_id text unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (plan, billing_interval)
);

insert into public.billing_plans (id, plan, billing_interval, name, price_cents, credits_per_month, sort_order) values
  ('starter_monthly', 'starter', 'month', 'Start', 1900, 70, 1),
  ('starter_yearly',  'starter', 'year',  'Start', 18000, 70, 2),
  ('pro_monthly',     'pro',     'month', 'Pro',   3900, 168, 3),
  ('pro_yearly',      'pro',     'year',  'Pro',   37200, 168, 4);

-- ── Per-video credit cost ────────────────────────────────────────────────────────────────────────
-- 480p ('standard') and 1:1 are no longer offered, so only 720p ('high') and 1080p ('ultra') rows.
-- 30s 1080p renders at 720p (Seedance 2.5 has no 1080p tier) but is still priced at 42c per the
-- sheet — explicit product decision, see decision-log D-030.
create table public.credit_rates (
  duration_seconds integer not null check (duration_seconds in (15, 30)),
  quality text not null check (quality in ('high', 'ultra')),
  credits integer not null check (credits > 0),
  -- What one render is expected to cost us (USD). Shown next to the real provider cost in admin.
  est_cost_usd numeric(10, 4) not null,
  updated_at timestamptz not null default now(),
  primary key (duration_seconds, quality)
);

insert into public.credit_rates (duration_seconds, quality, credits, est_cost_usd) values
  (15, 'high',  5,  0.64),
  (15, 'ultra', 35, 5.63),
  (30, 'high',  40, 6.94),
  (30, 'ultra', 42, 6.94);

-- Pricing is public (landing page, signed-out visitors). Writes are service-role only.
alter table public.billing_plans enable row level security;
alter table public.credit_rates enable row level security;
create policy billing_plans_public_read on public.billing_plans for select to anon, authenticated using (true);
create policy credit_rates_public_read on public.credit_rates for select to anon, authenticated using (true);

-- ── Subscriptions ────────────────────────────────────────────────────────────────────────────────
-- Mirror of Dodo's Subscription object, written only by dodo-webhook (and the cancel route, which
-- also asks Dodo first). profiles.plan / plan_period_end / plan_grace_end stay the entitlement the
-- app actually checks; this table is history + what the admin panel lists.
create table public.subscriptions (
  id text primary key, -- Dodo subscription_id
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.billing_plans (id),
  status text not null, -- Dodo's status: pending | active | on_hold | cancelled | failed | expired
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  -- Billing period start whose allotment has already been granted — makes the reset idempotent
  -- when Dodo sends both subscription.active and subscription.renewed for the same period.
  credited_period_start timestamptz,
  -- Yearly plans only: when billing_sweep() next resets credits to the monthly allotment.
  next_credit_refill_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);

-- The user's current subscription — the one later events are allowed to change entitlement for,
-- so a late event from an old, replaced subscription can't downgrade a newer one.
alter table public.profiles add column dodo_subscription_id text;

-- ── Payments ─────────────────────────────────────────────────────────────────────────────────────
-- Now one row per Dodo payment of any outcome (failed ones too, for the admin Failures view).
-- Period columns move to subscriptions, so they become nullable here.
alter table public.payments
  add column status text not null default 'succeeded' check (status in ('succeeded', 'failed', 'refunded')),
  add column subscription_id text,
  add column plan_id text references public.billing_plans (id),
  alter column period_start drop not null,
  alter column period_end drop not null,
  alter column grace_end drop not null;

-- ── Generation cost tracking ─────────────────────────────────────────────────────────────────────
-- est_cost_usd: credit_rates.est_cost_usd at submit time. provider_cost_usd: what OpenRouter
-- actually billed (poll response usage.cost), null until the job completes.
alter table public.generations
  add column est_cost_usd numeric(10, 4),
  add column provider_cost_usd numeric(10, 4);

-- ── Credit reset helper ──────────────────────────────────────────────────────────────────────────
-- Sets a balance to exactly p_target through spend_credits (so the ledger row is written), with the
-- profile row locked so a generation can't land between the read and the write. Used for plan
-- allotments (reset, not top-up) and for zeroing credits when a plan lapses.
create or replace function public.reset_credits(
  p_user_id uuid,
  p_target integer,
  p_reason text,
  p_reference_type text default null,
  p_reference_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
begin
  select credits_balance into current_balance from public.profiles where id = p_user_id for update;
  if current_balance is null then
    raise exception 'profile % not found', p_user_id;
  end if;
  if current_balance = p_target then
    return current_balance;
  end if;
  return public.spend_credits(p_user_id, p_target - current_balance, p_reason, p_reference_type, p_reference_id);
end;
$$;

revoke execute on function public.reset_credits(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.reset_credits(uuid, integer, text, text, uuid) to service_role;
