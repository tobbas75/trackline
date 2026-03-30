/**
 * Carbon Methodology Data
 *
 * MIGRATION STATUS: Database tables added in migration 007.
 * DB functions: getCarbonProjectFromDB(), getAccuPeriodsFromDB(), createAccuPeriod()
 * Calculation helpers: calculateProjectEmissions(), calculateAccus()
 * Mock data: accuPeriods, emissionsByGas, baselineYears (below) — backward-compat until DB is wired
 *
 * TODO: Update carbon page to call DB functions instead of mock arrays.
 */

import { getAdminClient } from "./supabase/admin";

// ─── Database-backed functions (migration 007) ─────────────────

export async function getCarbonProjectFromDB(projectId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("carbon_project")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No row found
      return null;
    }
    throw error;
  }

  return data;
}

export async function getAccuPeriodsFromDB(carbonProjectId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("accu_period")
    .select("*")
    .eq("carbon_project_id", carbonProjectId)
    .order("period_start", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAccuPeriodInDB(period: {
  carbon_project_id: string;
  period_start: string;
  period_end: string;
  project_emissions_eds: number;
  project_emissions_lds: number;
  project_emissions_total: number;
  gross_abatement: number;
  net_abatement: number;
  uncertainty_buffer: number;
  accus_eligible: number;
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("accu_period")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(period as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Calculation helpers ───────────────────────────────────────

/** Emission factors (tCO₂-e per hectare) by fuel type and season */
const EMISSION_FACTORS = {
  EOF: { eds: 2.5, lds: 5.8 }, // Eucalyptus Open Forest
  EW:  { eds: 1.8, lds: 4.2 }, // Eucalyptus Woodland
  SW:  { eds: 1.2, lds: 3.1 }, // Shrubby Woodland
  SH:  { eds: 0.9, lds: 2.3 }, // Shrubland
} as const;

type FuelType = keyof typeof EMISSION_FACTORS;

/**
 * Calculate project emissions from vegetation-intersected fire scar areas.
 * Based on: area_burnt_ha × fuel-type emission factor by season.
 */
export function calculateProjectEmissions(
  vegetationIntersections: Array<{
    fuel_type: FuelType;
    area_burnt_ha: number;
    season: "EDS" | "LDS";
  }>
): {
  eds_emissions_tco2e: number;
  lds_emissions_tco2e: number;
  total_emissions_tco2e: number;
} {
  const edsEmissions = vegetationIntersections
    .filter((v) => v.season === "EDS")
    .reduce((sum, v) => sum + v.area_burnt_ha * EMISSION_FACTORS[v.fuel_type].eds, 0);

  const ldsEmissions = vegetationIntersections
    .filter((v) => v.season === "LDS")
    .reduce((sum, v) => sum + v.area_burnt_ha * EMISSION_FACTORS[v.fuel_type].lds, 0);

  return {
    eds_emissions_tco2e: edsEmissions,
    lds_emissions_tco2e: ldsEmissions,
    total_emissions_tco2e: edsEmissions + ldsEmissions,
  };
}

/**
 * Calculate ACCU issuance from emissions and baseline.
 * Formula: gross = baseline − project; net = gross × (1 − permanenceDiscount);
 *          eligible = max(0, net − uncertaintyBuffer)
 */
export function calculateAccus(
  baselineEmissions: number,
  projectEmissions: number,
  permanenceDiscount: number = 0.25,
  uncertaintyBuffer: number = 0
): {
  gross_abatement: number;
  net_abatement: number;
  accus_eligible: number;
} {
  const grossAbatement = Math.max(0, baselineEmissions - projectEmissions);
  const netAbatement = grossAbatement * (1 - permanenceDiscount);
  const accusEligible = Math.max(0, netAbatement - uncertaintyBuffer);

  return {
    gross_abatement: grossAbatement,
    net_abatement: netAbatement,
    accus_eligible: accusEligible,
  };
}

// ─── Mock data (backward compatibility) ───────────────────────

// ─── ACCU Reporting Periods ────────────────────────────────────────

export interface AccuPeriod {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  /** tCO₂-e baseline emissions for this period */
  baseline_emissions: number;
  /** tCO₂-e project emissions for this period */
  project_emissions: number;
  /** tCO₂-e net abatement before permanence discount */
  gross_abatement: number;
  /** Permanence discount applied (e.g. 0.25 for 25%) */
  permanence_discount: number;
  /** tCO₂-e uncertainty buffer deducted */
  uncertainty_buffer: number;
  /** Final ACCUs issued after all deductions */
  accus_issued: number;
  /** Market price per ACCU at time of issuance (AUD) */
  accu_price: number;
  /** Revenue = accus_issued × accu_price */
  revenue: number;
  /** Submission status */
  status: "draft" | "submitted" | "under_review" | "approved" | "issued";
  /** Date submitted to CER (if any) */
  submitted_date: string | null;
  /** SavBAT run ID or reference */
  savbat_ref: string | null;
  notes: string;
}

export const accuPeriods: AccuPeriod[] = [
  {
    id: "ap-1", period: "2016-17", start_date: "2016-07-01", end_date: "2017-06-30",
    baseline_emissions: 45000, project_emissions: 28000, gross_abatement: 17000,
    permanence_discount: 0.25, uncertainty_buffer: 250,
    accus_issued: 12500, accu_price: 15.5, revenue: 193750,
    status: "issued", submitted_date: "2017-09-15", savbat_ref: "SB-2017-001",
    notes: "First crediting period. Baseline established from 2005-2014 fire history.",
  },
  {
    id: "ap-2", period: "2017-18", start_date: "2017-07-01", end_date: "2018-06-30",
    baseline_emissions: 45000, project_emissions: 25000, gross_abatement: 20000,
    permanence_discount: 0.25, uncertainty_buffer: 300,
    accus_issued: 14200, accu_price: 16.8, revenue: 238560,
    status: "issued", submitted_date: "2018-10-01", savbat_ref: "SB-2018-001",
    notes: "Improved EDS coverage. NAFI data validated against field mapping.",
  },
  {
    id: "ap-3", period: "2018-19", start_date: "2018-07-01", end_date: "2019-06-30",
    baseline_emissions: 45000, project_emissions: 26500, gross_abatement: 18500,
    permanence_discount: 0.25, uncertainty_buffer: 275,
    accus_issued: 15800, accu_price: 18.2, revenue: 287560,
    status: "issued", submitted_date: "2019-09-20", savbat_ref: "SB-2019-001",
    notes: "Cyclone impact reduced EDS window by 2 weeks.",
  },
  {
    id: "ap-4", period: "2019-20", start_date: "2019-07-01", end_date: "2020-06-30",
    baseline_emissions: 45000, project_emissions: 30000, gross_abatement: 15000,
    permanence_discount: 0.25, uncertainty_buffer: 350,
    accus_issued: 13900, accu_price: 17.0, revenue: 236300,
    status: "issued", submitted_date: "2020-11-05", savbat_ref: "SB-2020-001",
    notes: "Higher LDS due to late-season lightning ignitions in western sector.",
  },
  {
    id: "ap-5", period: "2020-21", start_date: "2020-07-01", end_date: "2021-06-30",
    baseline_emissions: 45000, project_emissions: 24000, gross_abatement: 21000,
    permanence_discount: 0.25, uncertainty_buffer: 250,
    accus_issued: 16500, accu_price: 22.5, revenue: 371250,
    status: "issued", submitted_date: "2021-09-30", savbat_ref: "SB-2021-001",
    notes: "COVID year — reduced aerial operations but good ground crew coverage.",
  },
  {
    id: "ap-6", period: "2021-22", start_date: "2021-07-01", end_date: "2022-06-30",
    baseline_emissions: 45000, project_emissions: 22000, gross_abatement: 23000,
    permanence_discount: 0.25, uncertainty_buffer: 200,
    accus_issued: 18200, accu_price: 28.0, revenue: 509600,
    status: "issued", submitted_date: "2022-10-15", savbat_ref: "SB-2022-001",
    notes: "Best year for EDS coverage. New burn plan areas in eastern sector.",
  },
  {
    id: "ap-7", period: "2022-23", start_date: "2022-07-01", end_date: "2023-06-30",
    baseline_emissions: 45000, project_emissions: 23500, gross_abatement: 21500,
    permanence_discount: 0.25, uncertainty_buffer: 325,
    accus_issued: 17800, accu_price: 33.5, revenue: 596300,
    status: "issued", submitted_date: "2023-09-28", savbat_ref: "SB-2023-001",
    notes: "Minor reversal in eastern zone; offset by strong western burns.",
  },
  {
    id: "ap-8", period: "2023-24", start_date: "2023-07-01", end_date: "2024-06-30",
    baseline_emissions: 45000, project_emissions: 21000, gross_abatement: 24000,
    permanence_discount: 0.25, uncertainty_buffer: 200,
    accus_issued: 19100, accu_price: 35.0, revenue: 668500,
    status: "issued", submitted_date: "2024-10-10", savbat_ref: "SB-2024-001",
    notes: "Record ACCU issuance. Strong EDS program with aerial + ground coordination.",
  },
  {
    id: "ap-9", period: "2024-25", start_date: "2024-07-01", end_date: "2025-06-30",
    baseline_emissions: 45000, project_emissions: 20000, gross_abatement: 25000,
    permanence_discount: 0.25, uncertainty_buffer: 180,
    accus_issued: 0, accu_price: 36.0, revenue: 0,
    status: "submitted", submitted_date: "2025-12-01", savbat_ref: "SB-2025-001",
    notes: "Awaiting CER review. SavBAT package submitted December 2025.",
  },
  {
    id: "ap-10", period: "2025-26", start_date: "2025-07-01", end_date: "2026-06-30",
    baseline_emissions: 45000, project_emissions: 0, gross_abatement: 0,
    permanence_discount: 0.25, uncertainty_buffer: 0,
    accus_issued: 0, accu_price: 37.0, revenue: 0,
    status: "draft", submitted_date: null, savbat_ref: null,
    notes: "Current reporting period. Fire season in progress.",
  },
];

// ─── Emissions by Gas ──────────────────────────────────────────────

export interface EmissionsByGas {
  period: string;
  ch4_baseline: number;
  ch4_project: number;
  n2o_baseline: number;
  n2o_project: number;
  total_baseline: number;
  total_project: number;
}

export const emissionsByGas: EmissionsByGas[] = [
  { period: "2016-17", ch4_baseline: 31500, ch4_project: 19600, n2o_baseline: 13500, n2o_project: 8400, total_baseline: 45000, total_project: 28000 },
  { period: "2017-18", ch4_baseline: 31500, ch4_project: 17500, n2o_baseline: 13500, n2o_project: 7500, total_baseline: 45000, total_project: 25000 },
  { period: "2018-19", ch4_baseline: 31500, ch4_project: 18550, n2o_baseline: 13500, n2o_project: 7950, total_baseline: 45000, total_project: 26500 },
  { period: "2019-20", ch4_baseline: 31500, ch4_project: 21000, n2o_baseline: 13500, n2o_project: 9000, total_baseline: 45000, total_project: 30000 },
  { period: "2020-21", ch4_baseline: 31500, ch4_project: 16800, n2o_baseline: 13500, n2o_project: 7200, total_baseline: 45000, total_project: 24000 },
  { period: "2021-22", ch4_baseline: 31500, ch4_project: 15400, n2o_baseline: 13500, n2o_project: 6600, total_baseline: 45000, total_project: 22000 },
  { period: "2022-23", ch4_baseline: 31500, ch4_project: 16450, n2o_baseline: 13500, n2o_project: 7050, total_baseline: 45000, total_project: 23500 },
  { period: "2023-24", ch4_baseline: 31500, ch4_project: 14700, n2o_baseline: 13500, n2o_project: 6300, total_baseline: 45000, total_project: 21000 },
];

// ─── Baseline Calculation Breakdown ────────────────────────────────

export interface BaselineYear {
  year: number;
  total_area_burnt_ha: number;
  eds_ha: number;
  lds_ha: number;
  ch4_tco2e: number;
  n2o_tco2e: number;
  total_tco2e: number;
}

/** 10-year pre-project fire history used for baseline calculation */
export const baselineYears: BaselineYear[] = [
  { year: 2005, total_area_burnt_ha: 380000, eds_ha: 120000, lds_ha: 260000, ch4_tco2e: 35200, n2o_tco2e: 15100, total_tco2e: 50300 },
  { year: 2006, total_area_burnt_ha: 350000, eds_ha: 140000, lds_ha: 210000, ch4_tco2e: 30100, n2o_tco2e: 12900, total_tco2e: 43000 },
  { year: 2007, total_area_burnt_ha: 410000, eds_ha: 110000, lds_ha: 300000, ch4_tco2e: 38500, n2o_tco2e: 16500, total_tco2e: 55000 },
  { year: 2008, total_area_burnt_ha: 330000, eds_ha: 150000, lds_ha: 180000, ch4_tco2e: 27300, n2o_tco2e: 11700, total_tco2e: 39000 },
  { year: 2009, total_area_burnt_ha: 390000, eds_ha: 130000, lds_ha: 260000, ch4_tco2e: 33600, n2o_tco2e: 14400, total_tco2e: 48000 },
  { year: 2010, total_area_burnt_ha: 370000, eds_ha: 125000, lds_ha: 245000, ch4_tco2e: 32200, n2o_tco2e: 13800, total_tco2e: 46000 },
  { year: 2011, total_area_burnt_ha: 360000, eds_ha: 135000, lds_ha: 225000, ch4_tco2e: 30800, n2o_tco2e: 13200, total_tco2e: 44000 },
  { year: 2012, total_area_burnt_ha: 340000, eds_ha: 145000, lds_ha: 195000, ch4_tco2e: 28700, n2o_tco2e: 12300, total_tco2e: 41000 },
  { year: 2013, total_area_burnt_ha: 385000, eds_ha: 115000, lds_ha: 270000, ch4_tco2e: 34300, n2o_tco2e: 14700, total_tco2e: 49000 },
  { year: 2014, total_area_burnt_ha: 365000, eds_ha: 128000, lds_ha: 237000, ch4_tco2e: 31300, n2o_tco2e: 13700, total_tco2e: 45000 },
];

// ─── ACCU Sales / Contract Tracking ────────────────────────────────

export interface AccuSale {
  id: string;
  date: string;
  quantity: number;
  price_per_accu: number;
  total_aud: number;
  buyer: string;
  contract_type: "spot" | "forward" | "government" | "voluntary";
  status: "completed" | "pending" | "contracted";
}

export const accuSales: AccuSale[] = [
  { id: "s-1", date: "2017-11-15", quantity: 10000, price_per_accu: 15.5, total_aud: 155000, buyer: "Commonwealth Govt (ERF)", contract_type: "government", status: "completed" },
  { id: "s-2", date: "2018-03-20", quantity: 2500, price_per_accu: 16.0, total_aud: 40000, buyer: "Qantas Future Planet", contract_type: "voluntary", status: "completed" },
  { id: "s-3", date: "2018-12-10", quantity: 12000, price_per_accu: 16.8, total_aud: 201600, buyer: "Commonwealth Govt (ERF)", contract_type: "government", status: "completed" },
  { id: "s-4", date: "2019-06-01", quantity: 5000, price_per_accu: 18.0, total_aud: 90000, buyer: "South Pole (voluntary)", contract_type: "voluntary", status: "completed" },
  { id: "s-5", date: "2020-02-15", quantity: 15000, price_per_accu: 17.5, total_aud: 262500, buyer: "Commonwealth Govt (ERF)", contract_type: "government", status: "completed" },
  { id: "s-6", date: "2021-08-01", quantity: 8000, price_per_accu: 24.0, total_aud: 192000, buyer: "Santos (offset)", contract_type: "voluntary", status: "completed" },
  { id: "s-7", date: "2022-04-10", quantity: 18000, price_per_accu: 30.0, total_aud: 540000, buyer: "Commonwealth Govt (ERF)", contract_type: "government", status: "completed" },
  { id: "s-8", date: "2023-07-20", quantity: 10000, price_per_accu: 33.5, total_aud: 335000, buyer: "Microsoft (voluntary)", contract_type: "voluntary", status: "completed" },
  { id: "s-9", date: "2024-01-15", quantity: 15000, price_per_accu: 35.0, total_aud: 525000, buyer: "Commonwealth Govt (ERF)", contract_type: "government", status: "completed" },
  { id: "s-10", date: "2025-06-01", quantity: 20000, price_per_accu: 36.0, total_aud: 720000, buyer: "Forward contract — TBC", contract_type: "forward", status: "contracted" },
];

// ─── Helpers ───────────────────────────────────────────────────────

export function getTotalACCUs(): number {
  return accuPeriods.reduce((sum, p) => sum + p.accus_issued, 0);
}

export function getTotalRevenue(): number {
  return accuSales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.total_aud, 0);
}

export function getBaselineAverage(): number {
  return Math.round(
    baselineYears.reduce((sum, y) => sum + y.total_tco2e, 0) / baselineYears.length
  );
}

export function getIssuedPeriods(): AccuPeriod[] {
  return accuPeriods.filter((p) => p.status === "issued");
}

export function getPendingPeriods(): AccuPeriod[] {
  return accuPeriods.filter((p) => p.status !== "issued");
}

/** Cumulative ACCUs issued over time (for area chart) */
export function getCumulativeACCUs(): Array<{ period: string; cumulative: number; issued: number }> {
  let cumulative = 0;
  return accuPeriods
    .filter((p) => p.accus_issued > 0)
    .map((p) => {
      cumulative += p.accus_issued;
      return { period: p.period, cumulative, issued: p.accus_issued };
    });
}

/** Revenue by buyer type */
export function getRevenueByBuyer(): Array<{ type: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const sale of accuSales.filter((s) => s.status === "completed")) {
    const existing = map.get(sale.contract_type) ?? { total: 0, count: 0 };
    existing.total += sale.total_aud;
    existing.count += sale.quantity;
    map.set(sale.contract_type, existing);
  }
  return Array.from(map.entries()).map(([type, data]) => ({
    type: type === "government" ? "Government (ERF)" : type === "voluntary" ? "Voluntary Market" : type === "forward" ? "Forward Contract" : "Spot Market",
    ...data,
  }));
}
