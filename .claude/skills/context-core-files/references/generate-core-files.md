# Generating the 4 core context files

Covers `architecture.md`, `code-standards.md`, `security-context.md`
(scan-based — the code and live backend are ground truth) and
`project-overview.md` (reconciliation-based — goals aren't in the code).

## architecture.md, code-standards.md — scan the code

Read: `package.json`, `tsconfig`, ESLint/prettier config, the folder
structure, and 5-10 representative existing files (a page, a component,
a service/API call, a test if one exists).

- **architecture.md** — stack table (cite actual package.json
  versions), folder-by-folder purpose (only note folders whose purpose
  isn't obvious from name + contents), storage model, auth pattern, and
  any invariant with EVIDENCE in the code. Only state an invariant
  ("every table has RLS") if a migration file actually shows the
  pattern held consistently.
- **code-standards.md** — infer from what the code actually does, not
  generic best practice. If a linter enforces something, cite the
  config. If files consistently follow a pattern, state it as
  convention. No evidence found → leave
  `{{TODO: confirm — no evidence found for X}}`.

## security-context.md — scan code AND live backend state, don't just describe intentions

This file is the one most likely to drift from reality if generated
from code alone — a comment saying "we validate this" isn't the same
as it actually being enforced. Check, in this order:

1. **Live backend state, if reachable** (e.g. Supabase via MCP tools:
   `list_tables`, `list_migrations`, `get_advisors`) — this is the
   strongest evidence for RLS coverage, table-level access rules, and
   any advisor-flagged security gaps. If connected, always check this
   before writing a claim about data access rules.
2. **Actual edge function / API route code** — check for real
   Authorization/CSRF header validation, actual CORS config values (not
   just "should restrict CORS" comments), actual input validation
   (Zod schemas or equivalent) at the boundary.
3. **Existing security docs/audits** (e.g. `documents/SECURITY_*.md`
   if present) — useful for known findings and severity, but verify
   each one is still open by checking the current code/schema, not by
   trusting the doc's last-known status.

Fill in:
- **Threat model** — the 3-6 realistic breach scenarios for this
  specific data model (cross-tenant leakage, role escalation, etc.),
  not a generic checklist.
- **Defence-in-depth rules** — only rules you can point to evidence
  for as currently true, or currently false and worth flagging as an
  open finding.
- **Standing findings table** — only include if there's an actual
  known-open issue (from an existing audit doc verified against
  current code, or a gap `get_advisors` surfaces). Don't invent
  findings to fill the table.

If backend access isn't available in this session, say so explicitly
in the file rather than silently writing security claims that were
never checked against the live schema.

## project-overview.md — reconcile multiple sources, don't just concatenate

This file can't be generated from code alone. Check, in order of trust:

1. **Code and live backend state** — what's actually built and
   enabled, strongest evidence.
2. **`documents/`** — plans, audits, historical notes. Supplementary
   only; may describe abandoned approaches.
3. **`lovable-build/documentation/` and `lovable-build/mds/`** (or
   equivalent scaffold-tool output) — useful for original intent, but
   may have since diverged from the actual build.

Do not treat any single source as authoritative by default, and do not
dump every document's contents in — synthesize, don't concatenate. When
sources disagree, say so explicitly and pick the strongest evidence
(running code/live schema outrank stale docs; a recently dated doc
outranks a clearly aged one). A goal or feature described in a planning
doc that was never actually built goes in as "planned, not
implemented" — never stated as if it already exists.

## Universal rule

For every claim in every file, note what justifies it — a file path, a
query result, or a specific document. Anything unverifiable: mark
`{{TODO: confirm with a human}}` rather than guessing. These four files
carry the most judgment of anything in `context/` — a wrong guess here
is the most expensive kind to leave unflagged, since every later
decision gets checked against them. Report the full list of TODOs to
the user at the end rather than burying them.
