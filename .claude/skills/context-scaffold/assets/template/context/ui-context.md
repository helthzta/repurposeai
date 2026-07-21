# UI Context

<!-- Delete this file if the project has no UI surface. Fill during
bootstrap. Only lock in rules that would otherwise drift — a link to the
real design system doc is often enough; this file is the "must-follow at
the call site" summary, not the full spec. -->

## Theme

{{light/dark, brand personality in 3 words, anti-references}}

## Tokens

- **Colour** — {{where tokens live, e.g. tailwind.config.ts}}. Never
  hardcode hex. {{list any never-use / interactive-only colour rules}}
- **Typography** — {{scale name/location}}. {{any lockdown rule, e.g.
  "display font used once per page, H1 only"}}
- **Spacing** — {{base unit and allowed steps}}
- **Radius / shadow** — {{token names and what maps to what}}

## Component library

{{library name, e.g. shadcn/ui}}. {{rule about never hand-rolling a
primitive that already exists}}.

## Layout patterns

<!-- Only patterns that recur and aren't obvious from the component
library defaults. -->

- {{pattern}}

## Component debt / open items

{{link to a tracking doc if one exists, or "None yet."}}
