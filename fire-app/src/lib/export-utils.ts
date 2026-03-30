/**
 * Data export utilities for fire metrics.
 * Supports CSV and GeoJSON formats.
 */

/** Trigger a file download in the browser */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert an array of objects to CSV string */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) return "";
  const keys = headers ?? Object.keys(data[0]);
  const headerRow = keys.join(",");
  const rows = data.map((row) =>
    keys.map((k) => {
      const val = row[k];
      if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val ?? "");
    }).join(",")
  );
  return [headerRow, ...rows].join("\n");
}

/** Export data as a CSV file download */
export function exportCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: string[]
) {
  const csv = toCSV(data, headers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/** Export annual burn data as CSV */
export function exportAnnualBurnCSV(
  data: Array<{
    year: number;
    eds_ha: number;
    lds_ha: number;
    total_ha: number;
    eds_pct: number;
    lds_pct: number;
    total_pct: number;
  }>
) {
  exportCSV(data, "fire-metrics-annual-burn.csv", [
    "year", "eds_ha", "lds_ha", "total_ha", "eds_pct", "lds_pct", "total_pct",
  ]);
}

/** Export CFI Table 3 as CSV */
export function exportTable3CSV(
  data: Array<{
    veg_class: string;
    veg_code: number;
    total_area_ha: number;
    eds_ha: number;
    eds_pct: number;
    lds_ha: number;
    lds_pct: number;
    total_ha: number;
    unburnt_ha: number;
  }>
) {
  exportCSV(data, "cfi-table-3.csv", [
    "veg_class", "veg_code", "total_area_ha",
    "eds_ha", "eds_pct", "lds_ha", "lds_pct",
    "total_ha", "unburnt_ha",
  ]);
}

/** Export CFI Table 9 as CSV */
export function exportTable9CSV(
  data: Array<{
    veg_class: string;
    veg_code: number;
    age_0: number;
    age_1: number;
    age_2: number;
    age_3: number;
    age_4: number;
    age_5_plus: number;
  }>
) {
  exportCSV(data, "cfi-table-9.csv", [
    "veg_class", "veg_code", "age_0", "age_1", "age_2", "age_3", "age_4", "age_5_plus",
  ]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

/** Export all metrics as a multi-sheet CSV (combined into one file with section headers) */
export function exportAllMetricsCSV(metrics: {
  annualBurn: AnyRow[];
  shapeIndex: AnyRow[];
  threeYearRolling: AnyRow[];
  twoYearRolling: AnyRow[];
  unburntPatches: AnyRow[];
  burnCount: AnyRow[];
  patchAge: AnyRow[];
  patchAgeLate: AnyRow[];
  distToUnburnt: AnyRow[];
  perimeterImpact: AnyRow[];
  heterogeneity: AnyRow[];
}) {
  const sections = [
    { title: "# Annual Burn % (Metric 1)", data: metrics.annualBurn },
    { title: "# Shape Index (Metric 2)", data: metrics.shapeIndex },
    { title: "# 3-Year Rolling Burn (Metric 3)", data: metrics.threeYearRolling },
    { title: "# Unburnt Patch Stats (Metric 4)", data: metrics.unburntPatches },
    { title: "# Burn Count Distribution (Metric 5)", data: metrics.burnCount },
    { title: "# Patch Age (Metric 6)", data: metrics.patchAge },
    { title: "# Patch Age Late Only (Metric 7)", data: metrics.patchAgeLate },
    { title: "# Distance to Unburnt (Metrics 8-10)", data: metrics.distToUnburnt },
    { title: "# Perimeter Impact (Metric 11)", data: metrics.perimeterImpact },
    { title: "# Heterogeneity Index (Metric 12)", data: metrics.heterogeneity },
    { title: "# 2-Year Rolling Burn (Metric 13)", data: metrics.twoYearRolling },
  ];

  const lines: string[] = [];
  for (const section of sections) {
    lines.push(section.title);
    if (section.data.length > 0) {
      lines.push(toCSV(section.data));
    }
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "fire-metrics-all.csv");
}

// ─── GeoJSON Exports ──────────────────────────────────────────────

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: any[];
}

/** Export data as GeoJSON file download */
export function exportGeoJSON(
  geojson: GeoJSONFeatureCollection,
  filename: string
) {
  const json = JSON.stringify(geojson, null, 2);
  const blob = new Blob([json], { type: "application/geo+json;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".geojson") ? filename : `${filename}.geojson`);
}

/** Convert fire scar data to GeoJSON (placeholder — actual geometry comes from PostGIS) */
export function exportFireScarsGeoJSON(
  scars: Array<{
    id: string;
    year: number;
    month: number;
    season: "EDS" | "LDS";
    area_ha: number;
    geometry?: GeoJSON.Geometry;
  }>
) {
  const features = scars.map((scar) => ({
    type: "Feature",
    properties: {
      id: scar.id,
      year: scar.year,
      month: scar.month,
      season: scar.season,
      area_ha: scar.area_ha,
    },
    geometry: scar.geometry ?? {
      type: "Point",
      coordinates: [0, 0],
    },
  }));

  exportGeoJSON(
    { type: "FeatureCollection", features },
    `fire-scars-${scars[0]?.year ?? "export"}.geojson`
  );
}

/** Convert burn plans to GeoJSON for external GIS tools */
export function exportBurnPlansGeoJSON(
  plans: Array<{
    id: string;
    name: string;
    season: string;
    status: string;
    target_ha: number;
    vegetation: string;
    geometry?: GeoJSON.Geometry;
  }>
) {
  const features = plans.map((plan) => ({
    type: "Feature",
    properties: {
      id: plan.id,
      name: plan.name,
      season: plan.season,
      status: plan.status,
      target_ha: plan.target_ha,
      vegetation: plan.vegetation,
    },
    geometry: plan.geometry ?? {
      type: "Point",
      coordinates: [0, 0],
    },
  }));

  exportGeoJSON(
    { type: "FeatureCollection", features },
    "burn-plans.geojson"
  );
}

/** Export generic JSON data as a file */
export function exportJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}
