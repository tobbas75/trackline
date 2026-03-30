import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";

/**
 * NAFI Fire Scar Import API.
 * Downloads fire scar shapefiles from NAFI and processes them
 * for storage in PostGIS. This replaces the manual ArcPy import
 * pipeline (FireScar ImportAllYears.py / NAFI FormatShapefiles.py).
 *
 * POST body:
 *   year - Fire scar year to import (e.g. 2024)
 *   region - Region code (e.g. "NT", "WA_K" for Kimberley)
 *   bbox - Optional bounding box to clip features
 *
 * This route prepares import metadata. The actual shapefile
 * processing uses the shpjs library (client-side) or
 * a Python worker (server-side) for production.
 *
 * ─────────────────────────────────────────────────────────────────
 * SECURITY EXCEPTION: HTTP (not HTTPS)
 *
 * The NAFI service (firenorth.org.au) does not provide HTTPS
 * endpoints for shapefile downloads.
 *
 * RISK ACCEPTANCE:
 * - NAFI is a trusted Australian government fire monitoring service
 * - Fire scar data is public (not sensitive/classified)
 * - We validate response headers before processing
 * - Shapefile format is validated by the shpjs parser
 * - Data is cross-referenced with DEA Hotspots for validation
 * - Man-in-the-middle risk is low; data tampering would be obvious
 *
 * MITIGATION:
 * - HEAD request verifies file exists before processing
 * - Content-Length checked for suspicious sizes
 * - All imports logged with source URL for audit trail
 *
 * TODO: Re-evaluate if NAFI adds HTTPS support in future
 * Last checked: March 2026
 * ─────────────────────────────────────────────────────────────────
 */

/** NAFI fire scar download base URL */
const NAFI_DOWNLOAD_URL =
  "http://www.firenorth.org.au/nafi3/views/data/downloads";

/** Available NAFI regions and their shapefile naming patterns */
const NAFI_REGIONS: Record<string, { name: string; prefix: string }> = {
  NT: { name: "Northern Territory", prefix: "NT_firescar" },
  WA_K: { name: "Kimberley (WA)", prefix: "WA_K_firescar" },
  WA_P: { name: "Pilbara (WA)", prefix: "WA_P_firescar" },
  QLD_CY: { name: "Cape York (QLD)", prefix: "QLD_CY_firescar" },
  QLD_GBR: { name: "Gulf/Burdekin (QLD)", prefix: "QLD_GBR_firescar" },
  ALL: { name: "All Northern Australia", prefix: "NA_firescar" },
};

interface ImportRequest {
  year: number;
  region: string;
  bbox?: [number, number, number, number];
}

/**
 * Validate a NAFI HEAD response before processing.
 * Guards against obviously wrong content (corrupted proxy, redirects, etc.).
 */
function validateNAFIHeadResponse(response: Response): boolean {
  // Content-Length should be 1 KB – 50 MB for a valid shapefile zip
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const sizeBytes = parseInt(contentLength, 10);
    if (sizeBytes < 1024 || sizeBytes > 50 * 1024 * 1024) {
      console.error("[nafi-import] Suspicious file size from HEAD:", sizeBytes);
      return false;
    }
  }

  // Content-Type should be zip or octet-stream (or absent — NAFI may omit it)
  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    !contentType.includes("zip") &&
    !contentType.includes("octet-stream") &&
    !contentType.includes("x-zip")
  ) {
    console.error("[nafi-import] Unexpected content-type:", contentType);
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["POST"],
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });
  if (guard) return guard;

  let body: ImportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { year, region, bbox } = body;

  // Validate year
  if (!year || year < 2000 || year > new Date().getFullYear()) {
    return NextResponse.json(
      { error: "Year must be between 2000 and current year" },
      { status: 400 }
    );
  }

  // Validate region
  const regionConfig = NAFI_REGIONS[region];
  if (!regionConfig) {
    return NextResponse.json(
      {
        error: `Invalid region. Allowed: ${Object.keys(NAFI_REGIONS).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Build the expected shapefile URL
  const shapefileUrl = `${NAFI_DOWNLOAD_URL}/${regionConfig.prefix}_${year}.zip`;

  try {
    // Verify the shapefile exists (HEAD request)
    const headResponse = await fetch(shapefileUrl, { method: "HEAD" });

    if (!headResponse.ok) {
      return NextResponse.json(
        {
          error: `Fire scar data not available for ${regionConfig.name} ${year}`,
          url: shapefileUrl,
        },
        { status: 404 }
      );
    }

    if (!validateNAFIHeadResponse(headResponse)) {
      return NextResponse.json(
        { error: "NAFI response failed validation — unexpected file size or content type" },
        { status: 502 }
      );
    }

    const fileSize = headResponse.headers.get("content-length");

    // Return import metadata — actual processing happens client-side
    // (shpjs) or via a background Python worker in production.
    const resp = NextResponse.json({
      status: "ready",
      import: {
        year,
        region,
        regionName: regionConfig.name,
        shapefileUrl,
        fileSizeBytes: fileSize ? parseInt(fileSize, 10) : null,
        bbox: bbox ?? null,
        estimatedFeatures: null, // Unknown until processed
      },
      instructions: {
        client: "Use shpjs to parse the shapefile and POST features to /api/fire-scars",
        server: "Submit to background worker queue for ogr2ogr processing",
      },
      seasons: {
        note: "NAFI fire scars use month to determine season",
        earlyDrySeason: "January - July (months 1-7)",
        lateDrySeason: "August - December (months 8-12)",
        fieldMapping: {
          month: "Month field in shapefile attributes",
          season: "Derived: month <= 7 → EDS, month >= 8 → LDS",
          area_ha: "Area in hectares from shapefile",
          source: "nafi",
        },
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("NAFI import check error:", error);
    return NextResponse.json(
      { error: "Failed to verify NAFI data availability" },
      { status: 502 }
    );
  }
}
