# Architecture Context

<!-- Fill during bootstrap. Only document what a competent engineer
wouldn't guess — actual defaults for a given framework don't need
restating. This file is read on demand, not every session. -->

## Stack

| Layer | Technology | Role |
|---|---|---|
| {{Framework}} | {{tech}} | {{one line}} |
| {{Routing}} | {{tech}} | |
| {{UI components}} | {{tech}} | |
| {{Data fetching}} | {{tech}} | |
| {{Auth + DB}} | {{tech}} | |
| {{Hosting}} | {{tech}} | |
| {{Package manager}} | {{tech}} | |

## System boundaries

<!-- One entry per top-level directory/module that isn't self-explanatory
from its name. Skip anything a `ls` + file names already tells you. -->

- `{{path}}` — {{what lives here, what must NOT go here}}

## Storage model

- **{{primary store}}** — {{what data}}
- **{{blob/file store}}** — {{what data}}
- **{{cache/ephemeral}}** — {{ttl / eviction rule}}

## Auth and access model

- **Authentication** — {{method}}
- **Roles** — {{list roles and where enforced}}
- **Ownership/scoping rule** — {{e.g. "resource X scoped by Y, derived
  server-side from session, never trusted from client"}}

## Invariants

<!-- The rules that must never be violated regardless of what a PR is
trying to accomplish. Keep this list short — 5-12 items, not exhaustive
style guide. -->

1. {{invariant}}
2.
