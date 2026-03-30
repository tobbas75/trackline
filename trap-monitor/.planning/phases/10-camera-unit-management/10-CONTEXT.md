# Phase 10: Camera Unit Management + Product Routing - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Camera units managed via existing org UI. Dashboard dynamically derives available product views from registered device types. Product toggle when org has both types. No settings page — device onboarding activates the product view.

Requirements: UNIT-02, UNIT-03, UNIT-04

</domain>

<decisions>
## Implementation Decisions

### Product Activation
- Products are activated by device registration — no settings page, no org configuration
- Query `SELECT DISTINCT device_type FROM units WHERE org_id = $1` to determine available products
- If only trap_monitor units exist → show trap monitor dashboard (existing behaviour)
- If only camera_trap units exist → show camera trap dashboard
- If both exist → show unified dashboard with product toggle

### Product Toggle
- Toggle component in dashboard header (next to OrgSelector)
- Options: "All" | "Trap Monitor" | "Camera Trap" — only shows when org has both types
- When org has single product, toggle is hidden, dashboard auto-adapts
- Toggle state stored in React state (not persisted — defaults to "All" on page load)
- Toggle filters the unit grid and event list by device_type

### Camera Unit CRUD
- Extend existing unit create/edit forms with device_type selector (trap_monitor | camera_trap)
- Camera-specific fields shown conditionally: model, firmware_version
- Default device_type for new units: trap_monitor (backwards compatible)
- Existing units unaffected — they default to trap_monitor from migration 012

### Camera Unit Detail
- Camera unit detail page shows recent camera_events with thumbnails
- Thumbnails loaded from Supabase Storage (camera-images bucket)
- Show detection count, top species, and last capture time

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- frontend/src/components/dashboard/UnitGrid.tsx — unit list component to extend
- frontend/src/components/dashboard/OrgSelector.tsx — header component pattern for toggle
- frontend/src/hooks/useDashboardData.ts — data fetching hook to extend with device_type awareness
- frontend/src/app/dashboard/units/[unitId]/page.tsx — unit detail to extend
- frontend/src/app/api/orgs/[orgId]/units/route.ts — unit CRUD API
- frontend/src/lib/types.ts — Unit type already has device_type and connectivity_method

### Established Patterns
- Dashboard uses useDashboardData hook for all state
- OrgSelector in header with dropdown
- UnitGrid filters via filteredUnits computed from state
- Unit detail page fetches unit + events on mount

### Integration Points
- useDashboardData.ts — add device type query, product toggle state
- UnitGrid.tsx — filter by device_type when toggle active
- EventList.tsx — filter by device_type when toggle active
- Unit create/edit forms — add device_type field
- Unit detail page — camera-specific event list

</code_context>

<specifics>
## Specific Ideas

- ProductToggle component: simple segmented control ("All" | "Trap Monitor" | "Camera Trap")
- Only render ProductToggle when `availableProducts.length > 1`
- Camera unit detail: show last 10 camera_events with thumbnail grid
- Thumbnail URL: Supabase Storage public URL from camera_events.image_path

</specifics>

<deferred>
## Deferred Ideas

- Camera event map view (GPS-tagged detections on Leaflet) — Phase 11 or future
- Device connectivity switching UI (SMS ↔ MQTT toggle per unit) — future milestone

</deferred>
