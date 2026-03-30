---
phase: 03-shared-supabase-package
plan: "03"
subsystem: workspace-tooling
tags: [supabase, types, scripts, workspace]
dependency_graph:
  requires: []
  provides: [db:types script in all app package.json files, root workspace db:types aggregator]
  affects: [portal, camera-trap-dashboard, fire-app, trap-monitor-dashboard]
tech_stack:
  added: []
  patterns: [pnpm --filter for cross-app script execution]
key_files:
  created: []
  modified:
    - path: "c:/Software code GITs/LandManagment Website/package.json"
      note: "Added root db:types aggregator script calling all 4 apps via --filter"
    - path: "c:/Software code GITs/LandManagment Website/portal/package.json"
      note: "Added db:types script"
    - path: "c:/Software code GITs/LandManagment Website/camera-trap-dashboard/package.json"
      note: "Added db:types script"
    - path: "c:/Software code GITs/LandManagment Website/trap-monitor/frontend/package.json"
      note: "Added db:types script"
decisions:
  - "fire-app already had db:types — unchanged; other three apps received identical script"
  - "Root workspace package.json is outside any git repo so tracked only as workspace-level change"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 1
  files_modified: 4
requirements_satisfied: [PKG-03]
---

# Phase 03 Plan 03: Root db:types Script Summary

**One-liner:** Added `db:types` to portal, camera-trap-dashboard, and trap-monitor package.json files, plus a root workspace aggregator script that regenerates Supabase TypeScript types for all four apps with one command.

## What Was Done

Added `db:types` scripts to complete the set of apps that can regenerate Supabase TypeScript types:

**Apps updated (3 new scripts):**
- `portal/package.json` — added `db:types`
- `camera-trap-dashboard/package.json` — added `db:types`
- `trap-monitor/frontend/package.json` — added `db:types`

**fire-app:** Already had `db:types` — untouched.

**Root workspace (`package.json`):**
```json
"db:types": "pnpm --filter portal run db:types && pnpm --filter camera-trap-dashboard run db:types && pnpm --filter fire-app run db:types && pnpm --filter trap-monitor-dashboard run db:types"
```

All scripts use the same pattern:
```
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/supabase/database.types.ts
```

`SUPABASE_PROJECT_ID` must be set in the shell before running. The script does not guard against an unset variable — the supabase CLI will emit a clear error if the variable is missing.

## Verification Results

All package.json files confirmed valid JSON. All 4 apps confirmed to have `db:types` scripts. Root script confirmed to include all 4 app filters.

```
package.json ok
portal/package.json ok
camera-trap-dashboard/package.json ok
fire-app/package.json ok
trap-monitor/frontend/package.json ok

portal true
camera-trap-dashboard true
fire-app true
trap-monitor/frontend true
```

## Commits

| Repo | Hash | Message |
|------|------|---------|
| portal | 611b0d5 | feat(03-03): add db:types script to portal package.json |
| camera-trap-dashboard | 1e001ae | feat(03-03): add db:types script to camera-trap-dashboard package.json |
| trap-monitor | 7c39fed | feat(03-03): add db:types script to trap-monitor-dashboard package.json |
| fire-app | — | No change (already had db:types) |
| workspace root | — | Not in a git repo — package.json modified but untracked by git |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- portal/package.json db:types: verified present
- camera-trap-dashboard/package.json db:types: verified present
- fire-app/package.json db:types: verified present (pre-existing)
- trap-monitor/frontend/package.json db:types: verified present
- Root workspace package.json db:types: verified present, includes all 4 --filter flags
- All JSON files valid: confirmed
