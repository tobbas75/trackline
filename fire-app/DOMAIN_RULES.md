# Domain Rules

This file defines business logic invariants for the Fire Project System.

Agents must preserve these rules when modifying domain logic.

Global behaviour rules: `C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

## Core Invariants

- All monetary/carbon credit values must use `DECIMAL(12,2)` — never floating point storage
- Fire season classification is binary: **Early Dry Season (EDS)** vs **Late Dry Season (LDS)** — there is no third category
- Geographic coordinates use WGS84 (EPSG:4326) unless otherwise specified
- The Tiwi Islands bounding box is fixed: `[130.02, -11.94, 131.54, -11.16]` — do not modify
- Supabase RLS is enabled on all tables — never bypass with raw SQL in client code
- All Sentinel-2 imagery is Sentinel-2 L2A (atmospherically corrected)

## Calculation Rules

### Sentinel-2 Imagery

- **MIBR formula**: `mibr = 10.0 × B12 - 9.8 × B11 + 2.0`, normalized to `(mibr + 1.0) / 5.0` clamped [0,1]. This is NOT standard NBR — it is a linear SWIR combination specific to this system.
- **mibr_bw evalscript**: applies `inv = 1.0 - norm` (inverted grayscale). Do not remove the inversion — the dMIBR differencing depends on it.
- **dMIBR differencing formula**: `diff = baseNorm - curNorm`. Negative diff = burnt (MIBR decreased), Positive = recovery. The subtraction is `baseline - current` (not `current - baseline`) because mibr_bw is inverted.
- **dMIBR color semantics**: dark purple/red/orange = burnt, neutral gray = unchanged, green = recovery
- **Grid chunking**: 4×2 grid = 8 chunks to stay within CDSE 2500px limit per request. Grid dimensions are computed dynamically from the Tiwi bbox at 20m resolution.
- **Resolution**: 20m (native SWIR band resolution — B11, B12)
- **Contrast enhancement** (mibr_bw): auto-levels percentile uses a `lowFound` boolean flag — do NOT use `low === 0` check because 0 is a valid pixel value
- **Transparent pixels only** (alpha === 0) are excluded from histogram — alpha > 0 pixels ARE included
- **dMIBR baseline cloud cover**: 50% floor (tropical dry season is cloudier than expected)

### Carbon Methodology (ACCU)

Carbon credit calculations follow the Australian Government's savanna burning ERF methodology.

**ACCU calculation chain:**
```
gross_abatement  = baseline_emissions - project_emissions
net_abatement    = gross_abatement × (1 - permanence_discount)   // typically 0.25
accus_issued     = net_abatement - uncertainty_buffer
revenue          = accus_issued × accu_price
```

Rules:
- Negative `gross_abatement` → zero ACCUs issued (never negative)
- Permanence discount applied before uncertainty buffer deduction
- All values in tCO₂-e unless labelled as ACCUs or AUD
- SAVBAT (Savanna Burning Abatement Tool) is the reference calculation tool

**ACCU period status workflow** (one direction only — no reversals without approval):
```
draft → submitted → under_review → approved → issued
```

**Fuel type classifications** (relevant to carbon emission factors):
- **EOF** — Eucalyptus Open Forest
- **EW** — Eucalyptus Woodland
- **SW** — Shrubby Woodland
- **SH** — Shrubland

### Fire Metrics

- Fire scar area calculations use geographic (geodesic) area via Turf.js `@turf/area` — not planar
- Fire frequency counted per sample point (0.5km point-grid sampling inside project boundary)
- Analysis zones are project sub-areas — metrics roll up to project level
- **Shape Index formula**: `(0.25 × perimeter_m) / sqrt(area_m²)` — higher = more complex/patchy burn
- **EDS end month is parameterized** (`edsEndMonth`) — months 1 to edsEndMonth = EDS, remainder = LDS. Not hardcoded.

**Fire compliance targets** (defined in `analysis-engine.ts` — do not change without updating all callers):

| Metric | Target | At Risk |
|--------|--------|---------|
| EDS Burn % | ≥35% | ≥30% |
| LDS Burn % | ≤10% | ≤15% |
| 3-Year Rolling coverage | 65–85% | 55–90% |
| 2-Year Rolling coverage | 50–70% | 40–80% |
| Unburnt Patches | ≥100 patches | ≥80 |
| Mean Patch Age | ≤3 years | ≤4 years |
| LDS Patch Age | ≥3 years | ≥2 years |
| Distance to Unburnt | ≤1000m | ≤1200m |
| Perimeter Impact | ≤25% | ≤30% |
| Shape Index (EDS) | ≥2.5 | ≥2.0 |

Note: `computeUnburntPatches()` and `computeDistanceToUnburnt()` are **statistical approximations** — true spatial analysis requires polygon differencing which is computationally expensive and not yet implemented.

## Workflow Rules

### Burn Plans

Burn plans follow a lifecycle — do not skip states or allow backward transitions without explicit logic:

```
draft → reviewed → approved → scheduled → active → completed
                 → cancelled (from any state)
```

Type defined in `src/lib/supabase/types.ts` as `BurnPlanStatus`. These exact string values are stored in DB — do not rename.

### ACCU Period Status

```
draft → submitted → under_review → approved → issued
```

Type defined in `AccuPeriod.status` in `src/lib/carbon-data.ts`.

**Important**: `carbon-data.ts` currently uses **static mock data**. The `carbon_project` / `accu_period` database tables do not yet exist in migrations. When these tables are added, `carbon-data.ts` must be replaced with Supabase queries.

### Fire Seasons

- EDS end month is configurable per-project via `edsEndMonth` parameter — not a hardcoded constant
- Typical Tiwi Islands setting: EDS = months 1–6, LDS = months 7–12
- Fire scar source types: `nafi_modis` | `nafi_sentinel` | `sentinel_manual` | `field_mapped` | `landgate`

## Permission Rules

- Users belong to organizations; organizations own projects
- Project-level permissions govern data access
- Admin operations (service role) are server-side only via `getAdminClient()`
- Cultural zones have restricted visibility — respect Traditional Owner access rules

## Critical Shared Domain Logic

Changes to these areas require impact scanning:

- `src/lib/carbon-data.ts` — carbon methodology calculations
- `src/lib/fire-metrics-data.ts` — fire scar area and frequency metrics
- `src/lib/analysis-engine.ts` — analysis orchestration
- `src/lib/sentinel-compositor.ts` — image differencing and enhancement
- `src/lib/sentinel-evalscripts.ts` — Sentinel Hub evalscripts (affect all imagery products)
- `src/lib/tiwi-grid.ts` — grid geometry (affects all chunked imagery)
- `src/lib/spatial-utils.ts` — area calculations used in carbon and fire metrics
- `src/workers/` — web worker analysis engine
