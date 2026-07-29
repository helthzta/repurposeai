<!-- This file is the project's compressed judgment. Every entry should be
a rule or heuristic that would change what a future session does — not a
story. One line each: constraint + why, in under ~20 words if possible.
No status field needed here — if it's here, it's active. If it stops being
true, delete it or move it to archive with a note of what replaced it. -->

_Last updated: 2026-07-29 (later session)_

## Rules learned so far

<!-- Format:
R-001 · <rule> · <why, ≤10 words>
-->
R-001 · When a `VideoProvider`'s output URL needs auth to fetch, return it via `PollResult.outputHeaders`, not by baking creds into the URL · `mirrorToStorage` threads headers through; keeps provider swaps to one file.
R-002 · Never mirror an intermediate/non-deliverable asset into `generated-videos` under the user's own path · that bucket's RLS lets the owner read anything under their prefix directly, not just app-linked files — re-fetch from the provider instead.
R-003 · A provider's single-call duration cap belongs on `VideoProvider.maxClipDurationSeconds`, not hardcoded in `generation.ts` · keeps chaining logic provider-agnostic per architecture invariant #5.
R-004 · When a user's shorthand product note lists fields/config to change, check what's read downstream before dropping anything not mentioned · shorthand notes are rarely exhaustive; ask (see D-002) rather than silently breaking a dependent feature.
R-005 · Prefer removing a DB column's *usage* over a destructive migration when a table might hold real user rows · `brand_profiles.tone`/`cta` left in schema, unused, rather than dropped (D-001).
R-006 · Tone and CTA are always AI-derived from the analyzed video, never manual input · user wants zero config, video already implies the answer.
R-007 · Keep any `video_analyses`/`brand_profiles` field a shipped feature depends on, even if a rewrite note omits it · shorthand notes aren't exhaustive; dropping breaks dependents silently.
R-008 · The Ideas-step (concepts → pick → script) flow only replaces the dashboard UI, not `generateScripts` used by the public v1 API · v1 runs synchronously with no human to pick an idea.
R-009 · "Original" camera style passes the analyzed `visual_style` text directly into the video-gen prompt · reuses captured-but-unused data over a generic instruction.
R-010 · `withLogger()` applies a baseline per-IP rate limit to every route by default; pass a tighter `{ rateLimit }` option for AI-calling/costly endpoints · keeps rate limiting enforceable in one place instead of per-file.
R-011 · Admin cross-user queries must go through `requireAdmin()` (checks the caller's own `is_admin` via the RLS-scoped client, only then hands back the service-role client) · never let a non-admin session query other users' rows directly.
R-012 · "Credits spent" in the admin dashboard sums `generations.credits_charged` for `completed` generations only, not `credit_transactions` net of refunds · simple and accurate for completed jobs; revisit if precise net-spend accounting matters later.
R-013 · Website scanning (`fetchWebsiteText`) is best-effort and non-blocking — never throws, returns `null` on any failure · a dead/slow brand site must never block project creation.
R-014 · Video-link ingestion (`/api/uploads/from-link`) uploads via the RLS-scoped session client, not the admin client · the path is under the user's own prefix, same ownership model as a normal file upload — no need for service-role here.
