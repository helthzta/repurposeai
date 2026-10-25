# UI Context

<!-- Generated from src/app/globals.css (design-system comment block + tokens)
and package.json (shadcn/Radix deps). -->

## Theme

Light/dark (`.dark` class variant, `@custom-variant dark (&:is(.dark *))`).
Per the comment in `globals.css`: "premium enterprise SaaS" — Inter
typography, soft blue primary, 16px radius, blue gradients. Anti-reference:
avoid anything that reads as playful/consumer — this is a B2B SaaS surface.

## Tokens

- **Colour** — all tokens defined as CSS custom properties in `:root`/`.dark`
  in `src/app/globals.css`, mapped into Tailwind via `@theme inline`. Never
  hardcode hex — use the `--color-*` custom properties (`background`,
  `foreground`, `card`, `popover`, `primary` (`#2563EB` light /
  lighter-blue dark), `secondary`, `muted`, `accent`, `success`, `warning`,
  `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*`).
  Primary is oklch-defined blue; success/warning/destructive are the only
  semantic-status colors — don't introduce ad hoc status colors.
- **Typography** — `--font-sans: "Inter", ...` for everything in the app.
  `--font-display: "Instrument Serif"` (2026-10-25) is for italic accent
  words in public-page headlines and plan names only (`font-display italic`)
  — never body text or app UI.
- **Public "screening room" band** — the landing demo reel sits on a dark
  `oklch(0.16 0.03 264)` band (also used behind `/admin/login`); demo videos
  are `public/demos/demo-N.{mp4,jpg}`, encoded with `scripts/encode-demo.sh`
  and listed in `demoAds` in `src/app/page.tsx`.
- **Admin console** — shadcn `Sidebar` (`variant="inset"`) +
  `src/components/admin/{AdminShell,DataTable,OverviewCharts}.tsx`. Charts use
  a validated blue/red pair (completed/revenue vs failed) via ChartConfig
  `theme`.
- **Spacing** — no custom spacing scale defined; Tailwind's default spacing
  scale applies (no override found in `globals.css`).
- **Radius / shadow** — `--radius: 1rem` (16px) is the base; `--radius-sm`
  through `--radius-3xl` are derived from it (`calc(var(--radius) ± N)`) in
  the `@theme inline` block — always use the `radius-*` scale, don't
  hardcode a pixel radius. Shadows: `--shadow-card`, `--shadow-lift`,
  `--shadow-glow` (glow/lift used via the `hover-lift`/`btn-glow` utilities
  defined at the bottom of `globals.css`).

## Component library

shadcn/ui on Radix primitives (`src/components/ui/*`, ~40 generated
components covering accordion through tooltip). Never hand-roll a primitive
that already exists in this directory — extend via props/variants
(`class-variance-authority` is a dependency, used for variant patterns like
`button.tsx`).

## Layout patterns

- Page-level split: a server `page.tsx` plus a `*-client.tsx` for
  interactive state (see `code-standards.md` → File organization).
- Custom utility classes defined in `globals.css` for recurring visual
  effects: `glass`, `gradient-primary`, `gradient-hero`, `gradient-text`,
  `hover-lift`, `btn-glow` — reuse these rather than re-implementing the
  same blur/gradient/hover-shadow combination inline.
- Animation keyframes (`float`, `fade-up`, `gradient-pan`, `pulse-soft`,
  `shimmer`) are pre-registered as `--animate-*` tokens — reference the
  token, don't redefine the keyframe.

## Component debt / open items

None tracked yet.
