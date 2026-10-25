<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-10-25_

## Format

`D-0XX · <date> · <one-line decision> · STATUS`
`  Why: <reason, ≤15 words>`
`  Rejected: <alternative considered and why not, if relevant>`

Status is one of: `ACTIVE` / `SUPERSEDED by D-0YY` / `PROMOTED to <file>`.
Anything not `ACTIVE` is deletable on sight — no need to re-read it first.

## Decisions

<!-- Example:
D-001 · {{DATE}} · Use X over Y for Z · ACTIVE
  Why: simpler, no query overhead
  Rejected: Y — overkill for this case
-->

D-001 thru D-004 (2026-07-25 session: auto tone/CTA, viral-framed analysis fields, Ideas step, Original camera style) — all shipped and stable; compacted to learned-rules.md R-006–R-009 and deleted here per the ritual.

D-007 · 2026-07-29 · Rate limiting is in-memory, per-process (`src/lib/rate-limit.ts`, keyed by user/IP + route scope) · ACTIVE
  Why: no Redis/DB-backed limiter infra exists yet, and the hosting target is still unresolved (architecture.md)
  Rejected: a Postgres-backed limiter table — more correct under multi-instance hosting, but adds a migration + DB round-trip per request for what's currently a single-instance app

D-010 thru D-018 (2026-07-29–08-02 sessions: website-scan caching/timing, 30s-script disable, v1 API brand handling, brand-profile migration backfill, brand-logo upload path reuse, separate login/signup screens, Settings→Profile rename, profile-preference column removal) — all shipped and stable; compacted to `learned-rules.md` R-047 and deleted here per the ritual.

D-022 · 2026-08-12 · 15s generations now cost fewer credits than 30s at the same quality tier (`CREDIT_RATE_15S` in `src/lib/credits.ts`, ~0.4x the 30s per-second rate) instead of keeping one flat duration×quality rate · SUPERSEDED by D-034
  Why: explicit user call after being shown real numbers — seedance-2.0-fast (now the 15s model, D-023-adjacent model-routing change) runs ~$0.04/s on OpenRouter vs seedance-2.5's ~$0.10/s for 30s, user wanted the discount to actually reflect that
  Rejected: leaving the rate flat — simpler, and the app never passed through raw provider cost 1:1 anyway, but user explicitly asked for the split
D-023 · 2026-08-12 · Custom plan's "Contact Us" is a real feature — `contact_submissions` table, public `POST /api/contact`, `/contact` page, and an admin-dashboard section to view/mark-responded — not a mailto link or a toast · ACTIVE
  Why: explicit user request ("hook it into the database and also in the admin portal") after being told no contact page/support email existed yet
  Rejected: mailto: placeholder or keeping the existing toast-only pattern — both were offered and declined
D-024 · 2026-08-12 · "Enterprise" plan renamed to "Custom" all the way through, including `profiles.plan`'s DB check constraint and existing rows (migration `0027`), not just the UI label · ACTIVE
  Why: spec explicitly said "rename, don't just relabel if pricing/credit fields exist for it"; no code path was found that ever set `plan` to anything but the signup default, so this was low-risk
  Rejected: leaving `enterprise` as an allowed-but-unused DB value and only changing what's displayed — cheaper, but leaves a real rename half-done at the schema layer
D-025 · 2026-08-12 · 15s generations do NOT regain real image-conditioned logo grounding even though they now route to seedance-2.0-fast, which (per the existing code comment) supports `input_references` unlike 2.5 · ACTIVE
  Why: the video-model-routing spec was scoped to model selection only; restoring image conditioning is a real behavior change (visual output, another aspect-ratio-conflict risk to re-verify) that deserves its own decision, not a byproduct of a routing change — flagged inline in `seedance.ts` instead
  Rejected: wiring it up now since the capability is technically already there — rejected on scope-discipline grounds, not a technical blocker

D-026 · 2026-08-13 · Dodo Payments billing uses one-time-payment Products per 30-day period, not Dodo's native Subscription object — entitlement (`profiles.plan`/`plan_period_end`/`plan_grace_end`) is tracked and enforced entirely in Supabase, not trusted from Dodo's subscription lifecycle · SUPERSEDED by D-032
  Why: explicit user redirect mid-build ("make this one time payment, and track the subscription via supabase edge function and disable it after 3 days grace period") — overrode the original plan (Dodo native subscriptions, agreed via `AskUserQuestion` earlier the same session) before any subscription code was written
  Rejected: Dodo Subscriptions (`subscription.active`/`renewed`/`cancelled` webhooks) — simpler in one sense (Dodo tracks the billing cycle) but the user specifically wanted Supabase to own tracking + a hard grace-period cutoff, which native subscriptions don't naturally express
D-027 · 2026-08-13 · Introduced a 4th `profiles.plan` value, `'free'`, as the new column default and backfilled every existing row (all were `'starter'`/`'pro'`) to it in the same migration (`0028`) · ACTIVE
  Why: `'starter'`/`'pro'` now mean "currently within a paid period" (only ever set by `dodo-webhook`) — before this migration nobody had ever actually paid (no billing existed), so every existing row's value was always just the old cosmetic default, safe to reset. Not flagged as a question — reversible, no real payment history existed to lose
  Rejected: keeping `'starter'` as the default/resting state — would make the DB claim every new signup is an active paying Starter subscriber, wrong once `plan` drives real entitlement
D-028 · 2026-08-13 · `profiles`' blanket `for update using (auth.uid() = id)` RLS policy (0001) had no column restriction and neither did Postgres grants — any signed-in user could already call the Supabase client directly and set their own `credits_balance`/`plan`/`is_admin` to anything, bypassing the Next.js app entirely. Fixed in the same migration that added the new billing columns: `revoke update on profiles from authenticated`, then `grant update (full_name, username, avatar_url)` — matching `/api/profile`'s own `EDITABLE_FIELDS` · ACTIVE
  Why: found while adding `plan`/`plan_period_end`/`plan_grace_end`/`dodo_customer_id` to the same table — those columns would've inherited the identical self-serve-forgeable gap, turning a latent issue into a direct "grant yourself Pro" exploit. `spend_credits` (security definer) and the service-role key (webhook/cron) are unaffected — both bypass column grants
  Rejected: leaving it for a separate security pass — the new columns made it urgent enough to fix inline; confirmed live via `information_schema.column_privileges` that only the three intended columns are grantable now
D-029 · 2026-08-13 · The Dodo webhook receiver and the grace-period expiry sweep are Supabase Edge Functions (`supabase/functions/dodo-webhook`, `expire-subscriptions`), not Next.js API routes · SUPERSEDED by D-033 for the sweep (webhook part still holds)
  Why: user explicitly asked for the expiry check as "a supabase edge function"; extended the same choice to the webhook receiver too since it gives Dodo's webhook a stable public URL independent of the Next.js app's own deploy/hosting status — still unresolved (D-007) — and there's nowhere else in this app for a scheduled job to live (no queue/cron infra otherwise)
  Rejected: a Next.js `/api/webhooks/dodo` route — would work once the app is actually deployed somewhere, but ties webhook delivery to that deploy being up, and doesn't solve the "nothing runs on a schedule" gap `expire-subscriptions` needed solved anyway
D-030 · 2026-10-25 (revised) · Visual Quality is now two tiers, "720p" (`high`) and "HD 1080p" (`ultra`); 480p removed. "HD 1080p" is real 1080p for 15s (`bytedance/seedance-2.0`) but still renders 720p for 30s (2.5 ceiling) and is charged 42c vs 40c for 30s 720p · ACTIVE
  Why: explicit user choice 2026-10-25 ("Keep 30s 1080p at 42c", per the pricing sheet), asked with the 720p-render fact stated
  Rejected: offering 30s at 720p only (recommended, declined)
D-031 · 2026-08-13 · All 29 incremental migration files (`0001_profiles.sql`…`0029_billing_cron.sql`) consolidated into one `supabase/migrations/0001_baseline.sql`, built by directly introspecting the live project's actual schema (columns, constraints, RLS, functions, triggers, storage, cron) — not reconstructed from the old files' text. Old files moved to `supabase/migrations/_archive/` (git-blame only, not applied by any tooling) · ACTIVE
  Why: explicit user request for one single current-state migration file; introspecting live rather than trusting the old files was deliberate given this project's own confirmed migration-history drift (R-024/R-045 — several archived numbers don't match what actually shipped under that name)
  Rejected: keeping the 29-file history and just adding a "current state" doc alongside it — doesn't satisfy "one single file," and leaves the drift problem for the next person to rediscover
D-032 · 2026-10-25 · Billing moved to Dodo native subscriptions (monthly + yearly products, one per `billing_plans` row). Cancel = `cancel_at_next_billing_date`: access and credits last to period end, then credits are forfeited; no refunds or proration on cancel; plan switches use `changePlan(prorated_immediately)` and adjust credits by the plan difference only; failed renewal keeps a 3-day grace · ACTIVE
  Why: brief asked for monthly/yearly plans with Cancel Subscription + webhook handling; user chose subscriptions over D-026 via AskUserQuestion
  Rejected: keep one-time payments with a 365-day yearly product (D-026 extended) — cancel would have nothing to act on
D-033 · 2026-10-25 · Scheduled billing work is `public.billing_sweep()` (SQL, security definer) run hourly by pg_cron (`billing-sweep` job, migration 0008): yearly monthly refills + expiry of lapsed plans. `expire-subscriptions` Edge Function deleted · ACTIVE
  Why: old cron posted to the previous project and the function was never deployed; in-DB removes the HTTP hop, anon key and deploy step
  Rejected: redeploying the Edge Function and repointing pg_net — more moving parts for the same query
D-034 · 2026-10-25 · Prices and per-video credits live in `billing_plans` / `credit_rates` (public-read RLS), read by app, landing page and webhook. Credits = sheet column C ("should be"): 15s 720p 5c, 15s 1080p 35c, 30s 720p 40c, 30s 1080p 42c. Yearly = monthly −20% rounded to whole $/mo ($15/$31) with the same monthly credits, refilled monthly · ACTIVE
  Why: brief requires DB/config pricing (provider cost fluctuates); column C matches the sheet's own plan math; user chose C, monthly yearly refills
  Rejected: column B ("credits": 6/6/9/30/42) — breaks the sheet's videos-per-plan math
D-035 · 2026-10-25 · Admin is a separate identity: `admin_users`/`admin_sessions`/`admin_audit_log` (0007), scrypt hashes, `/admin/login`, httpOnly SameSite=Strict cookie with sha256-hashed server-side session, 5-strike account lockout + per-IP limit, Origin check on admin mutations. `profiles.is_admin` dropped (0009). Admins no longer generate for free (R-061 obsolete) — give a test account credits from the admin user page instead · ACTIVE
  Why: brief demanded entirely separate credentials/auth path and removal of is_admin
  Rejected: keeping admin as a flagged Supabase user with an extra password — still couples admin to the customer auth path
D-036 · 2026-10-25 · Script page removed: after picking an idea the user goes straight to Generation Settings, which now holds the 15s/30s length switch, script language and subtitles (same `/select` and `/regenerate` APIs). Manual script editing, the AI-assist edit, `PATCH /api/scripts/[id]` and `GET /api/scripts` deleted · ACTIVE
  Why: brief item 11; language/subtitles kept because Hinglish scripts are part of the cost sheet
  Rejected: dropping language/subtitles with the page — would silently remove a used feature (R-004)
