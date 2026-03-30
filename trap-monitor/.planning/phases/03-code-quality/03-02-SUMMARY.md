---
phase: 03-code-quality
plan: 02
subsystem: frontend
tags: [nextjs, react, leaflet, typescript, type-safety, json-validation, error-handling]

# Dependency graph
requires: []
provides:
  - "Type-safe MapView with Unit[] and TrapEvent[] props"
  - "Leaflet icon workaround using intersection type narrowing"
  - "Command log insert error handling with structured JSON logging"
  - "JSON schema validation at all localStorage parse sites in dashboard"
  - "Clean Map-based org deduplication with extracted helpers"
affects: [dashboard-refactor, test-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intersection type narrowing for runtime-only properties (Leaflet _getIconUrl)"
    - "Structured JSON error logging for non-fatal DB failures"
    - "Array.isArray guard after JSON.parse for localStorage data"
    - "Map-based deduplication with role priority comparison"

key-files:
  created: []
  modified:
    - "frontend/src/components/map/MapView.tsx"
    - "frontend/src/app/api/command/route.ts"
    - "frontend/src/hooks/useDashboardData.ts"
    - "frontend/src/app/dashboard/field-check/page.tsx"
    - "frontend/src/app/api/orgs/route.ts"

key-decisions:
  - "Used intersection type (L.Icon.Default & { _getIconUrl?: unknown }) instead of as any for Leaflet workaround"
  - "Command log insert failure does not fail the overall request -- SMS was already sent successfully"
  - "Corrupt localStorage data is cleaned up (removed) rather than silently ignored"
  - "OrgMemberRow.organisations typed as single object | null matching PostgREST many-to-one behavior"

patterns-established:
  - "JSON.parse + Array.isArray guard pattern for localStorage reads"
  - "logged: boolean flag in API responses indicating whether DB side-effect succeeded"
  - "rolePriority() helper extracted to orgs.helpers.ts for reuse"

requirements-completed: [CQ-02, CQ-04, ERR-01, ERR-04, CQ-05]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 3 Plan 2: MapView Props, Leaflet Fix, Command Log Errors, JSON Validation, Org Dedup Summary

**Typed MapView with Unit[]/TrapEvent[] props and intersection-typed Leaflet workaround, added structured error logging for command DB inserts with logged flag, validated all 4 JSON.parse sites in dashboard with Array.isArray guards and corrupt data cleanup, and cleaned org deduplication to Map-based approach with extracted helpers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T14:44:28Z
- **Completed:** 2026-03-24T14:52:28Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- MapView props typed as Unit[] and TrapEvent[] with zero `any` occurrences in the file
- Leaflet _getIconUrl workaround uses intersection type narrowing (`L.Icon.Default & { _getIconUrl?: unknown }`) instead of `as any`
- Command log insert failures produce structured JSON error with actor, unit_id, error message; response includes `logged` boolean flag
- All 4 JSON.parse locations in useDashboardData.ts and field-check/page.tsx have schema validation with corrupt data cleanup
- Org deduplication uses clean Map-based approach with rolePriority() from extracted helpers module
- TypeScript compiles with zero type errors in all modified files

## Task Commits

Implementation was completed as part of WIP commit 0ea7e43 prior to plan execution. Verification confirmed all requirements met:

1. **Task 1: Type MapView props and fix Leaflet icon workaround** - `0ea7e43` (chore)
2. **Task 2: Handle command log insert errors and add JSON schema validation** - `0ea7e43` (chore)
3. **Task 3: Clean up org deduplication with proper typing** - `0ea7e43` (chore)

## Files Created/Modified
- `frontend/src/components/map/MapView.tsx` - Typed props (Unit[], TrapEvent[]), intersection type for Leaflet workaround
- `frontend/src/app/api/command/route.ts` - Command log error handling with structured JSON logging, `logged` flag in response
- `frontend/src/hooks/useDashboardData.ts` - JSON.parse validation with Array.isArray guard for fieldCheckQueue
- `frontend/src/app/dashboard/field-check/page.tsx` - JSON.parse validation at 3 locations (queue sync, cached units, offline queue)
- `frontend/src/app/api/orgs/route.ts` - Map-based org dedup, simplified OrgMemberRow type, helpers imported from orgs.helpers.ts

## Decisions Made
- Intersection type over `as any`: More precise than blanket `as any` -- only declares the specific runtime property `_getIconUrl` we need to delete
- Non-fatal command log error: SMS was already sent when log insert fails, so failing the request would mislead the user about command delivery
- localStorage cleanup on corruption: Removing corrupt data and resetting to zero is safer than attempting repair of unknown structure
- PostgREST single-object type: Removed Array union from OrgMemberRow.organisations since PostgREST many-to-one joins always return a single object or null

## Deviations from Plan

None - plan executed exactly as written. All implementation was already in place from WIP commit.

## Issues Encountered
- TypeScript `tsc --noEmit` reports errors in test files (UnitGrid.test.tsx, rls-policies.test.ts) -- these are pre-existing test mock type issues unrelated to this plan's changes. No errors in any plan-related files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MapView is fully typed for Phase 5 dashboard refactor
- Command route error handling supports Phase 7 test coverage
- Org route clean typing supports Phase 7 test coverage
- No blockers

## Self-Check: PASSED

- All referenced files verified to exist on disk
- Commit 0ea7e43 verified in git log
- All verification commands returned PASS
- TypeScript compilation clean for all plan-related files

---
*Phase: 03-code-quality*
*Completed: 2026-03-24*
