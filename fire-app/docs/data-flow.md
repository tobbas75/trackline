# Data Flow Architecture — Fire Project System

This document describes how data flows through the Fire Project System, with **fire scars as the foundational data source** that drives all analytics, compliance calculations, and carbon methodology.

---

## Core Principle: Fire Scars as Foundation

**Everything flows from fire scar geometry and attributes.**

```
Fire Scars (spatial + temporal)
    ↓
    ├─→ Fire Metrics (area, frequency, seasonality)
    ├─→ Compliance Analytics (EDS/LDS targets, patch analysis)
    ├─→ Carbon Calculations (emissions, abatement, ACCUs)
    ├─→ Vegetation Impact (fuel type × burn history)
    ├─→ Operational Planning (burn plan effectiveness)
    └─→ Reporting (dashboards, exports, PDF reports)
```

---

## 1. FIRE SCAR DATA: Entry Points

### 1.1 NAFI Import (Primary Source)

**Route**: `POST /api/nafi/import`

```
User selects year + region
    ↓
API downloads NAFI shapefile from firenorth.org.au
    ↓
Parse shapefile → extract features
    ↓
Transform to GeoJSON with attributes:
    - geometry (MultiPolygon)
    - fire_id (unique identifier)
    - fire_date (burn date)
    - burn_season (EDS or LDS — classified by month)
    - area_ha (geodesic area via Turf.js)
    - source: "NAFI"
    ↓
Insert into Supabase `fire_scar` table (batch)
    ↓
Store in fire-scar-store (Zustand)
    ↓
Display on map (fire-map.tsx)
```

**Data Schema**:
```typescript
interface FireScar {
  id: string;
  project_id: string;
  fire_date: string;           // YYYY-MM-DD
  burn_season: "EDS" | "LDS";  // Early/Late Dry Season
  area_ha: number;             // Geodesic area (hectares)
  geometry: GeoJSON.MultiPolygon;
  source: "NAFI" | "uploaded" | "planned";
  confidence?: number;         // Detection confidence (0-1)
  metadata?: Record<string, any>;
}
```

**Key Files**:
- [`src/app/api/nafi/import/route.ts`](../src/app/api/nafi/import/route.ts) — NAFI import endpoint
- [`src/stores/fire-scar-store.ts`](../src/stores/fire-scar-store.ts) — Client state
- [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql#L199) — `fire_scar` table

---

### 1.2 Manual Upload (Secondary Source)

**Route**: Shapefile upload component

```
User uploads .zip (shapefile bundle)
    ↓
Parse via shpjs library
    ↓
Extract GeoJSON features
    ↓
Attribute Mapping (flexible schema):
    - Look for name/NAME/Name → feature name
    - Look for date/DATE/FIRE_DATE → fire_date
    - Look for season/SEASON → burn_season
    - Calculate area if missing
    ↓
Validate geometry (valid GeoJSON, within project bounds)
    ↓
Insert into `fire_scar` table with source="uploaded"
    ↓
Store in fire-scar-store
```

**Key Files**:
- [`src/components/shapefile-upload.tsx`](../src/components/shapefile-upload.tsx) — Upload UI
- [`src/lib/geo-utils.ts`](../src/lib/geo-utils.ts) — Geometry validation
- [`src/lib/spatial-utils.ts`](../src/lib/spatial-utils.ts) — Area calculation

---

### 1.3 Sentinel-2 Derived (Future)

**Not yet implemented** — planned dMIBR burn scar detection:

```
dMIBR imagery (differenced MIBR)
    ↓
Apply threshold (negative diff = burnt)
    ↓
Vectorize raster → polygons
    ↓
Filter by minimum area (>10 ha)
    ↓
Insert with source="sentinel"
```

---

## 2. FIRE METRICS CALCULATION LAYER

**Once fire scars exist, all metrics derive from spatial/temporal analysis.**

### 2.1 Analysis Engine Entry Point

**File**: [`src/lib/analysis-engine.ts`](../src/lib/analysis-engine.ts)

```
User clicks "Run Analysis" on dashboard
    ↓
analysis-store.runAnalysis() dispatched
    ↓
Web Worker spawned → analysis-worker.ts
    ↓
Load data:
    - Fire scars (current year + historical)
    - Project boundary
    - Analysis zones (optional sub-areas)
    - Vegetation map
    ↓
Execute analysis pipeline (see below)
    ↓
Store results in analysis-store
    ↓
Display in dashboard + fire-history pages
```

**Key Files**:
- [`src/workers/analysis-worker.ts`](../src/workers/analysis-worker.ts) — Web Worker
- [`src/stores/analysis-store.ts`](../src/stores/analysis-store.ts) — Results storage
- [`src/hooks/use-analysis.ts`](../src/hooks/use-analysis.ts) — React hook

---

### 2.2 Analysis Pipeline Stages

#### Stage 1: Spatial Clipping

```typescript
// Clip fire scars to project boundary (or analysis zone)
function clipToProjectBoundary(
  fireScars: GeoJSON.Feature[],
  boundary: GeoJSON.Feature
): GeoJSON.Feature[] {
  return fireScars.map(scar => {
    const clipped = turf.intersect(scar, boundary);
    return clipped ? { ...scar, geometry: clipped.geometry } : null;
  }).filter(Boolean);
}
```

**Data Transformation**:
```
Fire scars (full extent)
    ↓ turf.intersect()
Fire scars (clipped to boundary)
```

**Output**: Fire scars with geometry constrained to project area only

---

#### Stage 2: Season Classification

```typescript
// Classify scars by EDS (early) vs LDS (late dry season)
function classifyBySeason(
  fireScars: GeoJSON.Feature[],
  edsEndMonth: number // parameterized per-project (default: 7 = July)
): { eds: GeoJSON.Feature[], lds: GeoJSON.Feature[] } {
  return fireScars.reduce((acc, scar) => {
    const month = new Date(scar.properties.fire_date).getMonth() + 1;
    if (month <= edsEndMonth) {
      acc.eds.push(scar);
    } else {
      acc.lds.push(scar);
    }
    return acc;
  }, { eds: [], lds: [] });
}
```

**Data Transformation**:
```
Fire scars (mixed seasons)
    ↓ classify by month
{ eds: Feature[], lds: Feature[] }
```

**Output**: Fire scars grouped by season (drives compliance targets)

---

#### Stage 3: Area Calculation

```typescript
// Calculate total burnt area by season
function calculateSeasonalArea(
  edScars: GeoJSON.Feature[],
  ldsScars: GeoJSON.Feature[],
  totalProjectArea: number
): {
  eds_area_ha: number;
  lds_area_ha: number;
  eds_percent: number;
  lds_percent: number;
} {
  const edsArea = edScars.reduce((sum, scar) => sum + turf.area(scar) / 10000, 0);
  const ldsArea = ldsScars.reduce((sum, scar) => sum + turf.area(scar) / 10000, 0);
  
  return {
    eds_area_ha: edsArea,
    lds_area_ha: ldsArea,
    eds_percent: (edsArea / totalProjectArea) * 100,
    lds_percent: (ldsArea / totalProjectArea) * 100,
  };
}
```

**Data Transformation**:
```
Fire scars (geometry)
    ↓ turf.area() for each
Sum total burnt area
    ↓ divide by project area
Seasonal burn percentages
```

**Output**: EDS/LDS burn percentages (primary compliance metric)

---

#### Stage 4: Shape Index (Patchiness)

```typescript
// Higher shape index = more patchy/complex burn pattern (better for biodiversity)
function computeShapeIndex(scar: GeoJSON.Feature): number {
  const area = turf.area(scar);        // m²
  const perimeter = turf.length(scar) * 1000; // m
  return (0.25 * perimeter) / Math.sqrt(area);
}
```

**Formula**: `SI = (0.25 × perimeter) / √area`

**Data Transformation**:
```
Fire scar geometry
    ↓ turf.area() + turf.length()
Shape index per scar
    ↓ aggregate
Mean shape index by season
```

**Interpretation**:
- **SI < 2.0**: Simple, solid burn (low patchiness)
- **SI 2.0–2.5**: Moderate patchiness (at-risk target)
- **SI > 2.5**: Complex, patchy burn (compliance target — good!)

**Output**: Mean shape index for EDS/LDS (biodiversity indicator)

---

#### Stage 5: Vegetation Intersection

```typescript
// Intersect fire scars with vegetation/fuel type map
function intersectWithVegetation(
  fireScars: GeoJSON.Feature[],
  vegetationMap: GeoJSON.Feature[]
): Array<{
  fuel_type: string; // EOF, EW, SW, SH
  area_burnt_ha: number;
  percent_burnt: number;
}> {
  return vegetationMap.map(vegFeature => {
    const fuelType = vegFeature.properties.fuel_type;
    const totalArea = turf.area(vegFeature) / 10000;
    
    const burntArea = fireScars.reduce((sum, scar) => {
      const intersection = turf.intersect(scar, vegFeature);
      return sum + (intersection ? turf.area(intersection) / 10000 : 0);
    }, 0);
    
    return {
      fuel_type: fuelType,
      area_burnt_ha: burntArea,
      percent_burnt: (burntArea / totalArea) * 100,
    };
  });
}
```

**Data Transformation**:
```
Fire scars × Vegetation polygons
    ↓ turf.intersect() for each combination
Burnt area by fuel type
    ↓ aggregate
Vegetation impact summary
```

**Output**: Burn coverage by fuel type (EOF, EW, SW, SH)

**Key Files**:
- [`src/lib/analysis-engine.ts`](../src/lib/analysis-engine.ts#L141) — `intersectWithVegetation()`
- [`src/stores/vegetation-store.ts`](../src/stores/vegetation-store.ts) — Fuel type data

---

#### Stage 6: Multi-Year Rolling Analysis

```typescript
// Calculate 2-year and 3-year rolling burn coverage
function calculateRollingCoverage(
  fireScarsMultiYear: Record<number, GeoJSON.Feature[]>,
  projectBoundary: GeoJSON.Feature
): {
  two_year_percent: number;
  three_year_percent: number;
} {
  const currentYear = new Date().getFullYear();
  const twoYearScars = [
    ...fireScarsMultiYear[currentYear] ?? [],
    ...fireScarsMultiYear[currentYear - 1] ?? [],
  ];
  const threeYearScars = [
    ...twoYearScars,
    ...fireScarsMultiYear[currentYear - 2] ?? [],
  ];
  
  // Union overlapping fire scars to avoid double-counting
  const twoYearUnion = turf.union(...twoYearScars);
  const threeYearUnion = turf.union(...threeYearScars);
  
  const projectArea = turf.area(projectBoundary) / 10000;
  
  return {
    two_year_percent: (turf.area(twoYearUnion) / 10000 / projectArea) * 100,
    three_year_percent: (turf.area(threeYearUnion) / 10000 / projectArea) * 100,
  };
}
```

**Data Transformation**:
```
Fire scars (year N, N-1, N-2)
    ↓ turf.union() to merge overlaps
Combined burnt area
    ↓ divide by project area
Rolling burn coverage %
```

**Compliance Targets**:
- **2-year target**: 50–70% (at-risk: 40–80%)
- **3-year target**: 65–85% (at-risk: 55–90%)

**Output**: Multi-year burn coverage (compliance metric)

---

#### Stage 7: Unburnt Patch Analysis

```typescript
// Identify unburnt patches and calculate biodiversity metrics
function analyzeUnburntPatches(
  projectBoundary: GeoJSON.Feature,
  fireScars: GeoJSON.Feature[]
): {
  num_patches: number;
  mean_patch_age: number;
  distance_to_unburnt_m: number;
} {
  // Subtract fire scars from project boundary
  const burntUnion = turf.union(...fireScars);
  const unburnt = turf.difference(projectBoundary, burntUnion);
  
  // Split multipolygon into individual patches
  const patches = unburnt.geometry.type === 'MultiPolygon'
    ? unburnt.geometry.coordinates.map(coords => turf.polygon(coords))
    : [unburnt];
  
  // Calculate mean patch age from fire history
  const patchAges = patches.map(patch => {
    // Find most recent fire scar that intersects edges
    // Age = years since last fire
  });
  
  // Calculate mean distance from burnt to unburnt
  const samplePoints = turf.pointGrid(turf.bbox(projectBoundary), 0.5); // 500m grid
  const distances = samplePoints.features.map(point => {
    const nearestUnburnt = turf.nearestPoint(point, turf.featureCollection(patches));
    return turf.distance(point, nearestUnburnt, { units: 'meters' });
  });
  
  return {
    num_patches: patches.length,
    mean_patch_age: patchAges.reduce((sum, age) => sum + age, 0) / patchAges.length,
    distance_to_unburnt_m: distances.reduce((sum, d) => sum + d, 0) / distances.length,
  };
}
```

**Data Transformation**:
```
Project boundary - Fire scars
    ↓ turf.difference()
Unburnt area (inverted)
    ↓ split into patches
Patch count + age + distance metrics
```

**Compliance Targets**:
- **Unburnt patches**: ≥100 patches (at-risk: ≥80)
- **Mean patch age**: ≤3 years (at-risk: ≤4)
- **Distance to unburnt**: ≤1000m (at-risk: ≤1200m)

**Output**: Unburnt patch metrics (biodiversity indicators)

---

### 2.3 Compliance Scoring

```typescript
// Evaluate metrics against targets
function evaluateCompliance(metrics: AnalysisResult): ComplianceStatus {
  const targets = {
    eds_burn_min: 35, eds_burn_at_risk: 30,
    lds_burn_max: 10, lds_burn_at_risk: 15,
    three_year_min: 65, three_year_max: 85,
    two_year_min: 50, two_year_max: 70,
    patches_min: 100, patches_at_risk: 80,
    // ... etc
  };
  
  const status = {
    eds_burn: getStatus(metrics.eds_percent, targets.eds_burn_min, targets.eds_burn_at_risk),
    lds_burn: getStatus(metrics.lds_percent, targets.lds_burn_max, targets.lds_burn_at_risk, true), // inverted
    // ... evaluate all metrics
  };
  
  return {
    overall: calculateOverallStatus(status),
    metrics: status,
  };
}

function getStatus(value: number, target: number, atRisk: number, inverted = false): "on-track" | "at-risk" | "off-track" {
  if (inverted) {
    if (value <= target) return "on-track";
    if (value <= atRisk) return "at-risk";
    return "off-track";
  } else {
    if (value >= target) return "on-track";
    if (value >= atRisk) return "at-risk";
    return "off-track";
  }
}
```

**Data Transformation**:
```
Analysis metrics
    ↓ compare to targets
Status per metric (on-track, at-risk, off-track)
    ↓ aggregate
Overall compliance status
```

**Output**: Compliance dashboard status (colour-coded indicators)

**Key Files**:
- [`src/lib/analysis-engine.ts`](../src/lib/analysis-engine.ts#L600) — Compliance evaluation
- [`src/app/(app)/dashboard/page.tsx`](../src/app/(app)/dashboard/page.tsx) — Dashboard display

---

## 3. CARBON METHODOLOGY LAYER

**Fire scars directly determine carbon abatement calculations.**

### 3.1 Baseline vs Project Emissions

**Formula** (Savanna Burning Methodology):

```
Gross Abatement = Baseline Emissions - Project Emissions

where:
  Baseline Emissions = Default fire regime (historical average)
  Project Emissions = Actual emissions (calculated from fire scars)
```

**Calculation from Fire Scars**:

```typescript
function calculateProjectEmissions(
  fireScars: { eds: GeoJSON.Feature[], lds: GeoJSON.Feature[] },
  vegetationMap: GeoJSON.Feature[]
): {
  eds_emissions_tco2e: number;
  lds_emissions_tco2e: number;
  total_emissions_tco2e: number;
} {
  // Emission factors by fuel type and season (from methodology)
  const emissionFactors = {
    EOF: { eds: 2.5, lds: 5.8 }, // tCO₂-e per hectare
    EW: { eds: 1.8, lds: 4.2 },
    SW: { eds: 1.2, lds: 3.1 },
    SH: { eds: 0.9, lds: 2.3 },
  };
  
  // Intersect fire scars with vegetation (Stage 5 output reused)
  const edsByVeg = intersectWithVegetation(fireScars.eds, vegetationMap);
  const ldsByVeg = intersectWithVegetation(fireScars.lds, vegetationMap);
  
  const edsEmissions = edsByVeg.reduce((sum, { fuel_type, area_burnt_ha }) => {
    return sum + (area_burnt_ha * emissionFactors[fuel_type].eds);
  }, 0);
  
  const ldsEmissions = ldsByVeg.reduce((sum, { fuel_type, area_burnt_ha }) => {
    return sum + (area_burnt_ha * emissionFactors[fuel_type].lds);
  }, 0);
  
  return {
    eds_emissions_tco2e: edsEmissions,
    lds_emissions_tco2e: ldsEmissions,
    total_emissions_tco2e: edsEmissions + ldsEmissions,
  };
}
```

**Data Transformation**:
```
Fire scars (EDS/LDS) × Vegetation (fuel types)
    ↓ apply emission factors
Emissions by season and fuel type
    ↓ sum
Total project emissions (tCO₂-e)
```

---

### 3.2 ACCU Issuance Calculation

```
Gross Abatement = Baseline Emissions - Project Emissions
Net Abatement = Gross Abatement × (1 - Permanence Discount)  // typically 0.25 = 25% discount
ACCUs Eligible = Net Abatement - Uncertainty Buffer
ACCUs Issued = max(0, ACCUs Eligible)  // never negative
Revenue (AUD) = ACCUs Issued × ACCU Price
```

**Example**:
```
Baseline Emissions: 50,000 tCO₂-e (historical average)
Project Emissions: 35,000 tCO₂-e (from fire scars)
Gross Abatement: 15,000 tCO₂-e
Net Abatement: 15,000 × 0.75 = 11,250 tCO₂-e
Uncertainty Buffer: 500 tCO₂-e
ACCUs Issued: 10,750 ACCUs
Revenue: 10,750 × $45 = $483,750 AUD
```

**Data Transformation**:
```
Fire scars → Project emissions
    ↓ subtract from baseline
Gross abatement
    ↓ apply permanence discount
Net abatement
    ↓ subtract uncertainty buffer
ACCUs issued
    ↓ multiply by price
Revenue
```

**Output**: Carbon credits (ACCUs) and revenue projections

**Key Files**:
- [`src/lib/carbon-data.ts`](../src/lib/carbon-data.ts) — Carbon calculations (CURRENTLY MOCK DATA — TODO: replace with DB queries)
- [`src/app/(app)/carbon/page.tsx`](../src/app/(app)/carbon/page.tsx) — Carbon dashboard
- [`supabase/migrations/007_carbon_methodology.sql`](../supabase/migrations/007_carbon_methodology.sql) — TODO: carbon tables

---

## 4. OPERATIONAL PLANNING LAYER

**Fire scars inform future burn planning.**

### 4.1 Burn Plan Effectiveness

```typescript
// Compare planned burn areas vs actual fire scars
function evaluateBurnPlanEffectiveness(
  burnPlan: GeoJSON.Feature,
  fireScars: GeoJSON.Feature[]
): {
  planned_area_ha: number;
  burnt_area_ha: number;
  effectiveness_percent: number;
  unburnt_remainder: GeoJSON.Feature;
} {
  const plannedArea = turf.area(burnPlan) / 10000;
  
  // Intersect fire scars with burn plan
  const actualBurnt = fireScars.reduce((union, scar) => {
    const intersection = turf.intersect(scar, burnPlan);
    return intersection ? turf.union(union, intersection) : union;
  }, null);
  
  const burntArea = actualBurnt ? turf.area(actualBurnt) / 10000 : 0;
  const effectiveness = (burntArea / plannedArea) * 100;
  
  // Calculate unburnt remainder
  const unburnt = actualBurnt ? turf.difference(burnPlan, actualBurnt) : burnPlan;
  
  return {
    planned_area_ha: plannedArea,
    burnt_area_ha: burntArea,
    effectiveness_percent: effectiveness,
    unburnt_remainder: unburnt,
  };
}
```

**Data Transformation**:
```
Burn plan (proposed) × Fire scars (actual)
    ↓ turf.intersect()
Burnt vs planned comparison
    ↓ turf.difference()
Unburnt remainder (rollover to next plan)
```

**Output**: Burn plan effectiveness metrics

**Key Files**:
- [`src/app/(app)/burn-plans/page.tsx`](../src/app/(app)/burn-plans/page.tsx) — Burn planning UI
- [`src/stores/project-store.ts`](../src/stores/project-store.ts) — Burn plan state

---

### 4.2 Target Area Prioritization

```typescript
// Identify priority burn areas based on fire history
function prioritizeBurnAreas(
  projectBoundary: GeoJSON.Feature,
  fireHistoryYears: Record<number, GeoJSON.Feature[]>
): GeoJSON.Feature[] {
  // Calculate fire frequency for each cell
  const grid = turf.pointGrid(turf.bbox(projectBoundary), 1); // 1km grid
  
  const prioritizedCells = grid.features.map(cell => {
    const yearsSinceFire = calculateYearsSinceLastFire(cell, fireHistoryYears);
    const ldsBurnCount = countLDSBurns(cell, fireHistoryYears);
    
    // Priority score (higher = more urgent)
    const priority = 
      (yearsSinceFire > 3 ? 10 : 0) +  // Old fuel
      (ldsBurnCount > 1 ? 5 : 0);       // Too many LDS burns
    
    return { ...cell, properties: { ...cell.properties, priority } };
  });
  
  return prioritizedCells
    .filter(cell => cell.properties.priority > 5)
    .sort((a, b) => b.properties.priority - a.properties.priority);
}
```

**Data Transformation**:
```
Fire scars (multi-year) × Project grid
    ↓ calculate fire frequency per cell
Priority scores
    ↓ sort by urgency
Target areas for next burn season
```

**Output**: Priority burn zones (guides operational planning)

---

## 5. REPORTING & VISUALIZATION LAYER

### 5.1 Dashboard Aggregation

**Route**: `/dashboard`

```
Fire scars → Analysis Engine
    ↓
Compliance metrics
    ↓
Dashboard cards:
    - EDS burn % (blue progress bar)
    - LDS burn % (red progress bar)
    - 3-year rolling coverage (bar chart)
    - Shape index (line chart)
    - Unburnt patches (badge)
    - Compliance status (colour-coded)
```

**Key Files**:
- [`src/app/(app)/dashboard/page.tsx`](../src/app/(app)/dashboard/page.tsx)
- [`src/components/dashboard-cards.tsx`](../src/components/dashboard-cards.tsx)

---

### 5.2 Map Visualization

**Component**: [`src/components/map/fire-map.tsx`](../src/components/map/fire-map.tsx)

```
Fire scars (Zustand store)
    ↓
MapLibre GL data source update
    ↓
Render fire scars on map:
    - EDS scars: Blue (#3b82f6)
    - LDS scars: Red (#ef4444)
    - Fill opacity: 0.4
    - Border width: 1px
    ↓
Layer panel toggles visibility
```

**Colour Scheme**:
- **EDS (Early Dry Season)**: Blue — good for compliance
- **LDS (Late Dry Season)**: Red — avoid (higher emissions)
- **Unknown season**: Grey

---

### 5.3 PDF Report Generation

**File**: [`src/lib/pdf-report.ts`](../src/lib/pdf-report.ts)

```
Fire scars → Analysis Engine → Compliance Metrics
    ↓
Generate PDF report:
    - Cover page (project name, reporting period)
    - Executive summary (compliance status)
    - Detailed metrics tables (EDS/LDS %, shape index, patches)
    - Fire scar map (static image)
    - Vegetation impact charts
    - Multi-year trend graphs
    - Carbon abatement summary
    ↓
Download as PDF
```

**Data Sources**:
- Fire scars (geometry → map image)
- Analysis results (metrics → tables/charts)
- Carbon calculations (ACCUs → financial summary)

---

### 5.4 CSV Export

**File**: [`src/lib/export-utils.ts`](../src/lib/export-utils.ts)

```
Fire scars + Analysis Results
    ↓
Transform to tabular format:
    - Annual burn metrics (year, EDS %, LDS %, total area)
    - Shape index by year
    - Vegetation impact (fuel type, area burnt, %)
    - Patch statistics
    - Rolling coverage
    ↓
Generate CSV with headers
    ↓
Download
```

**CSV Structure**:
```csv
Year,EDS_Percent,LDS_Percent,Total_Area_Ha,Shape_Index_EDS,Shape_Index_LDS,Patches,Mean_Patch_Age
2021,42.3,8.1,35420,2.8,2.1,132,2.4
2022,38.7,11.2,38910,2.6,2.3,118,2.8
2023,45.1,7.3,34200,3.1,1.9,145,2.1
```

---

## 6. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA ENTRY POINTS                         │
├─────────────────────────────────────────────────────────────┤
│  NAFI Import     │   Manual Upload   │   Sentinel-2 (future)│
│  (shapefile)     │   (shapefile)      │   (dMIBR vectorize) │
└────────┬─────────────────┬───────────────────┬──────────────┘
         │                 │                   │
         └─────────────────┴───────────────────┘
                           ↓
         ┌─────────────────────────────────────┐
         │       FIRE SCAR DATABASE            │
         │  (Supabase: fire_scar table)        │
         │  - geometry (MultiPolygon)          │
         │  - fire_date (timestamp)            │
         │  - burn_season (EDS/LDS)            │
         │  - area_ha (number)                 │
         │  - source (NAFI/uploaded/sentinel)  │
         └─────────────────┬───────────────────┘
                           ↓
         ┌─────────────────────────────────────┐
         │      FIRE SCAR STORE (Zustand)      │
         │  Client-side state management       │
         └─────────────────┬───────────────────┘
                           ↓
         ┌─────────────────────────────────────┐
         │         MAP VISUALIZATION           │
         │  (MapLibre GL - fire-map.tsx)       │
         │  - Colour: EDS blue, LDS red        │
         │  - Opacity: 0.4                     │
         │  - Toggle layer visibility          │
         └─────────────────┬───────────────────┘
                           ↓
         ┌─────────────────────────────────────┐
         │       ANALYSIS ENGINE               │
         │  (Web Worker: analysis-worker.ts)   │
         └─────────────────┬───────────────────┘
                           ↓
         ┌─────────────────────────────────────────────────────┐
         │              SPATIAL ANALYSIS STAGES                 │
         ├──────────────────────────────────────────────────────┤
         │ 1. Clip to boundary → turf.intersect()              │
         │ 2. Classify by season → month check                 │
         │ 3. Calculate area → turf.area()                     │
         │ 4. Shape index → (0.25 × perimeter) / √area         │
         │ 5. Vegetation intersection → turf.intersect(veg)    │
         │ 6. Rolling coverage → union multi-year              │
         │ 7. Unburnt patches → difference + split             │
         └─────────────────┬───────────────────────────────────┘
                           ↓
    ┌──────────────────────┼──────────────────────┐
    ↓                      ↓                      ↓
┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ COMPLIANCE  │  │  CARBON CALC     │  │  OPERATIONAL     │
│ METRICS     │  │  (carbon-data)   │  │  PLANNING        │
├─────────────┤  ├──────────────────┤  ├──────────────────┤
│ • EDS %     │  │ • Emissions      │  │ • Burn plan      │
│ • LDS %     │  │   (by fuel type) │  │   effectiveness  │
│ • 3yr roll  │  │ • Gross abate    │  │ • Priority zones │
│ • Shape idx │  │ • Net abate      │  │ • Target areas   │
│ • Patches   │  │ • ACCUs issued   │  │ • Rollover plans │
│ • Distance  │  │ • Revenue (AUD)  │  │                  │
└──────┬──────┘  └────────┬─────────┘  └────────┬─────────┘
       │                  │                      │
       └─────────────┬────┴───────────────┬──────┘
                     ↓                    ↓
         ┌─────────────────────┐  ┌────────────────────┐
         │    DASHBOARDS       │  │   REPORTS          │
         ├─────────────────────┤  ├────────────────────┤
         │ • Main dashboard    │  │ • PDF generation   │
         │ • Fire history page │  │ • CSV export       │
         │ • Carbon page       │  │ • Compliance docs  │
         │ • Burn plans page   │  │ • Financial reports│
         └─────────────────────┘  └────────────────────┘
```

---

## 7. KEY DEPENDENCIES BETWEEN DATA LAYERS

### Fire Scars → Compliance Metrics

| Metric | Calculation | Fire Scar Dependency |
|--------|-------------|---------------------|
| EDS Burn % | Sum(EDS area) / Project area × 100 | Fire date → season classification |
| LDS Burn % | Sum(LDS area) / Project area × 100 | Fire date → season classification |
| Shape Index | (0.25 × perimeter) / √area | Geometry → perimeter calculation |
| 3-Year Rolling | Union(year N, N-1, N-2) / Project area | Multi-year fire scars |
| Unburnt Patches | Project - Union(fire scars) → count | Geometry → spatial difference |

---

### Fire Scars → Carbon Calculations

| Component | Calculation | Fire Scar Dependency |
|-----------|-------------|---------------------|
| EDS Emissions | EDS fire scars × vegetation × emission factor (EDS) | Season + geometry + vegetation intersection |
| LDS Emissions | LDS fire scars × vegetation × emission factor (LDS) | Season + geometry + vegetation intersection |
| Project Emissions | EDS emissions + LDS emissions | Combined seasonal emissions |
| Gross Abatement | Baseline - Project emissions | Project emissions (from fire scars) |
| ACCUs Issued | Net abatement - uncertainty buffer | Indirect via gross abatement |

---

### Fire Scars → Operational Planning

| Planning Component | Calculation | Fire Scar Dependency |
|-------------------|-------------|---------------------|
| Burn Plan Effectiveness | Intersect(burn plan, fire scars) / Planned area | Geometry → spatial intersection |
| Priority Zones | Years since last fire | Fire date → fire frequency calculation |
| Target Areas | LDS burn count + fuel age | Multi-year fire scars + dates |

---

## 8. DATA QUALITY & VALIDATION

### 8.1 Fire Scar Validation Rules

**On import/upload**:
```typescript
function validateFireScar(scar: GeoJSON.Feature): ValidationResult {
  const errors: string[] = [];
  
  // 1. Geometry validation
  if (!scar.geometry) {
    errors.push("Missing geometry");
  }
  if (scar.geometry.type !== "Polygon" && scar.geometry.type !== "MultiPolygon") {
    errors.push("Geometry must be Polygon or MultiPolygon");
  }
  
  // 2. Date validation
  const fireDate = new Date(scar.properties.fire_date);
  if (isNaN(fireDate.getTime())) {
    errors.push("Invalid fire_date");
  }
  if (fireDate > new Date()) {
    errors.push("Fire date cannot be in the future");
  }
  
  // 3. Season validation
  if (!["EDS", "LDS"].includes(scar.properties.burn_season)) {
    errors.push("burn_season must be 'EDS' or 'LDS'");
  }
  
  // 4. Area validation
  const calculatedArea = turf.area(scar) / 10000; // ha
  if (Math.abs(calculatedArea - scar.properties.area_ha) > 0.1) {
    errors.push("Declared area_ha does not match calculated area");
  }
  
  // 5. Boundary validation
  if (!turf.booleanContains(projectBoundary, scar)) {
    errors.push("Fire scar extends outside project boundary");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

### 8.2 Data Quality Metrics

**Track in audit log**:
- **Source coverage**: % of fire scars from each source (NAFI, uploaded, sentinel)
- **Temporal coverage**: Years with complete data vs gaps
- **Spatial coverage**: % of project area with at least one fire scar
- **Attribute completeness**: % of fire scars with all required fields
- **Duplicate detection**: Fire scars with overlapping geometry + date

---

## 9. FUTURE ENHANCEMENTS

### 9.1 Real-Time Fire Scar Detection (Sentinel-2)

**Planned workflow**:
```
Sentinel-2 imagery (baseline + current)
    ↓ dMIBR processing (sentinel-compositor.ts)
Differenced imagery (negative = burnt)
    ↓ threshold + vectorize
Candidate burn polygons
    ↓ filter by area (>10 ha)
Auto-insert to fire_scar table with source="sentinel"
    ↓ notify user for review
Manual review + confirm/reject
    ↓ if confirmed
Included in next analysis run
```

**Benefits**:
- Real-time burn detection (vs monthly NAFI)
- Higher spatial resolution (20m vs 250m)
- Direct integration with imagery workflow

---

### 9.2 Machine Learning Burn Severity

**Planned enhancement**:
```
dMIBR values per fire scar
    ↓ classify severity
Low (dMIBR -0.1 to -0.3) → light burn
Medium (dMIBR -0.3 to -0.6) → moderate burn
High (dMIBR < -0.6) → severe burn
    ↓ store as severity property
Use severity in emission calculations (scaled emission factors)
```

**Impact**: More accurate emissions (currently assumes uniform burn intensity)

---

### 9.3 Predictive Burn Modeling

**Planned feature**:
```
Historical fire scars (5+ years)
    ↓ spatial-temporal patterns
Fire frequency heatmap
    ↓ identify high-risk zones
Predictive model (weather + fuel age + season)
    ↓ generate burn probability map
Operational planning tool (target high-probability zones first)
```

**Impact**: Optimize burn planning based on historical patterns

---

## 10. SUMMARY

### Fire Scars Are The Foundation

**Everything derives from fire scar data:**

1. **Spatial data** (geometry) → Area calculations, patch analysis, vegetation intersection
2. **Temporal data** (fire_date) → Season classification, rolling coverage, fire frequency
3. **Attribute data** (burn_season, area_ha) → Compliance metrics, emissions calculations

### Data Flow Hierarchy

```
Fire Scars (raw data)
    ↓
Analysis Engine (spatial processing)
    ↓
Metrics (compliance, carbon, operational)
    ↓
Reporting (dashboards, PDFs, CSV exports)
```

### Critical Files for Data Flow

| Layer | Key Files |
|-------|-----------|
| **Entry** | `api/nafi/import/route.ts`, `shapefile-upload.tsx` |
| **Storage** | `fire-scar-store.ts`, `supabase/migrations/001_initial_schema.sql` |
| **Processing** | `analysis-engine.ts`, `analysis-worker.ts` |
| **Metrics** | `fire-metrics-data.ts`, `carbon-data.ts` |
| **Visualization** | `fire-map.tsx`, `dashboard/page.tsx` |
| **Export** | `export-utils.ts`, `pdf-report.ts` |

### Data Quality Priority

**To ensure reliable calculations:**
1. Validate fire scar geometry (no self-intersections, within bounds)
2. Validate fire dates (no future dates, consistent with season)
3. Ensure temporal completeness (no missing years)
4. Cross-validate area calculations (declared vs calculated)
5. Monitor source coverage (prefer NAFI, supplement with uploads)

---

**This document should be read alongside:**
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — System structure
- [`DOMAIN_RULES.md`](../DOMAIN_RULES.md) — Business invariants
- [`docs/sentinel-imagery-system.md`](sentinel-imagery-system.md) — Imagery pipeline
- [`docs/architecture.md`](architecture.md) — File map
