/**
 * Offline processing script: reads NAFI MODIS fire scar shapefiles,
 * clips to the Tiwi Islands bounding box, simplifies geometry,
 * classifies burn season, and outputs per-year GeoJSON files.
 *
 * Usage:
 *   npx tsx scripts/process-fire-scars.ts          # process all years
 *   npx tsx scripts/process-fire-scars.ts --year 2020  # single year
 *   npx tsx scripts/process-fire-scars.ts --skip-upload  # local only, no Storage upload
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as shapefile from "shapefile";
import bboxClip from "@turf/bbox-clip";
import simplify from "@turf/simplify";
import area from "@turf/area";
import * as fs from "fs";
import * as path from "path";
import { getAdminClient, isAdminConfigured } from "../src/lib/supabase/admin";

// ─── Configuration ──────────────────────────────────────────────

const DATA_DIR =
  process.env.FIRE_SCAR_DATA_DIR ??
  "C:/Users/tobyw/OneDrive/GIS/Data/Fire Data/Fire scar Data";
const OUTPUT_DIR = path.resolve(__dirname, "../public/data/fire-scars");

// Tiwi Islands bounding box (slightly expanded to catch edge polygons)
const TIWI_BBOX: [number, number, number, number] = [129.0, -12.5, 132.5, -10.8];

const SIMPLIFY_TOLERANCE = 0.001; // ~110m at this latitude
const COORD_PRECISION = 4; // decimal places (~11m)

// ─── Helpers ────────────────────────────────────────────────────

function getShapefilePaths(year: number): { shp: string; dbf: string } | null {
  const yy = String(year).slice(-2).padStart(2, "0");
  const candidates = [
    `fs${yy}_mths_gda`,
    `fs${year}_mths_gda`,
    `fs${year}shp`,
  ];

  for (const baseName of candidates) {
    const shp = path.join(DATA_DIR, `${baseName}.shp`);
    const dbf = path.join(DATA_DIR, `${baseName}.dbf`);
    if (fs.existsSync(shp) && fs.existsSync(dbf)) {
      return { shp, dbf };
    }
  }

  return null;
}

function classifySeason(month: number): "EDS" | "LDS" | "WET" {
  if (month >= 4 && month <= 7) return "EDS";
  if (month >= 8 && month <= 12) return "LDS";
  return "WET"; // Jan-Mar
}

/** Check if a feature's coordinates overlap the Tiwi bbox (fast pre-filter). */
function featureMayIntersectBbox(
  feature: GeoJSON.Feature,
  bbox: [number, number, number, number]
): boolean {
  const [bMinX, bMinY, bMaxX, bMaxY] = bbox;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const walkCoords = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      // It's a coordinate pair [lon, lat]
      const [lon, lat] = coords as [number, number];
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
      return;
    }
    for (const child of coords) {
      walkCoords(child);
    }
  };

  walkCoords((feature.geometry as { coordinates: unknown }).coordinates);

  // Check bbox overlap
  return !(maxX < bMinX || minX > bMaxX || maxY < bMinY || minY > bMaxY);
}

/** Round all coordinates in a geometry to the given decimal places. */
function roundCoords(geom: GeoJSON.Geometry, precision: number): void {
  const factor = Math.pow(10, precision);
  const round = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      coords[0] = Math.round(coords[0] * factor) / factor;
      coords[1] = Math.round(coords[1] * factor) / factor;
      return;
    }
    for (const child of coords) {
      round(child);
    }
  };
  round((geom as { coordinates: unknown }).coordinates);
}

/** Check if a geometry has any actual coordinates after clipping. */
function hasCoordinates(geom: GeoJSON.Geometry): boolean {
  if (geom.type === "Polygon") {
    return geom.coordinates.length > 0 && geom.coordinates[0].length >= 4;
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some(
      (poly) => poly.length > 0 && poly[0].length >= 4
    );
  }
  return false;
}

// ─── Main processing ────────────────────────────────────────────

interface YearSummary {
  feature_count: number;
  eds_ha: number;
  lds_ha: number;
  wet_ha: number;
  total_ha: number;
}

interface SummaryFile {
  years?: Record<string, YearSummary>;
}

async function processYear(year: number): Promise<YearSummary | null> {
  const paths = getShapefilePaths(year);
  if (!paths) {
    console.log(`  Skipping ${year}: shapefile not found`);
    return null;
  }

  console.log(`  Processing ${year}...`);
  const startTime = Date.now();

  const source = await shapefile.open(paths.shp, paths.dbf);
  const features: GeoJSON.Feature[] = [];
  let totalRead = 0;
  let bboxFiltered = 0;
  const summary: YearSummary = {
    feature_count: 0,
    eds_ha: 0,
    lds_ha: 0,
    wet_ha: 0,
    total_ha: 0,
  };

  while (true) {
    const result = await source.read();
    if (result.done) break;

    totalRead++;
    const feature = result.value as GeoJSON.Feature;

    // Pre-filter: skip if feature bbox doesn't overlap Tiwi Islands
    if (!featureMayIntersectBbox(feature, TIWI_BBOX)) continue;
    bboxFiltered++;

    // Get month from properties (handle different attribute names)
    const props = feature.properties ?? {};
    const month: number =
      props.MONTH ?? props.Month ?? props.month ?? props.GRIDCODE ?? 0;

    if (!month || month < 1 || month > 12) continue;

    try {
      // Clip to Tiwi bbox
      const clipped = bboxClip(feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>, TIWI_BBOX);

      if (!hasCoordinates(clipped.geometry)) continue;

      // Simplify
      const simplified = simplify(clipped, {
        tolerance: SIMPLIFY_TOLERANCE,
        highQuality: true,
      });

      if (!hasCoordinates(simplified.geometry)) continue;

      // Compute area
      const areaM2 = area(simplified);
      const areaHa = Math.round(areaM2 / 100) / 100; // 2 decimal places

      if (areaHa < 0.1) continue; // Skip tiny slivers

      // Round coordinates
      roundCoords(simplified.geometry, COORD_PRECISION);

      // Classify season
      const burnSeason = classifySeason(month);

      // Build output feature with minimal properties
      const outputFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {
          month,
          burn_season: burnSeason,
          area_ha: areaHa,
        },
        geometry: simplified.geometry,
      };

      features.push(outputFeature);

      // Update summary
      summary.feature_count++;
      summary.total_ha += areaHa;
      if (burnSeason === "EDS") summary.eds_ha += areaHa;
      else if (burnSeason === "LDS") summary.lds_ha += areaHa;
      else summary.wet_ha += areaHa;
    } catch {
      // Skip features that fail clipping/simplification
      continue;
    }
  }

  // Round summary values
  summary.eds_ha = Math.round(summary.eds_ha * 100) / 100;
  summary.lds_ha = Math.round(summary.lds_ha * 100) / 100;
  summary.wet_ha = Math.round(summary.wet_ha * 100) / 100;
  summary.total_ha = Math.round(summary.total_ha * 100) / 100;

  // Write output GeoJSON
  const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const outputPath = path.join(OUTPUT_DIR, `${year}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(featureCollection));

  const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `    ${year}: ${totalRead} polygons read, ${bboxFiltered} in bbox, ${features.length} output features`
  );
  console.log(
    `    EDS: ${summary.eds_ha} ha | LDS: ${summary.lds_ha} ha | Total: ${summary.total_ha} ha`
  );
  console.log(`    Output: ${fileSizeKB} KB (${elapsed}s)`);

  return summary;
}

/** Upload a file to Supabase Storage */
async function uploadToStorage(
  localPath: string,
  storagePath: string
): Promise<void> {
  const client = getAdminClient();
  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await client.storage
    .from("fire-scars")
    .upload(storagePath, fileBuffer, {
      contentType: "application/json",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload ${storagePath}: ${error.message}`);
  }
}

async function main() {
  console.log("Fire Scar Processing Script");
  console.log("===========================\n");

  // Parse CLI args
  const args = process.argv.slice(2);
  const yearArgIdx = args.indexOf("--year");
  const singleYear =
    yearArgIdx >= 0 ? parseInt(args[yearArgIdx + 1], 10) : null;
  const skipUpload = args.includes("--skip-upload");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const years = singleYear
    ? [singleYear]
    : Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i); // 2000-current year

  const summaryPath = path.join(OUTPUT_DIR, "summary.json");
  let allSummaries: Record<string, YearSummary> = {};

  // For single-year refreshes, preserve previously processed years in summary.json.
  if (singleYear && fs.existsSync(summaryPath)) {
    try {
      const raw = fs.readFileSync(summaryPath, "utf8");
      const parsed = JSON.parse(raw) as SummaryFile;
      if (parsed.years && typeof parsed.years === "object") {
        allSummaries = { ...parsed.years };
      }
    } catch (err) {
      console.warn(
        "Warning: Failed to read existing summary.json; rebuilding summary from current run only.",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  for (const year of years) {
    try {
      const summary = await processYear(year);
      if (summary) {
        allSummaries[String(year)] = summary;
      }

  // Upload to Supabase Storage
  if (!skipUpload && isAdminConfigured()) {
    console.log("\nUploading to Supabase Storage...");
    try {
      // Upload summary.json first
      await uploadToStorage(summaryPath, "summary.json");
      console.log("  ✓ summary.json");

      // Upload each year file
      for (const year of Object.keys(allSummaries)) {
        const yearPath = path.join(OUTPUT_DIR, `${year}.json`);
        if (fs.existsSync(yearPath)) {
          await uploadToStorage(yearPath, `${year}.json`);
          console.log(`  ✓ ${year}.json`);
        }
      }
      console.log("\nAll files uploaded to fire-scars bucket.");
    } catch (err) {
      console.error(
        "\nERROR uploading to Storage:",
        err instanceof Error ? err.message : err
      );
      console.error("Local files were saved successfully, but cloud sync failed.");
      process.exit(1);
    }
  } else if (skipUpload) {
    console.log("\n--skip-upload: Supabase Storage upload skipped.");
  } else {
    console.log(
      "\nSupabase admin client not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable cloud uploads."
    );
  }
    } catch (err) {
      console.error(`  ERROR processing ${year}:`, err instanceof Error ? err.message : err);
      console.log(`  Skipping ${year} and continuing...\n`);
    }
  }

  // Write summary.json
  const summaryData = {
    years: allSummaries,
    available_years: Object.keys(allSummaries).map(Number).sort(),
    generated_at: new Date().toISOString(),
    bbox: TIWI_BBOX,
    simplify_tolerance: SIMPLIFY_TOLERANCE,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));

  console.log("\n===========================");
  console.log(
    `Done. ${Object.keys(allSummaries).length} years processed.`
  );
  console.log(`Summary written to ${summaryPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
