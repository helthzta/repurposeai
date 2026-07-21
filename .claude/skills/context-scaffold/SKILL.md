---
name: context-scaffold
description: Scaffolds a token-efficient, tiered context/ folder (project-overview.md, architecture.md, ui-context.md, code-standards.md, security-context.md, ai-workflow-rules.md, session-handoff.md, progress-tracker.md, learned-rules.md, INDEX.md, CLAUDE.md) for spec-driven AI-assisted development. Use whenever the user wants to set up, scaffold, bootstrap, or standardize a project's context/spec files for AI coding assistants — including "set up context for this project," "create a CLAUDE.md," "scaffold my context folder," "I need project-overview/architecture/code-standards files," "onboard this repo for AI-assisted dev," or "do the context restructuring" on a new codebase. Also trigger if the user has an existing but messy/growing set of context files (decision logs, progress trackers) and wants them restructured into a leaner, self-compacting system. Don't wait for every file to be requested by name — if they want AI working context for a project, this produces the whole set.
---

# Context Scaffold

Sets up a tiered `context/` folder for a project so that AI coding
sessions have accurate, token-efficient working context without the
user hand-writing every spec file or re-doing this per project.

The design principle: files split into **hot** (small, read every
session: current state, next steps, distilled rules), **warm**
(complete but read only when relevant: architecture, code standards, UI,
security), and **cold** (archived history, searched not loaded). See
`assets/template/README.md` for the full rationale if the user asks why
it's structured this way.

## Workflow

### Step 1 — Check what already exists

Look for an existing `context/` folder or `CLAUDE.md` in the target
project.

- **Nothing exists** → go to Step 2 (fresh scaffold).
- **An old-style flat context folder exists** (e.g. a large,
  ever-growing `progress-tracker.md` or `decision-log.md`, no
  hot/warm/cold split) → tell the user this looks like the older
  pattern, confirm they want it restructured (not just added
  alongside), then go to Step 2 using their existing files as source
  material for Step 3's generation instead of scanning from scratch.

### Step 2 — Copy the template

Copy every file from `assets/template/` into the target project root
(`CLAUDE.md` at root, everything else under `context/`). This gives the
full hot/warm/cold structure with `{{PLACEHOLDER}}` tokens, ready to be
filled in. Do not skip this step or hand-write these files from
scratch — the template already encodes the tiering, the caps, and the
end-of-session compaction ritual; freehand versions tend to drift from
that design.

### Step 3 — Fill in the project-specific files

Four files need real content: `project-overview.md`, `architecture.md`,
`code-standards.md`, `ui-context.md`. (`ui-context.md` can be deleted
entirely if the project has no UI surface — say so to the user rather
than filling it with placeholders.)

**If the project already has code:** read
`references/generate-from-code.md` and follow it. It covers scanning
the actual codebase for `architecture.md` / `code-standards.md` /
`ui-context.md`, and reconciling multiple sources (code, live backend
state, `documents/`, scaffold-tool output folders like
`lovable-build/`) for `project-overview.md` without just concatenating
whatever's longest. This is the default path for any real project —
don't interview for facts the code can already answer.

**If the project has no code yet, or for anything the code-scan
couldn't answer:** ask the user directly, in batches of a few questions
at a time, not one at a time. Typical gaps: product goals/scope (never
in code), branch model naming preference, package manager, any
non-obvious team convention.

Never invent a plausible-sounding fact to fill a placeholder. Leave
`{{TODO: confirm with a human}}` instead, and surface the list of open
TODOs to the user at the end rather than burying them.

### Step 4 — Wire up the routing files

Fill in the `{{DATE}}` fields in `context/INDEX.md` with today's date,
and confirm `context/session-handoff.md` and `context/progress-tracker.md`
reflect the project's actual current state (even if that's just
"project just scaffolded, no work done yet") rather than leaving the
raw template skeleton in place.

### Step 5 — Report back

Tell the user:
- Which files were generated from code vs. which need their input
- The full list of unresolved `{{TODO}}` markers, grouped by file
- A one-line reminder: these files become the standing spec every
  future session checks against, so it's worth resolving the TODOs
  before relying on them for real work

Do not silently leave TODOs unmentioned — an unresolved placeholder
that nobody knows about is worse than not having the file at all,
since a future session may treat it as ground truth.

## After scaffolding: how this gets used going forward

Once this skill has run, the user does *not* need to re-run it every
session. `CLAUDE.md` (copied to the project root) tells any future
Claude session the reading order and the end-of-session compaction
ritual on its own. This skill's job is one-time setup, not an
every-session dependency — only re-trigger it if the user explicitly
wants to re-scaffold, restructure an existing mess, or add a file
that's missing.

## Notes

- Never fabricate detail to avoid asking the user a question — a
  flagged gap is recoverable, a confidently wrong architecture claim
  is not, since it becomes the thing every later decision gets checked
  against.
- If the user only wants one file (e.g. just `project-overview.md`)
  rather than the full scaffold, it's fine to do just that — don't
  force the whole template on someone who asked for one file.
- If the user only wants the four highest-judgment files —
  `project-overview.md`, `architecture.md`, `code-standards.md`,
  `security-context.md` — without the rest of the scaffold (hot files,
  `ui-context.md`, `ai-workflow-rules.md`), prefer the narrower
  `context-core-files` companion skill instead of running this full
  workflow.
