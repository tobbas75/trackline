# Phase 5: Dashboard Upgrade - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous — discuss skipped)

<domain>
## Phase Boundary

The portal dashboard app switcher shows live app status and user role badges, built with shared UI components. Deliverables: upgraded dashboard with app switcher using shared Card/Badge/Avatar, app status column in portal.apps table, status indicators, quick-launch.

Requirements: DASH-01, DASH-02, DASH-03

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — autonomous mode.

Key context:
- Dashboard is at src/app/(protected)/dashboard/page.tsx
- Currently shows basic cards with external links
- Should use @trackline/ui Card, Badge, Avatar components
- DASH-02 needs ALTER TABLE portal.apps ADD COLUMN status text DEFAULT 'active'
- Status values: active, maintenance, down
- Keep the Between23 aesthetic, elegant and clean
- User wants to allocate different apps to different users — this already works via portal.app_access

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- src/app/(protected)/dashboard/page.tsx — current dashboard
- src/lib/check-access.ts — getUserApps() returns app data with roles
- @trackline/ui — Card, Badge, Avatar, Button components
- supabase/migrations/ — existing portal schema

### Integration Points
- portal.apps table needs status column (new migration)
- Dashboard page needs to import from @trackline/ui
- getUserApps() return type may need updating to include status

</code_context>

<specifics>
## Specific Ideas

User specifically requested "Dashboard app switcher with status indicators and quick-launch."

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
