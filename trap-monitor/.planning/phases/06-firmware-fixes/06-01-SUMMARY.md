---
phase: 06-firmware-fixes
plan: 01
subsystem: firmware
tags: [esp32, priority-queue, gps, littlefs, arduinojson, embedded]

# Dependency graph
requires: []
provides:
  - "Priority-based message queue with ALERT > TRAP > HEALTH ordering"
  - "GPS validation using isUpdated() instead of age() < 2000"
  - "Priority-aware overflow eviction (drops HEALTH before TRAP before ALERT)"
  - "Legacy queue entry fallback via msgPriorityFromType()"
  - "CMD_LISTEN_GRACE_S constant for Plan 06-02"
affects: [06-firmware-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Priority scan on dequeue/flush instead of sorted insert (ArduinoJson array limitation)"
    - "JSON 'pri' field with type-based fallback for backward compatibility"

key-files:
  created: []
  modified:
    - firmware/src/config.h
    - firmware/src/messages.h
    - firmware/src/storage.h
    - firmware/src/gps.h
    - firmware/src/main.cpp

key-decisions:
  - "Lower number = higher priority (ALERT=0, TRAP=1, HEALTH=2) for intuitive comparison"
  - "Scan-on-dequeue instead of sorted insert due to ArduinoJson array limitations on embedded"
  - "isUpdated() replaces age() < 2000 for GPS validation to avoid cold-start false rejections"

patterns-established:
  - "Priority field on EventMessage with msgPriorityFromType() helper for derivation"
  - "All compose functions must call msgPriorityFromType() after setting type"

requirements-completed: [FW-01, FW-02]

# Metrics
duration: 14min
completed: 2026-03-24
---

# Phase 6 Plan 1: Priority Retry Queue + GPS Stale Fix Summary

**Priority-based message queue ensuring ALERTs always sent first, with GPS validation fix replacing age() < 2000 with isUpdated() to prevent cold-start false rejections**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-24T12:36:38Z
- **Completed:** 2026-03-24T12:51:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Priority constants (ALERT=0, TRAP=1, HEALTH=2) and EventMessage priority field with msgPriorityFromType helper
- Priority-aware queue: dequeue returns highest-priority message, overflow evicts lowest-priority, flush sends in priority order
- GPS validation uses isUpdated() instead of age() < 2000, fixing false stale rejections during cold-start inter-sentence gaps
- Legacy queue entries without "pri" field fall back to type-based priority derivation
- CMD_LISTEN_GRACE_S=10 constant added for Plan 06-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add priority constants, EventMessage priority field, and helper function** - `d9ff382` (fix)
2. **Task 2: Implement priority-aware queue operations and fix GPS stale validation** - `d9ff382` (fix, same commit)

**Deviation fix:** `c155457` (fix: sensor alert priority in STATE_COMPOSE_MSG)

## Files Created/Modified
- `firmware/src/config.h` - MSG_PRIORITY_ALERT/TRAP/HEALTH constants, CMD_LISTEN_GRACE_S constant
- `firmware/src/messages.h` - EventMessage priority field, msgPriorityFromType helper, priority set in all compose functions
- `firmware/src/storage.h` - Priority-aware enqueue eviction, dequeue scan, flush ordering, "pri" serialization
- `firmware/src/gps.h` - GPS validation changed from age() < 2000 to isUpdated()
- `firmware/src/main.cpp` - Sensor alert priority fix in STATE_COMPOSE_MSG

## Decisions Made
- Lower number = higher priority (ALERT=0, TRAP=1, HEALTH=2) -- standard pattern where 0 is most urgent
- Scan-on-dequeue approach instead of maintaining a sorted array -- ArduinoJson arrays don't support efficient mid-array insertion on embedded targets
- isUpdated() chosen over age() with larger threshold because it precisely captures "new fix decoded this iteration" without an arbitrary time window
- CMD_LISTEN_GRACE_S added in this plan to avoid a second config.h edit in Plan 06-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sensor alert messages created without priority**
- **Found during:** Task 2 verification (code review of main.cpp STATE_COMPOSE_MSG)
- **Issue:** The sensor threshold breach alert in STATE_COMPOSE_MSG created an EventMessage with `alertMsg.type = "ALERT"` but never called `msgPriorityFromType()`, leaving priority at the default MSG_PRIORITY_HEALTH (2). This means sensor ALERTs would be treated as HEALTH priority in the queue, defeating the entire priority system.
- **Fix:** Added `alertMsg.priority = msgPriorityFromType(alertMsg.type);` after setting the type
- **Files modified:** firmware/src/main.cpp
- **Verification:** PlatformIO build succeeds, alert priority correctly set to 0
- **Committed in:** c155457

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential correctness fix -- without this, sensor alerts would queue at HEALTH priority. No scope creep.

## Issues Encountered
- PlatformIO build failed on first attempt due to Windows file locking race condition in library archiving (ar.exe "unable to rename" error). Resolved on retry -- known intermittent issue with parallel builds on Windows. Not a code issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Priority queue system complete and verified
- CMD_LISTEN_GRACE_S constant ready for Plan 06-02
- All firmware compiles cleanly (RAM: 6.5%, Flash: 21.5%)

## Self-Check: PASSED

All files verified present. All commit hashes confirmed in git log.

---
*Phase: 06-firmware-fixes*
*Completed: 2026-03-24*
