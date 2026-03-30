# WildTrack Schema Reference

**Schema:** `public`
**Owner:** camera-trap-dashboard repo (`c:/Software code GITs/camera-trap-dashboard/`)
**Source:** `supabase/migrations/001_foundation.sql` through `007_fix_detection_histories_trigger.sql`
**Generated:** Phase 1 Migration Governance (derived from migration SQL — not a live DB dump)

---

> **CROSS-APP DEPENDENCY:** `public.organisations` and `public.org_members` are also used by Trap Monitor.
> `public.is_org_member()`, `public.is_org_admin()`, `public.can_org_edit()` are called by Trap Monitor RLS policies.
> See `PROTECTED_SURFACES.md`.

---

## Enums

| Enum | Values | Notes |
|------|--------|-------|
| `org_type` | `ranger_team`, `national_park`, `research_group`, `ngo`, `private_landholder`, `government`, `other` | Organisation classification |
| `org_role` | `owner`, `admin`, `member`, `viewer` | Role within an organisation |
| `project_role` | `owner`, `editor`, `viewer` | Role within a project |
| `upload_type` | `observations`, `deployments`, `detection_history`, `generic` | CSV upload categorisation |
| `upload_status` | `pending`, `mapping`, `processing`, `completed`, `failed` | CSV processing state |

---

## Tables

### `public.organisations`

Conservation organisations. Trap Monitor links units to organisations via `units.org_id` FK — do not drop or rename columns here.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `name` | `text` | NOT NULL | — | — |
| `slug` | `text` | NOT NULL | — | UNIQUE — URL-friendly identifier |
| `type` | `org_type` | NOT NULL | `'other'` | Organisation classification |
| `description` | `text` | NULL | — | — |
| `logo_url` | `text` | NULL | — | — |
| `website` | `text` | NULL | — | — |
| `contact_email` | `text` | NULL | — | — |
| `region` | `text` | NULL | — | — |
| `is_public` | `boolean` | NOT NULL | `false` | Public orgs visible to all authenticated users |
| `settings` | `jsonb` | NOT NULL | `'{}'` | App-specific settings |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |
| `deleted_at` | `timestamptz` | NULL | — | Added in 002 — soft delete. NULL = active |

**Indexes:**
- `idx_organisations_slug` on `(slug)`
- `idx_organisations_public` on `(is_public)` WHERE `is_public = TRUE`

**RLS:** enabled. SELECT policy excludes soft-deleted rows (`deleted_at IS NULL`).

---

### `public.org_members`

Organisation membership. Queried by Trap Monitor's `trap_can_*` RLS functions — do not drop or alter.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `org_id` | `uuid` | NOT NULL | — | FK → `public.organisations(id)` ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL | — | FK → `portal.profiles(id)` ON DELETE CASCADE |
| `role` | `org_role` | NOT NULL | `'member'` | Role within the org |
| `invited_by` | `uuid` | NULL | — | FK → `portal.profiles(id)` ON DELETE SET NULL |
| `joined_at` | `timestamptz` | NOT NULL | `now()` | — |

**Primary key:** `(org_id, user_id)`

**Indexes:**
- `idx_org_members_user` on `(user_id)`

**RLS:** enabled.

---

### `public.projects`

Camera trap projects. Scoped to an organisation.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `org_id` | `uuid` | NOT NULL | — | FK → `public.organisations(id)` ON DELETE CASCADE |
| `created_by` | `uuid` | NULL | — | FK → `portal.profiles(id)` ON DELETE SET NULL |
| `name` | `text` | NOT NULL | — | — |
| `slug` | `text` | NOT NULL | — | UNIQUE within org |
| `description` | `text` | NULL | — | — |
| `location_name` | `text` | NULL | — | — |
| `bbox_north` | `numeric(9,6)` | NULL | — | Bounding box north |
| `bbox_south` | `numeric(9,6)` | NULL | — | Bounding box south |
| `bbox_east` | `numeric(10,6)` | NULL | — | Bounding box east |
| `bbox_west` | `numeric(10,6)` | NULL | — | Bounding box west |
| `is_published` | `boolean` | NOT NULL | `false` | Published projects visible to all authenticated users |
| `tags` | `text[]` | NOT NULL | `'{}'` | — |
| `settings` | `jsonb` | NOT NULL | `'{}'` | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |

**Unique constraint:** `(org_id, slug)`

**Indexes:**
- `idx_projects_org` on `(org_id)`
- `idx_projects_published` on `(is_published)` WHERE `is_published = TRUE`

**RLS:** enabled.

---

### `public.project_members`

Optional per-project role overrides. Members inherit project access from org membership; this table allows finer-grained project-level roles.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL | — | FK → `portal.profiles(id)` ON DELETE CASCADE |
| `role` | `project_role` | NOT NULL | `'viewer'` | Role within the project |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Primary key:** `(project_id, user_id)`

**RLS:** enabled.

---

### `public.sites`

Camera trap deployment locations (stations). One site per physical camera location within a project.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `site_name` | `text` | NOT NULL | — | UNIQUE within project |
| `latitude` | `numeric(10,7)` | NULL | — | — |
| `longitude` | `numeric(10,7)` | NULL | — | — |
| `date_deployed` | `date` | NULL | — | — |
| `date_end` | `date` | NULL | — | — |
| `covariates` | `jsonb` | NOT NULL | `'{}'` | Habitat covariates — GIN indexed |
| `comments` | `text` | NULL | — | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |

**Unique constraint:** `(project_id, site_name)`

**Indexes:**
- `idx_sites_project` on `(project_id)`
- `idx_sites_covariates` GIN on `(covariates)`

**RLS:** enabled.

---

### `public.species`

Per-project species registry. Links to Atlas of Living Australia (ALA) for conservation status.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `common_name` | `text` | NOT NULL | — | UNIQUE within project |
| `scientific_name` | `text` | NULL | — | — |
| `species_group` | `text` | NULL | — | — |
| `individual_id_label` | `text` | NULL | — | Label for individual ID field in observations |
| `ala_guid` | `text` | NULL | — | ALA species identifier |
| `conservation_status` | `jsonb` | NULL | — | ALA conservation status data |
| `ala_image_url` | `text` | NULL | — | — |
| `local_name` | `text` | NULL | — | Added in 006 — Indigenous/vernacular name |
| `metadata` | `jsonb` | NOT NULL | `'{}'` | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |

**Unique constraint:** `(project_id, common_name)`

**Indexes:**
- `idx_species_project` on `(project_id)`
- `idx_species_ala_guid` on `(ala_guid)` WHERE NOT NULL
- `idx_species_local_name` on `(local_name)` WHERE NOT NULL (added in 006)

**RLS:** enabled.

---

### `public.observations`

Camera trap detection records. One row per image/sequence with species classification, confidence scores, and bbox data.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `site_id` | `uuid` | NULL | — | FK → `public.sites(id)` ON DELETE SET NULL |
| `species_id` | `uuid` | NULL | — | FK → `public.species(id)` ON DELETE SET NULL |
| `observed_at` | `timestamptz` | NULL | — | Camera trigger timestamp |
| `is_animal` | `boolean` | NULL | — | — |
| `is_empty` | `boolean` | NULL | — | — |
| `count` | `integer` | NULL | — | Animal count |
| `individual_id` | `text` | NULL | — | — |
| `temperature` | `numeric(5,1)` | NULL | — | Degrees Celsius |
| `moon_phase` | `text` | NULL | — | — |
| `file_path` | `text` | NULL | — | Storage path |
| `file_name` | `text` | NULL | — | — |
| `sequence_id` | `text` | NULL | — | Groups burst images |
| `detection_confidence` | `numeric(4,3)` | NULL | — | 0.000–1.000 |
| `classification_confidence` | `numeric(4,3)` | NULL | — | 0.000–1.000 |
| `bbox` | `jsonb` | NULL | — | Bounding box in image coordinates |
| `classified_by` | `text` | NULL | — | Model or user name |
| `extras` | `jsonb` | NOT NULL | `'{}'` | Flexible extension fields |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |

**Indexes:**
- `idx_observations_project` on `(project_id)`
- `idx_observations_site_species` on `(site_id, species_id, observed_at)`
- `idx_observations_observed_at` on `(observed_at)`
- `idx_observations_animal` on `(project_id)` WHERE `is_animal = TRUE`

**RLS:** enabled.

---

### `public.detection_histories`

Occupancy-format detection matrices (sites × occasions) for occupancy modelling.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `species_id` | `uuid` | NULL | — | FK → `public.species(id)` ON DELETE SET NULL |
| `species_name` | `text` | NOT NULL | — | Denormalised name |
| `occasion_start` | `date` | NOT NULL | — | Start of detection occasion period |
| `occasion_end` | `date` | NOT NULL | — | End of detection occasion period |
| `occasion_length_days` | `int` | NOT NULL | `7` | Length of each occasion in days |
| `num_occasions` | `int` | NOT NULL | — | Total number of occasions |
| `notes` | `text` | NULL | — | — |
| `created_by` | `uuid` | NULL | — | FK → `auth.users(id)` ON DELETE SET NULL |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger (added in 007) |

**Indexes:**
- `idx_dh_project` on `(project_id)`
- `idx_dh_species` on `(species_id)`

**RLS:** enabled.

---

### `public.detection_history_rows`

One row per site per detection history. Stores the detection vector as an integer array (1=detected, 0=not detected, -1=not surveyed/NA).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `detection_history_id` | `uuid` | NOT NULL | — | FK → `public.detection_histories(id)` ON DELETE CASCADE |
| `site_id` | `uuid` | NULL | — | FK → `public.sites(id)` ON DELETE SET NULL |
| `site_name` | `text` | NOT NULL | — | Denormalised name |
| `detections` | `int[]` | NOT NULL | `'{}'` | Detection vector: 1/0/-1 per occasion |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes:**
- `idx_dhr_history` on `(detection_history_id)`
- `idx_dhr_site` on `(site_id)`

**RLS:** enabled.

---

### `public.csv_uploads`

Import audit trail for CSV bulk uploads.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `uploaded_by` | `uuid` | NULL | — | FK → `portal.profiles(id)` ON DELETE SET NULL |
| `file_name` | `text` | NOT NULL | — | — |
| `file_size_bytes` | `bigint` | NULL | — | — |
| `upload_type` | `upload_type` | NOT NULL | `'generic'` | — |
| `status` | `upload_status` | NOT NULL | `'pending'` | — |
| `source_columns` | `text[]` | NULL | — | Headers detected in uploaded CSV |
| `column_mapping` | `jsonb` | NULL | — | User-defined mapping to app columns |
| `extra_columns_mapping` | `jsonb` | NULL | — | Extra column handling |
| `parse_config` | `jsonb` | NULL | — | CSV parse options |
| `row_count` | `integer` | NULL | — | Total rows in upload |
| `rows_imported` | `integer` | NULL | `0` | Successfully imported |
| `rows_skipped` | `integer` | NULL | `0` | Skipped/errored |
| `error_log` | `jsonb` | NULL | — | Structured error records |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by trigger |

**RLS:** enabled.

---

### `public.column_mapping_templates`

Reusable saved column mappings for recurring CSV upload formats.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `public.projects(id)` ON DELETE CASCADE |
| `name` | `text` | NOT NULL | — | UNIQUE within project |
| `upload_type` | `upload_type` | NOT NULL | — | — |
| `column_mapping` | `jsonb` | NOT NULL | — | — |
| `extra_columns_mapping` | `jsonb` | NULL | — | — |
| `parse_config` | `jsonb` | NULL | — | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**RLS:** enabled.

---

## Functions

### `public.is_org_member(p_org_id uuid, p_user_id uuid)`

**Returns:** `boolean`
**Language:** `sql`
**Security:** `SECURITY DEFINER`
**Stability:** `STABLE`

Returns `true` if the user has any row in `public.org_members` for the given org. Called by WildTrack RLS policies AND by Trap Monitor `trap_can_*` RLS functions.

**WARNING:** Do not change signature or return type. Trap Monitor depends on this function.

---

### `public.is_org_admin(p_org_id uuid, p_user_id uuid)`

**Returns:** `boolean`
**Language:** `sql`
**Security:** `SECURITY DEFINER`
**Stability:** `STABLE`

Returns `true` if user has `role IN ('owner', 'admin')` in the org. Called by WildTrack RLS and Trap Monitor RLS.

**WARNING:** Do not change signature or return type. Trap Monitor depends on this function.

---

### `public.can_org_edit(p_org_id uuid, p_user_id uuid)`

**Returns:** `boolean`
**Language:** `sql`
**Security:** `SECURITY DEFINER`
**Stability:** `STABLE`

Returns `true` if user has `role IN ('owner', 'admin', 'member')`. Called by WildTrack RLS and Trap Monitor RLS.

**WARNING:** Do not change signature or return type. Trap Monitor depends on this function.

---

### `public.create_organisation(p_name, p_slug, p_type, ...)`

**Returns:** `json`
**Language:** `plpgsql`
**Security:** `SECURITY DEFINER` (with `SET search_path = ''`)

Atomically creates an org and adds the authenticated user as owner in a single transaction. Avoids the RLS policy conflict on `INSERT...RETURNING` (C-1 fix from migration 002).

**Full signature:**
```sql
create_organisation(
  p_name text,
  p_slug text,
  p_type org_type,
  p_description text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_is_public boolean DEFAULT FALSE
) RETURNS json
```

---

### `public.soft_delete_organisation(p_org_id uuid)`

**Returns:** `boolean`
**Language:** `plpgsql`
**Security:** `SECURITY DEFINER` (with `SET search_path = ''`)

Sets `deleted_at = now()` for the specified org. Only the org owner can call this.

---

### `public.project_org_id(p_project_id uuid)`

**Returns:** `uuid`
**Language:** `sql`
**Stability:** `STABLE`

Helper used in RLS policies to look up the `org_id` for a project, enabling org-based access checks from project-scoped tables.

---

### `public.update_updated_at()`

**Returns:** `trigger`
**Language:** `plpgsql`

Sets `NEW.updated_at = now()` on BEFORE UPDATE. Applied to `organisations` and `projects` tables.

> **NAMING COLLISION:** Fire App also defines `public.update_updated_at()` in its initial schema migration. `CREATE OR REPLACE` in either app silently overwrites the other's version. Both versions are identical (same logic), but any future divergence risks silent overwrite. See `PROTECTED_SURFACES.md`.

---

## Triggers

| Trigger Name | Event | Table | Function Called |
|-------------|-------|-------|-----------------|
| `set_updated_at` | BEFORE UPDATE | `public.organisations` | `public.update_updated_at()` |
| `set_updated_at` | BEFORE UPDATE | `public.projects` | `public.update_updated_at()` |
| `set_updated_at` | BEFORE UPDATE | `public.sites` | `public.update_updated_at()` |
| `set_updated_at` | BEFORE UPDATE | `public.species` | `public.update_updated_at()` |
| `set_updated_at` | BEFORE UPDATE | `public.csv_uploads` | `public.update_updated_at()` |
| `set_updated_at` | BEFORE UPDATE | `public.detection_histories` | `public.update_updated_at()` (added in 007 — was missing before) |

---

## Migration History

| File | Description |
|------|-------------|
| `001_foundation.sql` | Organisations, org_members, projects, project_members, helper functions, RLS |
| `002_security_fixes.sql` | `create_organisation()` atomic function, soft-delete for organisations |
| `003_phase2_sites_species.sql` | Sites, species, csv_uploads, column_mapping_templates |
| `004_phase3_observations.sql` | Observations table |
| `005_phase6_detection_histories.sql` | detection_histories and detection_history_rows |
| `006_add_species_local_name.sql` | Adds `local_name` column to species |
| `007_fix_detection_histories_trigger.sql` | Adds missing `updated_at` trigger to detection_histories |
