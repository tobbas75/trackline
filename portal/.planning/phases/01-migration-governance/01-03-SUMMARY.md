---
phase: 01-migration-governance
plan: 03
subsystem: documentation
tags: [schema-docs, rls-audit, governance, cross-app]
dependency_graph:
  requires: []
  provides:
    - docs/schema/portal.md
    - docs/schema/wildtrack.md
    - docs/schema/fire.md
    - docs/schema/trap-monitor.md
    - docs/schema/rls-audit.md
  affects:
    - PROTECTED_SURFACES.md (portal.md is the expanded reference)
    - Any AI agent working across Trackline repos
tech_stack:
  added: []
  patterns:
    - Schema documentation derived from migration SQL (no live DB required)
    - Governance gap documentation for ad-hoc schema changes
key_files:
  created:
    - docs/schema/portal.md
    - docs/schema/wildtrack.md
    - docs/schema/fire.md
    - docs/schema/trap-monitor.md
    - docs/schema/rls-audit.md
  modified: []
decisions:
  - Schema docs derived entirely from migration SQL — no live DB dump required, as all downstream schemas have migration files (except Trap Monitor, which is documented as the governance gap)
  - Trap Monitor inferred schema placed in trap-monitor.md rather than omitted — partial documentation is more useful than none, with the gap clearly marked
  - RLS audit documents both the 001 recursive policies and the 002 fix in the same table — makes the coexistence visible at a glance
metrics:
  duration: ~20min
  completed: 2026-03-29
  tasks_completed: 2
  files_created: 5
---

# Phase 1 Plan 3: Schema Documentation and RLS Audit Summary

Five schema documentation files written for all four Trackline apps, derived entirely from migration SQL files — no live database dump required.

---

## What Was Built

**Task 1 — Schema documentation for all four apps (commit: a3edd0d)**

Four Markdown reference files in `docs/schema/`:

- **`portal.md`** (177 lines): Full portal schema — `portal.apps`, `portal.app_access`, `portal.profiles` tables with all columns; `portal.check_app_access()`, `portal.is_admin()`, `portal.handle_new_user()`, `portal.update_updated_at()` functions; `on_auth_user_created` and `set_updated_at` triggers; RLS summary; cross-app warning callout.

- **`wildtrack.md`** (440 lines): All eight WildTrack tables from seven migrations — `organisations`, `org_members`, `projects`, `project_members`, `sites`, `species`, `observations`, `detection_histories`, `detection_history_rows`, `csv_uploads`, `column_mapping_templates`. All columns, indexes, enums, and helper functions documented. `soft_delete_organisation`, `create_organisation`, and `is_org_member`/`is_org_admin`/`can_org_edit` functions fully documented. Cross-app dependency warning for Trap Monitor included. Naming collision with Fire App's `update_updated_at()` flagged.

- **`fire.md`** (452 lines): All Fire App tables from eight migrations — `organization` (singular), `project`, `user_project`, `fire_season`, `burn_plan`, `fire_scar`, `analysis_zone`, `reference_layer`, `vegetation_analysis`, `sentinel_imagery_cache`, `sentinel_scene`, `carbon_project`, `accu_period`, `fire_scar_upload`. All enums documented (8 types). Naming collision warning for `update_updated_at()` prominently callout.

- **`trap-monitor.md`** (149 lines): Inferred schema from `verify-shared-db-impact.cjs`. GOVERNANCE GAP callout at the top documents the missing migrations directory. Known tables (`units`, `events`, `commands`, `notifications`) documented with a clear "inferred" caveat. Cross-app dependencies on WildTrack's `organisations`, `org_members`, and helper functions fully documented. Remediation steps for adding a migrations directory included.

**Task 2 — RLS policy audit (commit: d1865a9)**

- **`rls-audit.md`** (128 lines): Full portal policy table with all 10 policies including both the 001 (recursive) and 002 (SECURITY DEFINER) versions of `app_access_insert_admin`/`app_access_delete_admin`. KNOWN ISSUE section documents the duplicate policy issue with the remediation SQL. WildTrack, Fire App, and Trap Monitor RLS documented as summaries. Three findings in Findings Summary.

---

## Decisions Made

1. **Schema docs from migration SQL only.** The STATE.md blocker noted that downstream schemas might require `supabase db dump`. In practice, WildTrack, Fire App, and portal all have complete migration files. Trap Monitor's gap is documented as FINDING-3 rather than blocking the documentation task.

2. **Trap Monitor inferred schema documented, not omitted.** The verify-shared-db-impact.cjs script confirms `units.org_id`, `organisations`, and `org_members` are the key tables. Partial documentation with a clear GOVERNANCE GAP callout is more useful to future AI agents than omitting the file entirely.

3. **Both 001 and 002 policy versions included in the RLS table.** The duplicate `app_access_insert_admin` entries show the actual database state — both policies exist simultaneously — rather than just the "intended" state.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. All documentation files are fully authored from their source migration files. The Trap Monitor inferred columns are clearly marked as inferred, not a stub — they represent the best available information from a governance gap, not placeholder text.

---

## Self-Check

**Files created:**
- `docs/schema/portal.md` — FOUND
- `docs/schema/wildtrack.md` — FOUND
- `docs/schema/fire.md` — FOUND
- `docs/schema/trap-monitor.md` — FOUND
- `docs/schema/rls-audit.md` — FOUND

**Commits:**
- `a3edd0d` — docs(01-03): write schema documentation for all four Trackline apps — FOUND
- `d1865a9` — docs(01-03): write RLS policy audit across all four Trackline apps — FOUND

**Content checks:**
- `grep "check_app_access" docs/schema/portal.md` — 7 matches
- `grep "CROSS-APP" docs/schema/wildtrack.md` — match found
- `grep "GOVERNANCE GAP" docs/schema/trap-monitor.md` — match found
- `grep "NAMING COLLISION" docs/schema/fire.md` — 2 matches
- `grep "KNOWN ISSUE" docs/schema/rls-audit.md` — match found
- `grep "FINDING-1|FINDING-2|FINDING-3" docs/schema/rls-audit.md` — 5 matches
- `grep "recursive" docs/schema/rls-audit.md` — match found
- All files ≥ 30 lines — pass (min: portal.md 177, trap-monitor.md 149)

## Self-Check: PASSED
