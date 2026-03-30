import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/hotspots/route";
import { createMockRequest } from "@/test/helpers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GET /api/hotspots", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns GeoJSON FeatureCollection on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { type: "Point", coordinates: [130.5, -11.5] },
            properties: {
              satellite: "VIIRS",
              confidence: "h",
              power: 42,
              acq_date: new Date().toISOString(),
            },
          },
        ],
      }),
    });

    const req = createMockRequest("http://localhost:3000/api/hotspots?bbox=130,-12,131,-11&hours=48");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.type).toBe("FeatureCollection");
    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties.satellite).toBe("VIIRS");
  });

  it("filters hotspots older than hours parameter", async () => {
    const oldDate = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { type: "Point", coordinates: [130.5, -11.5] },
            properties: { acq_date: oldDate },
          },
        ],
      }),
    });

    const req = createMockRequest("http://localhost:3000/api/hotspots?hours=48");
    const res = await GET(req);
    const data = await res.json();

    expect(data.features).toHaveLength(0);
  });

  it("returns 502 when upstream API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const req = createMockRequest("http://localhost:3000/api/hotspots");
    const res = await GET(req);

    expect(res.status).toBe(502);
  });

  it("includes security headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const req = createMockRequest("http://localhost:3000/api/hotspots");
    const res = await GET(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("passes bbox to upstream WFS query", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const req = createMockRequest("http://localhost:3000/api/hotspots?bbox=130,-12,131,-11");
    await GET(req);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("bbox")).toBe("130,-12,131,-11");
  });

  it("returns 502 on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const req = createMockRequest("http://localhost:3000/api/hotspots");
    const res = await GET(req);

    expect(res.status).toBe(502);
  });
});
