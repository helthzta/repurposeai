<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-10-05_

## Current phase

Client feedback round 2 (items 5–15), on branch `fix/client-feedback-round-2`, uncommitted.
Code-complete for: Adiy AI rename, viral-ad wording, reclone script + idea-card order/labels,
admin free generations + admin credit/plan controls, cancel-route audit row, upload filename
sanitizing + brand-dialog error handling, video-prompt hand/voice rules, landing demo-ads
placeholders + mobile admin link, credit ledger moved to service-role (R-060–R-064).

Verified: `tsc --noEmit` 0 errors; `npm run lint` 1 error (generated `next-env.d.ts`, pre-existing);
public pages + unauthenticated API responses smoke-tested on a dev server. **Not** verified:
any signed-in flow (generation, brand save, admin controls, checkout, cancel).

## Blocked on a human

1. Apply `0003_reclone_script_style.sql` to the live DB — until then, writing a Recreated
   script fails on the `scripts_style_check` constraint.
2. Deploy this branch, THEN apply `0004_lock_down_spend_credits.sql` (order matters — older
   builds call the RPC with the user's client). Until applied, anyone can grant credits.
3. Deploy `dodo-webhook` + `expire-subscriptions` to project `xvtkjkvxjxsbeispjlrh`, set
   `DODO_PAYMENTS_WEBHOOK_KEY`, check the cron job's URL (R-065). Payments cannot work before this.

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
