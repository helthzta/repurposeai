<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-02_

## Status

This session shipped 3 tickets plus 2 same-session follow-ups after the
user spotted thumbnails not rendering in a live screenshot (code-complete,
`tsc --noEmit`/`eslint` pass — **not** verified with `next build` anymore,
see note below):

1. **Polished Add/Edit Brand modal.** `src/components/brand/BrandProfileDialog.tsx`
   already existed from an earlier session as a single reusable
   `mode`-less component (an `editing: BrandProfile | null` prop instead —
   `null` = add, a profile = edit) used from both the Profile page's
   `BrandProfilesSection` and `UploadStep.tsx`'s inline "Add new brand"
   flow, already visually polished (rounded-xl inputs, grid layout, logo
   upload with preview, `btn-glow` submit, `Loader2` loading state, toast
   errors). This session's only change: the required "Profile Name" field
   now shows an inline red-border + error message instead of only a toast
   on empty submit — the rest of the acceptance criteria were already met.
2. **Settings → Profile.** `src/app/settings` → `src/app/profile`
   (`git mv`, component renamed `SettingsPageClient` → `ProfilePageClient`,
   file `settings-client.tsx` → `profile-client.tsx`). `AppShell.tsx`'s nav
   item and `middleware.ts`'s `PROTECTED_PATHS` both updated to `/profile`.
   Theme/Language/Notifications sections deleted from the page entirely —
   also removed from `Profile` (`src/lib/types.ts`), `EDITABLE_FIELDS`
   (`src/app/api/profile/route.ts`), and the DB via a new migration
   (`supabase/migrations/0020_remove_profile_preferences.sql`, **written,
   not applied** — no DB access this session). New `PersonalInfoSection`:
   editable full name, editable username (inline error on the existing
   409-taken response), read-only email, and an "Avatar URL" text field
   (`avatar_url` added to `EDITABLE_FIELDS`) with a live circular preview
   that falls back to initials. Credits and Account (sign out) sections
   kept as-is; Brand Profiles section unchanged. See D-017/D-018 in
   `decision-log.md` for the route-rename and column-drop reasoning.
3. **Real file downloads, not CDN tab-opens.** All three Download buttons
   (`src/components/app/ProjectGrid.tsx`, `src/app/projects/[id]/project-videos-client.tsx`,
   `src/components/workflow/ResultStep.tsx`) used `<a href={cdnUrl} download>`
   — the `download` attribute is browser-ignored for cross-origin URLs
   (Supabase Storage signed URLs are a different origin than the app), so
   it just navigated to/opened the CDN link. Added `downloadFile()` to
   `src/lib/utils.ts` (fetch → blob → temporary anchor with `download` +
   `URL.createObjectURL`, since a blob URL is same-origin so the attribute
   works), wired into all three buttons with a per-button loading spinner
   and a sensible filename (sanitized project name, optionally + generation
   id; falls back to just the generation id in the Result step, which
   doesn't have the project name in scope). See R-025 in `learned-rules.md`.
   Thumbnails: `ProjectGrid.tsx` already rendered a muted `<video>` element
   as the grid-item thumbnail (shows the first frame) — left as-is, no
   separate thumbnail-generation pipeline added (ticket's thumbnail ask was
   conditional on "if not already implemented").

4. **Real captured-frame thumbnails** (follow-up in the same session — the
   raw `<video>` "thumbnail" wasn't actually showing anything). Added
   `src/components/app/VideoThumbnail.tsx`: seeks a hidden `<video>` to
   ~25% into the clip (capped at 2s), draws that frame to a `<canvas>`,
   renders it as a static `<img>`. No new dependency, no storage/DB change.
   Falls back to the plain `<video>` element if canvas capture throws (e.g.
   a tainted canvas from missing CORS headers). Used in `ProjectGrid.tsx`
   (grid card preview) and `project-videos-client.tsx` (click-to-play: shows
   the thumbnail with a hover Play button, swaps to a real `<video controls
   autoPlay>` on click instead of every card auto-decoding its video).
5. **Found and fixed the actual reason nothing showed a thumbnail or played**
   while testing #4 live: `generations.output_url` is a real DB column but
   is **never persisted** — `generation.ts`'s `signUrl()` computes a fresh
   private-bucket signed URL and merges it into the in-memory object on
   every read, it never writes it back to the row. `/api/projects/route.ts`
   and `getProjectDetail` (`src/lib/projects.ts`, shared by `/api/projects/
   [id]`, `/dashboard/[projectId]`, and `/projects/[id]`) were both
   selecting that raw, always-null column straight from the DB — so every
   project/generation list the client received had `output_url: null`
   regardless of whether the video existed, making Download disabled and
   thumbnails/players show nothing everywhere except the one place that was
   built correctly (`/api/generations/[id]`, used by `ResultStep.tsx`,
   which does go through `signUrl()`). Fixed by adding
   `signGenerationOutputs()` to `src/lib/projects.ts` (batches every
   completed generation's `output_path` into one `createSignedUrls` call)
   and calling it from both `getProjectDetail` and `/api/projects/route.ts`.
   See R-027 in `learned-rules.md`.

6. **Full result view from the project page.** The user asked to see a
   generation's prompt/script/AI Insights from `/projects/[id]`, not just
   from the live workflow's Result step. Extracted `ExpandableTextCard` and
   the AI-Insights bars out of `ResultStep.tsx` into
   `src/components/generation/GenerationDetails.tsx` (now shared).
   First pass wired these into a "View Result" dialog
   (`GenerationResultDialog.tsx`) — the user then asked for it inline on
   the page instead of a click-to-open popup, so that file was deleted and
   `project-videos-client.tsx` was rewritten: the 3-column grid-of-thumbnail
   -cards became a stacked, single-column list where every generation's
   full result (video, meta, Download, Prompt Used, Script Used, AI
   Insights) is always visible, no click needed. `ExpandableTextCard`
   itself still collapses prompt/script text behind its own inline
   View/Hide toggle (keeps the page from being a wall of raw prompt text),
   but nothing opens in a separate dialog/route anymore. The matching
   script per generation is looked up client-side from
   `project.scripts.find(s => s.id === generation.script_id)` (already
   fetched by `getProjectDetail`, no new query). `ResultStep.tsx` imports
   from the shared `GenerationDetails.tsx` file instead of defining these
   inline — no behavior change there.

7. **Fixed the Download button's layout** in the new
   `project-videos-client.tsx` panel (user flagged it from a screenshot):
   `sm:self-stretch` + `sm:flex-col` was forcing the Download button to
   match the 9:16 video's full height, turning it into a tall, mostly-empty
   box, and left a lot of dead space in that row. Changed the layout to a
   `sm:grid-cols-[176px_minmax(0,1fr)]` grid: a fixed-width video+Download
   column (button normal-sized, sits directly under the thumbnail) with the
   Prompt/Script cards filling the remaining width beside it instead of
   below with empty space.

8. **Applied migration `0020`** via the Supabase MCP (became available
   mid-session) — `theme`/`locale`/`notify_on_completion` are now actually
   dropped from the live `profiles` table on project `xxitlqjgmfqxesqiuouk`,
   confirmed via `list_migrations` (shows `0020_remove_profile_preferences`)
   and `list_tables` (columns gone). No longer pending — see below, this
   replaces the earlier "not applied" status.

## Current branch

`main`. Nothing committed this session yet (working tree has the changes
below, uncommitted). New: `supabase/migrations/0020_remove_profile_preferences.sql`,
`src/components/app/VideoThumbnail.tsx`,
`src/components/generation/GenerationDetails.tsx`.
Renamed: `src/app/settings/{page.tsx,settings-client.tsx}` →
`src/app/profile/{page.tsx,profile-client.tsx}`. Edited: `middleware.ts`,
`src/app/api/profile/route.ts`, `src/app/api/projects/route.ts`,
`src/lib/projects.ts`, `src/lib/types.ts`, `src/lib/utils.ts`,
`src/components/app/AppShell.tsx`, `src/components/app/ProjectGrid.tsx`,
`src/components/brand/BrandProfileDialog.tsx`, `src/components/workflow/ResultStep.tsx`,
`src/app/projects/[id]/project-videos-client.tsx`.

## Half-done / needs manual follow-up

- Migration `0020` **is now applied** (see item #8) — nothing pending there
  anymore.
- The user's dev server (`npm run dev`) was live and confirmed running
  during this session — that's how the missing-thumbnail bug (#5 above) got
  caught in the first place. The output_url fix hasn't been re-verified in
  the browser yet (should show up automatically via hot reload) — do that
  first next session before assuming it's actually fixed.
- **Build-verification approach changed mid-session**: earlier turns ran
  `next build` for verification, which shares `.next` with a running `next
  dev` server and was corrupting its cache (root cause of the user having
  to repeatedly delete `.next`). From here on, verification is `tsc
  --noEmit` + `eslint` only — no more `next build` while a dev server may
  be running. If a production-build check is ever genuinely needed again,
  confirm the dev server is stopped first.
- Everything else carried over from the prior session (middleware
  auth-gating gap D-008, migration history bookkeeping drift, hosting
  target) is still unresolved and untouched this session.

## First action next session

1. Refresh `/projects` and confirm real captured-frame thumbnails now show
   (not the play-icon empty state) and Download is enabled — this is the
   output_url fix (#5), unverified live as of this note.
2. Load `/profile`: confirm nav says "Profile", personal info section
   pre-fills and saves (name/username/avatar URL), brand profile add/edit
   still works pre-filled correctly in edit mode.
3. Confirm no residual `/settings` links or Theme/Language/Notifications UI
   anywhere.
4. Click Download in the Project grid, a project's detail video list, and a
   completed generation's Result step — confirm each saves an actual file
   (not a new tab) with a sensible filename, in Chrome and at least one
   other browser.

## Blockers

None — all 8 items above are code-complete and migration `0020` is applied.
Outstanding: a live re-check that the output_url fix actually resolved the
thumbnail/download issue (see First action next session).
