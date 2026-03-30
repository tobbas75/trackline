/**
 * Shared types for the fire scar analysis pipeline.
 * Used by both the main thread (stores, hooks) and the Web Worker.
 */

import type { CfiTable3Row, CfiTable9Row, FireTarget } from "./fire-metrics-data";

// Re-export for convenience
export type { CfiTable3Row, CfiTable9Row, FireTarget };

// ─── Fire Scar Source Types ─────────────────────────────────────

export type FireScarSource = "nafi_modis" | "nafi_sentinel" | "field_mapped" | "combined";

export interface FireScarDataset {
  id: string;
  source: FireScarSource;
  year: number;
  label: string;
  featureCollection: GeoJSON.FeatureCollection;
  featureCount: number;
  totalHa: number;
  edsHa: number;
  ldsHa: number;
  uploadedAt: string;
  persisted: boolean;
}

// ─── Vegetation Types ───────────────────────────────────────────

export interface VegetationClass {
  code: number | string;
  name: string;
  color: string;
  featureCount: number;
}

// ─── Analysis Input/Output ──────────────────────────────────────

export interface AnalysisParams {
  projectBoundary: GeoJSON.FeatureCollection;
  projectAreaHa: number;
  fireScars: Array<{ year: number; geojson: GeoJSON.FeatureCollection }>;
  vegetationLayer: GeoJSON.FeatureCollection | null;
  vegClassAttribute: string;
  edsEndMonth: number;
  analysisYears: number[];
}

// Row types matching the hardcoded data shapes in fire-metrics-data.ts
export interface AnnualBurnRow {
  year: number;
  eds_ha: number;
  lds_ha: number;
  total_ha: number;
  eds_pct: number;
  lds_pct: number;
  total_pct: number;
}

export interface ShapeIndexRow {
  year: number;
  eds_si: number;
  lds_si: number;
}

export interface RollingBurnRow {
  year: number;
  pct_burnt: number;
}

export interface UnburntPatchRow {
  year: number;
  count: number;
  mean_ha: number;
  min_ha: number;
  max_ha: number;
}

export interface BurnCountRow {
  times_burnt: string;
  area_pct: number;
}

export interface PatchAgeRow {
  age: string;
  area_pct: number;
  area_ha: number;
}

export interface DistToUnburntRow {
  year: number;
  annual_m: number;
  three_yr_m: number;
  three_yr_late_m: number;
}

export interface PerimeterImpactRow {
  year: number;
  pct_impacted: number;
}

export interface SeasonBreakdownRow {
  name: "EDS" | "LDS" | "Unburnt";
  value: number;
  color: string;
}

/** Complete analysis results matching the shapes in fire-metrics-data.ts */
export interface AnalysisResults {
  computedAt: string;
  years: number[];

  annualBurnData: AnnualBurnRow[];
  shapeIndexData: ShapeIndexRow[];
  threeYearRolling: RollingBurnRow[];
  twoYearRolling: RollingBurnRow[];
  unburntPatchData: UnburntPatchRow[];
  burnCountDistribution: BurnCountRow[];
  patchAgeData: PatchAgeRow[];
  patchAgeLateOnly: PatchAgeRow[];
  distToUnburntData: DistToUnburntRow[];
  perimeterImpactData: PerimeterImpactRow[];
  cfiTable3Data: CfiTable3Row[];
  cfiTable9Data: CfiTable9Row[];
  seasonBreakdown: SeasonBreakdownRow[];
  fireTargets: FireTarget[];
}

// ─── Analysis Progress ──────────────────────────────────────────

export type AnalysisStage =
  | "clipping"
  | "classifying"
  | "shape_index"
  | "veg_intersection"
  | "burn_history"
  | "unburnt_analysis"
  | "distance_metrics"
  | "rolling_averages"
  | "targets"
  | "cancelled";

export interface AnalysisProgress {
  stage: AnalysisStage;
  percent: number;
  detail: string;
}

export type AnalysisStatus = "idle" | "running" | "complete" | "error";

// ─── Worker Message Protocol ────────────────────────────────────

export type WorkerInput =
  | { type: "start"; payload: AnalysisParams }
  | { type: "cancel" };

export type WorkerOutput =
  | { type: "progress"; stage: AnalysisStage; percent: number; detail: string }
  | { type: "result"; data: AnalysisResults }
  | { type: "error"; message: string };

// ─── Metrics Data Bundle ────────────────────────────────────────

/** The complete set of metrics data consumed by the reports page */
export interface MetricsData {
  annualBurnData: AnnualBurnRow[];
  shapeIndexData: ShapeIndexRow[];
  threeYearRolling: RollingBurnRow[];
  twoYearRolling: RollingBurnRow[];
  unburntPatchData: UnburntPatchRow[];
  burnCountDistribution: BurnCountRow[];
  patchAgeData: PatchAgeRow[];
  patchAgeLateOnly: PatchAgeRow[];
  distToUnburntData: DistToUnburntRow[];
  perimeterImpactData: PerimeterImpactRow[];
  cfiTable3Data: CfiTable3Row[];
  cfiTable9Data: CfiTable9Row[];
  seasonBreakdown: SeasonBreakdownRow[];
  fireTargets: FireTarget[];
}
