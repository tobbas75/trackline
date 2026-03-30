---
phase: 02-monorepo-workspace
plan: "03"
subsystem: infra
tags: [typescript, eslint, pnpm, workspace, tsconfig, monorepo]

# Dependency graph
requires:
  - phase: 02-monorepo-workspace plan 02
    provides: "@trackline/tsconfig and @trackline/eslint-config shared packages, pnpm catalog"
provides:
  - All 4 apps extend @trackline/tsconfig/base.json — no duplicate compilerOptions
  - All 4 apps import from @trackline/eslint-config — single ESLint source of truth
  - All 4 apps use catalog: references for 17 shared dependencies
  - All 4 apps have typecheck script (prerequisite for Plan 04 workspace-wide verification)
  - trap-monitor/frontend gets eslint.config.mjs (new file) and lint script updated to "eslint"
affects: [02-04, shared-tsconfig, shared-eslint, catalog-deps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "App tsconfig extends shared base — only incremental, plugins, paths remain app-local"
    - "ESLint flat config: single import from @trackline/eslint-config exports nextConfig"
    - "pnpm catalog: references for all 17 pinned shared deps"

key-files:
  created:
    - "trap-monitor/frontend/eslint.config.mjs"
  modified:
    - "portal/tsconfig.json"
    - "portal/eslint.config.mjs"
    - "portal/package.json"
    - "camera-trap-dashboard/tsconfig.json"
    - "camera-trap-dashboard/eslint.config.mjs"
    - "camera-trap-dashboard/package.json"
    - "fire-app/tsconfig.json"
    - "fire-app/eslint.config.mjs"
    - "fire-app/package.json"
    - "trap-monitor/frontend/tsconfig.json"
    - "trap-monitor/frontend/package.json"

key-decisions:
  - "App tsconfigs retain only extends, incremental, plugins, paths, include, exclude — all shared compiler options delegated to base"
  - "trap-monitor lint script changed from 'next lint' to 'eslint' — next lint uses legacy built-in config, incompatible with flat config"
  - "IDE diagnostic 'File @trackline/tsconfig/base.json not found' is pre-install state, resolves after pnpm install in Plan 04"

patterns-established:
  - "All Trackline apps: tsconfig extends @trackline/tsconfig/base.json"
  - "All Trackline apps: eslint.config.mjs = single import from @trackline/eslint-config"
  - "All Trackline apps: catalog: for shared deps, workspace:* for @trackline packages"

requirements-completed: [MONO-02, MONO-03, MONO-05]

# Metrics
duration: 20min
completed: 2026-03-30
---

# Phase 02 Plan 03: Migrate All Apps to Shared tsconfig and ESLint Config

**All 4 Trackline apps now extend @trackline/tsconfig/base.json and import @trackline/eslint-config — eliminating copy-paste drift across 12 config files**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-30T01:35:00Z
- **Completed:** 2026-03-30T01:55:00Z
- **Tasks:** 2
- **Files modified:** 12 (3 per app x 4 apps; trap-monitor eslint.config.mjs is new)

## Accomplishments

- All 4 app tsconfig.json files reduced from ~34 lines to ~16 lines by delegating shared compilerOptions to base
- All 4 app eslint.config.mjs files replaced with a 2-line import (trap-monitor gets a new file)
- All 4 app package.json files use `catalog:` references for 17 shared deps and `workspace:*` for @trackline packages
- typecheck script added to camera-trap-dashboard, fire-app, and trap-monitor (portal already had it)
- trap-monitor lint script updated from `next lint` to `eslint` for flat config compatibility

## Task Commits

Each task was committed atomically across multiple repos (4 separate git repositories):

1. **Task 1: Migrate portal, camera-trap-dashboard, and fire-app configs**
   - portal repo: `835463d` (chore)
   - camera-trap-dashboard repo: `f9f876f` (chore)
   - fire-app repo: `9da8f03` (chore)

2. **Task 2: Migrate trap-monitor/frontend configs**
   - trap-monitor repo: `f2838a4` (chore)

## Files Created/Modified

- `portal/tsconfig.json` - Now extends @trackline/tsconfig/base.json; removes duplicate compilerOptions
- `portal/eslint.config.mjs` - Replaced with `import { nextConfig } from "@trackline/eslint-config"`
- `portal/package.json` - All 17 catalog deps replaced with `catalog:`, workspace:* devDeps added
- `camera-trap-dashboard/tsconfig.json` - Same tsconfig migration as portal; include preserves `**/*.mts`
- `camera-trap-dashboard/eslint.config.mjs` - Replaced with shared config import
- `camera-trap-dashboard/package.json` - Catalog refs + workspace:* devDeps + typecheck script
- `fire-app/tsconfig.json` - Same tsconfig migration; include preserves `**/*.mts`
- `fire-app/eslint.config.mjs` - Replaced with shared config import
- `fire-app/package.json` - Catalog refs + workspace:* devDeps + typecheck script
- `trap-monitor/frontend/tsconfig.json` - Same migration; include omits `**/*.mts` (preserved difference)
- `trap-monitor/frontend/eslint.config.mjs` - New file: imports from @trackline/eslint-config
- `trap-monitor/frontend/package.json` - Catalog refs + workspace:* devDeps + typecheck + lint=eslint

## Decisions Made

- App tsconfigs retain only `extends`, `incremental`, `plugins`, `paths`, `include`, `exclude` — all shared compiler options (target, lib, strict, jsx, etc.) are now in `@trackline/tsconfig/base.json` only
- trap-monitor lint script changed from `next lint` to `eslint`: `next lint` loads its own legacy config and ignores the flat config file, making the shared rules ineffective
- IDE TypeScript diagnostic `"File '@trackline/tsconfig/base.json' not found"` is expected pre-install state — the package resolution will work once `pnpm install` runs in Plan 04

## Deviations from Plan

None — plan executed exactly as written.

Note: fire-app git status showed many pre-existing deleted files (docs, public/data, src/**) that were already unstaged before this plan. Those were not staged or committed; only the 3 target files were committed. These pre-existing deletions are an out-of-scope concern for the fire-app repo owner.

## Issues Encountered

- **Multi-repo commit structure**: The plan's `files_modified` spans 4 separate git repos (portal, camera-trap-dashboard, fire-app, trap-monitor). Each repo received its own atomic commit rather than a single workspace-level commit. This is the correct approach given the workspace structure.

## User Setup Required

None — no external service configuration required. Changes take effect after `pnpm install` at workspace root (Plan 04).

## Next Phase Readiness

- All 4 apps are structurally ready for workspace-level `pnpm install`
- `typecheck` script present in all 4 apps — Plan 04 can run `pnpm -r run typecheck` workspace-wide
- ESLint flat config in all 4 apps — Plan 04 can run `pnpm -r run lint` workspace-wide
- Remaining concern: IDE will show tsconfig resolution errors until `pnpm install` links workspace packages

---
*Phase: 02-monorepo-workspace*
*Completed: 2026-03-30*

## Self-Check: PASSED

- portal/tsconfig.json: FOUND
- portal/eslint.config.mjs: FOUND
- camera-trap-dashboard/tsconfig.json: FOUND
- fire-app/tsconfig.json: FOUND
- trap-monitor/frontend/tsconfig.json: FOUND
- trap-monitor/frontend/eslint.config.mjs: FOUND (new)
- 02-03-SUMMARY.md: FOUND
- Commit 835463d (portal): FOUND
- Commit f9f876f (camera-trap): FOUND
- Commit 9da8f03 (fire-app): FOUND
- Commit f2838a4 (trap-monitor): FOUND
