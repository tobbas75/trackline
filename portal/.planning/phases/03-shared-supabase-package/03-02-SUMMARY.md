---
phase: 03-shared-supabase-package
plan: "02"
subsystem: infra
tags: [pnpm, workspace, typescript, supabase, monorepo, node-modules]

# Dependency graph
requires:
  - phase: 03-01
    provides: "@trackline/supabase-config package with checkAppAccess, getUserApps, createBrowserClient, createServerClient, AppId/AppRole/AppAccess types"
provides:
  - camera-trap-dashboard wired to @trackline/supabase-config with re-export shim
  - trap-monitor wired to @trackline/supabase-config with re-export shim (SEC-01 NODE_ENV guard now in effect)
  - fire-app declared @trackline/supabase-config dep (ready for future use)
  - portal declared @trackline/supabase-config dep with transpilePackages
  - All 4 apps have transpilePackages configured
  - Trap Monitor 322-test suite passes after SEC-01 NODE_ENV stub update
  - Pre-workspace stale npm node_modules cleared from camera-trap-dashboard and trap-monitor
affects:
  - Phase 04 (shared UI library) — all apps now consume workspace packages consistently
  - Any future plan that adds @trackline/* imports to satellite apps

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-export shim pattern: app-local check-access.ts delegates to shared package, call sites unchanged"
    - "peerDependencies in shared workspace package: avoids dual-instance TS class mismatch"
    - "NODE_ENV=production stubbing in vitest: isolates SEC-01 dev fallback from production-behavior tests"

key-files:
  created:
    - camera-trap-dashboard/src/lib/check-access.ts (re-export shim)
    - trap-monitor/frontend/src/lib/check-access.ts (re-export shim)
  modified:
    - camera-trap-dashboard/package.json (added @trackline/supabase-config workspace:*)
    - camera-trap-dashboard/next.config.ts (added transpilePackages)
    - trap-monitor/frontend/package.json (added @trackline/supabase-config workspace:*)
    - trap-monitor/frontend/next.config.ts (added transpilePackages)
    - trap-monitor/frontend/src/lib/check-access.test.ts (added NODE_ENV=production stub)
    - fire-app/package.json (added @trackline/supabase-config workspace:*)
    - fire-app/next.config.ts (added transpilePackages)
    - portal/package.json (added @trackline/supabase-config workspace:*)
    - portal/next.config.ts (added transpilePackages)
    - packages/supabase-config/package.json (moved supabase deps to peerDependencies — not in git)

key-decisions:
  - "supabase-config supabase deps moved to peerDependencies: avoids dual SupabaseClient class instances across workspace packages"
  - "Pre-workspace stale npm node_modules in camera-trap-dashboard and trap-monitor cleared via PowerShell (Windows rmdir/rm did not fully delete locked files)"
  - "trap-monitor check-access.test.ts SEC-05 tests stub NODE_ENV=production: shared package's SEC-01 guard triggers in NODE_ENV=test, changing infra-missing behavior from fail-closed to dev-bootstrap"
  - "trap-monitor pre-existing typecheck errors (CameraEventList, ImageViewer, rls-policies) are out of scope: existed before this plan and documented in deferred-items.md"

patterns-established:
  - "Re-export shim: satellite app src/lib/check-access.ts re-exports from @trackline/supabase-config — call sites need no import path changes"
  - "workspace peerDependencies: @trackline packages declare shared Supabase libs as peerDependencies to prevent dual-class TS errors"

requirements-completed:
  - PKG-02

# Metrics
duration: 16min
completed: 2026-03-30
---

# Phase 03 Plan 02: Wire Satellite Apps to @trackline/supabase-config Summary

**All 4 apps wired to shared @trackline/supabase-config via workspace:* with re-export shims replacing local check-access.ts implementations; Trap Monitor 322 tests pass with NODE_ENV stubs**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-30T02:22:28Z
- **Completed:** 2026-03-30T02:38:21Z
- **Tasks:** 3
- **Files modified:** 10 (+ packages/supabase-config/package.json outside git)

## Accomplishments

- camera-trap-dashboard, trap-monitor, fire-app, and portal all declare `@trackline/supabase-config: workspace:*` and have `transpilePackages: ['@trackline/supabase-config']` in their Next.js configs
- camera-trap-dashboard and trap-monitor local `check-access.ts` implementations replaced with re-export shims — all existing call sites continue to work without import path changes
- Trap Monitor 322-test suite passes after adding `vi.stubEnv('NODE_ENV', 'production')` to SEC-05 describe block; the shared package's SEC-01 dev-bootstrap guard now fires in `NODE_ENV=test` which required this fix
- portal/src/lib/check-access.ts left intact with `isAdmin`, `getAllProfiles`, `getAllAppAccess`, `getAllApps` admin functions

## Task Commits

Each task was committed atomically to the respective satellite app repos:

1. **Task 1: Wire camera-trap-dashboard** — `b9e198a` in camera-trap-dashboard repo (feat)
2. **Task 2: Wire trap-monitor and fire-app** — `72129c6` in trap-monitor repo, `1e6f095` in fire-app repo (feat)
3. **Task 3: Wire portal and workspace-wide typecheck** — `bf7c355` in portal repo (feat)

## Files Created/Modified

- `camera-trap-dashboard/src/lib/check-access.ts` — replaced with re-export shim to @trackline/supabase-config
- `camera-trap-dashboard/package.json` — added @trackline/supabase-config workspace:* dep
- `camera-trap-dashboard/next.config.ts` — added transpilePackages
- `trap-monitor/frontend/src/lib/check-access.ts` — replaced with re-export shim
- `trap-monitor/frontend/src/lib/check-access.test.ts` — added vi.stubEnv NODE_ENV=production to SEC-05 tests
- `trap-monitor/frontend/package.json` — added @trackline/supabase-config workspace:* dep
- `trap-monitor/frontend/next.config.ts` — added transpilePackages
- `fire-app/package.json` — added @trackline/supabase-config workspace:* dep
- `fire-app/next.config.ts` — added transpilePackages
- `portal/package.json` — added @trackline/supabase-config workspace:* dep
- `portal/next.config.ts` — added transpilePackages
- `packages/supabase-config/package.json` — moved supabase deps to peerDependencies (workspace root, not in git)

## Decisions Made

1. **peerDependencies for Supabase libs in shared package:** Moving `@supabase/ssr` and `@supabase/supabase-js` from `dependencies` to `peerDependencies` in `packages/supabase-config/package.json` was required to prevent the TypeScript "two copies of SupabaseClient" error (TS2345). Without this, TypeScript sees two distinct `SupabaseClient` class declarations and refuses to accept a client from one as an argument to a function expecting the other.

2. **NODE_ENV stub in trap-monitor tests:** The original trap-monitor `checkAppAccess` had no SEC-01 bootstrap fallback (it was always fail-closed). The shared package adds the `NODE_ENV !== 'production'` branch. In vitest (NODE_ENV=test), this changes infra-missing behavior from returning `{ hasAccess: false }` to returning `{ hasAccess: true, role: 'admin' }`. Adding `vi.stubEnv('NODE_ENV', 'production')` in the describe block restores expected test behavior without modifying the production logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved Supabase peer deps to fix dual-SupabaseClient TS2345 error**
- **Found during:** Task 1 (camera-trap-dashboard wiring)
- **Issue:** TypeScript error TS2345 — `@trackline/supabase-config` resolved supabase-js from workspace root (2.100.1) while app had its own copy (2.98.0 — stale pre-workspace npm install). Two distinct class declarations are structurally incompatible.
- **Fix:** (a) Moved `@supabase/ssr` and `@supabase/supabase-js` from `dependencies` to `peerDependencies` in `packages/supabase-config/package.json`. (b) Used PowerShell to fully delete pre-workspace npm `node_modules` in camera-trap-dashboard and trap-monitor (Windows `rmdir /s /q` and bash `rm -rf` could not fully delete due to file locks). pnpm then hoisted everything to workspace root correctly.
- **Files modified:** `packages/supabase-config/package.json` (not in git — workspace root only)
- **Verification:** `pnpm --filter camera-trap-dashboard exec tsc --noEmit` — zero errors. `pnpm --filter trap-monitor-dashboard exec tsc --noEmit` — only pre-existing test type errors remain.
- **Committed in:** No separate commit — fix was applied before Task 1 commit.

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Essential correctness fix. Without peerDependencies, all satellite apps would have dual-class TS errors when calling checkAppAccess. No scope creep.

## Issues Encountered

**Pre-workspace npm node_modules blocking fresh pnpm hoisting:**
Both `camera-trap-dashboard` and `trap-monitor/frontend` had pre-workspace npm-installed `node_modules` containing `@supabase/supabase-js@2.98.0`. With `node-linker=hoisted`, pnpm correctly puts packages at workspace root, but these old npm copies were not cleaned up. Windows `rmdir /s /q` partially failed (file locks on some files). PowerShell `Remove-Item -Recurse -Force` successfully cleared them. After clearing, pnpm install hoisted everything to workspace root correctly with no app-level duplicates.

**Pre-existing typecheck errors in trap-monitor (NOT caused by this plan):**
`pnpm -r run typecheck` fails for trap-monitor only due to pre-existing errors in:
- `src/components/dashboard/CameraEventList.test.tsx` — `TS2304: Cannot find name 'beforeEach'` (vitest globals not in tsconfig types)
- `src/components/dashboard/ImageViewer.test.tsx` — same
- `src/lib/rls-policies.test.ts` — mock type errors on Supabase chain

These existed before Plan 03-02. Confirmed via `git stash` test. Documented in `deferred-items.md`.
Portal, camera-trap-dashboard, and fire-app all pass tsc with zero errors.

## User Setup Required

None — no external service configuration required. Workspace package wiring is automatic.

## Next Phase Readiness

- All 4 apps consume `@trackline/supabase-config` via workspace:* — single source of truth for `checkAppAccess`, `getUserApps`, and shared types
- Trap Monitor test suite intact (322 passing) — SEC-01 behavior correctly tested
- Phase 04 (shared UI library) can proceed — all apps now demonstrate correct workspace package consumption pattern
- Deferred: trap-monitor pre-existing typecheck errors (`beforeEach` globals, rls-policies mocks) — tracked in deferred-items.md

---
*Phase: 03-shared-supabase-package*
*Completed: 2026-03-30*

## Self-Check: PASSED

- [x] `camera-trap-dashboard/src/lib/check-access.ts` — FOUND (re-export shim)
- [x] `trap-monitor/frontend/src/lib/check-access.ts` — FOUND (re-export shim)
- [x] `camera-trap-dashboard/next.config.ts` — FOUND (transpilePackages added)
- [x] `03-02-SUMMARY.md` — FOUND
- [x] Commit `b9e198a` (camera-trap-dashboard Task 1) — FOUND
- [x] Commit `72129c6` (trap-monitor Task 2) — FOUND
- [x] Commit `1e6f095` (fire-app Task 2) — FOUND
- [x] Commit `bf7c355` (portal Task 3) — FOUND
