---
phase: 09-mqtt-ingestion-pipeline
plan: 02
subsystem: backend
tags: [mqtt, edge-function, trap-monitor, device-routing, events-table]
one_liner: "Added trap_monitor device_type routing to ingest-mqtt edge function — MQTT trap events write to events table same as SMS"
requirements_completed: [MQTT-04, MQTT-05]
---

# Phase 9 Plan 2: Trap Monitor MQTT Routing

## What Was Built

Added device_type branching to the `ingest-mqtt` edge function so trap_monitor units sending MQTT payloads have their events stored in the existing `events` table (same schema as SMS ingestion), while camera_trap units continue through the camera pipeline.

## Key Files

| File | Change | Lines |
|------|--------|-------|
| backend/supabase/functions/ingest-mqtt/index.ts | Added handleTrapMonitor, validateTrapPayload, isValidGPS, TrapMQTTPayload interface | +134 |

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Add trap_monitor routing branch with validation, GPS check, events table insert | Done |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Store raw MQTT payload as `MQTT:{json}` in raw_sms field | Debugging compatibility with SMS events, maintains same column schema |
| GPS validation reuses same isValidGPS pattern as ingest-sms | Consistency — invalid coords set to null, not rejected |
| connectivity_method logged but not gated | Edge function processes whatever arrives; field is for UI/future routing |

## Self-Check

- [x] `trap_monitor` string appears in routing logic
- [x] `handleTrapMonitor` function defined and called
- [x] `from("events").insert()` writes to events table
- [x] `isValidGPS` validates coordinates
- [x] `MQTT_TRAP_VALIDATION_FAILURE` structured error logged
- [x] Device type included in success response
- [x] All 235 existing tests still pass
