---
phase: 08-database-schema-storage-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, rls, camera-trap, species, schema, migration]

requires:
  - phase: 02-data-isolation
    provides: org-scoped RLS patterns and trap_can_* functions

provides:
  - species table with 24 Australian wildlife seed entries
  - camera_events table with NE301 metadata columns and org-scoped RLS
  - camera_detections table with normalised bounding box coordinates
  - units table device_type and connectivity_method columns
  - realtime subscription for camera_events

affects: [08-02-storage-bucket, 09-mqtt-ingestion, 10-camera-dashboard]

tech-stack:
  added: []
  patterns: [denormalised org_id on camera_events for RLS performance, EXISTS subquery RLS on camera_detections]

key-files:
  created:
    - backend/supabase/migrations/012_camera_pipeline_schema.sql
  modified: []

key-decisions:
  - "Denormalised org_id on camera_events (same pattern as events table migration 011) for efficient RLS without joins"
  - "Species table is global (not org-scoped) with authenticated read, service_role write"
  - "Bounding box coords stored as real with CHECK 0-1 matching NE301 normalised output"
  - "camera_detections RLS uses EXISTS join to camera_events for org scoping"

patterns-established:
  - "Camera tables follow same RLS pattern as existing trap tables: trap_can_view_org for SELECT, service_role for INSERT/UPDATE, trap_can_admin_org for DELETE"
  - "Units table extended via ADD COLUMN IF NOT EXISTS with safe defaults preserving existing rows"

requirements-completed: [CAM-01, CAM-02, CAM-03, CAM-04, CAM-06, MQTT-03, UNIT-01]

duration: 1min
completed: 2026-03-29
---

# Phase 8 Plan 1: Camera Pipeline Schema Summary

**Migration 012 with species registry (24 seed entries), camera_events/detections tables, units extensions, and org-scoped RLS policies**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-29T08:24:05Z
- **Completed:** 2026-03-29T08:25:15Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created species table with 24 Australian wildlife seed entries covering mammals, birds, reptiles, and meta-categories (human, vehicle, empty)
- Created camera_events table with full NE301 MQTT payload metadata columns and org-scoped RLS
- Created camera_detections table with normalised bounding box coordinates (0-1 CHECK constraints) and cascade delete from camera_events
- Extended units table with device_type (trap_monitor/camera_trap) and connectivity_method (sms/mqtt) with safe defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Create species table with Australian wildlife seed data** - `e623564` (feat)

## Files Created/Modified
- `backend/supabase/migrations/012_camera_pipeline_schema.sql` - Complete camera pipeline schema: species, camera_events, camera_detections tables, units ALTER, RLS policies, indexes, realtime subscription

## Decisions Made
- Denormalised org_id on camera_events (same pattern as events table in migration 011) for efficient RLS policy evaluation without joining through units
- Species table is global registry, not org-scoped -- all authenticated users can read, only service_role can manage
- Bounding box coordinates stored as real (float4) with CHECK constraints 0-1, matching NE301 normalised output format
- camera_detections RLS uses EXISTS subquery joining to camera_events for org scoping, avoiding a direct org_id column

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Migration must be applied via `npx supabase db push` when ready to deploy.

## Next Phase Readiness
- Schema foundation complete for camera pipeline
- Ready for plan 08-02 (storage bucket) and subsequent MQTT ingestion phase
- All RLS policies in place using existing trap_can_* functions

---
*Phase: 08-database-schema-storage-foundation*
*Completed: 2026-03-29*
