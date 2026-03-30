---
phase: 05-dashboard-upgrade
plan: "02"
subsystem: portal-dashboard
tags: [dashboard, ui, shared-ui, badge, card, status]
dependency_graph:
  requires: [05-01]
  provides: [DASH-01, DASH-03]
  affects: [src/lib/check-access.ts, src/app/(protected)/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [Card/Badge from @trackline/ui, STATUS_DOT lookup, roleBadgeVariant helper]
key_files:
  created: []
  modified:
    - src/lib/check-access.ts
    - src/app/(protected)/dashboard/page.tsx
decisions:
  - Dashboard card border color removed from COLOR_MAP (Card component owns its own border via border-stone-200/60) — no behaviour change
metrics:
  duration_minutes: 4
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 2
requirements:
  - DASH-01
  - DASH-03
---

# Phase 05 Plan 02: Dashboard App Switcher Upgrade Summary

**One-liner:** Dashboard app switcher rebuilt with Card/Badge from @trackline/ui — status dots (active/maintenance/down) and role badges (admin=red-dust, member=app-colour, viewer=stone) on each tile.

## What Was Built

The portal dashboard `/dashboard` is now a proper app switcher:

- Each app tile uses `Card hover` from `@trackline/ui` (replaces hand-rolled bordered div)
- Role displayed as a `Badge` with variant mapped per role + app: admin=primary (red-dust), member follows app colour (eucalypt/ochre/sky), viewer=default (stone)
- Status indicator: inline dot span using `STATUS_DOT` lookup — active=bg-eucalypt, maintenance=bg-ochre, down=bg-red-dust
- Clicking any tile navigates to the app's URL (quick-launch)
- `getUserApps()` now fetches `status` from `portal.apps` and `UserAppRow.apps.status` is typed as `string`

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add status to getUserApps query and UserAppRow type | 93ba745 |
| 2 | Rewrite dashboard page with Card, Badge from @trackline/ui | 257ef9c |

## Deviations from Plan

None — plan executed exactly as written.

The Tailwind IDE lint warnings (`font-[family-name:...]` canonical form) were intentionally left unchanged — the syntax is consistent across all portal files and changing only this file would create inconsistency without functional benefit.

## Verification Performed

- `npx tsc --noEmit` — zero errors (both tasks)
- `npx next build` — succeeded, all 11 pages generated
- `grep "@trackline/ui" src/app/(protected)/dashboard/page.tsx` — confirmed
- `grep "status" src/lib/check-access.ts` — confirmed in select string and UserAppRow interface

## Known Stubs

None. `app.status` is fetched live from `portal.apps` (column added in 05-01). All Badge variants and STATUS_DOT entries are wired to real data.

## Self-Check: PASSED

Files verified:
- `src/lib/check-access.ts` — FOUND, contains `status` in select and interface
- `src/app/(protected)/dashboard/page.tsx` — FOUND, contains `@trackline/ui`, `Card`, `Badge`, `STATUS_DOT`, `roleBadgeVariant`

Commits verified:
- `93ba745` — FOUND
- `257ef9c` — FOUND
