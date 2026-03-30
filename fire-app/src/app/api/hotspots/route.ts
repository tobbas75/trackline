import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { CONFIG } from "@/lib/config";

/**
 * DEA Hotspots API proxy.
 * Fetches active fire hotspots from Geoscience Australia's Digital Earth Australia WFS.
 * Returns GeoJSON for direct consumption by MapLibre.
 *
 * Query params:
 *   bbox - Bounding box (minLon,minLat,maxLon,maxLat)
 *   hours - Hours of hotspot data (default: 72)
 *   satellite - Filter by satellite type (VIIRS, MODIS, Himawari)
 */

const DEA_WFS_URL = "https://hotspots.dea.ga.gov.au/geoserver/public/wfs";

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");
  const satellite = searchParams.get("satellite");
  const hours = parseInt(searchParams.get("hours") ?? "48", 10);

  // Build WFS request — use 3-day layer (closest DEA offers), filter by time client-side
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: "public:hotspots_three_days",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    count: "5000",
  });

  if (bbox) {
    const bboxParts = bbox.split(",").map(Number);
    if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "bbox must be 4 comma-separated numbers: west,south,east,north" },
          { status: 400 }
        )
      );
    }
    const [west, south, east, north] = bboxParts;
    const [bWest, bSouth, bEast, bNorth] = CONFIG.TIWI.BBOX_BUFFERED;
    if (west < bWest || south < bSouth || east > bEast || north > bNorth) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "bbox extends outside the allowable region", allowable: CONFIG.TIWI.BBOX_BUFFERED },
          { status: 400 }
        )
      );
    }
    params.set("bbox", bbox);
  }

  // Apply CQL filter for satellite type
  if (satellite) {
    params.set("CQL_FILTER", `satellite='${satellite}'`);
  }

  try {
    const response = await fetch(`${DEA_WFS_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `DEA WFS returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const now = Date.now();
    const cutoffMs = hours * 60 * 60 * 1000;

    // Transform to a simpler GeoJSON structure for the client
    const features = (data.features ?? [])
      .map(
        (f: {
          geometry: GeoJSON.Geometry;
          properties: Record<string, unknown>;
        }) => {
          const acqTime =
            (f.properties.acq_date as string) ??
            (f.properties.datetime as string) ??
            (f.properties.ACQ_DATE as string) ??
            null;

          const acqMs = acqTime ? new Date(acqTime).getTime() : 0;
          const hoursAgo = acqMs ? (now - acqMs) / (1000 * 60 * 60) : 999;

          return {
            type: "Feature" as const,
            geometry: f.geometry,
            properties: {
              satellite: f.properties.satellite ?? f.properties.SATELLITE,
              confidence: f.properties.confidence ?? f.properties.CONFIDENCE,
              frp: f.properties.power ?? f.properties.FRP,
              acquisition_time: acqTime,
              hours_ago: Math.round(hoursAgo * 10) / 10,
              source: "dea",
            },
            _acqMs: acqMs,
          };
        }
      )
      .filter(
        (f: { _acqMs: number }) => !f._acqMs || now - f._acqMs <= cutoffMs
      )
      .map(({ _acqMs, ...rest }: { _acqMs: number; type: "Feature"; geometry: GeoJSON.Geometry; properties: Record<string, unknown> }) => rest);

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    const resp = NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("DEA Hotspots fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hotspots from DEA" },
      { status: 502 }
    );
  }
}
