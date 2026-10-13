<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-10-05_

## Current phase

Client feedback round 2 (items 5–15), merged to `main` (PR #1); production rollout in progress.
Code-complete for: Adiy AI rename, viral-ad wording, reclone script + idea-card order/labels,
admin free generations + admin credit/plan controls, cancel-route audit row, upload filename
sanitizing + brand-dialog error handling, video-prompt hand/voice rules, landing demo-ads
placeholders + mobile admin link, credit ledger moved to service-role (R-060–R-064).

Verified: `tsc --noEmit` 0 errors; `npm run lint` 1 error (generated `next-env.d.ts`, pre-existing);
public pages + unauthenticated API responses smoke-tested on a dev server. **Not** verified:
any signed-in flow (generation, brand save, admin controls, checkout, cancel).

2026-10-13: every Gemini `generateContent` call now goes through `generate()` in
`src/lib/ai/gemini.ts`, which on a 503 UNAVAILABLE (model overloaded) retries `GEMINI_MODEL` once, then falls through
to `gemini-3.7-flash` and `gemini-3.5-flash-lite`. Default model is now `gemini-3.8-flash`
(`gemini-2.5-flash` 404s on this key). `tsc`/eslint clean; fallback path not yet seen firing live.

2026-10-13: Visual Quality picker is now 480p / 720p / HD 1080p (`standard`/`high`/`ultra`, D-030
updated); labels + picker only, no provider/rate/schema change. `tsc` clean, lint unchanged (1
pre-existing error). Not click-tested signed-in. Native 30s re-confirmed against OpenRouter's
`/api/v1/videos/models` (2.5: 4–30s); no clip-merging code is left in `src/`. 15s HD 1080p now
routes to `bytedance/seedance-2.0` at real 1080p (30s HD 1080p still 720p) — no live render run,
and `CREDIT_RATE_15S.ultra` (0.6) was not repriced for the costlier model: needs a number.

## Blocked on a human

Done 2026-10-06 (verified live): `0003` applied; `dodo-webhook` deployed (`verify_jwt: false`);
`DODO_PAYMENTS_WEBHOOK_KEY` secret set.

0. Redeploy `dodo-webhook` from the repo — the live version 500s on every request (SDK
   constructor throws without a `bearerToken`); fixed in `supabase/functions/dodo-webhook/index.ts`,
   uncommitted, redeploy denied to the agent. Expect 401 "Invalid signature" on an unsigned POST.

1. Apply `0004_lock_down_spend_credits.sql` — agent's attempt was denied by the permission
   classifier. Production must be on the merged main build first (older builds call the RPC
   with the user's client). Until applied, anyone can grant credits (`anon` can still execute).
2. Deploy `expire-subscriptions` (`verify_jwt: true`) — also denied to the agent. Then repoint
   the `expire-subscriptions` cron job: it still posts to `xxitlqjgmfqxesqiuouk` with that
   project's anon key (R-065).
3. Set Edge Function secrets `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_STARTER_PRODUCT_ID`,
   `DODO_PRO_PRODUCT_ID`, and register
   `https://xvtkjkvxjxsbeispjlrh.supabase.co/functions/v1/dodo-webhook` in the Dodo dashboard
   (`payment.succeeded`). Payments cannot work before this.

## Open questions

- Client asked for cancel on "monthly and yearly" plans — no yearly plan exists. Build one?
- "Around 10 polish items" — no list was provided.
- Idea-card labels: implemented as "Recreated" (first) / "Repurposed — …" with a small
  "Regenerates" tag on cards 2–3; client's literal wording for those was "Regenerate".
- HM Mollah's missing generations: consistent with the move to a new Supabase project; old
  data would be in `xxitlqjgmfqxesqiuouk` if it still exists.
- Demo ad videos and video-costing numbers still to come from the client (pricing untouched).

## Next steps

1. Get the three "Blocked on a human" items done, then click-test signed-in flows.
2. Run one Dodo test-mode payment end to end.
3. Drop real demo videos into `demoAds` in `src/app/page.tsx`.
