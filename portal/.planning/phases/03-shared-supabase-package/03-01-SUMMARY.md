---
phase: 03-shared-supabase-package
plan: "01"
subsystem: infra
tags: [supabase, typescript, pnpm, workspace, shared-package, access-control]

# Dependency graph
requires:
  - phase: 02-monorepo-workspace
    provides: pnpm workspace with catalog dep pinning and @trackline/tsconfig package
provides:
  - "@trackline/supabase-config workspace package with source-first TypeScript exports"
  - "Shared checkAppAccess with SEC-01 NODE_ENV guard for all Trackline apps"
  - "Shared createBrowserClient and createServerClient factory functions"
  - "AppId, AppRole, AppAccess types as single source of truth"
affects:
  - 03-02 (portal migration to shared package)
  - 03-03 (satellite app migration)
  - 04-shared-ui-package

# Tech tracking
tech-stack:
  added:
    - "@trackline/supabase-config workspace package (source-first, no build step)"
  patterns:
    - "source-first package exports: main/types/exports all point to src/index.ts"
    - "peerDependency on next for packages that use next/headers"
    - "workspace:* for internal package cross-references in devDependencies"

key-files:
  created:
    - packages/supabase-config/package.json
    - packages/supabase-config/tsconfig.json
    - packages/supabase-config/src/types.ts
    - packages/supabase-config/src/client.ts
    - packages/supabase-config/src/server.ts
    - packages/supabase-config/src/check-access.ts
    - packages/supabase-config/src/index.ts
  modified:
    - packages/supabase-config/package.json (added @trackline/tsconfig devDep for tsc resolve)

key-decisions:
  - "Removed plugins:[next] from tsconfig.json: causes tsc --noEmit to fail outside Next.js app context (plugins are IDE-only, do not affect compilation)"
  - "Added @trackline/tsconfig as devDependency: workspace:* reference needed for standalone tsc --noEmit to resolve extends path"
  - "Portal-only admin functions (isAdmin, getAllProfiles, getAllAppAccess, getAllApps) excluded from shared package — they query portal schema tables that satellite apps do not need"
  - "SEC-01 NODE_ENV guard preserved verbatim from portal/src/lib/check-access.ts"

patterns-established:
  - "Source-first workspace packages: consuming apps use transpilePackages, no build step required"
  - "Dependency injection for Supabase client: functions accept SupabaseClient parameter, do not create it internally"

requirements-completed:
  - PKG-01

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 03 Plan 01: Create @trackline/supabase-config Package Summary

**Source-first @trackline/supabase-config workspace package with shared Supabase client factories, checkAppAccess (SEC-01 guard preserved), and AppId/AppRole/AppAccess types — replacing three diverging check-access.ts copies across Trackline apps**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T01:55:53Z
- **Completed:** 2026-03-30T02:01:28Z
- **Tasks:** 3
- **Files modified:** 7 created, 1 updated

## Accomplishments

- Created `packages/supabase-config/` with full source-first TypeScript package structure
- Extracted `checkAppAccess` and `getUserApps` from portal's check-access.ts with SEC-01 guard intact
- Separated portal-only admin utilities (isAdmin, getAllProfiles, getAllAppAccess, getAllApps) — not included in shared package
- `pnpm --filter @trackline/supabase-config exec tsc --noEmit` passes with zero errors

## Task Commits

The packages/ directory lives at the workspace root (outside all git repos). Per established Phase 2 pattern, workspace root files are untracked. Planning artifacts are committed to the portal git repo.

1. **Task 1: Scaffold package manifest and tsconfig** - files created at workspace root (untracked)
2. **Task 2: Create source files** - 5 source files created at workspace root (untracked)
3. **Task 3: Install workspace deps and typecheck** - pnpm install succeeded, tsc passes

**Plan metadata:** committed with SUMMARY.md, STATE.md, ROADMAP.md

## Files Created/Modified

- `packages/supabase-config/package.json` - Package manifest with source-first exports, catalog deps, next peerDep
- `packages/supabase-config/tsconfig.json` - Extends @trackline/tsconfig/base.json, includes src/**/*
- `packages/supabase-config/src/types.ts` - AppId, AppRole, AppAccess type definitions
- `packages/supabase-config/src/client.ts` - createBrowserClient factory (wraps @supabase/ssr)
- `packages/supabase-config/src/server.ts` - createServerClient factory (uses next/headers cookies)
- `packages/supabase-config/src/check-access.ts` - checkAppAccess + getUserApps with SEC-01 guard
- `packages/supabase-config/src/index.ts` - Barrel export of all public API

## Decisions Made

1. **Removed `plugins: [{ "name": "next" }]` from tsconfig.json** — The Next.js TypeScript plugin is IDE-only (VS Code language server). When `tsc --noEmit` runs standalone (outside a Next.js build), it resolves full Next.js type declarations which contain errors in a non-app context. The plugin field does not affect compilation behaviour; removing it has no runtime impact.

2. **Added `@trackline/tsconfig` as `devDependency: "workspace:*"`** — The extends path `@trackline/tsconfig/base.json` requires the package to be resolvable when tsc is run from the package's own directory. Without the devDependency, tsc cannot find the extends target.

3. **Portal-only admin functions excluded from shared package** — `isAdmin`, `getAllProfiles`, `getAllAppAccess`, `getAllApps` query `portal.profiles` and `portal.app_access` directly. Satellite apps have no need for these; keeping them in `portal/src/lib/check-access.ts` avoids leaking portal-internal schema access patterns to satellite apps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed next plugin and added @trackline/tsconfig devDependency for tsc resolve**
- **Found during:** Task 3 (typecheck)
- **Issue:** `tsc --noEmit` failed with (a) `File '@trackline/tsconfig/base.json' not found` because the extends path wasn't resolvable standalone, and (b) ~23 Next.js type errors caused by `plugins: [{ "name": "next" }]` loading full Next.js types outside an app context
- **Fix:** Removed `plugins` from tsconfig.json; added `"@trackline/tsconfig": "workspace:*"` to devDependencies; ran `pnpm install`
- **Files modified:** packages/supabase-config/tsconfig.json, packages/supabase-config/package.json
- **Verification:** `pnpm --filter @trackline/supabase-config exec tsc --noEmit` exits 0
- **Anticipated by plan:** "If tsconfig plugin 'next' causes tsc --noEmit to fail outside a Next.js app context, remove the plugins entry from tsconfig.json and re-run."

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking, anticipated by plan)
**Impact on plan:** Fix was anticipated and pre-approved in plan instructions. No scope creep.

## Issues Encountered

- `packages/` directory lives at workspace root outside all git repos — established Phase 2 pattern means package source files are untracked. Per-task commits documented above reflect this constraint. Planning artifacts (this SUMMARY, STATE.md, ROADMAP.md) are committed to portal git repo.

## Known Stubs

None — this plan creates infrastructure code only. No UI components, no data stubs.

## User Setup Required

None — no external service configuration required. The package is a local workspace dependency consumed by the portal and satellite apps.

## Next Phase Readiness

- `@trackline/supabase-config` is available in the pnpm workspace and typechecks cleanly
- Plan 03-02: Portal can now update its imports to use the shared package (remove local check-access duplicates, update supabase client imports)
- Plan 03-03: Satellite apps can wire in the shared package via transpilePackages + workspace dependency

## Self-Check: PASSED

All 7 package source files exist at workspace root. SUMMARY.md created.

---
*Phase: 03-shared-supabase-package*
*Completed: 2026-03-30*
