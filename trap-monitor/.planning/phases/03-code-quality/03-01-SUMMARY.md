---
phase: 03-code-quality
plan: 01
subsystem: backend, firmware
tags: [deno, supabase-edge, cpp, platformio, sms-parsing, gps-validation, type-safety]

# Dependency graph
requires: []
provides:
  - "Clean ModemFactory without BG95 dead code"
  - "Typed SMS ingestion with UnitUpsertPayload and EventInsertRow interfaces"
  - "GPS coordinate validation (lat -90..90, lng -180..180) before DB insert"
  - "Structured JSON alert for unknown SMS formats"
affects: [firmware-fixes, test-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GPS bounds validation before database writes"
    - "Structured JSON alerts with severity levels for monitoring"
    - "Typed database payload interfaces instead of any casts"

key-files:
  created: []
  modified:
    - "firmware/src/hal/ModemFactory.h"
    - "backend/supabase/functions/ingest-sms/index.ts"

key-decisions:
  - "Retained SIM7080G and RedCap5G stubs in ModemFactory -- only BG95 was dead code per CQ-01"
  - "GPS validation applied at three points: TRAP parse, HEALTH parse, and unit update"
  - "Unknown SMS formats still stored in DB as UNKNOWN events for debugging, but now produce structured alert"

patterns-established:
  - "isValidGPS() guard pattern for coordinate validation before any DB write"
  - "Structured JSON error logging with alert/severity/timestamp fields for edge function monitoring"

requirements-completed: [CQ-01, CQ-03, ERR-02, ERR-03]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 3 Plan 1: BG95 Removal, SMS Typing, GPS Validation, Unknown Format Alerting Summary

**Removed dead BG95 modem driver from firmware, eliminated all `any` casts from SMS ingestion with typed interfaces, added GPS coordinate bounds checking at three validation points, and structured JSON alerting for unrecognized SMS formats**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T14:36:28Z
- **Completed:** 2026-03-24T14:44:28Z
- **Tasks:** 2
- **Files modified:** 2 (BG95.h deleted, not counted)

## Accomplishments
- BG95.h deleted and all references removed from ModemFactory.h -- only EG800Q, SIM7080G, and RedCap5G remain
- Zero `any` casts in ingest-sms/index.ts -- `unitUpdate` uses `UnitUpsertPayload`, `eventRow` uses `EventInsertRow`
- GPS coordinates validated at TRAP parse, HEALTH parse, and unit update sections with `isValidGPS()` guard
- Unknown SMS formats produce structured JSON alert with severity, raw SMS content, from number, and ISO timestamp
- Unknown events still stored in database for debugging, with proper error handling on the insert

## Task Commits

Implementation was completed as part of WIP commit 0ea7e43 prior to plan execution. Verification confirmed all requirements met:

1. **Task 1: Remove BG95 modem stub and clean ModemFactory** - `0ea7e43` (chore)
2. **Task 2: Type SMS ingestion, add GPS validation, and add structured unknown-format alerting** - `0ea7e43` (chore)

## Files Created/Modified
- `firmware/src/hal/modems/BG95.h` - Deleted (dead BG95 modem stub)
- `firmware/src/hal/ModemFactory.h` - Clean modem factory with EG800Q, SIM7080G, RedCap5G only
- `backend/supabase/functions/ingest-sms/index.ts` - Typed interfaces, GPS validation, structured alerting

## Decisions Made
- Retained SIM7080G and RedCap5G stubs: They serve documented future purposes (NB-IoT and 5G paths), unlike BG95 which was pure dead code
- GPS validation uses null-out pattern: Invalid coordinates are set to null with a console.warn, rather than rejecting the entire SMS event
- Unknown format alerting uses console.error with JSON.stringify: Enables log aggregation tools to parse and trigger alerts on UNKNOWN_SMS_FORMAT events

## Deviations from Plan

None - plan executed exactly as written. All implementation was already in place from WIP commit.

## Issues Encountered
None - all verification checks passed on first run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Firmware modem factory is clean for Phase 6 firmware fixes
- SMS ingestion is fully typed for Phase 7 test coverage
- No blockers

## Self-Check: PASSED

- All referenced files verified to exist on disk
- Commit 0ea7e43 verified in git log
- All verification commands returned PASS

---
*Phase: 03-code-quality*
*Completed: 2026-03-24*
