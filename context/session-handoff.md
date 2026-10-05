<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-10-05_

## Status

Worked through client feedback items 5–15. Code changes are done on branch
`fix/client-feedback-round-2` (uncommitted — not asked to commit). Details and what is
verified vs. not are in `progress-tracker.md`; rules in `learned-rules.md` R-060–R-065.

Already satisfied before this session: 50-credit signup bonus (live in DB), landing pricing
section, landing "Any Viral Ad" headline, reclone copyright clause (section 24A), credit
top-up opening in a new tab so the generation page survives.

## Current branch

`fix/client-feedback-round-2`, uncommitted. New files: `src/lib/credit-ledger.ts`,
`supabase/migrations/0003_reclone_script_style.sql`, `0004_lock_down_spend_credits.sql`,
`.mcp.json` (project-scoped Supabase MCP server).

## Blockers

Three production actions need the account holder (see `progress-tracker.md` "Blocked on a
human"): apply 0003, deploy then apply 0004, deploy the two Edge Functions + webhook secret.
Applying migrations from the agent session was blocked by the permission classifier.

## Drift flagged

- `context/project-overview.md` still calls the product "Repurpose AI"; the app is "Adiy AI".
- `architecture.md`/`decision-log.md` describe Edge Functions as deployed — none are on the
  current project.
- `list_migrations` is empty on the live project although the schema is present (R-024 again).

## First action next session

Confirm the three production actions happened, then click-test: Recreated script, brand save
with a non-English filename, admin free generation, admin credit/plan controls, cancel.
