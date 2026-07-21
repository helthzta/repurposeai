# Generating project-specific files from an existing codebase

Use this reference when the target project already has code. It covers
how to fill `architecture.md`, `code-standards.md`, `ui-context.md`, and
`project-overview.md` by analysis rather than by interview.

## architecture.md, code-standards.md, ui-context.md — scan the code

Read: `package.json`, `tsconfig`, tailwind/theme config, ESLint/prettier
config, the folder structure, and 5-10 representative existing files (a
page, a component, a service/API call, a test if one exists).

Do not ask the user questions before drafting. Fill in:

1. **architecture.md** — stack table (cite actual package.json
   versions), folder-by-folder purpose (only note folders whose purpose
   isn't obvious from name + contents), storage model, auth pattern,
   and any invariant with EVIDENCE in the code (e.g. "every table has
   RLS" only if a migration file actually shows that pattern held).

2. **code-standards.md** — infer from what the code actually does, not
   generic best practice. If a linter enforces something, cite the
   config. If files consistently follow a naming/structural pattern,
   state it as convention. No evidence → leave
   `{{TODO: confirm — no evidence found for X}}`.

3. **ui-context.md** — extract actual design tokens (colors, spacing,
   radius, typography) from the theme/tailwind/tokens file. Cite token
   names verbatim. Don't invent a design philosophy that wasn't stated.

## project-overview.md — reconcile multiple sources, don't just concatenate

This file can't be generated from code alone (goals/scope aren't in the
codebase). Check, in order of how much to trust them:

1. **The actual code and live backend state** (e.g. Supabase via MCP
   tools if connected: `list_tables`, `list_migrations`,
   `get_advisors`) — strongest evidence, wins any conflict.
2. **`documents/`** — plans, audits, historical notes. Supplementary
   only. May describe abandoned approaches or stale state — don't
   inherit a claim from here unless the current code/backend actually
   reflects it.
3. **`lovable-build/documentation/` and `lovable-build/mds/`** (or
   equivalent scaffold-tool output directories) — likely useful for
   original intent, but the codebase may have since diverged. Same
   rule: verify before trusting.

Do NOT treat any single source as authoritative by default and do NOT
dump every document's contents in — synthesize, don't concatenate. When
sources disagree, say so explicitly and pick the one with the strongest
evidence (running code and live schema outrank stale docs; a recently
dated doc outranks a clearly aged one). If two sources conflict and it
can't be resolved from evidence, flag it in the file rather than
silently picking one.

A goal or feature described in a planning doc that was never actually
built should be written as "planned, not implemented" — never stated as
if it exists just because a document says so.

Fill in `project-overview.md`'s sections (overview, goals, core user
flow, features, scope, success criteria) citing which source (file
path, doc name, or Supabase query) justifies each claim.

## Universal rule for this whole pass

For every claim in every generated file, note what justifies it — a
file path, a query result, or a specific document. Anything that can't
be verified: mark `{{TODO: confirm with a human}}` rather than
guessing or inheriting an unverified claim. These files become the
standing spec everything else gets checked against — a wrong guess
baked in now is more expensive to catch later than a flagged gap is to
resolve with the user.

After drafting, tell the user what got flagged and ask them to resolve
the `{{TODO}}` markers before treating the files as final.
