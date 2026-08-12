-- ============================================================================
-- Repurpose AI — consolidated baseline schema
-- ============================================================================
-- Generated 2026-08-13 by reading the LIVE project (xxitlqjgmfqxesqiuouk) —
-- every table, column, constraint, index, RLS policy, function, trigger,
-- storage bucket/policy, and the billing cron job — not reconstructed from the
-- old migration file history (which had known drift from the real schema, see
-- git history / context/learned-rules.md R-024, R-045). This ONE file replaces
-- the 29 incremental migrations that got here (`0001`...`0029`, archived under
-- `supabase/migrations/_archive/` for reference/git-blame, no longer applied).
--
-- This file is a from-scratch bootstrap. It is NOT meant to be re-run against
-- the existing live project (all of this already exists there) — it's for
-- standing up a fresh Supabase project (new environment, disaster recovery,
-- or after `supabase db reset`), and it's the single source of truth to diff
-- future schema changes against.
--
-- Edge Functions are NOT part of this file — SQL migrations and Deno Edge
-- Functions are genuinely different deploy mechanisms, nothing can make a
-- .sql file contain and deploy Deno code. The two functions this schema
-- depends on (the cron job at the bottom calls one of them) live in
-- `supabase/functions/dodo-webhook` and `supabase/functions/expire-subscriptions`
-- and must be deployed separately — `supabase functions deploy <name>`, or
-- the Supabase MCP's `deploy_edge_function`. See SETUP.md §8 for the full
-- one-shot bootstrap sequence (this file, then those two deploys).
--
-- NOT included here, deliberately: a `rls_auto_enable` event trigger exists
-- on the live project (auto-enables RLS on any newly created public table).
-- It predates and is independent of every migration in this app's history —
-- looks like Supabase-project-level tooling, not something any of this app's
-- code created. Every table below explicitly enables RLS itself regardless,
-- so nothing here depends on it either way — flagged here only so it isn't
-- mistaken for something this file forgot.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users, holds plan/credits/billing state.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  -- 'free' is the resting/default state (no active paid period). 'starter'/'pro' are set only
  -- by the dodo-webhook Edge Function on a real payment.succeeded. 'custom' is admin-set only
  -- (Contact-Us plan, never self-serve, never touched by billing).
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'custom')),
  credits_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text not null,
  is_admin boolean not null default false,
  -- Billing (Dodo Payments, one-time payment per 30-day period — not a Dodo Subscription).
  -- Set only by supabase/functions/dodo-webhook on payment.succeeded.
  dodo_customer_id text,
  plan_period_end timestamptz,
  plan_grace_end timestamptz
);

create unique index profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Column-level hardening on top of the row-level policy above: RLS only ever gated which ROW,
-- never which COLUMN, so without this any signed-in user could set their own
-- credits_balance/plan/is_admin directly via the Supabase client, bypassing the app entirely.
-- Only these three fields (matching /api/profile's own EDITABLE_FIELDS) are self-editable —
-- everything else (credits_balance, plan, plan_period_end, plan_grace_end, dodo_customer_id,
-- is_admin) only ever changes via spend_credits() or the service-role key (webhook/cron/admin
-- routes), both of which bypass column grants entirely and are unaffected by this.
revoke update on public.profiles from authenticated;
grant update (full_name, username, avatar_url) on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- api_keys — public v1 API authentication.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- brand_profiles — user-owned, reusable across projects (not one-row-per-project).
-- ----------------------------------------------------------------------------
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  brand_name text,
  product_service text,
  target_audience text,
  tone text,
  description text,
  brand_colors text[],
  cta text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  is_default boolean not null default false,
  -- Product/packaging/mood images uploaded per brand — the AI-context replacement for the
  -- (removed) website-scan feature.
  context_image_paths text[] not null default '{}'
);

create index brand_profiles_user_id_idx on public.brand_profiles (user_id, created_at desc);

alter table public.brand_profiles enable row level security;

create policy "brand_profiles_all_own" on public.brand_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'analyzing', 'scripted', 'generating', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  script_ideas jsonb,
  brand_profile_id uuid references public.brand_profiles (id) on delete set null
);

create index projects_user_id_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

create policy "projects_all_own" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- source_videos
-- ----------------------------------------------------------------------------
create table public.source_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('competitor', 'product', 'brand')),
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index source_videos_project_id_idx on public.source_videos (project_id);

alter table public.source_videos enable row level security;

create policy "source_videos_all_own" on public.source_videos
  for all using (exists (
    select 1 from public.projects p where p.id = source_videos.project_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.projects p where p.id = source_videos.project_id and p.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- video_analyses — Gemini's viral breakdown of an uploaded source video.
-- ----------------------------------------------------------------------------
create table public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_video_id uuid not null references public.source_videos (id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  company text,
  company_does text,
  duration_seconds numeric,
  hook text,
  audience text,
  pain_point text,
  context text,
  emotional_trigger text,
  hero text,
  tone_of_voice text,
  visual_style text,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  viral_factor text,
  relief text,
  language text,
  video_metrics text
);

create index video_analyses_project_id_idx on public.video_analyses (project_id, created_at desc);

alter table public.video_analyses enable row level security;

create policy "video_analyses_all_own" on public.video_analyses
  for all using (exists (
    select 1 from public.projects p where p.id = video_analyses.project_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.projects p where p.id = video_analyses.project_id and p.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- scripts
-- ----------------------------------------------------------------------------
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  style text not null check (style in ('emotional', 'humorous', 'high_conversion', 'custom')),
  title text not null,
  hook text,
  body text not null,
  scene_descriptions text,
  emotional_direction text,
  cta text,
  estimated_duration text,
  language text not null default 'en',
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The exact runtime this variant's scenes were written to fit — 15 or 30. Null for scripts
  -- written before this existed.
  target_duration_seconds integer check (target_duration_seconds in (15, 30)),
  subtitles boolean not null default false
);

create index scripts_project_id_idx on public.scripts (project_id, created_at);

alter table public.scripts enable row level security;

create policy "scripts_all_own" on public.scripts
  for all using (exists (
    select 1 from public.projects p where p.id = scripts.project_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.projects p where p.id = scripts.project_id and p.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- generations
-- ----------------------------------------------------------------------------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  provider text not null check (provider in ('seedance', 'higgsfield')),
  duration_seconds integer not null,
  aspect_ratio text not null check (aspect_ratio in ('9:16', '16:9', '1:1')),
  quality text not null check (quality in ('standard', 'high', 'ultra')),
  camera_style text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  prompt_used text,
  provider_job_id text,
  output_path text,
  output_url text,
  ai_insights jsonb,
  credits_charged integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  script_body text
);

comment on column public.generations.script_body is
  'Snapshot of scripts.body at the moment this generation was submitted — scripts.body can change afterward, this cannot.';

create index generations_project_id_idx on public.generations (project_id, created_at desc);

alter table public.generations enable row level security;

create policy "generations_all_own" on public.generations
  for all using (exists (
    select 1 from public.projects p where p.id = generations.project_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.projects p where p.id = generations.project_id and p.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- credit_transactions — append-only ledger, written only via spend_credits() below.
-- ----------------------------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_id_idx on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

create policy "credit_transactions_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- error_logs — every route handler + the client error boundary logs here.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- contact_submissions — Custom-plan "Contact Us" (and general Help support link). Public-facing,
-- submitter may be anonymous, so no RLS policies at all — every access path (POST /api/contact,
-- GET/PATCH /api/admin/contact-submissions) goes through the service-role client, same as
-- error_logs.
-- ----------------------------------------------------------------------------
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  plan_interest text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'responded')),
  created_at timestamptz not null default now()
);

create index contact_submissions_created_at_idx on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;

-- ----------------------------------------------------------------------------
-- payments — append-only ledger of successful one-time Dodo payments. Each row is one paid
-- 30-day period (grace_end = period_end + 3 days). Written only by supabase/functions/dodo-webhook
-- (service-role, bypasses RLS) — no insert/update policy needed for the same reason as
-- contact_submissions/error_logs.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- dodo_webhook_events — idempotency log. Dodo retries a webhook delivery up to 8 times; the
-- dodo-webhook Edge Function inserts the webhook-id here before doing any real work and no-ops
-- on conflict, so a retried delivery can never double-grant credits. Service-role only, no
-- policies.
-- ----------------------------------------------------------------------------
create table public.dodo_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.dodo_webhook_events enable row level security;

-- ============================================================================
-- Functions + triggers
-- ============================================================================

-- amount is signed: negative to spend, positive to grant/refund. Raises if it would take the
-- balance below zero, so concurrent generations can't overdraw. This is the ONLY sanctioned way
-- credits_balance ever changes — every spend/refund/grant in the app (generation charges, plan
-- renewals from dodo-webhook, the signup bonus below) goes through this, never a direct update.
create function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
  set credits_balance = credits_balance + p_amount,
      updated_at = now()
  where id = p_user_id
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'profile % not found', p_user_id;
  end if;

  if new_balance < 0 then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_transactions (user_id, amount, reason, reference_type, reference_id, balance_after)
  values (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id, new_balance);

  return new_balance;
end;
$$;

-- Creates the profile + signup bonus ledger entry for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bonus_credits constant integer := 100;
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8))
  );

  perform public.spend_credits(new.id, bonus_credits, 'signup_bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One generic trigger to keep updated_at fresh, attached to every table that has it.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.brand_profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.scripts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Storage — three buckets, all path-scoped as {user_id}/{...}/{filename} so ownership is
-- derivable from the path's first segment.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('source-videos', 'source-videos', false, 524288000),
  ('generated-videos', 'generated-videos', false, 524288000),
  ('brand-logos', 'brand-logos', true, 10485760)
on conflict (id) do nothing;

create policy "source_videos_owner_rw" on storage.objects
  for all using (bucket_id = 'source-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'source-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "generated_videos_owner_rw" on storage.objects
  for all using (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'generated-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- brand-logos is public-read: a plain URL is enough to hand a logo/context-image to a third
-- party (Gemini's multimodal calls, Seedance's input_references) without a signed URL. Path is
-- {user_id}/{brand_profile_id}/{filename} — the second segment is a brand profile id, not a
-- project id (brand profiles aren't project-scoped), which is fine since RLS here only ever
-- checks the first segment.
create policy "brand_logos_public_read" on storage.objects
  for select using (bucket_id = 'brand-logos');

create policy "brand_logos_owner_write" on storage.objects
  for insert with check (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand_logos_owner_update_delete" on storage.objects
  for update using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand_logos_owner_delete" on storage.objects
  for delete using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Billing cron — schedules the expire-subscriptions Edge Function every 6h. This is the only
-- scheduled/background job in the app (no queue/cron infra otherwise). Downgrades anyone past
-- profiles.plan_grace_end with no renewal payment back to 'free'; credits are left untouched.
--
-- The Authorization header below is literally NEXT_PUBLIC_SUPABASE_ANON_KEY (same value already
-- shipped in every browser bundle) — safe to commit as-is, it is not a secret. verify_jwt stays
-- on for that function (any valid Supabase JWT passes, including anon) because the sweep is
-- self-limiting: it only ever touches rows objectively already past their real plan_grace_end
-- timestamp, so triggering it extra often or with just the anon key is harmless. If this
-- project's anon key is ever rotated, update it here too or this job starts getting 401s. If
-- you're bootstrapping a NEW project from this file, replace both the project ref in the URL and
-- the Authorization value with the new project's own (non-secret) anon key before running this
-- section — or just skip this block until `expire-subscriptions` is actually deployed there.
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'expire-subscriptions',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://xxitlqjgmfqxesqiuouk.supabase.co/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aXRscWpnbWZxeGVzcWl1b3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjE5NjUsImV4cCI6MjEwMDAzNzk2NX0.ENZr3A9T3pfYXfUjH4dyqjNqlU0VY02mEjk-3MqiU64'
    ),
    body := '{}'::jsonb
  );
  $$
);
