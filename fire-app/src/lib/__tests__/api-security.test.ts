import { describe, it, expect, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  withSecurityHeaders,
  validateOrigin,
  validateQueryParams,
  apiGuard,
} from "@/lib/api-security";
import { NextResponse } from "next/server";
import { createMockRequest } from "@/test/helpers";

// ─── checkRateLimit ─────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const key = `test-first-${Date.now()}-${Math.random()}`;
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("decrements remaining on each request", () => {
    const key = `test-decr-${Date.now()}-${Math.random()}`;
    const opts = { maxRequests: 3, windowMs: 60000 };

    const r1 = checkRateLimit(key, opts);
    const r2 = checkRateLimit(key, opts);
    const r3 = checkRateLimit(key, opts);

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
  });

  it("blocks after exceeding maxRequests", () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    const opts = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    const third = checkRateLimit(key, opts);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const key = `test-reset-${Math.random()}`;
    const opts = { maxRequests: 1, windowMs: 100 };

    checkRateLimit(key, opts);
    vi.advanceTimersByTime(200);

    const result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(true);
    vi.useRealTimers();
  });

  it("returns resetAt timestamp in the future", () => {
    const key = `test-reset-time-${Date.now()}-${Math.random()}`;
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 60000 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── withSecurityHeaders ────────────────────────────────────────

describe("withSecurityHeaders", () => {
  it("adds security headers to response", () => {
    const response = NextResponse.json({ ok: true });
    const secured = withSecurityHeaders(response);
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(secured.headers.get("X-Frame-Options")).toBe("DENY");
    expect(secured.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(secured.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(secured.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});

// ─── validateOrigin ─────────────────────────────────────────────

describe("validateOrigin", () => {
  it("allows request with no origin header (server-to-server)", () => {
    const req = createMockRequest("http://localhost:3000/api/test");
    expect(validateOrigin(req)).toBe(true);
  });

  it("allows request from localhost:3000", () => {
    const req = createMockRequest("http://localhost:3000/api/test", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("allows request from localhost:3001", () => {
    const req = createMockRequest("http://localhost:3000/api/test", {
      headers: { origin: "http://localhost:3001" },
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects request from unknown origin", () => {
    const req = createMockRequest("http://localhost:3000/api/test", {
      headers: { origin: "http://evil.com" },
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("accepts custom allowed origins", () => {
    const req = createMockRequest("http://localhost:3000/api/test", {
      headers: { origin: "https://custom.app" },
    });
    expect(validateOrigin(req, ["https://custom.app"])).toBe(true);
  });
});

// ─── validateQueryParams ────────────────────────────────────────

describe("validateQueryParams", () => {
  it("returns valid when all required params present", () => {
    const req = createMockRequest("http://localhost:3000/api/test?bbox=1,2,3,4&hours=48");
    const result = validateQueryParams(req, ["bbox", "hours"]);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns missing params", () => {
    const req = createMockRequest("http://localhost:3000/api/test?bbox=1,2,3,4");
    const result = validateQueryParams(req, ["bbox", "hours"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["hours"]);
  });

  it("returns all missing when none present", () => {
    const req = createMockRequest("http://localhost:3000/api/test");
    const result = validateQueryParams(req, ["a", "b", "c"]);
    expect(result.missing).toEqual(["a", "b", "c"]);
  });
});

// ─── apiGuard ───────────────────────────────────────────────────

describe("apiGuard", () => {
  it("returns null when all checks pass", async () => {
    const req = createMockRequest("http://localhost:3000/api/test");
    const result = await apiGuard(req, { methods: ["GET"], rateLimit: false });
    expect(result).toBeNull();
  });

  it("returns 405 for disallowed method", async () => {
    const req = createMockRequest("http://localhost:3000/api/test", { method: "POST" });
    const result = await apiGuard(req, { methods: ["GET"], rateLimit: false });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(405);
  });

  it("returns 400 for missing required params", async () => {
    const req = createMockRequest("http://localhost:3000/api/test");
    const result = await apiGuard(req, {
      methods: ["GET"],
      rateLimit: false,
      requiredParams: ["service"],
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
  });

  it("passes when required params are present", async () => {
    const req = createMockRequest("http://localhost:3000/api/test?service=test");
    const result = await apiGuard(req, {
      methods: ["GET"],
      rateLimit: false,
      requiredParams: ["service"],
    });
    expect(result).toBeNull();
  });

  it("rejects invalid origin", async () => {
    const req = createMockRequest("http://localhost:3000/api/test", {
      headers: { origin: "http://evil.com" },
    });
    const result = await apiGuard(req, { methods: ["GET"], rateLimit: false });
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
