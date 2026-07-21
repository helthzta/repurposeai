# Code Standards

<!-- Fill during bootstrap. Document deviations from framework defaults,
not the defaults themselves. If your stack's idiomatic style already
implies a rule, leave it out. -->

## General

- Fix root causes, don't layer workarounds.
- Don't validate/handle errors for scenarios that can't happen; validate
  only at system boundaries ({{list what counts as a boundary here}}).
- Comment only when the **why** is non-obvious.

## Language / type system

- {{strict mode, no `any` equivalent, etc.}}
- Validate every unknown external input via {{validation library}}.

## File-size / structure rules

- Hard cap: {{N}} lines per file. {{grandfather policy if any}}.
- {{One responsibility per module/component rule}}

## Styling

{{link to ui-context.md if applicable; any rule about no hardcoded values}}

## API / data access rules

- {{where DB/API calls are allowed to live vs. not}}
- {{ownership/scoping rule that must be enforced in code, not just in
  the database}}

## File organization

- `{{path}}` — {{purpose}}

## Naming conventions

- {{pattern}} for {{thing}}

## Verification

- `{{command}}` — {{what it checks}}
- Required to pass before considering a unit done: `{{full check command}}`

## Package management

{{package manager}} only. {{lockfile rule}}
