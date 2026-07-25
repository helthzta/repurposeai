<!-- This file is the project's compressed judgment. Every entry should be
a rule or heuristic that would change what a future session does — not a
story. One line each: constraint + why, in under ~20 words if possible.
No status field needed here — if it's here, it's active. If it stops being
true, delete it or move it to archive with a note of what replaced it. -->

_Last updated: 2026-07-25_

## Rules learned so far

<!-- Format:
R-001 · <rule> · <why, ≤10 words>
-->
R-001 · When a `VideoProvider`'s output URL needs auth to fetch, return it via `PollResult.outputHeaders`, not by baking creds into the URL · `mirrorToStorage` threads headers through; keeps provider swaps to one file.
R-002 · Never mirror an intermediate/non-deliverable asset into `generated-videos` under the user's own path · that bucket's RLS lets the owner read anything under their prefix directly, not just app-linked files — re-fetch from the provider instead.
R-003 · A provider's single-call duration cap belongs on `VideoProvider.maxClipDurationSeconds`, not hardcoded in `generation.ts` · keeps chaining logic provider-agnostic per architecture invariant #5.
R-004 · When a user's shorthand product note lists fields/config to change, check what's read downstream before dropping anything not mentioned · shorthand notes are rarely exhaustive; ask (see D-002) rather than silently breaking a dependent feature.
R-005 · Prefer removing a DB column's *usage* over a destructive migration when a table might hold real user rows · `brand_profiles.tone`/`cta` left in schema, unused, rather than dropped (D-001).
