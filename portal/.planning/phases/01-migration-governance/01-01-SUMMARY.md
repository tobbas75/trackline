---
phase: 01-migration-governance
plan: "01"
subsystem: database-governance
tags: [migrations, naming-convention, cross-app-safety, documentation]
dependency_graph:
  requires: []
  provides:
    - portal_namespace_migration_files
    - wildtrack_namespace_migration_files
    - fire_namespace_migration_files
    - PROTECTED_SURFACES_inventory
  affects:
    - scripts/db-check.cjs (Plan 02 uses surface IDs from PROTECTED_SURFACES.md)
tech_stack:
  added: []
  patterns:
    - "{namespace}_{NNN}_{description}.sql migration naming convention"
    - "PROTECTED_SURFACES.md as authoritative cross-app surface registry"
key_files:
  created:
    - supabase/migrations/portal_001_app_access.sql
    - supabase/migrations/portal_002_admin_policies.sql
    - PROTECTED_SURFACES.md
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_001_foundation.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_002_security_fixes.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_003_sites_species.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_004_observations.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_005_detection_histories.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_006_species_local_name.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_007_fix_detection_trigger.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_001_initial_schema.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_002_analysis_zones.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_003_burn_type_ignition.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_004_reference_layers.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_005_vegetation_analysis.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_006_sentinel_imagery_cache.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_007_carbon_methodology.sql
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_008_fire_scar_uploads.sql
  modified: []
  deleted:
    - supabase/migrations/001_portal_app_access.sql
    - supabase/migrations/002_admin_policies.sql
    - c:/Software code GITs/camera-trap-dashboard/supabase/migrations/001_foundation.sql (and 002–007)
    - c:/Software code GITs/Fire project system/fire-app/supabase/migrations/001_initial_schema.sql (and 002–008)
decisions:
  - "Namespace tokens: portal_, wildtrack_, fire_, trap_ — each app's NNN counter is independent, no collision possible"
  - "Trap Monitor has no migrations directory — schema applied via dashboard; documented as governance gap in PROTECTED_SURFACES.md"
  - "do NOT run supabase db push for renamed files — live DB tracks original names; divergence is intentional"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 19
  files_modified: 0
---

# Phase 01 Plan 01: Migration Namespace Rename and Protected Surfaces Inventory Summary

**One-liner:** Namespace-prefixed all 17 migration files across portal, WildTrack, and Fire App repos and wrote PROTECTED_SURFACES.md as the authoritative cross-app surface inventory for db-check.cjs enforcement.

---

## What Was Done

### Task 1: Rename migration files with namespace prefix

All existing portal migration files were renamed from bare-numbered format to the `{namespace}_{NNN}_{description}.sql` convention. This was applied across all three app repos that have migration files.

**Portal (2 files):**
- `001_portal_app_access.sql` → `portal_001_app_access.sql`
- `002_admin_policies.sql` → `portal_002_admin_policies.sql`

**WildTrack (7 files):**
- `001_foundation.sql` → `wildtrack_001_foundation.sql`
- `002_security_fixes.sql` → `wildtrack_002_security_fixes.sql`
- `003_phase2_sites_species.sql` → `wildtrack_003_sites_species.sql`
- `004_phase3_observations.sql` → `wildtrack_004_observations.sql`
- `005_phase6_detection_histories.sql` → `wildtrack_005_detection_histories.sql`
- `006_add_species_local_name.sql` → `wildtrack_006_species_local_name.sql`
- `007_fix_detection_histories_trigger.sql` → `wildtrack_007_fix_detection_trigger.sql`

**Fire App (8 files):**
- `001_initial_schema.sql` → `fire_001_initial_schema.sql`
- `002_analysis_zones.sql` → `fire_002_analysis_zones.sql`
- `003_burn_type_ignition_lines.sql` → `fire_003_burn_type_ignition.sql`
- `004_reference_layers.sql` → `fire_004_reference_layers.sql`
- `005_vegetation_analysis.sql` → `fire_005_vegetation_analysis.sql`
- `006_sentinel_imagery_cache.sql` → `fire_006_sentinel_imagery_cache.sql`
- `007_carbon_methodology.sql` → `fire_007_carbon_methodology.sql`
- `008_fire_scar_uploads.sql` → `fire_008_fire_scar_uploads.sql`

Each renamed file has a two-line header comment at the top:
```
-- Originally: {original_name}.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules
```

The Supabase CLI divergence (live DB still records original filenames in `supabase_migrations.schema_migrations`) is intentional and documented in PROTECTED_SURFACES.md. Running `supabase db push` after rename would re-apply already-applied migrations. Do NOT do this.

### Task 2: Write PROTECTED_SURFACES.md

Created `PROTECTED_SURFACES.md` at the portal repo root with 96 lines covering:
- Naming convention and four namespace tokens
- 7 portal schema protected surfaces with `db-check ID` column (source of truth for Plan 02)
- 5 public schema cross-app dependencies (WildTrack → Trap Monitor)
- 2 naming collision risks (`public.update_updated_at()`, enum names)
- Migration filename tracking note explaining the CLI divergence
- Verbatim Rules for Schema Changes (7 rules from CLAUDE.md)
- Verbatim Cross-App Impact Checklist (4 items from CLAUDE.md)

---

## Decisions Made

1. **Namespace tokens:** `portal_`, `wildtrack_`, `fire_`, `trap_` — each app's `NNN` counter is independent; no collision is possible between repos
2. **Trap Monitor governance gap:** Trap Monitor has no `supabase/migrations/` directory (schema applied via Supabase dashboard). The `trap_` namespace is reserved but no files exist yet. Documented in PROTECTED_SURFACES.md.
3. **CLI divergence is intentional:** The renamed files must NOT be pushed to the live DB. The original filenames remain in `supabase_migrations.schema_migrations`. This is documented in every renamed file header and in PROTECTED_SURFACES.md.
4. **WildTrack and Fire App repos committed independently:** Each repo has its own git history; renames are committed directly in those repos.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Commits

- Portal repo: `f9d4298` — `chore(01-01): rename portal migration files with namespace prefix`
- Portal repo: `b578817` — `docs(01-01): add PROTECTED_SURFACES.md cross-app surface inventory`
- WildTrack repo: `9c15277` — `chore(01-01): rename WildTrack migration files with namespace prefix`
- Fire App repo: `836e66e` — `chore(01-01): rename Fire App migration files with namespace prefix`

---

## Known Stubs

None. This plan creates documentation and renames files only — no code stubs or placeholder data.

---

## Risks and Assumptions

- **Verified:** All 17 renamed files exist at their new paths and old files are deleted
- **Verified:** PROTECTED_SURFACES.md has 96 lines and contains all required db-check IDs
- **Assumed:** Trap Monitor schema is applied via dashboard only (confirmed from research: no migrations directory exists)
- **Risk:** The `portal_001` and `portal_002` duplicate RLS policy names (`app_access_insert_admin`, `app_access_delete_admin`) should eventually be cleaned up with a DROP POLICY migration (tracked in MIGR-06 audit scope — future plan, not this phase)

## Self-Check: PASSED
