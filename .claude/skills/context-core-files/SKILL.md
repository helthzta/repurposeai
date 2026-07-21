---
name: context-core-files
description: Generates or refreshes only the four highest-judgment context files — project-overview.md, architecture.md, code-standards.md, and security-context.md — without running the full context-scaffold setup. Use when the user wants to (re)create just these core files, says things like "regenerate architecture and security-context," "just do the core context files," "update project-overview from the docs," "refresh the security context against the real schema," or wants a quick check of these files against the actual code/backend without touching session-handoff, progress-tracker, learned-rules, ui-context, or ai-workflow-rules. If the user wants the full context/ folder set up from scratch, prefer the context-scaffold skill instead — this one is the narrow, faster companion for just the four core files.
---

# Context Core Files

Generates or refreshes exactly four files: `project-overview.md`,
`architecture.md`, `code-standards.md`, `security-context.md`. These
are the highest-judgment files in a project's context — the ones every
later architectural or security decision gets checked against — so
this skill treats accuracy over completeness: a flagged gap is fine, a
confident wrong claim is not.

Use this instead of the full `context-scaffold` skill when the user
only wants these four files created, refreshed, or checked against the
current state of the code/backend — no need to also touch
`session-handoff.md`, `progress-tracker.md`, `learned-rules.md`,
`ui-context.md`, or `ai-workflow-rules.md`.

## Workflow

### Step 1 — Check what exists

Look for `context/project-overview.md`, `context/architecture.md`,
`context/code-standards.md`, `context/security-context.md` in the
target project.

- **None exist** → copy the four templates from `assets/template/`
  into `context/` first, then fill them in (Step 2).
- **Some or all exist** → treat this as a refresh, not a rewrite.
  Re-verify each existing claim against the current code/backend
  rather than assuming it's still accurate, and flag anything that's
  drifted (a claim the file makes that the code/schema no longer
  supports) instead of silently leaving it or silently overwriting it
  without telling the user what changed.

### Step 2 — Generate/refresh

Read `references/generate-core-files.md` and follow it. In short:

- `architecture.md` and `code-standards.md` — scan the actual codebase
  (package.json, config files, folder structure, representative
  files). Cite the file path behind every claim.
- `security-context.md` — scan code AND live backend state (e.g.
  Supabase via MCP tools: `list_tables`, `list_migrations`,
  `get_advisors`, if connected) — this file is the one most prone to
  describing an intention rather than a verified fact, so hold it to
  the highest evidence bar.
- `project-overview.md` — reconcile code/live state, `documents/`, and
  any scaffold-tool output folders like `lovable-build/`. Don't
  concatenate everything; synthesize, and flag disagreements between
  sources rather than silently picking one.

Never invent a plausible-sounding fact to fill a gap. Leave
`{{TODO: confirm with a human}}` instead.

### Step 3 — Report back

Tell the user, per file:
- Whether it was newly generated or refreshed from an existing version
- What changed, if it was a refresh (especially anything that used to
  be stated as true and no longer verifies)
- The full list of unresolved `{{TODO}}` markers

Do not bury or summarize away the TODO list — an unresolved placeholder
nobody knows about is worse than the file not existing, since a future
session may treat it as settled fact.

## Notes

- If the user only wants one of the four files (e.g. just
  `security-context.md`), do just that one — don't force all four.
- If backend access (e.g. Supabase MCP) isn't available in this
  session, say so explicitly rather than writing security claims that
  were never actually checked against the live schema.
