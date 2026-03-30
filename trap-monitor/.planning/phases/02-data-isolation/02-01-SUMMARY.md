---
phase: 02-data-isolation
plan: 01
subsystem: database, ui
tags: [supabase, realtime, postgres, org-scoping, rls, composite-index]

# Dependency graph
requires: []
provides:
  - Org-scoped event queries on cards dashboard view
  - Server-side org_id filters on all realtime subscriptions (cards view)
  - Verified composite indexes for performant org-scoped queries
affects: [05-dashboard-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase realtime filter pattern: filter: `org_id=eq.${currentOrg.id}`"
    - "Org-scoped channel naming: `trap_realtime_{view}_{orgId}` for subscription lifecycle"
    - "Event query scoping: .eq('org_id', currentOrg.id) before .order().limit()"

key-files:
  created: []
  modified:
    - frontend/src/app/dashboard/cards/page.tsx

key-decisions:
  - "Used direct org_id filter on events (not unit_id IN subquery) since migration 011 added org_id to events table"
  - "Removed client-side org_id guard on units INSERT callback since server-side filter makes it redundant"

patterns-established:
  - "All dashboard realtime subscriptions must include server-side filter: `org_id=eq.${currentOrg.id}`"
  - "All event SELECT queries must include .eq('org_id', currentOrg.id) before ordering/limiting"
  - "Channel names must include org ID for proper subscription cleanup on org switch"

requirements-completed: [ISO-01, ISO-02, ISO-03]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 2 Plan 1: Data Isolation Summary

**Org-scoped event queries and server-side realtime filters on cards dashboard view, completing data isolation across all dashboard views**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T12:36:12Z
- **Completed:** 2026-03-24T12:38:29Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Cards view event query now filters by org_id before ordering/limiting, ensuring the "latest 100" results are always scoped to the current org
- All three realtime subscriptions (events INSERT, units INSERT, units UPDATE) now use server-side `filter` parameter with org_id, preventing cross-org event delivery at the database level
- Channel name includes org ID for proper subscription cleanup/recreation when switching organizations
- Verified all dashboard views (main, cards, field-check, unit detail) have correct data isolation
- Verified composite indexes exist (idx_events_org_triggered, idx_events_unit_triggered) supporting performant org-scoped queries
- Verified edge function (ingest-sms) populates org_id on new events for realtime filter support
- Verified no modifications to shared/WildTrack-owned tables in any migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Scope cards page event query and realtime subscriptions to current org** - `c7cfc49` (fix)
2. **Task 2: Verify all data isolation requirements across entire codebase** - verification only, no code changes

## Files Created/Modified
- `frontend/src/app/dashboard/cards/page.tsx` - Added org_id scoping to event query and server-side filters to all realtime subscriptions

## Decisions Made
- Used direct `.eq("org_id", currentOrg.id)` on events table (not unit_id IN subquery) since migration 011 already added org_id column to events and backfilled existing rows
- Removed client-side `if (newUnit.org_id === currentOrg.id)` guard on units INSERT callback since the server-side filter makes it redundant and the check was adding unnecessary complexity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `UnitGrid.test.tsx` and `rls-policies.test.ts` (vitest mock typing issues) -- these are unrelated to the data isolation changes and were not modified

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All dashboard views now have complete data isolation (org-scoped queries + server-side realtime filters)
- Phase 5 (Dashboard Refactor) can proceed with confidence that data isolation patterns are established
- The pattern `filter: \`org_id=eq.${currentOrg.id}\`` is now consistent across all realtime subscriptions

## Self-Check: PASSED

- All files exist on disk
- Commit c7cfc49 verified in git log

---
*Phase: 02-data-isolation*
*Completed: 2026-03-24*
