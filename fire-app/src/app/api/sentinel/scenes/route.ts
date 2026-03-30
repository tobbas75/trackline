import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";

/**
 * Sentinel-2 scene discovery via CDSE STAC API.
 * Searches the Copernicus Data Space Ecosystem catalog for available scenes.
 * No authentication required for STAC catalog searches.
 *
 * Query params:
 *   bbox      - Bounding box as "west,south,east,north" (EPSG:4326)
 *   dateStart - Start date (ISO 8601, e.g. "2024-01-01")
 *   dateEnd   - End date (ISO 8601, e.g. "2024-06-30")
 *   maxCloud  - Maximum cloud cover percentage (default: 30)
 *   limit     - Max number of results (default: 20, max: 50)
 */

const STAC_SEARCH_URL =
  "https://catalogue.dataspace.copernicus.eu/stac/search";

/** Sentinel-2 Level-2A collection ID on CDSE */
const SENTINEL2_COLLECTION = "SENTINEL-2";

interface StacFeature {
  id: string;
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
    platform?: string;
    [key: string]: unknown;
  };
  bbox: number[];
  assets?: Record<string, { href: string; type?: string }>;
}

interface StacSearchResponse {
  type: "FeatureCollection";
  features: StacFeature[];
  numberReturned?: number;
  numberMatched?: number;
}

export interface SentinelScene {
  sceneId: string;
  date: string;
  cloudCover: number | null;
  satellite: string;
  bbox: number[];
  thumbnailUrl: string | null;
}

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 15, windowMs: 60_000 },
    requiredParams: ["bbox", "dateStart", "dateEnd"],
  });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox")!;
  const dateStart = searchParams.get("dateStart")!;
  const dateEnd = searchParams.get("dateEnd")!;
  const maxCloud = Number(searchParams.get("maxCloud") ?? "30");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  // Parse and validate bbox
  const bboxParts = bbox.split(",").map(Number);
  if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
    return NextResponse.json(
      { error: "Invalid bbox format. Expected: west,south,east,north" },
      { status: 400 }
    );
  }

  // Build STAC search body
  const stacBody = {
    collections: [SENTINEL2_COLLECTION],
    bbox: bboxParts,
    datetime: `${dateStart}T00:00:00Z/${dateEnd}T23:59:59Z`,
    limit,
    query: {
      "eo:cloud_cover": { lte: maxCloud },
    },
    sortby: [{ field: "datetime", direction: "desc" }],
  };

  try {
    const response = await fetch(STAC_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stacBody),
      next: { revalidate: 3600 }, // Cache scene searches for 1 hour
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`CDSE STAC returned ${response.status}: ${text}`);
      return NextResponse.json(
        { error: `CDSE STAC returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as StacSearchResponse;

    // Transform to simplified scene list
    const scenes: SentinelScene[] = data.features.map((f) => ({
      sceneId: f.id,
      date: f.properties.datetime,
      cloudCover: f.properties["eo:cloud_cover"] ?? null,
      satellite: f.properties.platform ?? "Sentinel-2",
      bbox: f.bbox,
      thumbnailUrl:
        f.assets?.["thumbnail"]?.href ??
        f.assets?.["preview"]?.href ??
        null,
    }));

    const resp = NextResponse.json(
      { scenes, total: data.numberMatched ?? scenes.length },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=300",
        },
      }
    );
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("CDSE STAC search error:", error);
    return NextResponse.json(
      { error: "Failed to search CDSE STAC catalog" },
      { status: 502 }
    );
  }
}
