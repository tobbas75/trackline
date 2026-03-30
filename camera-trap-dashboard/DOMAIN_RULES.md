# Domain Rules — WildTrack

Agents must preserve these rules when modifying domain logic.

# Core Invariants

- Every database table must have Row Level Security policies scoped to organisation membership
- Observations reference species and sites by foreign key — species_id and site_id are nullable (observations can exist without a matched species or site)
- Species are unique per project by `common_name` — `UNIQUE (project_id, common_name)`
- Sites are unique per project by `site_name` — `UNIQUE (project_id, site_name)`
- Coordinates use `NUMERIC(10,7)` — never float
- All timestamps use `TIMESTAMPTZ`

# Calculation Rules

## Trap-Nights

`trap_nights = sum(date_end - date_deployed)` across all sites in a project. Each site contributes independently. Sites without both dates are excluded.

## Naive Occupancy

`naive_occupancy = (sites_with_detections / total_sites)` for a given species. Does not account for imperfect detection.

## Detection Histories

Binary matrix: rows = sites, columns = occasions (time periods of configurable length). `1` = species detected during occasion, `0` = not detected. Used for occupancy modelling.

## Diversity Indices

- **Shannon-Wiener (H'):** `-sum(p_i * ln(p_i))` where `p_i` is proportional abundance of species `i`
- **Simpson's (1-D):** `1 - sum(p_i^2)`

# Workflow Rules

## CSV Import

1. Upload CSV file
2. Auto-detect tool format (TimeLapse, AddaxAI, generic)
3. Auto-detect column mappings with confidence scores
4. User reviews and adjusts mappings
5. Preview and validate data
6. Import in batches — create audit record in `csv_uploads`

During observation import:
- Sites must already exist — unmatched site names cause row skips
- Species are matched by `common_name`, `scientific_name`, or `local_name` — unmatched species are auto-created
- TimeLapse format: rows with `DeleteFlag = true` are skipped; site name extracted from `RelativePath`

## Species Registry

- Species can be manually entered or looked up from ALA
- ALA lookup auto-fills: common name, scientific name, conservation status, image
- Local/Indigenous names are stored separately and used for import matching
- Conservation status is stored as JSONB: `{ jurisdiction: status }`

# Permission Rules

Three roles per organisation, checked via `src/lib/auth/roles.ts`:

- **Admin:** full access — create/edit/delete everything, manage members
- **Member:** create and edit sites, species, observations, uploads. Cannot delete or manage members.
- **Viewer:** read-only access to all project data

RLS policies enforce these at the database level. Client-side checks are for UI only — never trust them for authorization.

# Critical Shared Domain Logic

Changes to these areas require impact scanning:

- trap-night calculations
- detection history generation
- species matching during import
- permission/role checks
- RLS policies in migrations
