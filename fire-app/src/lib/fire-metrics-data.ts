/**
 * Sample fire metrics data for the Tiwi Islands project.
 * This will be replaced by PostGIS queries once fire scar data is imported.
 *
 * All 15 metrics from the AWC ArcPy scripts are represented here.
 */

// ─── Metric 1: Annual Burn % ────────────────────────────────────

export const annualBurnData = [
  { year: 2016, eds_ha: 187000, lds_ha: 112000, total_ha: 299000, eds_pct: 23.8, lds_pct: 14.2, total_pct: 38.0 },
  { year: 2017, eds_ha: 220000, lds_ha: 95000, total_ha: 315000, eds_pct: 28.0, lds_pct: 12.1, total_pct: 40.1 },
  { year: 2018, eds_ha: 221000, lds_ha: 118000, total_ha: 339000, eds_pct: 28.1, lds_pct: 15.0, total_pct: 43.1 },
  { year: 2019, eds_ha: 252000, lds_ha: 94000, total_ha: 346000, eds_pct: 32.1, lds_pct: 12.0, total_pct: 44.0 },
  { year: 2020, eds_ha: 275000, lds_ha: 63000, total_ha: 338000, eds_pct: 35.0, lds_pct: 8.0, total_pct: 43.0 },
  { year: 2021, eds_ha: 236000, lds_ha: 141000, total_ha: 377000, eds_pct: 30.0, lds_pct: 18.0, total_pct: 48.0 },
  { year: 2022, eds_ha: 299000, lds_ha: 47000, total_ha: 346000, eds_pct: 38.0, lds_pct: 6.0, total_pct: 44.0 },
  { year: 2023, eds_ha: 330000, lds_ha: 39000, total_ha: 369000, eds_pct: 42.0, lds_pct: 5.0, total_pct: 47.0 },
  { year: 2024, eds_ha: 314000, lds_ha: 55000, total_ha: 369000, eds_pct: 40.0, lds_pct: 7.0, total_pct: 47.0 },
  { year: 2025, eds_ha: 283000, lds_ha: 31000, total_ha: 314000, eds_pct: 36.0, lds_pct: 4.0, total_pct: 40.0 },
];

// ─── Metric 2: Shape Index ──────────────────────────────────────

export const shapeIndexData = [
  { year: 2018, eds_si: 2.8, lds_si: 1.6 },
  { year: 2019, eds_si: 3.1, lds_si: 1.4 },
  { year: 2020, eds_si: 3.4, lds_si: 1.8 },
  { year: 2021, eds_si: 2.9, lds_si: 1.5 },
  { year: 2022, eds_si: 3.6, lds_si: 1.9 },
  { year: 2023, eds_si: 3.8, lds_si: 2.1 },
  { year: 2024, eds_si: 3.5, lds_si: 1.7 },
  { year: 2025, eds_si: 3.3, lds_si: 1.6 },
];

// ─── Metric 3: 3-Year Rolling Burn ──────────────────────────────

export const threeYearRolling = [
  { year: 2018, pct_burnt: 65 },
  { year: 2019, pct_burnt: 68 },
  { year: 2020, pct_burnt: 72 },
  { year: 2021, pct_burnt: 70 },
  { year: 2022, pct_burnt: 74 },
  { year: 2023, pct_burnt: 78 },
  { year: 2024, pct_burnt: 76 },
  { year: 2025, pct_burnt: 75 },
];

// ─── Metric 4: Unburnt Patch Stats ──────────────────────────────

export const unburntPatchData = [
  { year: 2018, count: 142, mean_ha: 3350, min_ha: 12, max_ha: 48000 },
  { year: 2019, count: 128, mean_ha: 3520, min_ha: 8, max_ha: 52000 },
  { year: 2020, count: 135, mean_ha: 3410, min_ha: 15, max_ha: 45000 },
  { year: 2021, count: 112, mean_ha: 3680, min_ha: 10, max_ha: 55000 },
  { year: 2022, count: 118, mean_ha: 3560, min_ha: 14, max_ha: 50000 },
  { year: 2023, count: 105, mean_ha: 3780, min_ha: 18, max_ha: 42000 },
  { year: 2024, count: 110, mean_ha: 3650, min_ha: 11, max_ha: 48000 },
  { year: 2025, count: 120, mean_ha: 3500, min_ha: 20, max_ha: 46000 },
];

// ─── Metric 5: Burn Count (over 10 years) ───────────────────────

export const burnCountDistribution = [
  { times_burnt: "0", area_pct: 8 },
  { times_burnt: "1", area_pct: 12 },
  { times_burnt: "2", area_pct: 15 },
  { times_burnt: "3", area_pct: 18 },
  { times_burnt: "4", area_pct: 16 },
  { times_burnt: "5", area_pct: 13 },
  { times_burnt: "6", area_pct: 8 },
  { times_burnt: "7", area_pct: 5 },
  { times_burnt: "8+", area_pct: 5 },
];

// ─── Metrics 6 & 7: Patch Age ───────────────────────────────────

export const patchAgeData = [
  { age: "0 (burnt this yr)", area_pct: 40, area_ha: 314000 },
  { age: "1 year", area_pct: 22, area_ha: 173000 },
  { age: "2 years", area_pct: 15, area_ha: 118000 },
  { age: "3 years", area_pct: 10, area_ha: 79000 },
  { age: "4 years", area_pct: 6, area_ha: 47000 },
  { age: "5+ years", area_pct: 7, area_ha: 55000 },
];

export const patchAgeLateOnly = [
  { age: "0 (LDS this yr)", area_pct: 4, area_ha: 31000 },
  { age: "1 year", area_pct: 7, area_ha: 55000 },
  { age: "2 years", area_pct: 6, area_ha: 47000 },
  { age: "3 years", area_pct: 18, area_ha: 141000 },
  { age: "4+ years", area_pct: 65, area_ha: 511000 },
];

// ─── Metrics 8, 9, 10: Distance to Unburnt ─────────────────────

export const distToUnburntData = [
  { year: 2018, annual_m: 820, three_yr_m: 1450, three_yr_late_m: 420 },
  { year: 2019, annual_m: 780, three_yr_m: 1380, three_yr_late_m: 390 },
  { year: 2020, annual_m: 850, three_yr_m: 1520, three_yr_late_m: 410 },
  { year: 2021, annual_m: 920, three_yr_m: 1600, three_yr_late_m: 480 },
  { year: 2022, annual_m: 810, three_yr_m: 1550, three_yr_late_m: 350 },
  { year: 2023, annual_m: 870, three_yr_m: 1480, three_yr_late_m: 310 },
  { year: 2024, annual_m: 830, three_yr_m: 1420, three_yr_late_m: 290 },
  { year: 2025, annual_m: 790, three_yr_m: 1350, three_yr_late_m: 270 },
];

// ─── Metric 11: Perimeter Impact ────────────────────────────────

export const perimeterImpactData = [
  { year: 2018, pct_impacted: 32 },
  { year: 2019, pct_impacted: 28 },
  { year: 2020, pct_impacted: 25 },
  { year: 2021, pct_impacted: 35 },
  { year: 2022, pct_impacted: 22 },
  { year: 2023, pct_impacted: 18 },
  { year: 2024, pct_impacted: 20 },
  { year: 2025, pct_impacted: 15 },
];

// ─── Metric 12: Heterogeneity Index ─────────────────────────────

export const heterogeneityData = [
  { scale_m: 100, unburnt_pct: 62, mixed_pct: 18, burnt_pct: 20 },
  { scale_m: 250, unburnt_pct: 58, mixed_pct: 22, burnt_pct: 20 },
  { scale_m: 500, unburnt_pct: 52, mixed_pct: 26, burnt_pct: 22 },
  { scale_m: 1000, unburnt_pct: 45, mixed_pct: 28, burnt_pct: 27 },
  { scale_m: 2000, unburnt_pct: 38, mixed_pct: 30, burnt_pct: 32 },
  { scale_m: 5000, unburnt_pct: 28, mixed_pct: 32, burnt_pct: 40 },
];

// ─── Metric 13: Two-Year Rolling ────────────────────────────────

export const twoYearRolling = [
  { year: 2018, pct_burnt: 55 },
  { year: 2019, pct_burnt: 58 },
  { year: 2020, pct_burnt: 56 },
  { year: 2021, pct_burnt: 62 },
  { year: 2022, pct_burnt: 60 },
  { year: 2023, pct_burnt: 64 },
  { year: 2024, pct_burnt: 63 },
  { year: 2025, pct_burnt: 58 },
];

// ─── Metric 14: CFI Table 3 (Area by Veg × Season) ─────────────

export interface CfiTable3Row {
  veg_class: string;
  veg_code: number;
  eds_ha: number;
  lds_ha: number;
  total_ha: number;
  unburnt_ha: number;
  total_area_ha: number;
  eds_pct: number;
  lds_pct: number;
}

export const cfiTable3Data: CfiTable3Row[] = [
  { veg_class: "Open Forest (tall)", veg_code: 1, eds_ha: 85000, lds_ha: 8000, total_ha: 93000, unburnt_ha: 117000, total_area_ha: 210000, eds_pct: 40.5, lds_pct: 3.8 },
  { veg_class: "Open Woodland", veg_code: 2, eds_ha: 95000, lds_ha: 12000, total_ha: 107000, unburnt_ha: 143000, total_area_ha: 250000, eds_pct: 38.0, lds_pct: 4.8 },
  { veg_class: "Woodland (mixed)", veg_code: 3, eds_ha: 62000, lds_ha: 6000, total_ha: 68000, unburnt_ha: 82000, total_area_ha: 150000, eds_pct: 41.3, lds_pct: 4.0 },
  { veg_class: "Monsoon Vine Forest", veg_code: 4, eds_ha: 5000, lds_ha: 1000, total_ha: 6000, unburnt_ha: 44000, total_area_ha: 50000, eds_pct: 10.0, lds_pct: 2.0 },
  { veg_class: "Grassland / Sedgeland", veg_code: 5, eds_ha: 28000, lds_ha: 3000, total_ha: 31000, unburnt_ha: 49000, total_area_ha: 80000, eds_pct: 35.0, lds_pct: 3.8 },
  { veg_class: "Mangrove / Coastal", veg_code: 6, eds_ha: 2000, lds_ha: 500, total_ha: 2500, unburnt_ha: 23500, total_area_ha: 26000, eds_pct: 7.7, lds_pct: 1.9 },
  { veg_class: "Cleared / Developed", veg_code: 9, eds_ha: 6000, lds_ha: 500, total_ha: 6500, unburnt_ha: 13500, total_area_ha: 20000, eds_pct: 30.0, lds_pct: 2.5 },
];

// ─── Metric 15: CFI Table 9 (Fuel Age Distribution) ─────────────

export interface CfiTable9Row {
  veg_class: string;
  veg_code: number;
  age_0: number;
  age_1: number;
  age_2: number;
  age_3: number;
  age_4: number;
  age_5_plus: number;
}

export const cfiTable9Data: CfiTable9Row[] = [
  { veg_class: "Open Forest (tall)", veg_code: 1, age_0: 44.3, age_1: 22.0, age_2: 14.0, age_3: 9.0, age_4: 5.0, age_5_plus: 5.7 },
  { veg_class: "Open Woodland", veg_code: 2, age_0: 42.8, age_1: 21.0, age_2: 15.0, age_3: 10.0, age_4: 6.0, age_5_plus: 5.2 },
  { veg_class: "Woodland (mixed)", veg_code: 3, age_0: 45.3, age_1: 23.0, age_2: 13.0, age_3: 8.0, age_4: 5.5, age_5_plus: 5.2 },
  { veg_class: "Monsoon Vine Forest", veg_code: 4, age_0: 12.0, age_1: 10.0, age_2: 15.0, age_3: 18.0, age_4: 15.0, age_5_plus: 30.0 },
  { veg_class: "Grassland / Sedgeland", veg_code: 5, age_0: 38.8, age_1: 20.0, age_2: 16.0, age_3: 12.0, age_4: 7.0, age_5_plus: 6.2 },
  { veg_class: "Mangrove / Coastal", veg_code: 6, age_0: 9.6, age_1: 8.0, age_2: 12.0, age_3: 18.0, age_4: 20.0, age_5_plus: 32.4 },
  { veg_class: "Cleared / Developed", veg_code: 9, age_0: 32.5, age_1: 18.0, age_2: 16.0, age_3: 14.0, age_4: 10.0, age_5_plus: 9.5 },
];

// ─── Targets (from Healthy Country Plan) ────────────────────────

export interface FireTarget {
  metric: string;
  metric_num: number;
  target: string;
  current: string;
  status: "on_track" | "at_risk" | "off_track";
  description: string;
}

export const fireTargets: FireTarget[] = [
  { metric: "EDS Burn %", metric_num: 1, target: "≥35%", current: "36%", status: "on_track", description: "At least 35% of project area burnt during EDS" },
  { metric: "LDS Burn %", metric_num: 1, target: "≤10%", current: "4%", status: "on_track", description: "No more than 10% of project area burnt during LDS" },
  { metric: "3-Year Rolling", metric_num: 3, target: "65–85%", current: "75%", status: "on_track", description: "Cumulative 3-year burn coverage within target range" },
  { metric: "Unburnt Patches", metric_num: 4, target: "≥100 patches", current: "120", status: "on_track", description: "Maintain sufficient unburnt wildlife refuges" },
  { metric: "Mean Patch Age", metric_num: 6, target: "≤3 years", current: "2.1 yr", status: "on_track", description: "Average time since last burn across project" },
  { metric: "Dist. to Unburnt", metric_num: 8, target: "≤1000m", current: "790m", status: "on_track", description: "Mean distance from burnt areas to nearest unburnt refuge" },
  { metric: "Perimeter Impact", metric_num: 11, target: "≤25%", current: "15%", status: "on_track", description: "% of sensitive area perimeters adjacent to recent burns" },
  { metric: "LDS Patch Age", metric_num: 7, target: "≥3 years", current: "4.2 yr", status: "on_track", description: "Average years since last late-season burn" },
  { metric: "Shape Index (EDS)", metric_num: 2, target: "≥2.5", current: "3.3", status: "on_track", description: "EDS burns should be patchy (higher SI = more complex shape)" },
  { metric: "2-Year Rolling", metric_num: 13, target: "50–70%", current: "58%", status: "on_track", description: "Cumulative 2-year burn coverage within target range" },
];

// ─── Season Breakdown (current year) ────────────────────────────

export const seasonBreakdown: Array<{ name: "EDS" | "LDS" | "Unburnt"; value: number; color: string }> = [
  { name: "EDS", value: 36, color: "#3b82f6" },
  { name: "LDS", value: 4, color: "#ef4444" },
  { name: "Unburnt", value: 60, color: "#d1d5db" },
];

// ─── Helpers ────────────────────────────────────────────────────

export function getLatestYear() {
  return annualBurnData[annualBurnData.length - 1];
}

export function getEdsLdsRatio(year: number) {
  const row = annualBurnData.find((d) => d.year === year);
  if (!row || row.lds_pct === 0) return Infinity;
  return row.eds_pct / row.lds_pct;
}

// ─── Data Bridge ────────────────────────────────────────────────

import type { MetricsData, AnalysisResults } from "./analysis-types";

/**
 * Get metrics data, preferring computed results over hardcoded demo data.
 * Used by the reports page to transparently switch between data sources.
 */
export function getMetricsData(computed: AnalysisResults | null): MetricsData {
  if (computed) {
    return {
      annualBurnData: computed.annualBurnData,
      shapeIndexData: computed.shapeIndexData,
      threeYearRolling: computed.threeYearRolling,
      twoYearRolling: computed.twoYearRolling,
      unburntPatchData: computed.unburntPatchData,
      burnCountDistribution: computed.burnCountDistribution,
      patchAgeData: computed.patchAgeData,
      patchAgeLateOnly: computed.patchAgeLateOnly,
      distToUnburntData: computed.distToUnburntData,
      perimeterImpactData: computed.perimeterImpactData,
      cfiTable3Data: computed.cfiTable3Data,
      cfiTable9Data: computed.cfiTable9Data,
      seasonBreakdown: computed.seasonBreakdown,
      fireTargets: computed.fireTargets,
    };
  }

  return {
    annualBurnData,
    shapeIndexData,
    threeYearRolling,
    twoYearRolling,
    unburntPatchData,
    burnCountDistribution,
    patchAgeData,
    patchAgeLateOnly,
    distToUnburntData,
    perimeterImpactData,
    cfiTable3Data,
    cfiTable9Data,
    seasonBreakdown,
    fireTargets,
  };
}
