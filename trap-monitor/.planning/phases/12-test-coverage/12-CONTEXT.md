# Phase 12: Test Coverage - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All new v2.0 code is tested and overall coverage remains at or above the 70% threshold. This covers MQTT ingestion edge function, camera event/detection storage, image storage, and camera dashboard components.

Requirements: TST-01, TST-02, TST-03, TST-04, TST-05

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase. Follow existing Vitest testing patterns from v1.0 Phase 7.

Key patterns to follow:
- Mock Supabase client with vi.mock('@/lib/supabase/server')
- Use mockGetUser, mockFrom pattern from existing route tests
- Dynamic imports for route handlers (await import('./route'))
- Component tests with @testing-library/react

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing test patterns in frontend/src/app/api/ (command, orgs, push, notifications route tests)
- frontend/src/components/dashboard/*.test.tsx (OrgSelector, EventList, UnitGrid component tests)
- frontend/vitest.config.ts (configured with 70% thresholds)
- backend/supabase/functions/ingest-sms/ (reference for edge function testing patterns)

### Files to Test
- backend/supabase/functions/ingest-mqtt/index.ts (MQTT ingestion — TST-01)
- Camera event/detection queries (TST-02)
- Image storage upload/retrieve (TST-03)
- frontend/src/components/dashboard/CameraEventList.tsx (TST-04)
- frontend/src/components/dashboard/ImageViewer.tsx (TST-04)
- frontend/src/components/dashboard/CameraEventFilters.tsx (TST-04)
- frontend/src/components/dashboard/ProductToggle.tsx (TST-04)

</code_context>

<specifics>
## Specific Ideas

None — follow established patterns.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
