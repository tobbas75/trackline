import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

/**
 * Sentinel imagery library — lists all cached/processed imagery.
 *
 * GET /api/sentinel/imagery/library?product=ndvi&limit=20
 *
 * Returns records from sentinel_imagery_cache, sorted newest-first.
 * No auth required (public cache metadata), but rate-limited.
 */

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (guard) return guard;

  if (!isAdminConfigured()) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      )
    );
  }

  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  try {
    const client = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from("sentinel_imagery_cache")
      .select("id, product, date_start, date_end, baseline_start, baseline_end, file_size_bytes, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (product) {
      query = query.eq("product", product);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[sentinel-library] Query error:", error.message);
      return withSecurityHeaders(
        NextResponse.json({ error: "Failed to query imagery cache" }, { status: 500 })
      );
    }

    const maps = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      product: row.product,
      dateStart: row.date_start,
      dateEnd: row.date_end,
      baselineStart: row.baseline_start ?? null,
      baselineEnd: row.baseline_end ?? null,
      fileSizeBytes: row.file_size_bytes ?? null,
      createdAt: row.created_at,
    }));

    const resp = NextResponse.json(
      { maps, total: count ?? maps.length },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
    return withSecurityHeaders(resp);
  } catch (err) {
    console.error("[sentinel-library] Unexpected error:", err);
    return withSecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
