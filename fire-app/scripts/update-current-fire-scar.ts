/**
 * Download the newest available NAFI fire-scar zip, extract it into the local
 * shapefile source folder, then regenerate local GeoJSON for that year.
 *
 * Usage:
 *   npx tsx scripts/update-current-fire-scar.ts
 *   npx tsx scripts/update-current-fire-scar.ts --year 2026
 *   npx tsx scripts/update-current-fire-scar.ts --dry-run
 *
 * Optional env vars:
 *   FIRE_SCAR_DATA_DIR: Override source shapefile folder
 *   FIRE_SCAR_LOOKBACK_YEARS: How many years back to search (default 2)
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";

const DEFAULT_DATA_DIR =
  "C:/Users/tobyw/OneDrive/GIS/Data/Fire Data/Fire scar Data";
const DOWNLOAD_BASE_URL = "https://www.firenorth.org.au/nafi3/downloads/firescars";
const PROJECT_ROOT = path.resolve(__dirname, "..");

interface CliOptions {
  year?: number;
  dryRun: boolean;
  dataDir: string;
}

function parseArgs(args: string[]): CliOptions {
  let year: number | undefined;
  let dryRun = false;
  let dataDir = process.env.FIRE_SCAR_DATA_DIR ?? DEFAULT_DATA_DIR;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--year") {
      const raw = args[i + 1];
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isInteger(parsed) || parsed < 2000) {
        throw new Error("Invalid --year value. Example: --year 2026");
      }
      year = parsed;
      i++;
      continue;
    }

    if (arg === "--data-dir") {
      const raw = args[i + 1];
      if (!raw) {
        throw new Error("Missing value for --data-dir");
      }
      dataDir = raw;
      i++;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { year, dryRun, dataDir };
}

function candidateYears(forcedYear?: number): number[] {
  if (forcedYear) return [forcedYear];

  const currentYear = new Date().getFullYear();
  const lookbackRaw = Number(process.env.FIRE_SCAR_LOOKBACK_YEARS ?? "2");
  const lookback = Number.isFinite(lookbackRaw) && lookbackRaw >= 0
    ? Math.floor(lookbackRaw)
    : 2;

  return Array.from({ length: lookback + 1 }, (_, i) => currentYear - i);
}

function expectedBaseNames(year: number): string[] {
  const yy = String(year).slice(-2).padStart(2, "0");
  return [
    `fs${yy}_mths_gda`,
    `fs${year}_mths_gda`,
    `fs${year}shp`,
  ];
}

function findExtractedShapefilePair(
  dataDir: string,
  year: number
): { shp: string; dbf: string } | null {
  for (const base of expectedBaseNames(year)) {
    const shp = path.join(dataDir, `${base}.shp`);
    const dbf = path.join(dataDir, `${base}.dbf`);
    if (fs.existsSync(shp) && fs.existsSync(dbf)) {
      return { shp, dbf };
    }
  }
  return null;
}

async function fetchZipLinksForYear(year: number): Promise<string[]> {
  const listingUrl = `${DOWNLOAD_BASE_URL}/${year}/`;
  const response = await fetch(listingUrl);
  if (!response.ok) return [];

  const html = await response.text();
  const links = new Set<string>();

  const patterns = [
    /href\s*=\s*"([^"]+\.zip)"/gi,
    /href\s*=\s*'([^']+\.zip)'/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const href = match[1]?.trim();
      if (!href) continue;

      try {
        const absolute = new URL(href, listingUrl).toString();
        if (absolute.toLowerCase().endsWith(".zip")) {
          links.add(absolute);
        }
      } catch {
        // Ignore malformed links.
      }
    }
  }

  return Array.from(links);
}

function fallbackZipUrl(year: number): string {
  const fileName = `${year} to date firescar shape files.zip`;
  return `${DOWNLOAD_BASE_URL}/${year}/${encodeURIComponent(fileName)}`;
}

async function headTimestamp(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return Number.NEGATIVE_INFINITY;

    const lastModified = response.headers.get("last-modified");
    const ts = lastModified ? Date.parse(lastModified) : NaN;
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}

async function pickNewestZip(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;

  let bestUrl = urls[0];
  let bestTs = Number.NEGATIVE_INFINITY;

  for (const url of urls) {
    const ts = await headTimestamp(url);
    if (ts > bestTs || (ts === bestTs && url > bestUrl)) {
      bestUrl = url;
      bestTs = ts;
    }
  }

  return bestUrl;
}

async function resolveZipUrl(year: number): Promise<string | null> {
  const discovered = await fetchZipLinksForYear(year);
  const newest = await pickNewestZip(discovered);
  if (newest) return newest;

  const fallback = fallbackZipUrl(year);
  const ts = await headTimestamp(fallback);
  return ts > Number.NEGATIVE_INFINITY ? fallback : null;
}

async function downloadZip(zipUrl: string): Promise<string> {
  const response = await fetch(zipUrl);
  if (!response.ok) {
    throw new Error(`Failed to download zip (${response.status}): ${zipUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = decodeURIComponent(path.basename(new URL(zipUrl).pathname));
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const outputPath = path.join(os.tmpdir(), `nafi-${Date.now()}-${safeName}`);

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

function runPowerShell(command: string): void {
  const executables = ["pwsh", "powershell"];
  let lastError: Error | null = null;

  for (const exe of executables) {
    const result = spawnSync(exe, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      stdio: "inherit",
    });

    if (!result.error && result.status === 0) {
      return;
    }

    if (result.error && (result.error as NodeJS.ErrnoException).code === "ENOENT") {
      continue;
    }

    if (result.error) {
      lastError = result.error;
    } else {
      lastError = new Error(`${exe} failed with exit code ${result.status}`);
    }
  }

  throw lastError ?? new Error("Failed to run PowerShell command");
}

function extractZip(zipPath: string, destinationDir: string): void {
  const escapedZip = zipPath.replace(/'/g, "''");
  const escapedDest = destinationDir.replace(/'/g, "''");
  const command = [
    `$zip = '${escapedZip}'`,
    `$dest = '${escapedDest}'`,
    "Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force",
  ].join("; ");

  runPowerShell(command);
}

function runProcessScript(year: number, dataDir: string): void {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

  const result = spawnSync(
    npmExecutable,
    ["run", "firescars:process", "--", "--year", String(year)],
    {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        FIRE_SCAR_DATA_DIR: dataDir,
      },
    }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`process-fire-scars.ts failed with exit code ${result.status}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.dataDir)) {
    fs.mkdirSync(options.dataDir, { recursive: true });
    console.log(`Created data directory: ${options.dataDir}`);
  }

  const yearsToTry = candidateYears(options.year);
  console.log(`Searching NAFI fire-scar zips for years: ${yearsToTry.join(", ")}`);

  let selectedYear: number | null = null;
  let selectedZipUrl: string | null = null;

  for (const year of yearsToTry) {
    const zipUrl = await resolveZipUrl(year);
    if (zipUrl) {
      selectedYear = year;
      selectedZipUrl = zipUrl;
      break;
    }
  }

  if (!selectedYear || !selectedZipUrl) {
    throw new Error(
      `Could not find a downloadable NAFI fire-scar zip for: ${yearsToTry.join(", ")}`
    );
  }

  console.log(`Selected year: ${selectedYear}`);
  console.log(`Selected zip: ${selectedZipUrl}`);

  if (options.dryRun) {
    console.log("Dry run complete. No files were downloaded or processed.");
    return;
  }

  const zipPath = await downloadZip(selectedZipUrl);
  console.log(`Downloaded zip to: ${zipPath}`);

  try {
    extractZip(zipPath, options.dataDir);
    console.log(`Extracted zip into: ${options.dataDir}`);
  } finally {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }

  const extractedPair = findExtractedShapefilePair(options.dataDir, selectedYear);
  if (!extractedPair) {
    throw new Error(
      `Extraction finished but no expected shapefile pair was found for ${selectedYear}.`
    );
  }

  console.log(
    `Found shapefile pair: ${path.basename(extractedPair.shp)} + ${path.basename(extractedPair.dbf)}`
  );

  runProcessScript(selectedYear, options.dataDir);

  console.log("Done. Local fire-scar data has been refreshed.");
  console.log(`Updated year: ${selectedYear}`);
}

main().catch((err) => {
  console.error("update-current-fire-scar failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
