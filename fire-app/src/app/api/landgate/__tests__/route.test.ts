import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/landgate/route";
import { createMockRequest } from "@/test/helpers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GET /api/landgate", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns 400 when service param missing", async () => {
    const req = createMockRequest("http://localhost:3000/api/landgate");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid service name", async () => {
    const req = createMockRequest("http://localhost:3000/api/landgate?service=Invalid_Service");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid service");
  });

  it("accepts valid service names", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const req = createMockRequest("http://localhost:3000/api/landgate?service=Firewatch_Current_Map");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("passes bbox as ESRI envelope geometry", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const req = createMockRequest(
      "http://localhost:3000/api/landgate?service=Firewatch_Current_Map&bbox=115,-18,120,-14"
    );
    await GET(req);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    const geometry = JSON.parse(calledUrl.searchParams.get("geometry")!);
    expect(geometry.xmin).toBe(115);
    expect(geometry.ymax).toBe(-14);
  });

  it("returns 502 on upstream failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const req = createMockRequest("http://localhost:3000/api/landgate?service=Firewatch_Current_Map");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns 502 on ESRI error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "Service unavailable" } }),
    });

    const req = createMockRequest("http://localhost:3000/api/landgate?service=Firewatch_Current_Map");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("includes security headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const req = createMockRequest("http://localhost:3000/api/landgate?service=Firewatch_Current_Map");
    const res = await GET(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
