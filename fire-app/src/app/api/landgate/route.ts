import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";

/**
 * Landgate SLIP API proxy.
 * Proxies requests to Western Australia's Shared Location Information Platform (SLIP).
 * Provides access to FireWatch, Bush Fire Prone Areas, and other WA fire datasets.
 *
 * Query params:
 *   service - SLIP service name (e.g. "Firewatch_Current_Map")
 *   layer - Layer ID within the service
 *   bbox - Bounding box (minLon,minLat,maxLon,maxLat)
 *   format - Response format (default: geojson)
 */

const SLIP_BASE_URL =
  "https://services.slip.wa.gov.au/public/rest/services";

/** Available Landgate fire-related services */
const ALLOWED_SERVICES = [
  "Locate_Bushfire_Prone_Areas_OBRM",
  "Firewatch_Current_Map",
  "Firewatch_Archive_Map",
  "Locate_Emergency_Bushfire",
] as const;

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
    requiredParams: ["service"],
  });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service")!;
  const layer = searchParams.get("layer") ?? "0";
  const bbox = searchParams.get("bbox");
  const format = searchParams.get("format") ?? "geojson";

  // Validate service name to prevent path traversal
  if (!ALLOWED_SERVICES.includes(service as (typeof ALLOWED_SERVICES)[number])) {
    return NextResponse.json(
      {
        error: `Invalid service. Allowed: ${ALLOWED_SERVICES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Build SLIP REST query
  const queryUrl = `${SLIP_BASE_URL}/${service}/MapServer/${layer}/query`;
  const params = new URLSearchParams({
    f: format === "geojson" ? "geojson" : "json",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "2000",
  });

  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox.split(",");
    params.set(
      "geometry",
      JSON.stringify({
        xmin: Number(minLon),
        ymin: Number(minLat),
        xmax: Number(maxLon),
        ymax: Number(maxLat),
        spatialReference: { wkid: 4326 },
      })
    );
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("spatialRel", "esriSpatialRelIntersects");
    params.set("inSR", "4326");
  } else {
    // Default: return all features (with count limit)
    params.set("where", "1=1");
  }

  try {
    const response = await fetch(`${queryUrl}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Landgate SLIP returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Check for ESRI error responses
    if (data.error) {
      return NextResponse.json(
        { error: `Landgate SLIP error: ${data.error.message}` },
        { status: 502 }
      );
    }

    const resp = NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("Landgate SLIP fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Landgate SLIP" },
      { status: 502 }
    );
  }
}
