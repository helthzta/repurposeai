# Spec-Driven Context Template

A drop-in `context/` system for AI-assisted development. Designed to stay
cheap to read even as a project grows, by separating things that change
every session (hot), things that change per feature area (warm), and things
that are historical record only (cold, not loaded by default).

## How to install on a new project

1. Copy this whole folder into your repo root (`context/` + `CLAUDE.md`).
2. Open a chat with your AI assistant and paste the **Bootstrap Prompt**
   below. It will interview you and fill in every `{{PLACEHOLDER}}`.
   (If the project already has code, ask for the code-scan variant of
   this prompt — it generates `architecture.md`, `code-standards.md`,
   and `ui-context.md` from the actual repo instead of an interview.)
3. Delete this README (or keep it — it's not loaded by the ritual).

## Bootstrap Prompt (paste this into a fresh session)

> Read `CLAUDE.md` and every file in `context/`. They contain
> `{{PLACEHOLDER}}` tokens. Interview me with short, specific questions
> (stack, package manager, branch model, auth model, UI system, security
> posture, current phase) until you have enough to fill in every
> placeholder. Ask in batches, not one at a time. Once filled, the
> placeholders should be gone and every file should read as if
> hand-written for this specific project. Do not invent details you
> weren't given — leave a `{{TODO: confirm X}}` marker instead of
> guessing.

## File roles at a glance

| File | Loaded | Purpose |
|---|---|---|
| `context/INDEX.md` | always | routing table — what to read for what |
| `context/session-handoff.md` | always | current session snapshot, overwritten not appended |
| `context/progress-tracker.md` | always | current phase + next steps only, capped |
| `context/learned-rules.md` | always | distilled permanent constraints — this is what gets smarter over time |
| `context/project-overview.md` | on demand | product goals, scope, feature inventory — the one file that can't be generated from code |
| `context/decision-log.md` | on demand | still-active decisions only, capped |
| `context/architecture.md` | on demand | system structure |
| `context/ui-context.md` | on demand | design tokens/UI conventions (delete if no UI) |
| `context/code-standards.md` | on demand | implementation conventions |
| `context/security-context.md` | on demand | threat model + hardening rules |
| `context/ai-workflow-rules.md` | on demand | branching, scoping, delivery ritual |
| `context/archive/` | searched only | anything aged out of the files above |

The core idea: **hot files are load-bearing every session and stay small on
purpose. Warm files are complete but read selectively. Cold storage exists
so nothing is lost, but nothing is paid for unless asked for.**
