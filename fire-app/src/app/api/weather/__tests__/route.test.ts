import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/weather/route";
import { createMockRequest } from "@/test/helpers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GET /api/weather", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns weather data on success", async () => {
    const weatherData = {
      current: { temperature_2m: 32, wind_speed_10m: 15 },
      daily: { temperature_2m_max: [34, 35] },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => weatherData,
    });

    const req = createMockRequest("http://localhost:3000/api/weather?lat=-11.55&lng=130.85");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.current.temperature_2m).toBe(32);
  });

  it("uses default coordinates when none provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ current: {} }),
    });

    const req = createMockRequest("http://localhost:3000/api/weather");
    await GET(req);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("latitude")).toBe("-11.55");
    expect(calledUrl.searchParams.get("longitude")).toBe("130.85");
  });

  it("returns 502 when upstream fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const req = createMockRequest("http://localhost:3000/api/weather");
    const res = await GET(req);

    expect(res.status).toBe(502);
  });

  it("includes cache control headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const req = createMockRequest("http://localhost:3000/api/weather");
    const res = await GET(req);

    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("includes security headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const req = createMockRequest("http://localhost:3000/api/weather");
    const res = await GET(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
