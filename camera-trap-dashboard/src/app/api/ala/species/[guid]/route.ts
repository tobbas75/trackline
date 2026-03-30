import { NextResponse } from "next/server";
import { getConservationStatus } from "@/lib/ala/conservation";
import { getSpeciesImageUrl } from "@/lib/ala/images";

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;

  const cacheKey = `profile:${guid}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const [conservationStatus, imageUrl] = await Promise.all([
    getConservationStatus(guid),
    getSpeciesImageUrl(guid),
  ]);

  const result = { guid, conservationStatus, imageUrl };
  cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });

  return NextResponse.json(result);
}
