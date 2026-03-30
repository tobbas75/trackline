---
phase: 05-dashboard-upgrade
plan: "01"
subsystem: database
tags: [supabase, sql, migration, portal-apps, status]

# Dependency graph
requires:
  - phase: 01-migration-governance
    provides: db-check.cjs safety tooling and portal schema conventions

provides:
  - portal.apps.status column (text NOT NULL DEFAULT 'active') with CHECK constraint
  - Migration file portal_003_app_status.sql ready for supabase db push

affects: [05-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADD COLUMN IF NOT EXISTS with DEFAULT — safe column additions to portal tables"
    - "CHECK constraint naming: {table}_{column}_check pattern"

key-files:
  created:
    - supabase/migrations/portal_003_app_status.sql
  modified: []

key-decisions:
  - "ADD COLUMN with DEFAULT 'active' — existing rows get status without a table rewrite; no downstream apps broken"
  - "IF NOT EXISTS guard — migration is idempotent and safe to re-run against a DB that already has the column"

patterns-established:
  - "Status column pattern: text NOT NULL DEFAULT 'active' with named CHECK constraint for portal.apps"

requirements-completed: [DASH-02]

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 05 Plan 01: App Status Column Summary

**ALTER TABLE portal.apps adds status column (active|maintenance|down) with CHECK constraint, enabling dashboard status indicators**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-30T03:59:59Z
- **Completed:** 2026-03-30T04:00:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `supabase/migrations/portal_003_app_status.sql` with safe `ADD COLUMN IF NOT EXISTS` DDL
- `apps_status_check` CHECK constraint enforces allowed values: `active`, `maintenance`, `down`
- `DEFAULT 'active'` ensures all existing app rows get a valid status without any data migration step
- db-check.cjs passed with zero protected-surface violations

## Task Commits

1. **Task 1: Write portal_003_app_status migration** - `227f98f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `supabase/migrations/portal_003_app_status.sql` — ALTER TABLE adding status column with DEFAULT and CHECK constraint

## Decisions Made

- `ADD COLUMN IF NOT EXISTS` used so the migration is idempotent — safe if the column already exists on the live DB
- Default value `'active'` chosen so all three existing app rows (wildtrack, fire, trap_monitor) immediately have a valid status without a backfill step

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. db-check.cjs confirmed the migration touches only `portal.apps`, which is portal-owned. No downstream app surfaces affected.

## User Setup Required

None — no external service configuration required for this migration file. Running `supabase db push` is a manual step done outside this plan.

## Next Phase Readiness

- `portal.apps.status` column migration is ready to apply via `supabase db push`
- Plan 05-02 (dashboard UI) can proceed — it depends on this column existing

---
*Phase: 05-dashboard-upgrade*
*Completed: 2026-03-30*
