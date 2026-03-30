/**
 * Structured content for the Fire Metrics Methodology page and report tooltips.
 * All methodology text is centralised here — not scattered across JSX.
 */

// ─── Metric Methodology ──────────────────────────────────────────

export interface MetricMethodology {
  /** Metric number (1-13) */
  num: number;
  /** Short metric name */
  name: string;
  /** What this metric measures and why it matters */
  description: string;
  /** How it's calculated (plain text formula or steps) */
  formula: string;
  /** What input data is required */
  dataRequired: string;
  /** How to interpret the values — what's good, what's bad */
  interpretation: string;
  /** Target range from the Healthy Country Plan */
  target: string;
  /** Which CER table this feeds into, if any */
  cfiRelevance?: string;
  /** Whether this metric is currently implemented */
  status: "implemented" | "deferred";
}

export const METRICS: MetricMethodology[] = [
  {
    num: 1,
    name: "Annual Burn %",
    description:
      "Percentage of the project area burnt in a given year, split into Early Dry Season (EDS) and Late Dry Season (LDS) components. This is the foundational metric for savanna fire management — the primary goal is to shift burning from LDS to EDS.",
    formula:
      "EDS % = (total EDS burnt area ÷ project area) × 100\nLDS % = (total LDS burnt area ÷ project area) × 100\nTotal % = EDS % + LDS %",
    dataRequired:
      "Fire scar polygons with month attribute, project boundary polygon, EDS/LDS season cutoff month.",
    interpretation:
      "Higher EDS % and lower LDS % is better. A well-managed savanna fire project aims for 30–50% total annual burn, with the majority (>70%) occurring in EDS. High LDS % indicates unmanaged wildfire.",
    target: "EDS ≥35%, LDS ≤10%, Total 35–50%",
    cfiRelevance: "Feeds directly into CFI Table 3 (area by vegetation class and season).",
    status: "implemented",
  },
  {
    num: 2,
    name: "Shape Index",
    description:
      "Measures how complex and irregular the edges of fire scar patches are. A perfect circle has a Shape Index of 1.0 — higher values indicate more irregular, patchy burns typical of lower-intensity EDS fires.",
    formula:
      "SI = (0.25 × perimeter) / √area\nCalculated separately for EDS and LDS patches, then averaged by season.",
    dataRequired: "Fire scar polygons with geometry (perimeter and area calculable).",
    interpretation:
      "Higher Shape Index (>2.5) indicates patchy, mosaic-style burns — desirable for biodiversity. Values near 1.0 indicate compact, intense burns typical of LDS wildfire. EDS burns should consistently score higher than LDS.",
    target: "EDS Shape Index ≥2.5",
    status: "implemented",
  },
  {
    num: 3,
    name: "3-Year Rolling Burn",
    description:
      "Cumulative proportion of the project area that has been burnt at least once in a 3-year rolling window. Tracks whether the full landscape is being treated over a multi-year cycle.",
    formula:
      "For year Y: union of fire scars from years Y, Y-1, Y-2.\nRolling % = (union area ÷ project area) × 100.",
    dataRequired: "Fire scar polygons for 3 consecutive years, project boundary.",
    interpretation:
      "65–85% is the target range. Below 65% means insufficient landscape treatment and fuel build-up. Above 85% may leave too few unburnt refuges for wildlife. The rolling metric smooths out year-to-year variation.",
    target: "65–85%",
    status: "implemented",
  },
  {
    num: 4,
    name: "Unburnt Patch Statistics",
    description:
      "Count, mean area, and size distribution of contiguous unburnt patches within the project area. Unburnt patches serve as critical wildlife refugia during and after fire.",
    formula:
      "Inverse of burnt area: project boundary minus union of fire scars = unburnt extent.\nCount and measure contiguous patches from the unburnt extent.",
    dataRequired: "Fire scar polygons, project boundary.",
    interpretation:
      "More and larger unburnt patches is better for biodiversity. Target is ≥100 patches to maintain landscape heterogeneity. Mean patch size should be >1,000 ha to support mobile species.",
    target: "≥100 patches, mean area >1,000 ha",
    status: "implemented",
  },
  {
    num: 5,
    name: "Burn Count Distribution",
    description:
      "Distribution showing how many times each part of the project area has been burnt over the analysis period (e.g. 10 years). Identifies areas of chronic over-burning and long-unburnt areas.",
    formula:
      "Point-grid sampling at 250m resolution. For each point, count how many years it falls within a fire scar polygon.\nGroup counts into bins (0, 1, 2, ... 8+) and calculate area percentage per bin.",
    dataRequired: "Fire scar polygons for all analysis years, project boundary.",
    interpretation:
      "A healthy distribution has most area burnt 2–5 times per decade. Areas never burnt (0) may accumulate dangerous fuel loads. Areas burnt 8+ times may have degraded soil and vegetation.",
    target: "Most area in 2–5 burns per decade",
    status: "implemented",
  },
  {
    num: 6,
    name: "Patch Age — All Burns",
    description:
      "Distribution of time since last burn (any season) across the project area. Shows the landscape's fuel age mosaic.",
    formula:
      "For each 250m sample point, find the most recent year it was burnt.\nPatch age = current year − last burn year.\nGroup into bins (0, 1, 2, 3, 4, 5+ years) and calculate area percentage.",
    dataRequired: "Fire scar polygons for all analysis years, project boundary.",
    interpretation:
      "A diverse age distribution is ideal — a mix of recently burnt and older patches. Heavy concentration in 0-year (just burnt) suggests over-burning. Heavy concentration in 5+ years suggests under-treatment and fuel accumulation.",
    target: "Mean patch age ≤3 years",
    cfiRelevance: "Feeds directly into CFI Table 9 (fuel age distribution by vegetation class).",
    status: "implemented",
  },
  {
    num: 7,
    name: "Patch Age — Late Season Only",
    description:
      "Same as Metric 6 but only counting LDS burns. Tracks how long since each area experienced a damaging late-season fire.",
    formula:
      "For each sample point, find the most recent LDS-only burn year.\nAge = current year − last LDS burn year.\nAge distribution by bins.",
    dataRequired: "Fire scar polygons with season classification, project boundary.",
    interpretation:
      "Higher average LDS patch age is better — it means areas haven't experienced intense late-season fire recently. Low values indicate recent LDS wildfire impact.",
    target: "Mean LDS patch age ≥3 years",
    status: "implemented",
  },
  {
    num: 8,
    name: "Distance to Unburnt — Annual",
    description:
      "Mean distance from any point in the burnt area to the nearest unburnt refuge, calculated for a single year's fire scars. Measures habitat connectivity for fauna escaping fire.",
    formula:
      "For each 250m sample point within the annual burn extent:\n  Find the nearest point in the unburnt extent.\n  Record the Euclidean distance.\nReport mean distance across all burnt sample points.",
    dataRequired: "Fire scar polygons for the year, project boundary.",
    interpretation:
      "Shorter distances are better — animals can reach unburnt habitat more easily. Distances >1,000m indicate large continuous burns that may trap or harm wildlife.",
    target: "≤1,000m",
    status: "implemented",
  },
  {
    num: 9,
    name: "Distance to Unburnt — 3-Year Composite",
    description:
      "Same as Metric 8 but using a 3-year burn composite. Shows cumulative habitat fragmentation over a multi-year window.",
    formula: "Union fire scars from 3 years, then calculate mean distance to unburnt as per Metric 8.",
    dataRequired: "Fire scar polygons for 3 consecutive years, project boundary.",
    interpretation:
      "Multi-year composite distances are typically larger than annual distances because more area is classified as burnt. Values below the target indicate landscape-scale connectivity is maintained.",
    target: "≤1,500m",
    status: "implemented",
  },
  {
    num: 10,
    name: "Distance to Unburnt — 3-Year Late Only",
    description:
      "Same as Metric 9 but only using LDS fire scars. Focuses specifically on the habitat impact of intense late-season burns.",
    formula: "Union LDS-only scars from 3 years, then calculate mean distance to un-LDS-burnt area.",
    dataRequired: "Fire scar polygons with season classification for 3 years, project boundary.",
    interpretation:
      "LDS burns are more ecologically damaging, so this metric isolates their impact on habitat connectivity. Lower values indicate less cumulative LDS fragmentation.",
    target: "≤1,200m",
    status: "implemented",
  },
  {
    num: 11,
    name: "Perimeter Impact",
    description:
      "Percentage of sensitive area perimeters (e.g. monsoon vine forest, cultural sites, infrastructure buffers) that are adjacent to recent fire scars. Measures fire encroachment on high-value areas.",
    formula:
      "Buffer sensitive area perimeters by 100m.\nIntersect buffer with fire scars.\nPerimeter Impact % = (intersected length ÷ total perimeter length) × 100.",
    dataRequired: "Fire scar polygons, sensitive area boundaries (not yet available).",
    interpretation:
      "Lower is better. Values above 25% indicate fire is regularly encroaching on sensitive areas. Strategic EDS buffer burns can reduce this metric.",
    target: "≤25%",
    status: "deferred",
  },
  {
    num: 12,
    name: "Heterogeneity Index",
    description:
      "Multi-scale measure of burn pattern diversity across the landscape. Quantifies whether the fire regime is creating a diverse mosaic of different burn ages and patterns at multiple spatial scales.",
    formula:
      "Multi-scale moving window analysis of burn history variance.\nCalculated at 1km, 5km, and 10km windows, then combined into a weighted index.",
    dataRequired: "Fire scar polygons for multiple years, project boundary.",
    interpretation:
      "Higher heterogeneity is better for biodiversity. Low values indicate uniform fire patterns (either all burnt or all unburnt) at landscape scale.",
    target: "Index ≥0.6",
    status: "deferred",
  },
  {
    num: 13,
    name: "2-Year Rolling Burn",
    description:
      "Cumulative proportion of the project area burnt at least once in a 2-year rolling window. A shorter-term complement to the 3-year rolling metric.",
    formula:
      "For year Y: union of fire scars from years Y and Y-1.\nRolling % = (union area ÷ project area) × 100.",
    dataRequired: "Fire scar polygons for 2 consecutive years, project boundary.",
    interpretation:
      "50–70% is the target range. Provides a more responsive signal than the 3-year rolling metric — useful for tracking year-on-year management improvements.",
    target: "50–70%",
    status: "implemented",
  },
];

// ─── Data Sources ────────────────────────────────────────────────

export interface DataSourceInfo {
  name: string;
  provider: string;
  resolution: string;
  revisit: string;
  coverage: string;
  description: string;
  limitations: string;
}

export const DATA_SOURCES: DataSourceInfo[] = [
  {
    name: "NAFI MODIS Fire Scars",
    provider: "Charles Darwin University / North Australia Fire Information",
    resolution: "250m (6.25 ha minimum mapping unit)",
    revisit: "Updated approximately every 2 weeks during fire season (Apr–Nov)",
    coverage: "Northern Australia (above ~20°S), 2000–present",
    description:
      "The primary fire scar data source. NAFI maps fire scars by comparing pre- and post-fire MODIS satellite images. Each fire scar polygon includes the month of detection, area in hectares, and is classified as EDS or LDS based on the month.",
    limitations:
      "250m resolution means small fires (<6.25 ha) are missed. Mixed pixels at fire scar edges reduce accuracy. Cloud cover during the wet season can delay detection. Does not detect burns under dense canopy (e.g. monsoon vine forest).",
  },
  {
    name: "Sentinel-2 Imagery",
    provider: "European Space Agency via Copernicus (CDSE) and Digital Earth Australia (DEA)",
    resolution: "10m (multispectral bands), 20m (vegetation indices)",
    revisit: "5-day revisit (with both Sentinel-2A and 2B)",
    coverage: "Global land areas, 2015–present",
    description:
      "Higher-resolution satellite imagery used for visual validation and spectral indices (NDVI, NBR, dNBR). Not currently used for automated fire scar mapping in this tool, but available for manual interpretation and verification of NAFI data.",
    limitations:
      "Not yet integrated as an automated fire scar source. Automated mapping from Sentinel-2 is a planned future feature. Cloud cover during the wet/early dry season can limit usability.",
  },
  {
    name: "Field-Mapped Fire Scars",
    provider: "User-uploaded shapefiles from GPS field surveys or manual digitising",
    resolution: "Varies — typically 1–10m depending on GPS accuracy",
    revisit: "As collected — typically post-burn validation surveys",
    coverage: "Project area only",
    description:
      "High-accuracy fire scar boundaries collected in the field using GPS or digitised from aerial photography. Uploaded as shapefiles with a month attribute for season classification. These can supplement or replace satellite-derived scars for specific years.",
    limitations:
      "Labour-intensive to collect. Coverage is typically incomplete — only surveyed areas are mapped. Must include a month or date attribute for EDS/LDS classification.",
  },
  {
    name: "Vegetation Classification Layer",
    provider: "User-uploaded shapefile — typically from state/territory vegetation mapping",
    resolution: "Varies — typically 1:100,000 or 1:250,000 scale mapping",
    revisit: "Static — updated infrequently (typically every 5–10 years)",
    coverage: "Project area",
    description:
      "Polygon layer classifying the project area into vegetation fuel types (e.g. Open Forest, Woodland, Grassland, Monsoon Vine Forest). Required for CFI Table 3 (area by vegetation class × season) and CFI Table 9 (fuel age by vegetation class). The vegetation code attribute is user-selectable during upload.",
    limitations:
      "Vegetation boundaries may not reflect current conditions if mapping is outdated. Classification granularity varies by source. Must cover the entire project area for complete analysis.",
  },
  {
    name: "CER Baseline Emissions",
    provider: "Clean Energy Regulator — from project registration documents",
    resolution: "Single value per project (tCO₂-e/year)",
    revisit: "Fixed at project registration — does not change",
    coverage: "Whole project area",
    description:
      "The baseline emissions figure calculated from 10–15 years of pre-project fire history using the approved savanna burning methodology. This is the reference point against which annual emissions are compared to calculate carbon credits (ACCUs).",
    limitations:
      "Fixed value — does not account for changes in vegetation or climate since the baseline period. Must be entered manually from CER project registration documents.",
  },
];

// ─── Analysis Pipeline Steps ────────────────────────────────────

export interface PipelineStep {
  num: number;
  stage: string;
  title: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    num: 1,
    stage: "clipping",
    title: "Clip Fire Scars to Project Boundary",
    description:
      "All fire scar polygons are intersected with the project boundary using Turf.js polygon intersection. Fire scars that extend beyond the boundary are clipped, and their areas recalculated. This ensures all metrics are computed only for the project area.",
  },
  {
    num: 2,
    stage: "classifying",
    title: "Classify by Season & Compute Areas",
    description:
      "Each fire scar is classified as EDS or LDS based on its month attribute and the configured season cutoff (default: months 1–7 = EDS, months 8–12 = LDS). Areas are calculated using geodesic area computation (Turf.js area). Annual burn statistics are aggregated: total hectares, EDS hectares, LDS hectares, and corresponding percentages of project area.",
  },
  {
    num: 3,
    stage: "shape_index",
    title: "Compute Patch Shape Complexity",
    description:
      "The Shape Index is calculated for each fire scar polygon: SI = (0.25 × perimeter) / √area. This produces a dimensionless ratio where 1.0 = perfect circle and higher values indicate more complex, irregular shapes. Indices are averaged by season (EDS vs LDS) for each year.",
  },
  {
    num: 4,
    stage: "veg_intersection",
    title: "Intersect with Vegetation Layer",
    description:
      "If a vegetation classification layer is loaded, fire scars are intersected with vegetation polygons to produce CFI Table 3 — showing area burnt by vegetation class and season. Each fire scar × vegetation polygon intersection is calculated, with areas summed by vegetation code and season.",
  },
  {
    num: 5,
    stage: "burn_history",
    title: "Analyse Multi-Year Burn History",
    description:
      "A 250m point grid is generated across the project area (~128,000 points for the Tiwi Islands). For each point, the analysis checks which years it was burnt and by which season. This produces: burn count distribution (times burnt), patch age (years since last burn), and CFI Table 9 (fuel age by vegetation class).",
  },
  {
    num: 6,
    stage: "unburnt_analysis",
    title: "Identify Unburnt Patches",
    description:
      "The union of all fire scars for a year is subtracted from the project boundary to identify unburnt areas. These are counted and measured to produce unburnt patch statistics: count, mean area, minimum and maximum patch sizes.",
  },
  {
    num: 7,
    stage: "distance_metrics",
    title: "Compute Distance to Unburnt Areas",
    description:
      "For each burnt sample point, the distance to the nearest unburnt area is calculated. This is done for three variants: annual burn extent, 3-year composite burn extent, and 3-year LDS-only composite. Mean distances are reported as habitat connectivity indicators.",
  },
  {
    num: 8,
    stage: "rolling_averages",
    title: "Calculate Rolling Burn Averages",
    description:
      "2-year and 3-year rolling burn percentages are calculated from the annual burn data. For each year, the cumulative unique area burnt over the rolling window is estimated from annual coverage figures, accounting for spatial overlap between years.",
  },
  {
    num: 9,
    stage: "targets",
    title: "Evaluate Healthy Country Plan Targets",
    description:
      "All computed metrics are compared against the Healthy Country Plan target thresholds. Each target is evaluated as 'On Track' (meets target), 'At Risk' (within 10% of threshold), or 'Off Track' (exceeds threshold). This produces the compliance summary table.",
  },
];

// ─── Assumptions & Limitations ──────────────────────────────────

export const ASSUMPTIONS: string[] = [
  "Fire scar data from NAFI uses MODIS 250m resolution. The minimum detectable fire scar is approximately 6.25 hectares (one MODIS pixel). Smaller burns are not captured.",
  "Season classification uses a fixed cutoff month (default: July). Fires detected in months 1–7 are classified as EDS, months 8–12 as LDS. This does not account for regional variation in season timing.",
  "Point-grid sampling at 250m resolution is used for burn count, patch age, and distance metrics. This is an approximation — finer resolution would be more accurate but computationally expensive.",
  "Burn count and patch age calculations assume fire scar data is available for all years in the analysis period. Missing years will undercount burns and overestimate patch ages.",
  "Distance to unburnt metrics use Euclidean (straight-line) distance, not accounting for terrain, barriers, or vegetation corridors that may affect actual animal movement.",
  "Unburnt patch statistics are estimated from annual burn coverage rather than computed from true polygon union operations, to keep computation times reasonable for client-side processing.",
  "The analysis processes all data client-side in the browser using a Web Worker. Very large datasets (>10,000 features per year) may be slow on older devices.",
  "Perimeter Impact (Metric 11) is deferred — it requires sensitive area boundary data that is not yet integrated.",
  "Heterogeneity Index (Metric 12) is deferred — it requires computationally expensive multi-scale spatial analysis.",
  "CFI Table 3 and Table 9 require a vegetation classification layer. Without one, these tables cannot be computed and will show placeholder values.",
];

// ─── Report Tooltips ────────────────────────────────────────────

/** Centralised tooltip text for the reports page. Keyed by a descriptive identifier. */
export const REPORT_TOOLTIPS: Record<string, string> = {
  // Chart titles
  annual_burn_chart:
    "Stacked bar chart showing the percentage of project area burnt each year, split by Early Dry Season (blue) and Late Dry Season (red). Higher EDS and lower LDS is the goal.",
  season_breakdown:
    "Pie chart showing the current year's burn split: EDS %, LDS %, and unburnt %. Based on the most recent year's fire scar data.",
  rolling_burn:
    "Line chart showing cumulative burn coverage over 2-year and 3-year rolling windows. Smooths out year-to-year variation to show landscape-scale treatment progress.",
  patch_age_all:
    "Distribution of years since last burn (any season) across the project area. A healthy landscape has a diverse mix of recently burnt and older patches.",
  patch_age_late:
    "Distribution of years since last LDS burn only. Higher ages mean longer since damaging late-season fire — which is desirable.",
  distance_unburnt:
    "Mean distance from burnt areas to the nearest unburnt refuge. Shorter distances mean better habitat connectivity for wildlife escaping fire. Shown for annual, 3-year composite, and 3-year LDS-only.",
  fire_frequency:
    "How many times each part of the project has been burnt over the analysis period. Most area should fall in the 2–5 burns range.",
  shape_index:
    "Patch complexity trend over time. Higher Shape Index = more irregular, patchy burns (typical of EDS). Lower = compact, intense burns (typical of LDS wildfire).",

  // Summary metrics table
  eds_burn_pct:
    "Percentage of project area burnt during the Early Dry Season. Higher is better — EDS burns are lower intensity and patchier.",
  lds_burn_pct:
    "Percentage of project area burnt during the Late Dry Season. Lower is better — LDS burns are high intensity and ecologically damaging.",
  total_burn_pct:
    "Total percentage of project area burnt this year (EDS + LDS combined). Target range is 35–50% for effective landscape management.",
  shape_index_eds:
    "Mean Shape Index for EDS fire scar patches. Higher values (≥2.5) indicate patchy, mosaic-style burns good for biodiversity.",
  three_year_rolling:
    "Cumulative area burnt at least once in the last 3 years. Target 65–85% to ensure landscape treatment without over-burning.",
  unburnt_patches:
    "Number of contiguous unburnt areas in the project. These serve as critical wildlife refugia. Target ≥100 patches.",
  distance_to_unburnt:
    "Mean distance from any burnt point to the nearest unburnt area. Shorter is better for fauna movement. Target ≤1,000m.",
  perimeter_impact:
    "Percentage of sensitive area perimeters adjacent to recent burns. Lower means less fire encroachment on high-value areas. Target ≤25%.",
  two_year_rolling:
    "Cumulative area burnt at least once in the last 2 years. A shorter-term complement to the 3-year rolling metric. Target 50–70%.",

  // CFI Tables
  cfi_table_3:
    "Required for CER reporting under the Carbon Farming Initiative. Shows hectares burnt in each vegetation fuel type, split by EDS and LDS. Feeds into emissions calculations in SavBAT.",
  cfi_table_9:
    "Required for CER reporting. Shows fuel age distribution (years since last burn) across vegetation classes. Used to calculate fuel loads for emissions estimates.",

  // Table column headers
  col_veg_class: "Vegetation fuel type classification from the uploaded vegetation layer.",
  col_veg_code: "Numeric code for the vegetation class, matching CER methodology codes.",
  col_total_area: "Total area of this vegetation class within the project boundary.",
  col_eds_ha: "Hectares of this vegetation class burnt during the Early Dry Season.",
  col_eds_pct: "Percentage of this vegetation class's total area burnt during EDS.",
  col_lds_ha: "Hectares of this vegetation class burnt during the Late Dry Season.",
  col_lds_pct: "Percentage of this vegetation class's total area burnt during LDS.",
  col_total_burnt: "Total hectares burnt (EDS + LDS) for this vegetation class.",
  col_unburnt: "Hectares of this vegetation class that remained unburnt this year.",
  col_age_0: "Percentage of area burnt in the current year (fuel age = 0 years).",
  col_age_1: "Percentage of area last burnt 1 year ago.",
  col_age_2: "Percentage of area last burnt 2 years ago.",
  col_age_3: "Percentage of area last burnt 3 years ago.",
  col_age_4: "Percentage of area last burnt 4 years ago.",
  col_age_5_plus: "Percentage of area last burnt 5 or more years ago. Higher values indicate fuel accumulation.",

  // Targets table
  targets_table:
    "Healthy Country Plan compliance assessment. Each metric is compared against its target threshold and rated as On Track, At Risk, or Off Track.",
};

// ─── Overview Text ──────────────────────────────────────────────

export const OVERVIEW_TEXT = `FireManager analyses satellite-derived fire scar data to produce 15 fire management metrics required for savanna burning carbon projects under Australia's Emissions Reduction Fund.

The tool is designed for Indigenous land management organisations, fire program managers, and carbon project staff working in northern Australian savannas. It processes fire scar data from NAFI (North Australia Fire Information), user-uploaded field mapping, and vegetation classification layers to generate the metrics and tables required for Clean Energy Regulator (CER) reporting.

All analysis is performed client-side in the browser using Turf.js geospatial processing in a Web Worker. This means data never leaves the user's device — important for projects involving culturally sensitive spatial information.

The analysis follows the approved methodology under the Carbon Credits (Carbon Farming Initiative — Emissions Avoidance) (Savanna Fire Management — Sequestration and Emissions Avoidance) Methodology Determination 2018.`;

export const CFI_TABLE_3_TEXT = `CFI Table 3 is a required reporting table under the Carbon Farming Initiative methodology. It shows the total area burnt within each vegetation fuel type class, split by Early Dry Season (EDS) and Late Dry Season (LDS).

This table is produced by intersecting fire scar polygons with the vegetation classification layer. Each fire scar polygon is split by vegetation boundary, and the resulting fragments are summed by vegetation code and season.

The vegetation classification layer must be uploaded by the user and typically comes from state/territory vegetation mapping programs. The vegetation code attribute (e.g. "VEG_CODE", "FUEL_TYPE") is selected during upload.

Table 3 feeds directly into the SavBAT emissions calculator, where it is combined with fuel type-specific emission factors to calculate total project emissions.`;

export const CFI_TABLE_9_TEXT = `CFI Table 9 shows the fuel age distribution across vegetation classes — specifically, what percentage of each vegetation type has a fuel age of 0, 1, 2, 3, 4, or 5+ years.

Fuel age is the number of years since an area was last burnt. It determines fuel load — longer unburnt areas have more accumulated biomass and produce more emissions when they eventually burn.

The table is computed using point-grid sampling at 250m resolution. For each sample point, the most recent burn year is identified from the multi-year fire scar history, and the fuel age is calculated. Points are then grouped by vegetation class and age bin.

Table 9 is used by SavBAT to weight emissions calculations by fuel accumulation. Vegetation classes with more area in higher age bins (4+ years) have higher fuel loads and produce more emissions per hectare when burnt.`;
