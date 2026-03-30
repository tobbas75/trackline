import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";

/**
 * Weather API proxy.
 * Fetches forecast data from Open-Meteo using BOM ACCESS-G model.
 * Free, no API key required.
 *
 * Query params:
 *   lat - Latitude
 *   lng - Longitude
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/bom";

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (guard) return guard;
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") ?? "-11.55";
  const lng = searchParams.get("lng") ?? "130.85";

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_max,relative_humidity_2m_min",
    current:
      "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
    timezone: "Australia/Darwin",
    forecast_days: "7",
  });

  try {
    const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Open-Meteo returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const resp = NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("Weather fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 }
    );
  }
}
