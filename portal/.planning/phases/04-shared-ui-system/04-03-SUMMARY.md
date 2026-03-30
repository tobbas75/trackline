---
phase: 04-shared-ui-system
plan: "03"
subsystem: ui
tags: [tailwind-v4, next-js, shared-components, tokens-css, transpile-packages, workspace]

requires:
  - phase: 04-01
    provides: "@trackline/ui package scaffold with cn utility and tokens.css"
  - phase: 04-02
    provides: "Button, Card, Badge, Avatar components in @trackline/ui"
  - phase: 02-monorepo-workspace
    provides: "pnpm workspace linking all four apps under workspace root"

provides:
  - All four apps wired to @trackline/ui via transpilePackages (Next.js can compile shared TSX)
  - All apps have @source directive pointing at packages/ui/src (Tailwind v4 won't purge shared classes)
  - portal globals.css migrated to import from tokens.css (no more duplicated token definitions)
  - trap-monitor globals.css imports tokens.css for Trackline brand tokens
  - camera-trap-dashboard and fire-app get @source only (shadcn apps, no token import to avoid conflict)
  - docs/UI-RULES.md at workspace root as opinionated developer reference

affects:
  - phase-05 (any phase using shared components in apps — needs this wiring to be in place)
  - all app deployments (Tailwind purging behaviour in production now includes shared component classes)

tech-stack:
  added: []
  patterns:
    - "transpilePackages pattern: Next.js compiles raw TSX from workspace packages (not just pre-built)"
    - "@source directive in globals.css tells Tailwind v4 to scan packages/ui/src for used class names"
    - "Shadcn apps (camera-trap-dashboard, fire-app) receive @source only — no token import to prevent CSS variable conflicts"
    - "Token import safe for Trackline-themed apps (portal, trap-monitor) that use --tm-* or no conflicting namespaces"

key-files:
  created:
    - "docs/UI-RULES.md — workspace-level opinionated UI reference for all Trackline developers"
    - "fire-app/src/app/globals.css — restored from git (was deleted) with @source directive added"
  modified:
    - "portal/next.config.ts — added @trackline/ui to transpilePackages"
    - "portal/package.json — added @trackline/ui workspace:* dependency"
    - "portal/src/app/globals.css — replaced inline tokens with @import + @source"
    - "camera-trap-dashboard/next.config.ts — added @trackline/ui to transpilePackages"
    - "camera-trap-dashboard/package.json — added @trackline/ui workspace:*"
    - "camera-trap-dashboard/src/app/globals.css — added @source directive"
    - "fire-app/next.config.ts — added @trackline/ui to transpilePackages"
    - "fire-app/package.json — added @trackline/ui workspace:*"
    - "trap-monitor/frontend/next.config.ts — added @trackline/ui to transpilePackages"
    - "trap-monitor/frontend/package.json — added @trackline/ui workspace:*"
    - "trap-monitor/frontend/src/app/globals.css — added @import tokens.css + @source"

key-decisions:
  - "camera-trap-dashboard treated as shadcn app (same as fire-app): @source only, no token import — tokens.css sets --accent/--muted/--background which would override shadcn oklch values"
  - "fire-app src/ directory was fully deleted (281 files deleted, visible in git status) — globals.css restored from git history before adding @source directive"
  - "trap-monitor receives full token import: uses --tm-* namespace (no conflict with tokens.css --accent/--muted), and body font-family in trap-monitor overrides tokens.css body rule via CSS cascade"
  - "Workspace root docs/ is not a git repo — UI-RULES.md lives there alongside CONVENTIONS.md, outside any individual repo"

patterns-established:
  - "Shadcn detection rule: if app has @import shadcn/tailwind.css in globals.css, treat as shadcn-only — add @source, never @import tokens.css"
  - "Next.js shared package integration: transpilePackages + @source + (optional) @import tokens.css is the 3-step wiring pattern"

requirements-completed:
  - UI-03
  - UI-04

duration: 25min
completed: 2026-03-30
---

# Phase 04 Plan 03: App Integration & UI Rules Summary

**All four Trackline apps wired to @trackline/ui via transpilePackages + @source directives; portal globals.css migrated to single-source tokens.css import; docs/UI-RULES.md written**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-30T03:07:21Z
- **Completed:** 2026-03-30T03:32:00Z
- **Tasks:** 2
- **Files modified:** 11 (across 4 repos)

## Accomplishments

- All four Next.js apps now have `@trackline/ui` in `transpilePackages` — Next.js can compile raw TSX from the shared package
- All apps have `@source "path/to/packages/ui/src"` in `globals.css` — Tailwind v4 will not purge shared component classes in production builds
- Portal `globals.css` reduced from 133 lines to 8 lines — tokens are now single-sourced from `packages/ui/tokens.css`
- `docs/UI-RULES.md` created at workspace root: colour table, typography guide, layout patterns, breakpoints, component API, integration checklist
- `pnpm install` at workspace root resolves cleanly with `@trackline/ui: workspace:*` linked in all four apps

## Task Commits

Portal repo commits (main git repo for this plan):

1. **Task 1: Update all four next.config.ts files** - `5f45433` (feat)
2. **Task 2: Add @trackline/ui dep, migrate globals.css, write UI-RULES.md** - `3d6fb52` (feat)

Satellite repo commits:

- camera-trap-dashboard: `4358278` (next.config.ts), `729add5` (package.json + globals.css)
- fire-app: `c877f53` (next.config.ts), `316e61c` (package.json + globals.css)
- trap-monitor/frontend: `a3963e3` (next.config.ts), `a21c3fa` (package.json + globals.css)

## Files Created/Modified

- `portal/next.config.ts` — added @trackline/ui to transpilePackages
- `portal/package.json` — added @trackline/ui workspace:*
- `portal/src/app/globals.css` — replaced 130-line inline token block with 8-line import + @source
- `camera-trap-dashboard/next.config.ts` — added @trackline/ui to transpilePackages
- `camera-trap-dashboard/package.json` — added @trackline/ui workspace:*
- `camera-trap-dashboard/src/app/globals.css` — added @source directive (shadcn app, no token import)
- `fire-app/next.config.ts` — added @trackline/ui to transpilePackages
- `fire-app/package.json` — added @trackline/ui workspace:*
- `fire-app/src/app/globals.css` — restored from git history (was deleted), added @source directive
- `trap-monitor/frontend/next.config.ts` — added @trackline/ui to transpilePackages
- `trap-monitor/frontend/package.json` — added @trackline/ui workspace:*
- `trap-monitor/frontend/src/app/globals.css` — added @import tokens.css + @source
- `docs/UI-RULES.md` — created at workspace root (outside all git repos)

## Decisions Made

- **camera-trap-dashboard treated as shadcn app**: Plan said to import tokens.css, but camera-trap-dashboard has a full shadcn theme with `--accent`, `--muted`, `--background` in oklch. Importing tokens.css would override these with Trackline hex values, breaking the entire shadcn colour system. Applied same rule as fire-app: @source only.
- **fire-app src/ directory restoration**: fire-app's entire src/ directory was deleted (281 files showing as D in git status — likely from Phase 2 monorepo robocopy operations). Restored globals.css from git history before adding the @source directive.
- **trap-monitor gets full token import**: trap-monitor uses `--tm-*` namespaced variables exclusively — no `--accent`, `--muted`, `--background` conflicts. CSS cascade means trap-monitor's own body rule overrides tokens.css body font-family. Safe to import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] camera-trap-dashboard treated as shadcn app — @source only**
- **Found during:** Task 2 (globals.css migration)
- **Issue:** Plan specified @import tokens.css for camera-trap-dashboard. Inspection revealed camera-trap-dashboard uses shadcn with `@import "shadcn/tailwind.css"` and a full `:root` block with oklch-format `--accent`, `--muted`, `--background`, `--foreground` variables. Importing tokens.css would override these with Trackline hex values (`--accent: #b5452a`), completely breaking shadcn component colours.
- **Fix:** Applied @source directive only (same treatment as fire-app). No token import.
- **Files modified:** `camera-trap-dashboard/src/app/globals.css`
- **Verification:** Verified `@import "shadcn/tailwind.css"` present in camera-trap-dashboard globals.css — same shadcn pattern as fire-app
- **Committed in:** `729add5` (Task 2 satellite commit)

**2. [Rule 3 - Blocking] fire-app src/app/globals.css deleted — restored from git**
- **Found during:** Task 2 (locating fire-app globals.css)
- **Issue:** fire-app had no src/ directory at all (281 files deleted, visible in git status). The globals.css needed to exist for the @source directive.
- **Fix:** Retrieved original globals.css content via `git show HEAD:src/app/globals.css`, created `src/app/` directory, wrote restored file + added @source directive. Full shadcn theme content preserved.
- **Files modified:** `fire-app/src/app/globals.css` (created/restored)
- **Verification:** File verified present with correct shadcn theme + @source line
- **Committed in:** `316e61c` (Task 2 satellite commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both fixes required for correctness. Rule 1 fix prevents shadcn theme breakage. Rule 3 fix enables the task to complete. No scope creep.

## Issues Encountered

- fire-app has 281 deleted source files (the entire src/ directory) — this is a pre-existing issue from Phase 2 monorepo operations. This plan only restored globals.css. The remaining deleted src/ files are a broader blocker for fire-app development. Logged to deferred items.

## Known Stubs

None — this plan wires configuration only. No UI data stubs introduced.

## Next Phase Readiness

- All four apps can now import and render components from `@trackline/ui`
- Tailwind v4 will include shared component classes in production builds (via @source)
- Portal brand tokens are single-sourced from `packages/ui/tokens.css`
- `docs/UI-RULES.md` provides developer reference for consistent usage across all apps
- **Concern:** fire-app has 281 deleted source files beyond globals.css — full app restore needed before fire-app can build

---
*Phase: 04-shared-ui-system*
*Completed: 2026-03-30*
