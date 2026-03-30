---
phase: 09-mqtt-ingestion-pipeline
plan: 01
subsystem: api
tags: [deno, supabase-edge, mqtt, ne301, camera-trap, base64, storage, wildlife-detection]

# Dependency graph
requires:
  - phase: 08-database-schema-storage-foundation
    provides: camera_events, camera_detections, species tables and camera-images storage bucket
provides:
  - "ingest-mqtt edge function handling NE301 camera trap MQTT payloads"
  - "Camera event creation with metadata from MQTT payload"
  - "Base64 JPEG/PNG decode and Supabase Storage upload at org-scoped paths"
  - "Camera detection rows with species lookup from seeded species table"
  - "Structured JSON error responses for malformed payloads and unknown devices"
affects: [09-02-PLAN, 10-camera-unit-management, 11-camera-dashboard, 12-test-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns: [MQTT webhook ingestion, NE301 payload validation, base64 image decode, species-detection linking]

key-files:
  created:
    - backend/supabase/functions/ingest-mqtt/index.ts
  modified: []

key-decisions:
  - "Non-fatal image upload: event row stored even if storage upload fails"
  - "Flexible device ID extraction: supports query param, body field, and MQTT topic parsing"
  - "PNG support alongside JPEG: validates both data URI prefixes, stores with correct extension"
  - "Species lookup by lowercase class_name: maps NE301 AI detection labels to seeded species table"

patterns-established:
  - "MQTT ingestion edge function pattern: validate -> lookup unit -> insert event -> upload image -> insert detections -> respond"
  - "Structured error logging with alert/severity/timestamp for monitoring"

requirements-completed: [MQTT-01, MQTT-02, MQTT-06, CAM-05, IMG-02, IMG-03]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 9 Plan 01: MQTT Camera Trap Ingestion Summary

**NE301 camera trap MQTT ingestion edge function with payload validation, camera_event + detections insert, base64 image storage, and species lookup**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T08:33:52Z
- **Completed:** 2026-03-29T08:38:00Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments
- Created ingest-mqtt Deno edge function that receives NE301 MQTT payloads via HTTP webhook
- Full NE301 payload validation with field-level error messages for each required property
- Camera event creation with metadata (dimensions, model, inference time, battery, communication type)
- Base64 JPEG/PNG decode and upload to camera-images Supabase Storage bucket at {org_id}/{unit_id}/{event_id}.jpg
- Camera detection rows with species lookup mapping class_name to seeded species table
- Structured JSON error responses (400 invalid payload, 404 unknown device, 500 DB error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ingest-mqtt edge function with NE301 payload validation and unit lookup** - `eb741ef` (feat)

## Files Created/Modified
- `backend/supabase/functions/ingest-mqtt/index.ts` - Complete MQTT ingestion edge function (431 lines) handling NE301 camera trap payloads with validation, storage, and detection processing

## Decisions Made
- Non-fatal image upload: if storage upload fails, the camera_event row is still preserved with null image_path. This prevents data loss from transient storage issues.
- Flexible device ID extraction: supports `device_id` query param, `device_id` body field, and MQTT topic parsing (`ne301/{device_id}/upload/report`). This accommodates different MQTT broker webhook bridge configurations.
- PNG support alongside JPEG: validates both `data:image/jpeg;base64,` and `data:image/png;base64,` prefixes and stores with correct file extension.
- Species lookup by lowercase class_name: NE301 AI model outputs class names that may vary in case; normalizing to lowercase matches the seeded species table entries.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data paths are wired to real database operations and storage.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Edge function deploys via `npx supabase functions deploy ingest-mqtt`.

## Next Phase Readiness
- Edge function ready for Plan 09-02 (trap monitor MQTT routing with device_type branching)
- Function structure supports adding trap_monitor event routing alongside camera_trap flow
- Phase 10 (camera unit management) can create camera_trap units that this function will process

## Self-Check: PASSED

- FOUND: backend/supabase/functions/ingest-mqtt/index.ts
- FOUND: commit eb741ef
- FOUND: .planning/phases/09-mqtt-ingestion-pipeline/09-01-SUMMARY.md

---
*Phase: 09-mqtt-ingestion-pipeline*
*Completed: 2026-03-29*
