import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";

/**
 * NAFI WMS proxy.
 * Proxies WMS tile requests to NAFI's fire scar WMS endpoint.
 * This avoids CORS issues and allows caching.
 *
 * Forwards all query parameters directly to NAFI's WMS.
 */

const NAFI_WMS_URL = "https://www.firenorth.org.au/public";

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 120, windowMs: 60_000 },
  });
  if (guard) return guard;
  const { searchParams } = new URL(request.url);

  // Forward all WMS params to NAFI
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  // Ensure required WMS params
  if (!params.has("SERVICE")) params.set("SERVICE", "WMS");
  if (!params.has("REQUEST")) params.set("REQUEST", "GetMap");

  try {
    const response = await fetch(`${NAFI_WMS_URL}?${params.toString()}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `NAFI WMS returned ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = await response.arrayBuffer();

    const resp = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("NAFI WMS proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from NAFI WMS" },
      { status: 502 }
    );
  }
}
