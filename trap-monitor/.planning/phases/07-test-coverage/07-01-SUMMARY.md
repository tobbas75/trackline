---
phase: 07-test-coverage
plan: 01
subsystem: frontend
tags: [testing, security, api-routes, portal-access]
dependency_graph:
  requires: []
  provides: [check-access-tests, org-crud-tests, unit-crud-tests]
  affects: [test-coverage]
tech_stack:
  added: []
  patterns: [vitest-mocking, supabase-client-mock, chainable-mock-pattern]
key_files:
  created:
    - frontend/src/lib/check-access.test.ts
    - frontend/src/app/api/orgs/[orgId]/route.test.ts
    - frontend/src/app/api/orgs/[orgId]/units/route.test.ts
    - frontend/src/app/api/orgs/[orgId]/units/[unitId]/route.test.ts
  modified: []
decisions:
  - Inline mock Supabase client for check-access (no module-level vi.mock needed since functions accept client param)
  - Module-level vi.mock for route tests (routes call createClient internally)
  - callCount pattern for multi-step mockFrom chains (org membership check then delete)
metrics:
  duration: 3 min
  completed: 2026-03-29
---

# Phase 7 Plan 1: Check-Access and Org/Unit CRUD Route Tests Summary

Tests for portal access gating (check-access.ts with SEC-05 fail-closed verification) and org/unit CRUD API routes (DELETE org, GET/POST units, GET/PUT/DELETE single unit)

## What Changed

### Task 1: check-access.ts tests (portal access gating + SEC-05)
**Commit:** `7b16960`

Added 13 tests covering `checkAppAccess` and `getUserApps` in `frontend/src/lib/check-access.test.ts`:

- **SEC-05 fail-closed:** 3 tests verify portal infrastructure missing errors ("check_app_access", "schema cache", "Invalid schema: portal") all return `{ hasAccess: false, role: null }`
- **Structured logging:** Verified `console.warn` outputs JSON with `level`, `msg`, `app_id`, `error`, `ts` fields
- **Success path:** RPC returns `has_access: true` with correct role mapping
- **Denial paths:** `has_access: false`, empty data array, null data all return denied
- **Generic error:** Non-infrastructure RPC errors return denied without portal-specific warning
- **RPC argument verification:** Confirms correct function name and target_app_id parameter
- **getUserApps:** Success returns data array, error returns empty array, null data returns empty array, schema called with "portal"

### Task 2: Org/Unit CRUD API route tests
**Commit:** `2c0ee0f` (pre-existing)

3 test files covering org deletion and unit CRUD routes:

**`orgs/[orgId]/route.test.ts`** (5 tests):
- Auth guard: 401 for unauthenticated users
- Owner-only: 403 for non-owner (member role) and missing membership
- Success: 200 with `{ success: true }` for owner
- Error: 500 on database error

**`orgs/[orgId]/units/route.test.ts`** (6 tests):
- GET: Returns units filtered by org_id, 500 on DB error
- POST: 400 for missing id, 400 for missing name, 201 with unit data on success, 500 on DB error

**`orgs/[orgId]/units/[unitId]/route.test.ts`** (6 tests):
- GET: Returns unit by id + org_id, 404 when not found
- PUT: Returns updated unit, 500 on DB error
- DELETE: Returns `{ success: true }`, 500 on DB error

## Verification

```
Test Files  18 passed (18)
     Tests  235 passed (235)
  Duration  1.82s
```

All 4 new test files discovered and pass. No existing tests broken. Full test suite exits 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Tests] Added null data and has_access=false tests**
- **Found during:** Task 1
- **Issue:** Plan behavior list specified "RPC returns null data" and "RPC succeeds with has_access=false" tests but existing file lacked them
- **Fix:** Added 3 additional tests (null data, has_access=false, RPC argument verification)
- **Files modified:** `frontend/src/lib/check-access.test.ts`
- **Commit:** `7b16960`

## Known Stubs

None.

## Self-Check: PASSED
