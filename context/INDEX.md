# Context Index

One line per file: what it owns, when to read it, when it was last true.

| File | Owns | Read when | Last verified |
|---|---|---|---|
| `session-handoff.md` | current session snapshot | every session | 2026-08-13 |
| `progress-tracker.md` | current phase, open questions, next steps | every session | 2026-08-13 |
| `learned-rules.md` | distilled permanent constraints | every session | 2026-08-13 |
| `project-overview.md` | product definition, goals, scope | scope/priority questions | 2026-08-01 |
| `decision-log.md` | still-active decisions with rationale | when touching an area listed below | 2026-08-13 |
| `architecture.md` | stack, boundaries, storage, invariants | touching system structure | 2026-08-13 |
| `ui-context.md` | design tokens, component conventions | touching UI | 2026-07-21 |
| `code-standards.md` | implementation conventions | writing/reviewing code | 2026-07-21 |
| `security-context.md` | threat model, hardening rules | touching auth/data/edge functions | 2026-07-21 |
| `ai-workflow-rules.md` | branching, scoping, delivery ritual | starting a new unit of work | 2026-07-21 |

## Active decision areas (keeps decision-log.md from being read every session)

- Rate limiting (D-007), 15s credit-rate split (D-022), Contact Us as a
  real feature (D-023), Enterprise→Custom plan rename (D-024), 15s image
  grounding deliberately not restored (D-025), Dodo one-time-payment
  billing model (D-026), `'free'` plan value + backfill (D-027), `profiles`
  column-grant security fix (D-028), billing as Supabase Edge Functions
  (D-029), Visual Quality labels vs. real resolution (D-030), migrations
  consolidated to one file (D-031) — see `decision-log.md`. (D-008 resolved
  and D-010/D-019/D-020/D-021 compacted to `learned-rules.md`
  R-039–R-042/R-047 as of 2026-08-13.)

## Compaction thresholds

- `decision-log.md` soft cap: 100 lines
- `progress-tracker.md` soft cap: 50 lines
- Anything moved out goes to `archive/YYYY-MM.md`, most recent archive linked here:
  {{TODO: link once archive exists}}
