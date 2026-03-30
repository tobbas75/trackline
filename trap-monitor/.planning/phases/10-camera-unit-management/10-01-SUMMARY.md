---
phase: 10-camera-unit-management
plan: 01
subsystem: frontend
tags: [dashboard, product-toggle, unit-crud, camera-trap]
dependency_graph:
  requires: []
  provides: [ProductToggle, product-aware-dashboard, camera-unit-crud]
  affects: [dashboard, unit-management, unit-api]
tech_stack:
  added: []
  patterns: [device-type-filtering, conditional-form-fields]
key_files:
  created:
    - frontend/src/components/dashboard/ProductToggle.tsx
  modified:
    - frontend/src/hooks/useDashboardData.ts
    - frontend/src/app/dashboard/page.tsx
    - frontend/src/app/orgs/[orgId]/units/page.tsx
    - frontend/src/app/api/orgs/[orgId]/units/route.ts
    - frontend/src/app/api/orgs/[orgId]/units/[unitId]/route.ts
decisions:
  - Derive availableProducts from fetched units (no separate query)
  - Auto-select single product type when org has only one device type
  - Device type immutable after unit creation (disabled on edit)
  - Phone/SIM and armed fields hidden for camera_trap units
metrics:
  duration: 7m
  completed: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 10 Plan 01: Product-Aware Dashboard and Camera Unit CRUD Summary

Product toggle filtering on dashboard with device-type-aware unit creation and editing for camera_trap units.

## What Was Done

### Task 1: ProductToggle component and product-aware dashboard filtering
- Created `ProductToggle.tsx` segmented control component with "All", "Trap Monitor", "Camera Trap" options
- Extended `useDashboardData` hook with `availableProducts`, `activeProduct`, `setActiveProduct`, `filteredEvents`
- `filteredUnits` applies device_type filter before existing status/search/sort filters
- `filteredEvents` filters events to only those from product-matching units
- ProductToggle renders null when org has only one device type (no toggle needed)
- Wired into dashboard header between OrgSelector and action links

### Task 2: Device type selector and camera fields in unit CRUD
- Added `device_type` select to unit creation form (trap_monitor default, camera_trap option)
- Device type disabled on edit (immutable after creation)
- Camera-specific fields (model, cam_firmware_version) shown conditionally for camera_trap
- Phone Number / SIM ID field hidden for camera_trap units (they use MQTT, not SMS)
- Armed checkbox hidden for camera_trap units
- Unit cards show "Cam" badge and camera model for camera units
- Header subtitle shows device type breakdown when cameras present
- POST API route accepts `device_type`, `model`, `cam_firmware_version`; defaults `device_type` to `trap_monitor`
- PUT API route accepts `model`, `cam_firmware_version` but does not allow changing `device_type`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | a326fa5 | feat(10-01): add ProductToggle component and product-aware dashboard filtering |
| 2 | 14f8356 | feat(10-01): add device_type selector and camera fields to unit CRUD |

## Deviations from Plan

None - plan executed exactly as written. Task 1 code was already present (from prior phase work) and committed as-is.

## Verification

- TypeScript compilation: PASSED (only pre-existing test file errors in rls-policies.test.ts)
- Frontend build: PASSED (all routes compiled successfully)
- ProductToggle exports: ProductToggle and ProductToggleProps confirmed
- useDashboardData returns: availableProducts, activeProduct, setActiveProduct, filteredEvents confirmed

## Known Stubs

None. All functionality is fully wired to live data sources.

## Self-Check: PASSED

- All 6 key files: FOUND
- Commit a326fa5: FOUND
- Commit 14f8356: FOUND
