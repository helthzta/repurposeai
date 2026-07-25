<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-07-21_

## Format

`D-0XX · <date> · <one-line decision> · STATUS`
`  Why: <reason, ≤15 words>`
`  Rejected: <alternative considered and why not, if relevant>`

Status is one of: `ACTIVE` / `SUPERSEDED by D-0YY` / `PROMOTED to <file>`.
Anything not `ACTIVE` is deletable on sight — no need to re-read it first.

## Decisions

<!-- Example:
D-001 · {{DATE}} · Use X over Y for Z · ACTIVE
  Why: simpler, no query overhead
  Rejected: Y — overkill for this case
-->

D-001 · 2026-07-25 · Remove manual Tone/CTA input from Upload step; both auto-derived every time · ACTIVE
  Why: user wants zero manual config where the analyzed video already implies the answer
  Rejected: optional override (blank = auto) — user explicitly chose full automation over flexibility

D-002 · 2026-07-25 · Fully replace `video_analyses` fields per user's viral-framing list, except keep `tone_of_voice` and `visual_style` · ACTIVE
  Why: those two are load-bearing for D-001 (auto-tone) and D-004 (Original camera style); dropping them would silently break both
  Rejected: literal full replace (drop everything not in the note) — note was shorthand, not exhaustive; would break existing features

D-003 · 2026-07-25 · New Ideas step (3 short concepts → pick one → 1 full script) replaces "3 full scripts, pick one" in the dashboard UI only · ACTIVE
  Why: user explicitly wants "mini 3" before committing to a full script — cheaper/faster iteration
  Rejected: renaming existing 3-script flow — user confirmed they want a real new step, not just relabeling

D-004 · 2026-07-25 · "Original" camera style pulls the analyzed video's `visual_style` text into the video-gen prompt, default-selected · ACTIVE
  Why: matches "like uploaded Original camera style"; visual_style was already captured and unused
  Rejected: generic "match the original" instruction with no real data — visual_style already exists, using it is strictly better
