<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-07-21_

## Current phase

Core pipeline (upload → analyze → script → generate → result), auth,
credits, API keys, and error logging are implemented per recent commits
(`b460195`, `338d32a`, `12d00d5`); `MOCK_PROVIDERS=false` locally, meaning
real Seedance credentials appear to be configured already. Payment/billing
is explicitly not built (by design, per `SETUP.md`).

## In progress

- context/ scaffold just created — no other work in flight.

## Open questions

- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Which package manager is canonical — npm (`package-lock.json`) or bun
  (`bunfig.toml`)? Both are present. (`code-standards.md`)
- Is there a deploy target/hosting provider yet? Nothing found in repo.
  (`architecture.md`)
- Should `Profile.plan` (`starter`/`pro`/`enterprise`) gate any feature yet,
  or is it unused for now? (`architecture.md`)
- Are tests planned? No test runner/config exists yet. (`code-standards.md`)
- Is rate limiting on `/api/v1/*` deliberately deferred? (`security-context.md`)
- Branch model / delivery workflow — only `main` exists so far; no
  feature-branch convention has been established yet. (`ai-workflow-rules.md`)

## Next steps (max ~5)

1. Resolve the open questions above with the project owner.
2. Decide on a hosting target and add it to `architecture.md`.
3. Decide package manager and remove the unused lockfile/config.
