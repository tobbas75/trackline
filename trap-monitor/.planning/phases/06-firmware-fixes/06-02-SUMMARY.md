---
phase: 06-firmware-fixes
plan: 02
subsystem: firmware
tags: [esp32, deep-sleep, grace-period, race-condition, interrupt, state-machine]

# Dependency graph
requires:
  - phase: 06-firmware-fixes plan 01
    provides: "CMD_LISTEN_GRACE_S constant in config.h"
provides:
  - "Deadline-based command listen window with automatic grace period extension"
  - "Atomic trap pin check before deep sleep entry preventing missed triggers"
  - "Safety cap at 3x base listen window preventing runaway extension"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deadline-based loop with movable deadline instead of fixed start+window"
    - "portDISABLE_INTERRUPTS/portENABLE_INTERRUPTS atomic section for pin read before sleep"

key-files:
  created: []
  modified:
    - firmware/src/main.cpp

key-decisions:
  - "3x safety cap prevents infinite listen extension if commands keep arriving"
  - "portDISABLE_INTERRUPTS for atomic pin read -- microsecond critical section is acceptable"
  - "Re-enter STATE_WAKE_ASSESS (not just COMPOSE_MSG) when trap detected pre-sleep for full state machine traversal"

patterns-established:
  - "Always check trap pin atomically before esp_deep_sleep_start()"
  - "Grace period pattern: deadline variable + remaining check + elapsed cap"

requirements-completed: [FW-03, FW-04]

# Metrics
duration: 14min
completed: 2026-03-24
---

# Phase 6 Plan 2: Command Listen Grace Period + Deep Sleep Race Guard Summary

**Deadline-based command listen with 10s grace extension near window end, plus atomic trap pin check before deep sleep preventing missed triggers during the ext0-to-sleep race window**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-24T12:36:38Z
- **Completed:** 2026-03-24T12:51:12Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- STATE_CMD_LISTEN uses movable deadline instead of fixed start+window comparison
- Commands received in final 10 seconds (CMD_LISTEN_GRACE_S) extend the deadline by 10 seconds
- Safety cap at 3x base window (180s with default 60s) prevents runaway extension
- STATE_SLEEP atomically checks TRAP_TRIGGER_PIN inside portDISABLE_INTERRUPTS/portENABLE_INTERRUPTS
- If trap pin HIGH during sleep prep, state transitions to STATE_WAKE_ASSESS with WAKE_TRAP reason
- Serial logging for grace period extensions and trap detection for field debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Add command listen grace period and atomic deep sleep guard** - `ecefbcd` (fix)

## Files Created/Modified
- `firmware/src/main.cpp` - STATE_CMD_LISTEN rewritten with deadline-based grace period; STATE_SLEEP rewritten with atomic trap pin check

## Decisions Made
- 3x safety cap chosen as balance between allowing legitimate multi-command sessions and preventing battery drain from infinite listen
- portDISABLE_INTERRUPTS/portENABLE_INTERRUPTS (FreeRTOS macros) used rather than noInterrupts()/interrupts() for ESP32 compatibility
- Full state machine re-entry (STATE_WAKE_ASSESS) chosen over shortcut to COMPOSE_MSG to ensure proper wake reason assessment and battery/solar checks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All firmware fixes complete (FW-01 through FW-04)
- Firmware compiles cleanly: RAM 6.5%, Flash 21.5%
- No blockers for Phase 7 (Test Coverage)

## Self-Check: PASSED

All files verified present. Commit hash ecefbcd confirmed in git log.

---
*Phase: 06-firmware-fixes*
*Completed: 2026-03-24*
