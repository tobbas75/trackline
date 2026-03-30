/**
 * Generates national-scale fire scar grid summaries from NAFI shapefiles.
 *
 * Reads each year's national shapefile, bins fire scars into 0.25° grid cells
 * (~28km) with aggregated EDS/LDS hectares, and outputs lightweight GeoJSON
 * files suitable for map overlay at national/regional zoom levels.
 *
 * Usage:
 *   npx tsx scripts/generate-national-grids.ts              # all years
 *   npx tsx scripts/generate-national-grids.ts --year 2023   # single year
 *   npx tsx scripts/generate-national-grids.ts --upload       # upload to Supabase Storage
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as shapefile from "shapefile";
import centroid from "@turf/centroid";
import area from "@turf/area";
import * as fs from "fs";
import * as path from "path";
import { getAdminClient, isAdminConfigured } from "../src/lib/supabase/admin";

// ─── Configuration ──────────────────────────────────────────────────

const DATA_DIR =
  process.env.FIRE_SCAR_DATA_DIR ??
  "C:/Users/tobyw/OneDrive/GIS/Data/Fire Data/Fire scar Data";
const OUTPUT_DIR = path.resolve(__dirname, "../public/data/fire-scars/national");

/** Grid cell size in degrees. 0.25° ≈ 28km at this latitude. */
const CELL_SIZE = 0.25;

/** Skip fire scars smaller than this (hectares). */
const MIN_AREA_HA = 1;

/** Skip grid cells with total burned area below this threshold (hectares). */
const MIN_CELL_TOTAL_HA = 100;

/** Decimal precision for grid coordinates. */
const COORD_PRECISION = 1;

// ─── Helpers ────────────────────────────────────────────────────────

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
  return "WET";
}

// ─── Processing ─────────────────────────────────────────────────────

interface GridCell {
  lon: number;
  lat: number;
  eds: number;
  lds: number;
}

async function processYear(year: number): Promise<number | null> {
  const paths = getShapefilePaths(year);
  if (!paths) {
    console.log(`  Skipping ${year}: shapefile not found`);
    return null;
  }

  console.log(`  Processing ${year}...`);
  const startTime = Date.now();

  const source = await shapefile.open(paths.shp, paths.dbf);
  const grid = new Map<string, GridCell>();
  let totalRead = 0;
  let included = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;
    totalRead++;

    try {
      const feature = result.value as GeoJSON.Feature;
      const c = centroid(feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
      const [lon, lat] = c.geometry.coordinates;
      const areaHa = area(feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>) / 10000;

      if (areaHa < MIN_AREA_HA) continue;

      const props = feature.properties ?? {};
      const month: number =
        props.MONTH ?? props.Month ?? props.month ?? props.GRIDCODE ?? 0;
      const season = month >= 1 && month <= 12 ? classifySeason(month) : "LDS";

      // Snap to grid
      const gLon = Math.round(lon / CELL_SIZE) * CELL_SIZE;
      const gLat = Math.round(lat / CELL_SIZE) * CELL_SIZE;
      const key = `${gLon.toFixed(COORD_PRECISION)},${gLat.toFixed(COORD_PRECISION)}`;

      if (!grid.has(key)) {
        grid.set(key, { lon: gLon, lat: gLat, eds: 0, lds: 0 });
      }

      const cell = grid.get(key)!;
      if (season === "EDS") {
        cell.eds += areaHa;
      } else {
        cell.lds += areaHa;
      }
      included++;
    } catch {
      continue;
    }
  }

  // Build GeoJSON FeatureCollection with grid cell polygons
  const half = CELL_SIZE / 2;
  const features: GeoJSON.Feature[] = [];

  let skippedLow = 0;
  for (const cell of grid.values()) {
    const total = Math.round(cell.eds + cell.lds);
    if (total < MIN_CELL_TOTAL_HA) { skippedLow++; continue; }
    const p = COORD_PRECISION;
    features.push({
      type: "Feature",
      properties: {
        eds: Math.round(cell.eds),
        lds: Math.round(cell.lds),
        total: Math.round(cell.eds + cell.lds),
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [+(cell.lon - half).toFixed(p), +(cell.lat - half).toFixed(p)],
            [+(cell.lon + half).toFixed(p), +(cell.lat - half).toFixed(p)],
            [+(cell.lon + half).toFixed(p), +(cell.lat + half).toFixed(p)],
            [+(cell.lon - half).toFixed(p), +(cell.lat + half).toFixed(p)],
            [+(cell.lon - half).toFixed(p), +(cell.lat - half).toFixed(p)],
          ],
        ],
      },
    });
  }

  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const outputPath = path.join(OUTPUT_DIR, `${year}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(fc));

  const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `    ${year}: ${totalRead} polygons → ${features.length} cells kept, ${skippedLow} removed (<${MIN_CELL_TOTAL_HA}ha)`
  );
  console.log(`    Output: ${fileSizeKB} KB (${elapsed}s)`);

  return grid.size;
}

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
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${storagePath}: ${error.message}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("National Fire Scar Grid Generation");
  console.log(`Grid cell size: ${CELL_SIZE}° (~${Math.round(CELL_SIZE * 111)}km)`);
  console.log("==================================\n");

  const args = process.argv.slice(2);
  const yearArgIdx = args.indexOf("--year");
  const singleYear =
    yearArgIdx >= 0 ? parseInt(args[yearArgIdx + 1], 10) : null;
  const doUpload = args.includes("--upload");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const years = singleYear
    ? [singleYear]
    : Array.from(
        { length: new Date().getFullYear() - 2000 + 1 },
        (_, i) => 2000 + i
      );

  const processed: string[] = [];

  for (const year of years) {
    try {
      const cells = await processYear(year);
      if (cells !== null) {
        processed.push(String(year));
      }
    } catch (err) {
      console.error(
        `  ERROR processing ${year}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Write a national summary
  const summaryPath = path.join(OUTPUT_DIR, "index.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({
      available_years: processed.map(Number).sort(),
      cell_size_deg: CELL_SIZE,
      generated_at: new Date().toISOString(),
    }, null, 2)
  );

  // Upload to Supabase Storage
  if (doUpload && isAdminConfigured()) {
    console.log("\nUploading to Supabase Storage...");
    try {
      await uploadToStorage(summaryPath, "national/index.json");
      console.log("  + national/index.json");

      for (const year of processed) {
        const yearPath = path.join(OUTPUT_DIR, `${year}.json`);
        await uploadToStorage(yearPath, `national/${year}.json`);
        console.log(`  + national/${year}.json`);
      }
      console.log("\nAll national grid files uploaded.");
    } catch (err) {
      console.error(
        "\nUpload failed:",
        err instanceof Error ? err.message : err
      );
      console.error("Local files saved successfully.");
      process.exit(1);
    }
  }

  console.log("\n==================================");
  console.log(`Done. ${processed.length} years generated in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
