import { NextResponse } from "next/server";
import { searchSpecies } from "@/lib/ala/species-search";
import { rateLimit } from "@/lib/rate-limit";

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const limiter = rateLimit({ interval: 60_000, limit: 30 });

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const cacheKey = `species:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const results = await searchSpecies(query);
  cache.set(cacheKey, { data: results, expires: Date.now() + CACHE_TTL });

  return NextResponse.json(results);
}
