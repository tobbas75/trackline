# Fire App Schema Reference

**Schema:** `public`
**Owner:** fire-app repo (`c:/Software code GITs/Fire project system/fire-app/`)
**Source:** `supabase/migrations/001_initial_schema.sql` through `008_fire_scar_uploads.sql`
**Generated:** Phase 1 Migration Governance (derived from migration SQL — not a live DB dump)

---

> **NAMING COLLISION RISK:** Fire App defines `public.update_updated_at()`. WildTrack defines the same function.
> `CREATE OR REPLACE` in either app silently overwrites the other's version in the shared database.
> See `PROTECTED_SURFACES.md`.

---

## Enums

| Enum | Values | Notes |
|------|--------|-------|
| `user_role` | `admin`, `manager`, `ranger`, `viewer` | Project membership role |
| `burn_season` | `EDS`, `LDS` | Early/Late Dry Season |
| `burn_plan_status` | `draft`, `reviewed`, `approved`, `scheduled`, `active`, `completed`, `cancelled` | Burn plan lifecycle |
| `fire_scar_source` | `nafi_modis`, `nafi_sentinel`, `sentinel_manual`, `field_mapped`, `landgate` | Fire scar data provenance |
| `checklist_type` | `bombardier`, `ground_crew`, `safety`, `pre_flight`, `post_flight` | Operational checklist type |
| `equipment_type` | `aircraft`, `vehicle`, `incendiary_device`, `communication` | Equipment categories |
| `equipment_status` | `available`, `in_use`, `maintenance`, `retired` | Equipment availability |
| `vegetation_index_type` | `ndvi`, `nbr`, `dnbr`, `bai`, `fmc`, `true_colour`, `false_colour`, `fire_enhanced` | Sentinel-2 analysis type |
| `vegetation_source` | `dea_ows`, `cdse_sentinel_hub` | Imagery source provider |

---

## Tables

### `organization` (singular — not `organisations`)

Fire App uses the singular form. This is a separate table from WildTrack's `public.organisations` (plural).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `name` | `text` | NOT NULL | — | — |
| `slug` | `text` | NOT NULL | — | UNIQUE |
| `logo_url` | `text` | NULL | — | — |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**RLS:** enabled.

---

### `project`

Fire management project. Scoped to an organization. Geometry is stored both as PostGIS `GEOMETRY` and as `JSONB` (GeoJSON) for client-side access.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `organization_id` | `uuid` | NOT NULL | — | FK → `organization(id)` ON DELETE CASCADE |
| `name` | `text` | NOT NULL | — | — |
| `slug` | `text` | NOT NULL | — | UNIQUE within org |
| `description` | `text` | NULL | — | — |
| `boundary` | `geometry(MultiPolygon, 4326)` | NULL | — | Project boundary — GIST indexed |
| `boundary_geojson` | `jsonb` | NULL | — | GeoJSON copy for client access |
| `area_ha` | `decimal(12,2)` | NULL | — | — |
| `rainfall_zone` | `text` | NULL | — | CHECK: `high`, `low` |
| `state` | `text` | NULL | — | NT, WA, QLD |
| `status` | `text` | NULL | `'active'` | — |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | Maintained by `project_updated_at` trigger |

**Unique constraint:** `(organization_id, slug)`

**Indexes:** `idx_project_boundary` GIST on `(boundary)`

**RLS:** enabled.

---

### `user_project`

Project membership. Maps Supabase auth users to projects with a fire-specific role. Note: references `auth.users` directly (not `portal.profiles`).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `role` | `user_role` | NOT NULL | `'viewer'` | Fire-specific role |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Unique constraint:** `(user_id, project_id)`

**RLS:** enabled.

---

### `fire_season`

Annual fire season planning record. Projects plan burns per season (EDS/LDS).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `year` | `integer` | NOT NULL | — | CHECK: 2000–2100 |
| `eds_start_month` | `integer` | NULL | `1` | CHECK: 1–12 |
| `eds_end_month` | `integer` | NULL | `7` | CHECK: 1–12 |
| `status` | `text` | NULL | `'planning'` | CHECK: `planning`, `active`, `completed`, `archived` |
| `notes` | `text` | NULL | — | — |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Unique constraint:** `(project_id, year)`

**RLS:** enabled.

---

### `burn_plan`

Planned prescribed burn. References fire_season and project. Contains geometry, target season, priority, and approval workflow.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `fire_season_id` | `uuid` | NOT NULL | — | FK → `fire_season(id)` ON DELETE CASCADE |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `name` | `text` | NOT NULL | — | — |
| `description` | `text` | NULL | — | — |
| `planned_geometry` | `geometry(MultiPolygon, 4326)` | NULL | — | GIST indexed |
| `planned_area_ha` | `decimal(12,2)` | NULL | — | — |
| `target_season` | `burn_season` | NULL | — | EDS or LDS |
| `vegetation_types` | `text[]` | NULL | — | Fuel class codes |
| `priority` | `integer` | NULL | `3` | CHECK: 1–5 |
| `status` | `burn_plan_status` | NULL | `'draft'` | — |
| `approved_by` | `uuid` | NULL | — | FK → `auth.users(id)` |
| `approved_at` | `timestamptz` | NULL | — | — |
| `created_by` | `uuid` | NULL | — | FK → `auth.users(id)` |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | Maintained by trigger |
| `burn_type` | `text` | NULL | — | Added in 003: CHECK `aerial`, `road` |
| `ignition_lines` | `geometry(MultiLineString, 4326)` | NULL | — | Added in 003 — GIST indexed |
| `zone_id` | `uuid` | NULL | — | Added in 002 — FK → `analysis_zone(id)` ON DELETE SET NULL |

**Indexes:** GIST on `planned_geometry`, GIST on `ignition_lines`, on `zone_id`

**RLS:** enabled.

---

### `fire_scar`

Imported fire scar polygons from NAFI, Sentinel, or field mapping. One record per detected burn per year.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `geometry` | `geometry(MultiPolygon, 4326)` | NOT NULL | — | GIST indexed |
| `year` | `integer` | NOT NULL | — | CHECK: >= 2000 |
| `month` | `integer` | NULL | — | CHECK: 1–12 |
| `burn_season` | `burn_season` | NULL | — | — |
| `area_ha` | `decimal(12,2)` | NULL | — | — |
| `source` | `fire_scar_source` | NOT NULL | — | Data provenance |
| `source_resolution_m` | `integer` | NULL | — | — |
| `imported_at` | `timestamptz` | NULL | `now()` | — |
| `zone_id` | `uuid` | NULL | — | Added in 002 — FK → `analysis_zone(id)` ON DELETE SET NULL |

**Indexes:** GIST on `geometry`, on `(project_id, year)`, on `zone_id`

**RLS:** enabled.

---

### `analysis_zone`

Geographic sub-divisions of a project for targeted analysis. Added in migration 002.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `name` | `text` | NOT NULL | — | — |
| `slug` | `text` | NOT NULL | — | UNIQUE within project |
| `description` | `text` | NULL | — | — |
| `boundary` | `geometry(Polygon, 4326)` | NOT NULL | — | GIST indexed |
| `area_ha` | `numeric(12,2)` | NULL | — | — |
| `color` | `text` | NULL | `'#3b82f6'` | UI display colour |
| `sort_order` | `integer` | NULL | `0` | Display ordering |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Unique constraint:** `(project_id, slug)`

**RLS:** enabled.

---

### `reference_layer`

User-uploaded GeoJSON layers for planning context (roads, firebreaks, landing sites, etc.). Added in migration 004.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `name` | `text` | NOT NULL | — | — |
| `description` | `text` | NULL | — | — |
| `geojson_data` | `jsonb` | NOT NULL | — | Full GeoJSON feature collection |
| `geometry_type` | `text` | NOT NULL | — | CHECK: `Point`, `LineString`, `Polygon`, `Multi*`, `Mixed` |
| `feature_count` | `integer` | NULL | `0` | — |
| `color` | `text` | NULL | `'#6b7280'` | — |
| `visible` | `boolean` | NULL | `true` | — |
| `sort_order` | `integer` | NULL | `0` | — |
| `uploaded_by` | `uuid` | NULL | — | FK → `auth.users(id)` |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**RLS:** enabled.

---

### `vegetation_analysis`

Saved Sentinel-2 vegetation index analysis results (NDVI, NBR, BAI, etc.). Added in migration 005.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `zone_id` | `uuid` | NULL | — | FK → `analysis_zone(id)` ON DELETE SET NULL |
| `scene_id` | `uuid` | NULL | — | FK → `sentinel_scene(id)` ON DELETE SET NULL |
| `index_type` | `vegetation_index_type` | NOT NULL | — | — |
| `source` | `vegetation_source` | NOT NULL | `'dea_ows'` | — |
| `date_start` | `date` | NOT NULL | — | — |
| `date_end` | `date` | NOT NULL | — | — |
| `mean_value` | `decimal(6,4)` | NULL | — | — |
| `min_value` | `decimal(6,4)` | NULL | — | — |
| `max_value` | `decimal(6,4)` | NULL | — | — |
| `std_dev` | `decimal(6,4)` | NULL | — | — |
| `area_above_threshold_ha` | `decimal(12,2)` | NULL | — | — |
| `threshold_value` | `decimal(6,4)` | NULL | — | — |
| `wms_params` | `jsonb` | NOT NULL | — | Parameters to recreate tile layer visualisation |
| `notes` | `text` | NULL | — | — |
| `created_by` | `uuid` | NULL | — | FK → `auth.users(id)` |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**RLS:** enabled.

---

### `sentinel_imagery_cache`

Persistent cache of processed Sentinel-2 WebP composites stored in Supabase Storage. Added in migration 006.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `product` | `text` | NOT NULL | — | e.g. `ndvi`, `dmibr`, `mibr_bw` |
| `date_start` | `date` | NOT NULL | — | — |
| `date_end` | `date` | NOT NULL | — | — |
| `baseline_start` | `date` | NULL | — | NULL for non-dMIBR products |
| `baseline_end` | `date` | NULL | — | NULL for non-dMIBR products |
| `storage_path` | `text` | NOT NULL | — | Path within storage bucket |
| `width` | `integer` | NOT NULL | — | Pixels |
| `height` | `integer` | NOT NULL | — | Pixels |
| `resolution_m` | `integer` | NOT NULL | `20` | Spatial resolution in metres |
| `bbox_west` | `decimal(10,6)` | NOT NULL | — | — |
| `bbox_south` | `decimal(10,6)` | NOT NULL | — | — |
| `bbox_east` | `decimal(10,6)` | NOT NULL | — | — |
| `bbox_north` | `decimal(10,6)` | NOT NULL | — | — |
| `file_size_bytes` | `integer` | NULL | — | — |
| `source` | `text` | NOT NULL | `'cdse_processing_api'` | — |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Unique constraint:** `(product, date_start, date_end, baseline_start, baseline_end)`

**RLS:** enabled. Authenticated users can SELECT; service role manages INSERTs.

---

### `sentinel_scene`

Sentinel-2 scene metadata cached from STAC searches. Added in migration 005.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `scene_id` | `text` | NOT NULL | — | UNIQUE within project |
| `satellite` | `text` | NOT NULL | — | e.g. `Sentinel-2A` |
| `acquired_at` | `timestamptz` | NOT NULL | — | Acquisition time |
| `cloud_cover_pct` | `decimal(5,2)` | NULL | — | — |
| `bbox` | `geometry(Polygon, 4326)` | NULL | — | GIST indexed |
| `thumbnail_url` | `text` | NULL | — | — |
| `source` | `vegetation_source` | NOT NULL | `'cdse_sentinel_hub'` | — |
| `stac_properties` | `jsonb` | NULL | — | Full STAC metadata |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**RLS:** enabled.

---

### `carbon_project`

Carbon abatement project configuration per fire management project. One per project. Added in migration 007.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE — UNIQUE |
| `start_date` | `date` | NOT NULL | — | — |
| `methodology_version` | `text` | NOT NULL | `'2.1'` | Australian savanna burning methodology version |
| `baseline_emissions` | `decimal(12,2)` | NOT NULL | — | tCO₂-e historical emissions baseline |
| `permanence_discount` | `decimal(5,4)` | NOT NULL | `0.25` | Typically 25% |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | Maintained by trigger |

**RLS:** enabled.

---

### `accu_period`

Annual ACCU (Australian Carbon Credit Unit) calculation and issuance records. Added in migration 007.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `carbon_project_id` | `uuid` | NOT NULL | — | FK → `carbon_project(id)` ON DELETE CASCADE |
| `period_start` | `date` | NOT NULL | — | — |
| `period_end` | `date` | NOT NULL | — | CHECK: > period_start |
| `status` | `text` | NOT NULL | `'draft'` | Workflow: `draft` → `submitted` → `under_review` → `approved` → `issued` |
| `project_emissions_eds` | `decimal(12,2)` | NOT NULL | `0` | tCO₂-e from early dry season fires |
| `project_emissions_lds` | `decimal(12,2)` | NOT NULL | `0` | tCO₂-e from late dry season fires |
| `project_emissions_total` | `decimal(12,2)` | NOT NULL | `0` | — |
| `gross_abatement` | `decimal(12,2)` | NOT NULL | `0` | baseline_emissions − project_emissions_total |
| `net_abatement` | `decimal(12,2)` | NOT NULL | `0` | gross × (1 − permanence_discount) |
| `uncertainty_buffer` | `decimal(12,2)` | NULL | `0` | — |
| `accus_eligible` | `decimal(12,2)` | NOT NULL | `0` | max(0, net_abatement − uncertainty_buffer) |
| `accus_issued` | `decimal(12,2)` | NULL | — | — |
| `accu_price` | `decimal(12,2)` | NULL | — | AUD per ACCU at issuance |
| `revenue` | `decimal(12,2)` | NULL | — | AUD |
| `submitted_at` | `timestamptz` | NULL | — | — |
| `approved_at` | `timestamptz` | NULL | — | — |
| `issued_at` | `timestamptz` | NULL | — | — |
| `created_at` | `timestamptz` | NULL | `now()` | — |
| `updated_at` | `timestamptz` | NULL | `now()` | Maintained by trigger |

**RLS:** enabled.

---

### `fire_scar_upload`

Custom fire scar upload metadata. One record per project+year upload, stored in `fire-scars` Storage bucket. Added in migration 008.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | FK → `project(id)` ON DELETE CASCADE |
| `year` | `integer` | NOT NULL | — | CHECK: >= 2000 |
| `label` | `text` | NOT NULL | — | — |
| `source` | `text` | NOT NULL | `'field_mapped'` | CHECK: `nafi_modis`, `nafi_sentinel`, `sentinel_manual`, `field_mapped`, `landgate`, `combined` |
| `feature_count` | `integer` | NOT NULL | `0` | — |
| `total_ha` | `decimal(12,2)` | NOT NULL | `0` | — |
| `eds_ha` | `decimal(12,2)` | NOT NULL | `0` | — |
| `lds_ha` | `decimal(12,2)` | NOT NULL | `0` | — |
| `storage_path` | `text` | NOT NULL | — | Path in `fire-scars` bucket, e.g. `{project_id}/{year}.json` |
| `uploaded_by` | `uuid` | NOT NULL | — | FK → `auth.users(id)` |
| `created_at` | `timestamptz` | NULL | `now()` | — |

**Unique constraint:** `(project_id, year)` — latest upload replaces previous

**RLS:** enabled.

---

### Additional Tables (from 001_initial_schema.sql)

The following tables exist from the initial schema. They are documented here for completeness but have less cross-app risk:

| Table | Purpose |
|-------|---------|
| `cultural_zone` | No-go / restricted cultural areas. Geometry(MultiPolygon). |
| `daily_plan` | Daily operational planning. Weather conditions, crew assignments. |
| `flight_plan` | Aircraft flight paths and incendiary plan for a daily plan. |
| `burn_execution` | Actual burn records from field crew. PostGIS geometry. |
| `gps_track` | GPS track data from field devices. PostGIS LineString. |
| `incendiary_drop` | Individual incendiary drop locations. PostGIS Point. |
| `daily_checklist` | Operational checklists (pre-flight, safety, etc.). |
| `fire_history_overlay` | Pre-computed burn history analysis results per zone. |
| `hotspot` | Cached hotspot data from DEA/NAFI satellite feeds. |
| `vegetation_map` | Fuel type polygon layers per project. |
| `equipment` | Aircraft, vehicles, and incendiary device inventory. |
| `incendiary_inventory` | Season-level incendiary stock tracking. |
| `document` | Project documents (plans, compliance, reports). |
| `audit_log` | Action audit trail per project. |

---

## Functions

### `public.update_updated_at()`

**Returns:** `trigger`
**Language:** `plpgsql`

Sets `NEW.updated_at = now()`. Applied to `project` and `burn_plan` tables.

> **NAMING COLLISION:** WildTrack defines an identical function `public.update_updated_at()`. Both are `CREATE OR REPLACE` — the last migration applied wins. Currently identical logic, but future changes in either app risk silently overwriting the other's version. See `PROTECTED_SURFACES.md`.

---

### `classify_burn_season(burn_month integer, cutoff_month integer)`

**Returns:** `burn_season`
**Language:** `plpgsql`
**Stability:** `IMMUTABLE`

Classifies a burn month as EDS or LDS based on a cutoff month. Used for fire scar analysis calculations.

---

### `update_updated_at_column()`

**Returns:** `trigger`
**Language:** `plpgsql`

Defined in migration 007 (`-- Reuse function if it already exists from a prior migration`). Separate from `update_updated_at()` — applies to `carbon_project` and `accu_period`. Same logic but different function name.

---

## Triggers

| Trigger Name | Event | Table | Function Called |
|-------------|-------|-------|-----------------|
| `project_updated_at` | BEFORE UPDATE | `project` | `update_updated_at()` |
| `burn_plan_updated_at` | BEFORE UPDATE | `burn_plan` | `update_updated_at()` |
| `update_carbon_project_updated_at` | BEFORE UPDATE | `carbon_project` | `update_updated_at_column()` |
| `update_accu_period_updated_at` | BEFORE UPDATE | `accu_period` | `update_updated_at_column()` |

---

## Migration History

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Organization, project, user_project, fire_season, burn_plan, cultural_zone, daily_plan, flight_plan, burn_execution, gps_track, incendiary_drop, daily_checklist, fire_scar, fire_history_overlay, hotspot, vegetation_map, equipment, incendiary_inventory, document, audit_log, RLS |
| `002_analysis_zones.sql` | analysis_zone table; adds zone_id to fire_scar and burn_plan |
| `003_burn_type_ignition_lines.sql` | Adds burn_type and ignition_lines columns to burn_plan |
| `004_reference_layers.sql` | reference_layer table |
| `005_vegetation_analysis.sql` | sentinel_scene and vegetation_analysis tables |
| `006_sentinel_imagery_cache.sql` | sentinel_imagery_cache table; creates `sentinel-imagery` storage bucket |
| `007_carbon_methodology.sql` | carbon_project and accu_period tables; Australian savanna burning methodology |
| `008_fire_scar_uploads.sql` | fire_scar_upload table; custom fire scar data for project+year |
