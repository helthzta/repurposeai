# Code Standards

<!-- Generated from eslint.config.js, .prettierrc, tsconfig.json, and observed
patterns in src/lib and src/app/api. -->

## General

- Fix root causes, don't layer workarounds.
- Don't validate/handle errors for scenarios that can't happen; validate only
  at system boundaries (route handler request bodies, external API
  responses, provider/webhook payloads).
- Comment only when the why is non-obvious. Several existing files use a
  `// ponytail: <shortcut> <upgrade path>` convention for deliberate
  simplifications (e.g. `src/lib/credits.ts`) — follow that pattern if
  adding another one, don't invent a different marker.

## Language / type system

- `strict: true`, no relaxed compiler flags beyond
  `noUnusedLocals`/`noUnusedParameters: false` (`tsconfig.json`) and
  `@typescript-eslint/no-unused-vars: off` (`eslint.config.js`) — unused
  vars/params are not linted, everything else in strict mode is.
- Validate external input with `zod` (already a dependency) at API route
  boundaries; app-internal types are hand-written to match the DB schema
  (`src/lib/types.ts` — no live Supabase project to run `supabase gen types`
  against, per the comment at the top of that file).

## File-size / structure rules

- No enforced hard cap found in config. Observed largest files are
  ~300-line workflow components (`UploadStep.tsx` at 296 lines); route
  handlers stay under 80 lines by delegating shared logic to `src/lib/*`
  (e.g. `src/lib/generation.ts` holds the actual create/poll logic, routes
  are thin wrappers). Keep following that split rather than growing route
  handlers directly.
- One responsibility per `src/lib/*` module (auth, credits, errors, storage,
  generation, api-keys are each a separate file) — don't merge unrelated
  concerns into one file.

## Styling

See `ui-context.md` for tokens. No hardcoded hex/color values in components —
theme is entirely CSS custom properties in `src/app/globals.css`, consumed
via Tailwind's `@theme inline` mapping.

## API / data access rules

- DB/Storage calls happen in `src/lib/*` (generation, credits, storage,
  api-keys) or directly inside `src/app/api/*` route handlers — never from
  client components. Client components call the dashboard's own API routes
  via `src/app/api/api-client.tsx`, or use `@tanstack/react-query`.
- Ownership scoping must be enforced by RLS (see `architecture.md` invariant
  1) — application code should not rely solely on filtering by `user_id` in
  a query without RLS backing it, since the public `/api/v1` surface uses
  the service-role client which bypasses RLS entirely and must filter
  explicitly.
- Session-scoped work uses `requireUser()`; API-key-scoped work uses
  `requireApiKey()` (both in `src/lib/auth.ts`) — don't hand-roll auth
  checks in a new route.

## File organization

- `src/app/api/*` — route handlers, thin, delegate to `src/lib/*`.
- `src/app/<page>/` — server page component + a `*-client.tsx` companion for
  the interactive parts (pattern seen in `dashboard`, `credits`, `help`,
  `login`, `settings`).
- `src/components/ui/*` — shadcn/ui primitives, generated — treat as
  vendored, don't hand-edit behavior in place of using the primitive's props.
- `src/components/workflow/*` — the Upload→Analyze→Script→Generate→Result
  step components.
- `src/components/app/*` — app-shell/dashboard-level composed components.
- `src/lib/ai/*` — Gemini prompts and calls.
- `src/lib/providers/*` — video-provider abstraction + implementations.
- `src/lib/supabase/*` — the three Supabase client constructors.

## Naming conventions

- Route handler files are always `route.ts` under the relevant `src/app/api/`
  segment (Next.js App Router convention).
- Page client components: `<page>-client.tsx` alongside `page.tsx`.
- DB tables/columns: `snake_case` (Postgres convention); TypeScript types in
  `src/lib/types.ts` mirror the DB shape 1:1, including `snake_case` field
  names — don't camelCase them at the type layer.

## Verification

- `npm run lint` — ESLint (`eslint.config.js`): typescript-eslint recommended
  + react-hooks + prettier-as-lint-rule.
- `npm run format` — Prettier write (100 col width, double quotes off i.e.
  `singleQuote: false`, semicolons, trailing commas everywhere — `.prettierrc`).
- No test runner/config found in the repo — {{TODO: confirm with a human
  whether tests are planned or intentionally out of scope so far}}.
- Required before considering a unit done: `npm run lint` passing (no test
  command exists to add to this yet).

## Package management

npm only (`package-lock.json` is the committed lockfile). A `bunfig.toml`
also exists in the repo root — {{TODO: confirm with a human which package
manager is actually canonical; don't add a second lockfile}}.
