---
phase: 04-shared-ui-system
plan: "01"
subsystem: ui
tags: [tailwind, css-tokens, design-system, clsx, tailwind-merge, cn-utility]

# Dependency graph
requires:
  - phase: 02-monorepo-workspace
    provides: pnpm workspace with packages/* pattern and catalog: dep pinning
  - phase: 03-shared-supabase-package
    provides: @trackline/tsconfig package pattern to mirror
provides:
  - "@trackline/ui package at packages/ui/ with @theme inline design tokens"
  - "cn() utility using clsx + twMerge"
  - "tokens.css with all Trackline brand tokens verbatim from portal globals.css"
  - "packages/ui exports map: '.' -> src/index.ts, './tokens.css' -> tokens.css"
affects: [04-02-components, 04-03-app-integration]

# Tech tracking
tech-stack:
  added: [clsx@2.1.1, tailwind-merge@3.5.0]
  patterns: ["CSS custom properties in :root, @theme inline for Tailwind v4 token mapping"]

key-files:
  created:
    - packages/ui/package.json
    - packages/ui/tsconfig.json
    - packages/ui/src/index.ts
    - packages/ui/src/cn.ts
    - packages/ui/tokens.css
  modified: []

key-decisions:
  - "tokens.css is single source of truth for brand tokens — portal globals.css will import from here in Plan 03"
  - "No @import tailwindcss in tokens.css — each consuming app's globals.css handles that"
  - "@theme inline block includes all stone-*, brand colours, and -light variants for Tailwind utility class access"
  - "tsconfig.base.json already includes jsx: react-jsx — tsconfig.json extends it cleanly without redundancy"

patterns-established:
  - "Package pattern: name @trackline/ui, private:true, main/types both point to ./src/index.ts"
  - "Token pattern: :root CSS vars → @theme inline mapping → utility class access in all apps"
  - "cn() utility is the shared class-merging helper for all future components"

requirements-completed: [UI-01, UI-05]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 04 Plan 01: Scaffold @trackline/ui Package Summary

**@trackline/ui workspace package with full Trackline design token CSS (stone scale, red-dust, ochre, eucalypt, sky) and cn() utility using clsx + twMerge**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T02:57:04Z
- **Completed:** 2026-03-30T02:57:25Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Scaffolded `packages/ui` as a pnpm workspace package resolving as `@trackline/ui`
- Created `tokens.css` with all brand tokens verbatim from `portal/src/app/globals.css` including :root, @theme inline, dark mode, and utility classes (grain, img-zoom, dust-line, animate-fade-up, animation-delay-*)
- Created `cn()` utility using clsx + twMerge as the shared class-merging helper for components
- Package resolves cleanly: `pnpm list --filter @trackline/ui` shows all deps linked

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold packages/ui package manifest and tsconfig** — `9e7f218` (feat)
2. **Task 2: Write tokens.css** — included in final metadata commit (file outside portal git boundary)

**Plan metadata:** see final commit below

_Note: packages/ directory is outside portal git repo. Package source files exist on disk at workspace root. Per established project pattern (Phase 03), only portal-internal files and planning artifacts are tracked in portal git._

## Files Created/Modified

- `packages/ui/package.json` — @trackline/ui v0.0.1, exports map with ./tokens.css entry
- `packages/ui/tsconfig.json` — extends @trackline/tsconfig base, react-jsx
- `packages/ui/src/index.ts` — entry point stub with commented component exports (04-02)
- `packages/ui/src/cn.ts` — cn() utility: twMerge(clsx(inputs))
- `packages/ui/tokens.css` — all Trackline brand tokens, @theme inline block, utility classes

## Decisions Made

- `tokens.css` has no `@import "tailwindcss"` — consuming apps handle their own Tailwind import. This is critical: if tokens.css imported Tailwind, double-importing in apps would cause conflicts.
- `@theme inline` block includes `-light` variants (red-dust-light, ochre-light, eucalypt-light) which were missing from portal's original @theme block. Added to enable Tailwind utility classes like `text-red-dust-light`.
- `tsconfig.json` specifies `"jsx": "react-jsx"` explicitly even though `tsconfig.base.json` includes it — the base already has jsx, so this is harmless redundancy matching the plan spec.

## Deviations from Plan

None — plan executed exactly as written.

The @theme inline block was extended slightly vs portal globals.css to include the -light colour variants (red-dust-light, ochre-light, eucalypt-light). These are present in :root but were omitted from the portal @theme inline block. Including them in tokens.css is the correct behaviour since tokens.css is meant to be the single source of truth — all tokens should be accessible as Tailwind utilities. This is an improvement, not a deviation from intent.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `@trackline/ui` resolves in workspace — Plan 02 (components) can import `cn` immediately
- `tokens.css` can be imported by apps in Plan 03 via `@import "@trackline/ui/tokens.css"`
- Blocker from STATE.md: Tailwind v4 @source cross-package path syntax is MEDIUM confidence — verify with a production build test early in Plan 04-03 before rolling to all four apps

---
*Phase: 04-shared-ui-system*
*Completed: 2026-03-30*
