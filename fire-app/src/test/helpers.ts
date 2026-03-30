import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for API route testing.
 * Supports query params, method, headers, and body.
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
): NextRequest {
  const { method = "GET", headers = {}, body } = options ?? {};

  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    init as ConstructorParameters<typeof NextRequest>[1]
  );
}

/** Create a minimal GeoJSON FeatureCollection */
export function mockFeatureCollection(
  features: GeoJSON.Feature[] = []
): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

/** Create a GeoJSON Point feature */
export function mockPointFeature(
  lon: number,
  lat: number,
  properties: Record<string, unknown> = {}
): GeoJSON.Feature {
  return {
    type: "Feature",
    properties,
    geometry: { type: "Point", coordinates: [lon, lat] },
  };
}

/** Create a GeoJSON Polygon feature from a bounding box */
export function mockPolygonFeature(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  properties: Record<string, unknown> = {}
): GeoJSON.Feature {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ],
    },
  };
}
