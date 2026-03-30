/**
 * API Security utilities for Next.js API routes.
 * Provides rate limiting, security headers, and request validation.
 *
 * Rate limiting uses Redis (Upstash) when credentials are present,
 * falling back to in-memory for local development.
 */

import { NextResponse, type NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

// ─── Redis client (null if not configured) ─────────────────────

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ─── In-memory fallback ────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 60,
  windowMs: 60_000, // 1 minute
};

// Periodic in-memory cleanup (every 5 minutes)
let lastInMemoryCleanup = Date.now();
const IN_MEMORY_CLEANUP_INTERVAL_MS = 5 * 60_000;

function cleanupInMemoryIfNeeded(): void {
  const now = Date.now();
  if (now - lastInMemoryCleanup < IN_MEMORY_CLEANUP_INTERVAL_MS) return;
  lastInMemoryCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

/**
 * Synchronous in-memory rate limit check.
 * Exported for use in tests. Production code uses checkRateLimit() (async, Redis-aware).
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupInMemoryIfNeeded();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    };
  }

  entry.count += 1;

  if (entry.count > options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Resolve rate limit using Redis (production) or in-memory fallback (local dev).
 * This is the internal async function used by apiGuard().
 */
async function resolveRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (redis) {
    const windowSeconds = Math.ceil(options.windowMs / 1000);
    const redisKey = `rate_limit:${key}`;

    try {
      const current = await redis.incr(redisKey);

      // Set expiry on first request in window
      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const resetAt = Date.now() + options.windowMs;
      const allowed = current <= options.maxRequests;
      return {
        allowed,
        remaining: allowed ? options.maxRequests - current : 0,
        resetAt,
      };
    } catch (error) {
      console.error("[api-security] Redis error, falling back to in-memory:", error);
      return checkRateLimit(key, options);
    }
  }

  // No Redis — use in-memory (not production-safe, but fine for local dev)
  console.warn(
    "[api-security] In-memory rate limiting active (not production-safe). " +
    "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed rate limiting."
  );
  return checkRateLimit(key, options);
}

// ─── Security Headers ──────────────────────────────────────────

/** Apply security headers to an API response */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );
  return response;
}

// ─── Request Validation ────────────────────────────────────────

/** Validate that the request origin matches expected origins */
export function validateOrigin(
  request: NextRequest,
  allowedOrigins?: string[]
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Server-to-server requests may not have origin

  const allowed = allowedOrigins ?? [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  return allowed.includes(origin);
}

/** Validate required query parameters */
export function validateQueryParams(
  request: NextRequest,
  required: string[]
): { valid: boolean; missing: string[] } {
  const url = new URL(request.url);
  const missing = required.filter((param) => !url.searchParams.has(param));
  return { valid: missing.length === 0, missing };
}

// ─── Composable API Handler ────────────────────────────────────

interface ApiHandlerOptions {
  /** Rate limit config (defaults to 60 req/min) */
  rateLimit?: RateLimitOptions | false;
  /** Allowed HTTP methods */
  methods?: string[];
  /** Required query parameters */
  requiredParams?: string[];
}

/**
 * Wrap an API handler with standard security checks.
 * NOW ASYNC to support Redis-based rate limiting.
 *
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const guard = await apiGuard(request, { methods: ["GET"], requiredParams: ["year"] });
 *   if (guard) return guard;
 *   // ... handle request
 * }
 * ```
 */
export async function apiGuard(
  request: NextRequest,
  options: ApiHandlerOptions = {}
): Promise<NextResponse | null> {
  // Method check
  if (options.methods && !options.methods.includes(request.method)) {
    return NextResponse.json(
      { error: `Method ${request.method} not allowed` },
      { status: 405 }
    );
  }

  // Origin validation
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin" },
      { status: 403 }
    );
  }

  // Rate limiting
  if (options.rateLimit !== false) {
    const rateLimitOpts = options.rateLimit ?? DEFAULT_RATE_LIMIT;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const path = new URL(request.url).pathname;
    const key = `${ip}:${path}`;

    const result = await resolveRateLimit(key, rateLimitOpts);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateLimitOpts.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }
  }

  // Required params
  if (options.requiredParams) {
    const { valid, missing } = validateQueryParams(request, options.requiredParams);
    if (!valid) {
      return NextResponse.json(
        { error: `Missing required parameters: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  return null; // All checks passed
}
