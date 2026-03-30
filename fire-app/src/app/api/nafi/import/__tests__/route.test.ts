import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/nafi/import/route";
import { createMockRequest } from "@/test/helpers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("POST /api/nafi/import", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns import metadata when shapefile exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-length": "5000000" }),
    });

    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 2024, region: "NT" },
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ready");
    expect(data.import.year).toBe(2024);
    expect(data.import.regionName).toBe("Northern Territory");
  });

  it("returns 400 for invalid year", async () => {
    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 1999, region: "NT" },
      headers: { "x-forwarded-for": "10.0.0.2" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for future year", async () => {
    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 2050, region: "NT" },
      headers: { "x-forwarded-for": "10.0.0.3" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid region", async () => {
    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 2024, region: "INVALID" },
      headers: { "x-forwarded-for": "10.0.0.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid region");
  });

  it("returns 404 when shapefile not available", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 2000, region: "NT" },
      headers: { "x-forwarded-for": "10.0.0.5" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new (await import("next/server")).NextRequest(
      new URL("http://localhost:3000/api/nafi/import"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.6",
        },
        body: "invalid json",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("includes season mapping in response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    });

    const req = createMockRequest("http://localhost:3000/api/nafi/import", {
      method: "POST",
      body: { year: 2024, region: "WA_K" },
      headers: { "x-forwarded-for": "10.0.0.7" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.seasons.earlyDrySeason).toContain("January");
    expect(data.seasons.lateDrySeason).toContain("August");
  });
});
