<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-08-13_

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

D-022 · 2026-08-12 · 15s generations now cost fewer credits than 30s at the same quality tier (`CREDIT_RATE_15S` in `src/lib/credits.ts`, ~0.4x the 30s per-second rate) instead of keeping one flat duration×quality rate · ACTIVE
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

D-026 · 2026-08-13 · Dodo Payments billing uses one-time-payment Products per 30-day period, not Dodo's native Subscription object — entitlement (`profiles.plan`/`plan_period_end`/`plan_grace_end`) is tracked and enforced entirely in Supabase, not trusted from Dodo's subscription lifecycle · ACTIVE
  Why: explicit user redirect mid-build ("make this one time payment, and track the subscription via supabase edge function and disable it after 3 days grace period") — overrode the original plan (Dodo native subscriptions, agreed via `AskUserQuestion` earlier the same session) before any subscription code was written
  Rejected: Dodo Subscriptions (`subscription.active`/`renewed`/`cancelled` webhooks) — simpler in one sense (Dodo tracks the billing cycle) but the user specifically wanted Supabase to own tracking + a hard grace-period cutoff, which native subscriptions don't naturally express
D-027 · 2026-08-13 · Introduced a 4th `profiles.plan` value, `'free'`, as the new column default and backfilled every existing row (all were `'starter'`/`'pro'`) to it in the same migration (`0028`) · ACTIVE
  Why: `'starter'`/`'pro'` now mean "currently within a paid period" (only ever set by `dodo-webhook`) — before this migration nobody had ever actually paid (no billing existed), so every existing row's value was always just the old cosmetic default, safe to reset. Not flagged as a question — reversible, no real payment history existed to lose
  Rejected: keeping `'starter'` as the default/resting state — would make the DB claim every new signup is an active paying Starter subscriber, wrong once `plan` drives real entitlement
D-028 · 2026-08-13 · `profiles`' blanket `for update using (auth.uid() = id)` RLS policy (0001) had no column restriction and neither did Postgres grants — any signed-in user could already call the Supabase client directly and set their own `credits_balance`/`plan`/`is_admin` to anything, bypassing the Next.js app entirely. Fixed in the same migration that added the new billing columns: `revoke update on profiles from authenticated`, then `grant update (full_name, username, avatar_url)` — matching `/api/profile`'s own `EDITABLE_FIELDS` · ACTIVE
  Why: found while adding `plan`/`plan_period_end`/`plan_grace_end`/`dodo_customer_id` to the same table — those columns would've inherited the identical self-serve-forgeable gap, turning a latent issue into a direct "grant yourself Pro" exploit. `spend_credits` (security definer) and the service-role key (webhook/cron) are unaffected — both bypass column grants
  Rejected: leaving it for a separate security pass — the new columns made it urgent enough to fix inline; confirmed live via `information_schema.column_privileges` that only the three intended columns are grantable now
D-029 · 2026-08-13 · The Dodo webhook receiver and the grace-period expiry sweep are Supabase Edge Functions (`supabase/functions/dodo-webhook`, `expire-subscriptions`), not Next.js API routes · ACTIVE
  Why: user explicitly asked for the expiry check as "a supabase edge function"; extended the same choice to the webhook receiver too since it gives Dodo's webhook a stable public URL independent of the Next.js app's own deploy/hosting status — still unresolved (D-007) — and there's nowhere else in this app for a scheduled job to live (no queue/cron infra otherwise)
  Rejected: a Next.js `/api/webhooks/dodo` route — would work once the app is actually deployed somewhere, but ties webhook delivery to that deploy being up, and doesn't solve the "nothing runs on a schedule" gap `expire-subscriptions` needed solved anyway
