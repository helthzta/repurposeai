# Archived migrations

These 29 files (`0001_profiles.sql` … `0029_billing_cron.sql`) are the
incremental history that built up the schema now consolidated into
`supabase/migrations/0001_baseline.sql`. They are **not applied by any
tooling** — this directory isn't scanned by the Supabase CLI/MCP (migration
files are only picked up from the top level of `supabase/migrations/`), kept
here purely for git-blame/"why does this column exist" archaeology.

Do not run these against a project that already has `0001_baseline.sql`
applied — most of them would fail outright (tables/columns already exist),
and a few no longer match the live schema at all (e.g. `0012`/`0017` were
superseded by later files in this same list — that's the migration-history
drift `context/learned-rules.md` R-024/R-045 warn about, which is part of
why this got consolidated into one file rather than kept growing).

Going forward: schema changes are new, numbered files back at the top level
(`0002_whatever.sql`, `0003_...`), same convention as before — this
consolidation is a one-time reset of the starting point, not a new rule
about how migrations work day to day.
