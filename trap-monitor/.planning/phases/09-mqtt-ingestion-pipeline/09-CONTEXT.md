# Phase 9: MQTT Ingestion Pipeline - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

MQTT payloads from camera traps are received, validated, parsed into camera events with detections, and images are stored — all through a single edge function. Also handles trap events from MQTT-connected units writing to the existing events table.

Requirements: MQTT-01, MQTT-02, MQTT-04, MQTT-05, MQTT-06, CAM-05, IMG-02, IMG-03

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints:
- Follow ingest-sms edge function pattern (Deno, Supabase service role, webhook POST)
- NE301 MQTT payload format documented in hardware/Camera Trap/NeoEyes-Addax-Testing/PROJECT_BRIEF.md (Section 6)
- Base64 JPEG from image_data field must be decoded and stored in Supabase Storage
- camera_events and camera_detections tables created in Phase 8 migration 012
- Storage bucket created in Phase 8 migration 013
- Per-device connectivity switching via units.connectivity_method field
- Malformed payloads must be rejected with structured error logging (same pattern as ingest-sms unknown format handling)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- backend/supabase/functions/ingest-sms/index.ts — reference implementation for edge function pattern
- frontend/src/lib/types.ts — CameraEvent, CameraDetection, Species types (added in Phase 8)
- backend/supabase/migrations/012_camera_pipeline_schema.sql — table definitions

### Established Patterns
- Supabase edge functions run on Deno
- Service role key for database writes (server-side only)
- Structured JSON error responses
- GPS validation pattern from ingest-sms
- Timezone handling from ingest-sms

### Integration Points
- camera_events table (INSERT with org_id from units lookup)
- camera_detections table (INSERT linked to camera_event)
- Supabase Storage camera-images bucket (upload base64 decoded JPEG)
- events table (for trap events from MQTT units — same schema as SMS events)
- units table (lookup device_type and connectivity_method)

</code_context>

<specifics>
## Specific Ideas

- Edge function name: ingest-mqtt (parallel to ingest-sms)
- MQTT broker sends POST webhook to edge function (broker-to-webhook bridge)
- Payload format matches NE301 JSON exactly (metadata, device_info, ai_result, image_data)
- Storage path: {org_id}/{unit_id}/{event_id}.jpg
- If device_type is trap_monitor, write to events table (same as SMS format)
- If device_type is camera_trap, write to camera_events + camera_detections + store image
- Look up unit by device_info.device_name or device_info.serial_number

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
