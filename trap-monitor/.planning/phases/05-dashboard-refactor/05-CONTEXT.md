# Phase 5: Dashboard Refactor - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Complete dashboard refactor polish: fix test types, add aria-labels, add ARM/DISARM confirmation. Core extraction already done.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. UI review findings incorporated into plan.

</decisions>

<code_context>
## Existing Code Insights

OrgSelector, EventList, UnitGrid, useDashboardData all extracted. page.tsx at 198 lines. Tests exist but have type issues.

</code_context>

<specifics>
## Specific Ideas

UI Review findings: missing aria-labels, no ARM/DISARM confirmation, hardcoded hex in BatteryChart.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
