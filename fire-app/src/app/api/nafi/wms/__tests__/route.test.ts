import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/nafi/wms/route";
import { createMockRequest } from "@/test/helpers";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GET /api/nafi/wms", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("proxies WMS request and returns image", async () => {
    const imageBuffer = new ArrayBuffer(100);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => imageBuffer,
    });

    const req = createMockRequest(
      "http://localhost:3000/api/nafi/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=fire_scars_2024&WIDTH=256&HEIGHT=256"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("forwards all query params to NAFI", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    const req = createMockRequest(
      "http://localhost:3000/api/nafi/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=test"
    );
    await GET(req);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("LAYERS")).toBe("test");
  });

  it("returns 502 when NAFI is unavailable", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const req = createMockRequest("http://localhost:3000/api/nafi/wms?SERVICE=WMS");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("includes cache control header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    const req = createMockRequest("http://localhost:3000/api/nafi/wms?SERVICE=WMS");
    const res = await GET(req);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("includes security headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    const req = createMockRequest("http://localhost:3000/api/nafi/wms?SERVICE=WMS");
    const res = await GET(req);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
