# Phase 8: Database Schema + Storage Foundation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

All database tables, columns, RLS policies, and storage infrastructure exist for camera events, detections, species, and images. This is the v2.0 foundation — everything else depends on schema existing.

Requirements: CAM-01, CAM-02, CAM-03, CAM-04, CAM-06, MQTT-03, UNIT-01, IMG-01, IMG-04

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints:
- Shared Supabase project (landmanager) — new tables in public schema only, don't touch shared tables
- Follow existing RLS pattern (trap_can_view_org, trap_can_edit_org, trap_can_admin_org)
- Existing migrations in backend/supabase/migrations/ — continue numbering
- Units table already exists — ALTER to add device_type and connectivity_method columns with safe defaults
- Species table should be pre-seeded with common Australian wildlife

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing migration pattern in backend/supabase/migrations/
- RLS helper functions: trap_can_view_org(), trap_can_edit_org(), trap_can_admin_org()
- Existing units table schema (add columns, don't recreate)
- Existing events table as reference for camera_events structure

### Established Patterns
- Supabase migrations with sequential numbering (001, 002, ... 011)
- RLS policies per table following org-scoped pattern
- org_id column on all tenant-scoped tables
- Composite indexes for common query patterns

### Integration Points
- units table (ALTER to add device_type, connectivity_method)
- Supabase Storage (new bucket creation)
- RLS functions (reuse existing trap_can_* functions)

</code_context>

<specifics>
## Specific Ideas

- NE301 MQTT payload format documented in hardware/Camera Trap/NeoEyes-Addax-Testing/PROJECT_BRIEF.md — use as reference for camera_events and camera_detections schema
- Species table should support: name, common_name, scientific_name, category (mammal/bird/reptile/etc)
- camera_detections stores normalised bounding box coordinates (x, y, width, height as 0-1 floats) matching NE301 output format
- Device health fields (battery_percent, communication_type, inference_time_ms) go on camera_events, not units

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
