# Context Index

One line per file: what it owns, when to read it, when it was last true.

| File | Owns | Read when | Last verified |
|---|---|---|---|
| `session-handoff.md` | current session snapshot | every session | 2026-08-12 |
| `progress-tracker.md` | current phase, open questions, next steps | every session | 2026-08-12 |
| `learned-rules.md` | distilled permanent constraints | every session | 2026-08-12 |
| `project-overview.md` | product definition, goals, scope | scope/priority questions | 2026-08-01 |
| `decision-log.md` | still-active decisions with rationale | when touching an area listed below | 2026-08-12 |
| `architecture.md` | stack, boundaries, storage, invariants | touching system structure | 2026-08-12 |
| `ui-context.md` | design tokens, component conventions | touching UI | 2026-07-21 |
| `code-standards.md` | implementation conventions | writing/reviewing code | 2026-07-21 |
| `security-context.md` | threat model, hardening rules | touching auth/data/edge functions | 2026-07-21 |
| `ai-workflow-rules.md` | branching, scoping, delivery ritual | starting a new unit of work | 2026-07-21 |

## Active decision areas (keeps decision-log.md from being read every session)

- Rate limiting (D-007), duration/chaining scope (D-011), v1 API brand
  handling (D-012), brand-profile migration backfill (D-013), website-scan
  timing (D-014, superseded), brand-logo upload path (D-015),
  Settings→Profile route rename (D-017), profile-preference column
  removal (D-018), 15s credit-rate split (D-022), Contact Us as a real
  feature (D-023), Enterprise→Custom plan rename (D-024), 15s image
  grounding deliberately not restored (D-025) — see `decision-log.md`.
  (D-008 resolved and D-019/D-020/D-021 compacted to `learned-rules.md`
  R-039–R-042 as of 2026-08-11.)

## Compaction thresholds

- `decision-log.md` soft cap: 100 lines
- `progress-tracker.md` soft cap: 50 lines
- Anything moved out goes to `archive/YYYY-MM.md`, most recent archive linked here:
  {{TODO: link once archive exists}}
