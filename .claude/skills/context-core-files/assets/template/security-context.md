# Security Context

<!-- Fill during bootstrap. This is the live ruleset; a separate historical
audit doc (if one exists) can be linked here rather than duplicated. -->

## Threat model

<!-- The 3-6 breach scenarios that would actually hurt, ranked. -->

1. {{scenario}} — {{why it matters}}

## Defence-in-depth rules

### Identity & access
- {{auth check requirement on privileged operations}}
- {{ownership/scope check must happen server-side, not trusted from client}}

### Data exposure
- {{secrets-in-code rule}}
- {{row-level security or equivalent rule}}

### Input/output handling
- {{XSS / injection prevention rule for this stack}}

### Rate limiting / abuse
- {{what needs explicit rate limiting}}

### Audit logging
- {{what privileged operations must be logged, and where}}

## Standing findings

<!-- Only if there's an active security backlog. Otherwise delete this
section. Mirror status here; full detail can live in a separate audit doc. -->

| # | Finding | Severity | Status |
|---|---|---|---|
| {{1}} | {{finding}} | {{sev}} | {{status}} |

## Verification checklist (run before merging security-relevant changes)

1. {{check}}
