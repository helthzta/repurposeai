# Security Context

<!-- Generated from supabase/migrations/*.sql, src/lib/auth.ts, src/lib/errors.ts,
src/lib/api-keys.ts, middleware.ts. This is a client project under NDA
(project_overview.md) — treat any credential/data leak as high severity. -->

## Threat model

1. **Cross-user data access via a missing/misconfigured RLS policy** — every
   user's ads, scripts, and generated videos are sensitive client-brand
   material; a policy gap would expose one customer's unreleased ad content
   to another.
2. **API key compromise** — the public `/api/v1/commercials` surface trusts
   a Bearer token; a leaked key lets an attacker spend the owner's credits
   and read their project data.
3. **Service-role client misuse** — `src/lib/supabase/admin.ts` bypasses RLS
   entirely; using it on a code path that serves a specific user's request
   without manual scoping would silently defeat every RLS policy in the app.
4. **Credit balance manipulation** — direct writes to `profiles.credits_balance`
   (bypassing `spend_credits`) could create free-generation exploits or
   corrupt the ledger's audit trail.
5. **Storage path traversal** — since ownership is derived purely from the
   first path segment matching `auth.uid()`, a caller-supplied path that
   doesn't go through the app's own path-construction logic could attempt to
   read/write another user's folder if ever accepted as raw input.

## Defence-in-depth rules

### Identity & access
- Every dashboard route must call `requireUser()` (`src/lib/auth.ts`) before
  touching user data; every `/api/v1/*` route must call `requireApiKey()`.
  Don't hand-roll a third auth path.
- Ownership/scope checks happen server-side via Postgres RLS
  (`auth.uid() = user_id` or a join through `projects`), never trusted from
  client-supplied IDs alone.

### Data exposure
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
  `SEEDANCE_API_KEY`) live only in server-side env vars (`.env.example`),
  never in `NEXT_PUBLIC_*` vars or client bundles.
- RLS is enabled on every user-data table (`profiles`, `projects`,
  `brand_profiles`, `source_videos`, `video_analyses`, `scripts`,
  `generations`, `credit_transactions`, `api_keys`) — confirmed present in
  each corresponding migration file. Any new table holding user data must
  ship RLS in the same migration that creates it.
- API keys are stored only as a sha256 hash (`api_keys.key_hash`) — the
  plaintext key is shown once at creation and never persisted
  (`src/lib/api-keys.ts`).

### Input/output handling
- Video/file uploads are constrained by Supabase Storage bucket
  `file_size_limit` (500MB for source/generated video, 10MB for logos) and
  bucket-level RLS on `storage.objects`, not just client-side validation.
- No explicit HTML-sanitization layer was found for AI-generated script
  text rendered in the UI — {{TODO: confirm with a human whether any
  Gemini/user-edited script field is ever rendered as raw HTML anywhere, or
  if React's default escaping is relied on throughout}}.

### Rate limiting / abuse
- No rate limiting found on `/api/v1/*` or the analysis/generation routes —
  {{TODO: confirm with a human whether this is deliberately deferred or a
  gap to close before the public API is exposed to real third parties}}.

### Audit logging
- Every route handler and the client error boundary log failures to
  `error_logs` via `logError()` (`src/lib/errors.ts`), including scope,
  message, stack, and optional metadata — logging failures are swallowed so
  they never break the request.
- Credit spend/refund is self-auditing: every `spend_credits` call inserts a
  `credit_transactions` row with the resulting balance (append-only ledger).
- Admin actions (login success/failure/lockout, logout, credit and plan
  changes, contact status) write `admin_audit_log` with admin id and IP;
  visible at `/admin/activity` with the Dodo webhook delivery stream.

### Admin console (D-035)
- Separate identity from customers: `admin_users` (scrypt hashes, 5-failure
  15-min lockout), `admin_sessions` (sha256 of a random token; cookie is
  httpOnly, SameSite=Strict, Secure in prod, 8h), all three admin tables
  RLS-on with no policies and privileges revoked from anon/authenticated.
- Login: per-IP limit 5 / 15 min; unknown email and wrong password take the
  same path and return the same 401.
- Every admin page calls `requireAdminPage()`; every admin API calls
  `requireAdmin(req)`, which also rejects mutations whose Origin isn't this
  host. The middleware cookie check is a redirect convenience only.

## Standing findings

None tracked yet.

## Verification checklist (run before merging security-relevant changes)

1. New table holding user data → RLS enabled + an `auth.uid()`-scoped policy
   in the same migration.
2. New route touching user data → uses `requireUser()` or `requireApiKey()`,
   not a hand-rolled check.
3. Any use of `createAdminClient()` → confirm it's for API-key auth or
   logging only, not serving a specific user's data without an explicit
   manual scope filter.
4. Any credit balance change → goes through `spend_credits`, not a direct
   `update` on `profiles`.
   App code calls it only via `src/lib/credit-ledger.ts` (service-role client) with a `userId`
   taken from the session, never from request input. `0004_lock_down_spend_credits.sql`
   revokes EXECUTE from `anon`/`authenticated` (repeated in `0009`) — until one is applied
   live, the RPC is publicly callable (anyone can grant credits to any account). Still open
   as of 2026-10-25. `reset_credits`/`billing_sweep` (0005/0008) are service-role only.
5. New admin page/route → `requireAdminPage()` / `requireAdmin(req)` + `audit()` for
   any mutation.
6. New storage writes → path is `{user_id}/{project_id}/{filename}`, never
   caller-supplied verbatim.
