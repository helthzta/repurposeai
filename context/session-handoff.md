<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-12_

## Status

Implemented a 4-part feature-update spec end to end: video model routing
(15s → seedance-2.0-fast, 30s → seedance-2.5, `src/lib/providers/
seedance.ts`), Hinglish added as a 4th script language, the payment plans
replaced (Starter 350cr/$19, Pro 700cr/$39, Custom no-price/"Contact Us"),
and three legal links added to the dashboard Help section. Full detail in
`progress-tracker.md`'s "Current phase" — this file is the short version.

Two things came up mid-task that expanded scope beyond the spec as written,
both resolved via `AskUserQuestion` before building:

1. **15s credit cost** — OpenRouter charges ~2.5x more per second for
   seedance-2.5 than 2.0-fast. User chose to lower the 15s credit rate to
   reflect that (D-022) rather than leave it flat.
2. **Custom plan's "Contact Us"** — no contact page or support email existed
   anywhere in the codebase. User asked for a real feature, not a
   placeholder: a `contact_submissions` table, a public `/contact` page,
   and an admin-dashboard section to view/manage submissions (D-023). Built
   all three (migrations `0026`/`0027`, `/api/contact`, `/api/admin/
   contact-submissions[/[id]]`, `/contact` page, admin UI section).

**Flagged rather than silently done**: no Razorpay/payment-gateway
integration exists anywhere in this codebase (`SETUP.md` confirms this is
"not included by design") — the spec's Starter/Pro "checkout charges $X"
acceptance criteria can't be met yet; Starter/Pro buttons stay informational
(point to `/contact`). Also flagged, not changed: 2.0-fast supports real
image-conditioned logo grounding (`input_references`) that 2.5 doesn't, but
15s clips don't use it yet — left as an inline code comment + open question
(D-025), out of this task's stated scope.

## Current branch

`main`, working tree has this session's changes uncommitted (not asked to
commit) — 8 modified files, 6 new (2 migrations, `/api/contact`, `/api/
admin/contact-submissions[/[id]]`, `/contact` page + client, `ContactForm`
component). Migrations `0026_contact_submissions` and
`0027_rename_enterprise_plan_to_custom` are already applied live via
Supabase MCP against project `xxitlqjgmfqxesqiuouk` — don't re-apply them,
just get the local `.sql` files committed alongside the code that depends
on them.

`npm run lint`: clean, 0 errors from this session (pre-existing warnings
elsewhere untouched). `tsc --noEmit`: same pre-existing `.next`-cache-stale
errors as `main` before this session (confirmed via `git stash` A/B test),
nothing new from this session's files.

## Half-done / needs manual follow-up

- **Nothing in this session was click-tested in a real browser** — all
  verification was code review + lint/tsc + live DB queries via Supabase
  MCP. See progress-tracker's "Next steps" for the specific things to
  click through first.
- Carried over, still unverified: Language/Subtitles controls in the
  Script step (from 2026-08-04) — now also relevant to Hinglish
  specifically, since that's untested live (Gemini quota caution, R-034).
- Carried over: a real Seedance generation's FINAL FRAME against a real
  logo (D-020, code+API verified only).

## First action next session

1. Click through this session's new/changed UI live: `/contact` (direct and
   `?plan=Custom`), Help's three legal links, Credits page's three plan
   cards, admin dashboard's Contact submissions table.
2. Run one real 15s generation, confirm the OpenRouter job actually used
   `bytedance/seedance-2.0-fast` (not just code review).
3. Generate a Hinglish script and eyeball it for genuine code-mixing.
4. Resolve hosting target (D-007) — still open.

## Blockers

None.
