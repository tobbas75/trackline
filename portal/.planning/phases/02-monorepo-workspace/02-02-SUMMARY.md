---
phase: 02-monorepo-workspace
plan: "02"
subsystem: infra
tags: [pnpm, monorepo, workspace, tsconfig, eslint, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: pnpm installed, satellite apps co-located under LandManagment Website/
provides:
  - pnpm-workspace.yaml with catalog pinning 17 shared dependencies
  - Root package.json (trackline-workspace) with typecheck/lint/build/dev scripts
  - .npmrc with hoisted node-linker for Next.js compatibility
  - packages/tsconfig with shared compilerOptions (strict, ES2017, bundler resolution)
  - packages/eslint-config with shared nextConfig flat config array
affects:
  - 02-03 (app package.json migration uses catalog: references and @trackline/* packages)
  - all future phases (shared tsconfig and eslint-config are the baseline for all 4 apps)

# Tech tracking
tech-stack:
  added: ["@trackline/tsconfig (internal)", "@trackline/eslint-config (internal)"]
  patterns:
    - pnpm catalog for version pinning — single source of truth for all shared dep versions
    - Internal packages under packages/ with @trackline/ scope namespace
    - eslint-config-next declared as peerDependency (not bundled) to avoid dual plugin instances
    - tsconfig.base.json omits incremental/plugins/paths — those remain app-specific

key-files:
  created:
    - "C:/Software code GITs/LandManagment Website/pnpm-workspace.yaml"
    - "C:/Software code GITs/LandManagment Website/package.json"
    - "C:/Software code GITs/LandManagment Website/.npmrc"
    - "C:/Software code GITs/LandManagment Website/packages/tsconfig/package.json"
    - "C:/Software code GITs/LandManagment Website/packages/tsconfig/tsconfig.base.json"
    - "C:/Software code GITs/LandManagment Website/packages/eslint-config/package.json"
    - "C:/Software code GITs/LandManagment Website/packages/eslint-config/index.mjs"
  modified: []

key-decisions:
  - "pnpm catalog used for dep pinning — catalog: references in app package.json files (Plan 03) will automatically track these versions"
  - "node-linker=hoisted + shamefully-hoist=true — Next.js 16 peer dep resolution fails in strict isolated mode; hoisted is the safe default for Next.js monorepos"
  - "eslint-config-next as peerDependency in @trackline/eslint-config — consuming app already has it; bundling it creates two plugin instances causing ESLint config errors"
  - "tsconfig.base.json omits incremental, plugins:[next], and paths — these are app-specific and must not appear in the shared base"
  - "Workspace root files (pnpm-workspace.yaml, package.json, .npmrc, packages/) are outside any git repo — on-disk only, same pattern as 02-01"

patterns-established:
  - "Shared internal packages use @trackline/ scope with private:true and exports field"
  - "peerDependencies for eslint plugins: avoids plugin duplication in consuming packages"

requirements-completed: [MONO-02, MONO-03, MONO-04, MONO-05]

# Metrics
duration: 7min
completed: 2026-03-30
---

# Phase 02 Plan 02: Workspace Infrastructure Summary

**pnpm-workspace.yaml with 17-entry catalog, root package.json scripts, .npmrc, and two internal packages (@trackline/tsconfig, @trackline/eslint-config) ready for app migration in Plan 03**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-30T01:25:53Z
- **Completed:** 2026-03-30T01:32:00Z
- **Tasks:** 2
- **Files modified:** 7 created, 0 modified

## Accomplishments

- pnpm-workspace.yaml created at workspace root listing all 4 app paths and packages/* glob, with catalog pinning 17 shared dependencies
- Root package.json (trackline-workspace) created with 8 workspace scripts: typecheck, lint, 4x build:*, 4x dev:*
- .npmrc configured with hoisted node-linker for Next.js 16 peer dep compatibility
- packages/tsconfig internal package created with tsconfig.base.json containing shared compilerOptions (strict, ES2017, bundler resolution) — incremental/plugins/paths excluded
- packages/eslint-config internal package created with nextConfig flat config array, eslint-config-next declared as peerDependency

## Task Commits

Both tasks involve workspace root files outside any git repo (same pattern as 02-01). Changes are on-disk only.

1. **Task 1: Workspace root files** — on-disk only (pnpm-workspace.yaml, package.json, .npmrc)
2. **Task 2: packages/ internal packages** — on-disk only (packages/tsconfig/*, packages/eslint-config/*)

**Plan metadata:** committed to portal git repo

## Files Created/Modified

- `C:/Software code GITs/LandManagment Website/pnpm-workspace.yaml` — workspace topology and 17-entry version catalog
- `C:/Software code GITs/LandManagment Website/package.json` — trackline-workspace root with 8 scripts
- `C:/Software code GITs/LandManagment Website/.npmrc` — hoisted node-linker config
- `C:/Software code GITs/LandManagment Website/packages/tsconfig/package.json` — @trackline/tsconfig internal package manifest
- `C:/Software code GITs/LandManagment Website/packages/tsconfig/tsconfig.base.json` — shared compilerOptions, strict mode
- `C:/Software code GITs/LandManagment Website/packages/eslint-config/package.json` — @trackline/eslint-config with peerDeps
- `C:/Software code GITs/LandManagment Website/packages/eslint-config/index.mjs` — nextConfig flat config export

## Decisions Made

- **pnpm catalog**: Single source of truth for 17 shared dep versions. Plan 03 app migrations will swap version strings for `catalog:` references.
- **hoisted node-linker**: Next.js 16 occasionally fails to resolve peer deps from nested workspace packages in strict isolated mode. Hoisted flat node_modules is the safe default for Next.js monorepos.
- **peerDependencies for eslint-config-next**: If declared as a direct dependency in @trackline/eslint-config, pnpm would install a second copy of the plugin alongside the one in each app — causing "two plugin instances" ESLint errors. peerDependency ensures the consuming app's copy is used.
- **Omit incremental/plugins/paths from tsconfig.base.json**: These are Next.js-specific (plugins:[next]) or path-alias-specific (paths:@/*). Sharing them in the base would break apps that have different path aliases or don't use the Next.js TS plugin directly.
- **Workspace root files not in VCS**: LandManagment Website/ has no git repo. Files are on-disk only. This is expected and documented — same as 02-01.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- pnpm-workspace.yaml is ready for Plan 03 (app package.json migration to catalog: references)
- packages/tsconfig and packages/eslint-config are ready for extends/imports in all 4 apps
- No app files have been modified yet (those changes happen in Plan 03)
- **Reminder:** Before running `pnpm install` at workspace root, ensure node_modules in satellite apps are present (trap-monitor/frontend needs `npm install` per 02-01 issue note)

---
*Phase: 02-monorepo-workspace*
*Completed: 2026-03-30*

## Self-Check: PASSED

- pnpm-workspace.yaml: FOUND
- package.json (trackline-workspace): FOUND
- .npmrc: FOUND
- packages/tsconfig/package.json: FOUND
- packages/tsconfig/tsconfig.base.json: FOUND
- packages/eslint-config/package.json: FOUND
- packages/eslint-config/index.mjs: FOUND
- 02-02-SUMMARY.md: FOUND
- commit 737b67d: FOUND
