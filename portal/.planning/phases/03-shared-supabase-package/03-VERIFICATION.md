---
phase: 03-shared-supabase-package
verified: 2026-03-29T00:00:00Z
status: gaps_found
score: 5/6 must-haves verified
re_verification: false
gaps:
  - truth: "A TypeScript type error in checkAppAccess return type surfaces in all three consuming satellite apps at typecheck time"
    status: partial
    reason: "fire-app has no src/ directory and no code that calls checkAppAccess — a type error in the shared package cannot propagate to fire-app until it has consuming source files"
    artifacts:
      - path: "fire-app"
        issue: "Stub app with no src/ directory; @trackline/supabase-config is declared as a dep and transpilePackages is configured, but there are zero call sites for checkAppAccess — type errors in the shared package are invisible to fire-app"
    missing:
      - "fire-app needs at least one source file that imports and calls checkAppAccess from @trackline/supabase-config (or from @/lib/check-access shim) for type error propagation to work at typecheck time"
      - "This is acceptable to defer if fire-app remains a stub in Phase 3 scope — but SC3 as written cannot be verified as PASSED until fire-app has consuming code"
human_verification:
  - test: "Run pnpm db:types from workspace root (with SUPABASE_PROJECT_ID set)"
    expected: "All four apps regenerate their database.types.ts files from a single command without error"
    why_human: "Cannot run the supabase CLI in this verification session — requires SUPABASE_PROJECT_ID and network access to the live Supabase project"
  - test: "Introduce a deliberate type change to packages/supabase-config/src/check-access.ts (e.g. change AppAccess.role to string instead of AppRole | null), then run pnpm -r run typecheck"
    expected: "TypeScript errors appear in camera-trap-dashboard and trap-monitor (which call checkAppAccess via shim), confirming type error propagation"
    why_human: "Cannot run tsc across the full workspace in this verification session due to environment constraints; the import chain has been traced and is structurally correct but runtime confirmation needs a typecheck run"
---

# Phase 3: Shared Supabase Package Verification Report

**Phase Goal:** A single @trackline/supabase-config package is the authoritative source for checkAppAccess, client factories, and shared types — consumed by all three satellite apps
**Verified:** 2026-03-29
**Status:** gaps_found (1 gap: SC3 partially satisfiable — fire-app is a stub with no consuming code)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `packages/supabase-config/src/index.ts` exports AppId, AppRole, AppAccess, checkAppAccess, getUserApps, createBrowserClient, createServerClient | ✓ VERIFIED | All 7 exports confirmed present in index.ts (lines 2–9) |
| 2 | The shared check-access.ts preserves the SEC-01 NODE_ENV guard | ✓ VERIFIED | `process.env.NODE_ENV !== 'production'` guard confirmed at line 28 of packages/supabase-config/src/check-access.ts |
| 3 | All three satellite apps import checkAppAccess from @trackline/supabase-config — no local implementations remain | ✓ VERIFIED | camera-trap-dashboard and trap-monitor have re-export shims; fire-app has no check-access.ts at all (it is a stub app with no src/ directory, which the plan explicitly acknowledges) |
| 4 | All 4 apps (including portal) have transpilePackages: ['@trackline/supabase-config'] in next.config.ts | ✓ VERIFIED | All four next.config.ts files confirmed to contain `transpilePackages: ["@trackline/supabase-config"]` |
| 5 | Root db:types script regenerates types for all apps from one command | ✓ VERIFIED | Root package.json has db:types covering all 4 apps via --filter; all 4 app package.json files have individual db:types scripts |
| 6 | A type error in checkAppAccess return type surfaces in all three consuming apps at typecheck time | ✗ PARTIAL | camera-trap-dashboard and trap-monitor are structurally wired (shim -> shared package); fire-app has no consuming source code — type errors cannot surface in an app with no call sites |

**Score:** 5/6 truths verified (SC3 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/supabase-config/package.json` | Package manifest with source-first exports | ✓ VERIFIED | `"name": "@trackline/supabase-config"`, `"main": "./src/index.ts"`, Supabase deps in peerDependencies |
| `packages/supabase-config/tsconfig.json` | Extends @trackline/tsconfig/base.json | ✓ VERIFIED | Extends correct path, includes src/**/* |
| `packages/supabase-config/src/types.ts` | AppId, AppRole, AppAccess type definitions | ✓ VERIFIED | All three types present and correctly typed |
| `packages/supabase-config/src/client.ts` | createBrowserClient factory | ✓ VERIFIED | Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env |
| `packages/supabase-config/src/server.ts` | createServerClient factory using next/headers | ✓ VERIFIED | Uses cookies() from next/headers, implements getAll/setAll pattern |
| `packages/supabase-config/src/check-access.ts` | checkAppAccess + getUserApps with SEC-01 guard | ✓ VERIFIED | SEC-01 guard at line 28; no portal-only admin functions present |
| `packages/supabase-config/src/index.ts` | Barrel export of all public API | ✓ VERIFIED | Exports all 7 symbols: AppId, AppRole, AppAccess, createBrowserClient, createServerClient, checkAppAccess, getUserApps |
| `camera-trap-dashboard/src/lib/check-access.ts` | Re-export shim to @trackline/supabase-config | ✓ VERIFIED | 2-line shim; no local implementation; call sites unchanged |
| `trap-monitor/frontend/src/lib/check-access.ts` | Re-export shim to @trackline/supabase-config | ✓ VERIFIED | 2-line shim; test suite updated with NODE_ENV stub |
| `fire-app/package.json` | @trackline/supabase-config workspace:* dep declared | ✓ VERIFIED | `"@trackline/supabase-config": "workspace:*"` present |
| Root `package.json` | db:types aggregator script | ✓ VERIFIED | Calls pnpm --filter for all 4 apps sequentially |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/supabase-config/src/index.ts` | `check-access.ts` | `export { checkAppAccess, getUserApps } from "./check-access"` | ✓ WIRED | Line 9 of index.ts |
| `packages/supabase-config/src/check-access.ts` | `portal.check_app_access()` RPC | `supabase.rpc("check_app_access", { target_app_id: appId })` | ✓ WIRED | Line 16–18 of check-access.ts |
| `camera-trap-dashboard/src/lib/check-access.ts` | `@trackline/supabase-config` | re-export shim | ✓ WIRED | `export { checkAppAccess, getUserApps } from "@trackline/supabase-config"` |
| `camera-trap-dashboard/src/app/(auth)/layout.tsx` | `@trackline/supabase-config` | `@/lib/check-access` shim | ✓ WIRED | layout.tsx imports from `@/lib/check-access`; shim delegates to shared package |
| `trap-monitor/frontend/src/lib/check-access.ts` | `@trackline/supabase-config` | re-export shim | ✓ WIRED | `export { checkAppAccess, getUserApps } from "@trackline/supabase-config"` |
| `trap-monitor/frontend/src/app/dashboard/layout.tsx` | `@trackline/supabase-config` | `@/lib/check-access` shim | ✓ WIRED | Multiple call sites confirmed (layout.tsx, cards/page.tsx, field-check/page.tsx, useDashboardData.ts) |
| `fire-app` | `@trackline/supabase-config` | declared dep + transpilePackages | ✗ ORPHANED | Dependency declared and transpilePackages configured, but fire-app has no src/ directory — no actual call sites exist |
| Root `package.json db:types` | `fire-app db:types` | `pnpm --filter fire-app run db:types` | ✓ WIRED | fire-app has its own db:types script (pre-existing); root script calls it |

---

## Data-Flow Trace (Level 4)

Not applicable — this phase creates infrastructure/utility code only (a shared package and re-export shims). No components render dynamic data as part of this phase's deliverables.

---

## Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|----------|--------|
| camera-trap-dashboard resolves checkAppAccess through shim to shared package | Import chain traced: layout.tsx -> @/lib/check-access -> @trackline/supabase-config/src/check-access.ts | ✓ VERIFIED (static) |
| trap-monitor resolves checkAppAccess through shim to shared package | Multiple call sites traced; test suite updated with NODE_ENV stub; commit `72129c6` confirms 322 tests pass | ✓ VERIFIED (static) |
| Root db:types aggregates all 4 apps | Script confirmed in root package.json; all 4 app-level scripts confirmed present | ✓ VERIFIED (static) |
| pnpm db:types invocation | Requires SUPABASE_PROJECT_ID + live Supabase connection | ? SKIP — needs human |
| Workspace-wide typecheck passes (portal, camera-trap-dashboard, fire-app) | Plan summary confirms pnpm -r run typecheck passes for these 3; trap-monitor has pre-existing errors (deferred) | ? SKIP — needs human confirmation |

Note on tsc: Cannot run `pnpm --filter @trackline/supabase-config exec tsc --noEmit` in this environment. The plan summary confirms it passed during execution (zero errors). The package structure, tsconfig, and import chain are all correctly configured.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PKG-01 | 03-01-PLAN.md | @trackline/supabase-config package exporting Supabase client factories and check-access utilities | ✓ SATISFIED | Package exists with all required exports; SEC-01 guard present; admin-only functions excluded |
| PKG-02 | 03-02-PLAN.md | All 3 downstream apps consume @trackline/supabase-config via workspace:* protocol | ✓ SATISFIED | camera-trap-dashboard and trap-monitor: re-export shims confirmed; fire-app: workspace:* dep declared and transpilePackages configured (stub app with no consuming code to migrate) |
| PKG-03 | 03-03-PLAN.md | Root-level db:types script generating Supabase types for all apps | ✓ SATISFIED | Root script confirmed; all 4 individual app scripts confirmed |

No orphaned requirements — all 3 phase requirements are accounted for in plans.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `portal/src/lib/check-access.ts` | Defines its own AppId, AppRole, AppAccess types and checkAppAccess implementation separately from the shared package | ℹ Info | Portal maintains a dual implementation — its own checkAppAccess is structurally identical to the shared one but structurally independent. A type change to the shared package's AppAccess would NOT surface in portal's own check-access.ts. This is intentional by design (portal keeps local file for admin functions) but means the portal is not a consumer of the shared types. |
| `fire-app` | No src/ directory — the @trackline/supabase-config dep is declared but completely unconsumed | ⚠ Warning | SC3 cannot be satisfied for fire-app until it has source files that call checkAppAccess. This was known and accepted in the plan. |

No blockers found. No placeholder/stub implementations in the shared package itself. No hardcoded credentials. SEC-01 guard is correct and present.

---

## Human Verification Required

### 1. db:types End-to-End Run

**Test:** Set `SUPABASE_PROJECT_ID` in shell, then run `pnpm db:types` from the workspace root (`c:/Software code GITs/LandManagment Website/`)
**Expected:** All four apps regenerate `src/lib/supabase/database.types.ts` without errors; command exits 0
**Why human:** Requires SUPABASE_PROJECT_ID environment variable and a live network connection to the Supabase project — cannot be run in this verification session

### 2. Type Error Propagation Confirmation

**Test:** In `packages/supabase-config/src/check-access.ts`, temporarily change the return type of `checkAppAccess` (e.g. change `Promise<AppAccess>` to `Promise<{ hasAccess: string; role: string }>`), then run `pnpm -r run typecheck`
**Expected:** TypeScript errors appear in camera-trap-dashboard (layout.tsx) and trap-monitor (layout.tsx, page.tsx files, useDashboardData.ts) — confirming type error propagation works for these two consumers. fire-app should not show errors (no consuming code).
**Why human:** Cannot run tsc across the workspace in this session; import chain is structurally verified but a live typecheck run is the definitive proof

### 3. Trap Monitor Test Suite Passes

**Test:** Run `pnpm --filter trap-monitor-dashboard test` from workspace root
**Expected:** All 322 tests pass including the SEC-05 describe block (which now stubs NODE_ENV=production)
**Why human:** Cannot run vitest in this environment; commit `72129c6` confirms 322 passing but this should be re-confirmed against the current state of the file

---

## Gaps Summary

**One gap blocks full SC3 satisfaction:** fire-app is a stub application with no `src/` directory and zero TypeScript source files that call `checkAppAccess`. The `@trackline/supabase-config` workspace dependency and `transpilePackages` configuration are correctly declared in `fire-app/package.json` and `fire-app/next.config.ts`, making fire-app *ready* to consume the shared package. However, the phase-level Success Criterion 3 — "A TypeScript type error in the shared checkAppAccess return type surfaces in all three consuming apps at typecheck time" — cannot be satisfied for fire-app until it has source code that actually imports and calls `checkAppAccess`.

This gap was explicitly acknowledged in Plan 03-02 ("fire-app has no check-access.ts to replace (it's a stub app with no src/ directory)") and the plan's own success criteria were scoped accordingly. The gap is a consequence of fire-app being a stub, not an oversight or implementation error.

**Two satellite apps (camera-trap-dashboard and trap-monitor) are fully wired** — their import chains are traced end-to-end from call site through shim to the shared package, and type errors will propagate correctly at typecheck time.

**PKG-01, PKG-02, PKG-03 are all satisfied** per REQUIREMENTS.md. The phase goal is substantially achieved. The fire-app SC3 limitation is pre-existing and structural.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
