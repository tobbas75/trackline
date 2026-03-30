# Roadmap: Trap Monitor

## Milestones

- ✅ **v1.0 Harden Codebase** — Phases 1-7 (shipped 2026-03-29) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Camera Image Pipeline + Dual Ingestion** — Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Harden Codebase (Phases 1-7) — SHIPPED 2026-03-29</summary>

- [x] Phase 1: Security Fixes (1/1 plans) — completed 2026-03-24
- [x] Phase 2: Data Isolation (1/1 plans) — completed 2026-03-24
- [x] Phase 3: Code Quality & Error Handling (2/2 plans) — completed 2026-03-24
- [x] Phase 4: Configuration Hardening (2/2 plans) — completed 2026-03-24
- [x] Phase 5: Dashboard Refactor (1/1 plans) — completed 2026-03-25
- [x] Phase 6: Firmware Fixes (2/2 plans) — completed 2026-03-24
- [x] Phase 7: Test Coverage (2/2 plans) — completed 2026-03-29

</details>

### 🚧 v2.0 Camera Image Pipeline + Dual Ingestion

**Milestone Goal:** Add MQTT ingestion alongside SMS with per-device switching, camera image capture with multi-species wildlife detection, and image viewing on the dashboard.

- [ ] **Phase 8: Database Schema + Storage Foundation** - New tables, columns, RLS policies, and storage bucket for camera pipeline
- [ ] **Phase 9: MQTT Ingestion Pipeline** - Edge function that receives MQTT payloads, extracts detections, and stores images
- [x] **Phase 10: Camera Unit Management** - Camera units created/managed via existing org UI with device-specific fields
- [x] **Phase 11: Camera Dashboard + Image Viewer** - Event list, image viewer with bounding boxes, filters, and unified timeline (completed 2026-03-29)
- [x] **Phase 12: Test Coverage** - Full test coverage for MQTT ingestion, camera events, image storage, and dashboard components (completed 2026-03-29)

## Phase Details

### Phase 8: Database Schema + Storage Foundation
**Goal**: All database tables, columns, RLS policies, and storage infrastructure exist for camera events, detections, species, and images
**Depends on**: Nothing (v2.0 foundation)
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04, CAM-06, MQTT-03, UNIT-01, IMG-01, IMG-04
**Success Criteria** (what must be TRUE):
  1. camera_events table exists with org_id, device reference, capture timestamp, and image metadata columns
  2. camera_detections table exists with species, confidence, bounding box coordinates linked to camera_event
  3. species table exists with name, common_name, scientific_name, category and is pre-seeded with common Australian wildlife
  4. Units table has connectivity_method (sms/mqtt) and device_type (trap_monitor/camera_trap) fields with defaults that preserve existing units
  5. Supabase Storage bucket exists with org-scoped paths and RLS policies that restrict access to org members only
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Database tables (species, camera_events, camera_detections), units ALTER, RLS policies
- [ ] 08-02-PLAN.md — Storage bucket with org-scoped RLS + TypeScript types

### Phase 9: MQTT Ingestion Pipeline
**Goal**: MQTT payloads from camera traps are received, validated, parsed into camera events with detections, and images are stored — all through a single edge function
**Depends on**: Phase 8
**Requirements**: MQTT-01, MQTT-02, MQTT-04, MQTT-05, MQTT-06, CAM-05, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. Edge function receives NE301 JSON payload via HTTP webhook and creates a camera_event with linked camera_detections rows
  2. Base64 JPEG image from payload is decoded and stored in Supabase Storage with org-scoped path, and camera_event row references the stored image path
  3. Trap events from MQTT-connected units write to the existing events table (same schema as SMS events)
  4. Malformed payloads are rejected with structured error responses and logged for debugging
  5. Changing a unit's connectivity_method from SMS to MQTT correctly routes future ingestion through the MQTT pipeline
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Camera trap ingestion: NE301 payload validation, camera_event + detections insert, base64 image storage
- [ ] 09-02-PLAN.md — Trap monitor MQTT routing: device_type branching, events table insert for trap_monitor units

### Phase 10: Camera Unit Management + Product Routing
**Goal**: Camera units managed via existing org UI; dashboard dynamically derives available product views from registered device types; product toggle when org has both types
**Depends on**: Phase 8
**Requirements**: UNIT-02, UNIT-03, UNIT-04
**Success Criteria** (what must be TRUE):
  1. Operator can create a camera_trap unit via the existing org unit management UI with camera-specific fields (model, firmware_version)
  2. Camera units display device-specific fields that trap_monitor units do not show
  3. Dashboard queries distinct device_type values for current org to derive available product views
  4. Product toggle appears in dashboard header when org has both trap_monitor and camera_trap units
  5. When org has only one device type, dashboard shows that product view directly (no toggle)
  6. Camera unit detail page shows recent camera events with thumbnail images
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 10-01-PLAN.md — Product toggle, dashboard filtering, unit CRUD with device_type and camera fields
- [x] 10-02-PLAN.md — Camera unit detail page with camera_events thumbnail grid

### Phase 11: Camera Dashboard + Image Viewer
**Goal**: Operators can browse camera events, view full images with detection bounding box overlays, filter by species/confidence/date, and see camera events in the unified timeline
**Depends on**: Phase 8, Phase 10
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, VIEW-07
**Success Criteria** (what must be TRUE):
  1. Camera event list shows thumbnail, detected species, confidence score, and timestamp for each event
  2. Full image viewer displays the captured image with bounding box overlays drawn at correct positions, with species labels and confidence scores per box
  3. Operator can filter camera events by species name, minimum confidence threshold, and date range independently or in combination
  4. Camera events appear in the unified timeline alongside trap events with a clear event type indicator distinguishing them
  5. Toggle to "Trap Monitor" shows only trap events; "Camera Trap" shows only camera events; "All" shows unified timeline
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 11-01-PLAN.md — CameraEventList, ImageViewer with bounding boxes, CameraEventFilters components
- [x] 11-02-PLAN.md — Data hook extension, unified timeline, dashboard wiring

### Phase 12: Test Coverage
**Goal**: All new v2.0 code is tested and overall coverage remains at or above the 70% threshold
**Depends on**: Phase 9, Phase 10, Phase 11
**Requirements**: TST-01, TST-02, TST-03, TST-04, TST-05
**Success Criteria** (what must be TRUE):
  1. MQTT ingestion edge function has tests covering valid payload processing, malformed payload rejection, and authentication failure
  2. Camera event and detection storage has tests covering insert, query, and org-scoped access isolation
  3. Image storage has tests covering upload, retrieve, and org-scoped access restriction
  4. Camera dashboard components (event list, image viewer, filters) have rendering and interaction tests
  5. Overall test coverage is >= 70% with the new code included
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — MQTT validation logic extraction + validation/storage tests (TST-01, TST-02, TST-03)
- [x] 12-02-PLAN.md — Camera dashboard component tests + coverage verification (TST-04, TST-05)

## Progress

**Execution Order:**
Phase 8 first. Then Phase 9 and Phase 10 can run in parallel. Phase 11 after Phase 10. Phase 12 last.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Database Schema + Storage Foundation | v2.0 | 0/2 | Planned    |  |
| 9. MQTT Ingestion Pipeline | v2.0 | 1/2 | In Progress | - |
| 10. Camera Unit Management | v2.0 | 2/2 | Complete    | 2026-03-29 |
| 11. Camera Dashboard + Image Viewer | v2.0 | 2/2 | Complete    | 2026-03-29 |
| 12. Test Coverage | v2.0 | 2/2 | Complete    | 2026-03-29 |

---
*Roadmap created: 2026-03-23*
*v2.0 phases added: 2026-03-29*
