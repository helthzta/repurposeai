# Repurpose AI — AI Working Context

## Reading order (tiered — don't load everything every time)

**Hot — read every session, always small:**
1. `context/INDEX.md` — routing table, read this first
2. `context/session-handoff.md` — current state
3. `context/progress-tracker.md` — current phase, next steps
4. `context/learned-rules.md` — distilled constraints from past sessions

**Warm — read only the ones relevant to the work at hand:**
- `context/project-overview.md` — unclear whether a feature is in scope,
  or a decision needs to be checked against product goals
- `context/architecture.md` — touching system structure, storage, or boundaries
- `context/ui-context.md` — touching UI/design
- `context/code-standards.md` — writing or reviewing code
- `context/security-context.md` — touching auth, edge functions, or user data
- `context/ai-workflow-rules.md` — branching, scoping, or delivery questions
- `context/decision-log.md` — only if the task touches an area with an
  active logged decision (check `INDEX.md`)

**Cold — never loaded proactively, only searched when a "why did we do
this" question comes up:**
- `context/archive/*`

Never infer or invent product/architecture behaviour that isn't defined in
these files. If a requirement is missing, add it as an open question in
`progress-tracker.md` rather than guessing.

## Keeping context in sync (during work)

- Update `progress-tracker.md` after every meaningful change.
- If implementation changes architecture, UI rules, code standards, or
  scope, update the relevant context file **before** continuing.
- Log a new decision in `decision-log.md` only if it's non-obvious and
  could be second-guessed later. Give it a stable ID (`D-001`, `D-002`, ...).

## End-of-session ritual (run every time, in order)

1. **Compact before you snapshot.** For each entry in `decision-log.md`:
   - If it's stable and unlikely to be revisited → rewrite it as one line
     in `learned-rules.md` (rule + why, no narrative) and delete it here.
   - If it's been superseded → mark `SUPERSEDED by D-00X` and delete once
     the superseding entry is itself stable.
   - If it's still live and contestable → leave it, status `ACTIVE`.
2. **Prune the tracker.** Delete completed items older than this session
   (git history is the record). Keep only current phase + next steps.
3. **Check the caps.** `decision-log.md` > ~100 lines or
   `progress-tracker.md` > ~50 lines → move the oldest material into
   `context/archive/YYYY-MM.md` before writing anything new.
4. **Overwrite `session-handoff.md` entirely** (never append) using its
   own template fields.
5. **Flag drift.** If anything in a warm context file no longer matches
   the actual code, say so explicitly rather than silently working around
   it — the file is wrong and needs a human decision, not a workaround.

## Definition of done for a unit of work

1. Verified end to end within its declared scope, including unhappy paths.
2. No invariant in `architecture.md` violated.
3. No regression against anything in `security-context.md`.
4. `progress-tracker.md` reflects the completed work and next step.
5. The project's standard verification command passes (see
   `code-standards.md` for what that is on this project).
