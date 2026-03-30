import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clipToProjectBoundary } from "@/lib/analysis-engine";
import * as fs from "fs";
import * as path from "path";

/**
 * Fire Scars API — serves NAFI fire-scar GeoJSON.
 *
 * Data sources (in priority order):
 *   1. Custom project upload from Supabase Storage  (fire-scars/{project_id}/{year}.json)
 *   2. Pre-processed NAFI data from local filesystem (public/data/fire-scars/{year}.json)
 *
 * Query params:
 *   year       - Fire scar year (2000-present, default: current year)
 *   project_id - Optional: check for custom uploads + clip NAFI to project boundary
 *   summary    - Return summary.json metadata
 */

const DATA_DIR = path.join(process.cwd(), "public", "data", "fire-scars");

function readLocalFile(filename: string): string | null {
  const filePath = path.join(DATA_DIR, filename);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 120, windowMs: 60_000 },
  });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const projectId = searchParams.get("project_id");
  const wantSummary = searchParams.get("summary") === "true";

  // ─── Summary ───────────────────────────────────────────────────────
  if (wantSummary) {
    const raw = readLocalFile("summary.json");
    if (!raw) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Summary file not found" }, { status: 404 })
      );
    }
    return withSecurityHeaders(
      NextResponse.json(JSON.parse(raw), {
        headers: { "Cache-Control": "public, max-age=3600" },
      })
    );
  }

  // ─── Validate year ─────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  if (isNaN(year) || year < 2000 || year > currentYear + 1) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: `Invalid year. Must be between 2000 and ${currentYear}` },
        { status: 400 }
      )
    );
  }

  // ─── Load fire scar data ──────────────────────────────────────────
  // Priority: custom project upload > local NAFI files
  let fireScarsGeoJSON: GeoJSON.FeatureCollection | null = null;
  let isCustomUpload = false;

  // Check for custom project upload in Supabase Storage
  if (projectId && isAdminConfigured()) {
    try {
      const storage = getAdminClient().storage.from("fire-scars");
      const { data, error } = await storage.download(
        `${projectId}/${year}.json`
      );
      if (!error && data) {
        fireScarsGeoJSON = JSON.parse(
          await data.text()
        ) as GeoJSON.FeatureCollection;
        isCustomUpload = true;
      }
    } catch {
      // No custom upload — fall through to NAFI
    }
  }

  // Fall back to local NAFI files
  if (!fireScarsGeoJSON) {
    const raw = readLocalFile(`${year}.json`);
    if (!raw) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: `Fire scar data for ${year} not found` },
          { status: 404 }
        )
      );
    }
    fireScarsGeoJSON = JSON.parse(raw) as GeoJSON.FeatureCollection;
  }

  // ─── No project filtering — return as-is ──────────────────────────
  if (!projectId) {
    return withSecurityHeaders(
      NextResponse.json(fireScarsGeoJSON, {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      })
    );
  }

  // ─── Custom uploads are already project-scoped — skip clipping ────
  if (isCustomUpload) {
    return withSecurityHeaders(
      NextResponse.json(fireScarsGeoJSON, {
        headers: { "Cache-Control": "private, max-age=3600" },
      })
    );
  }

  // ─── Clip NAFI data to project boundary ───────────────────────────
  try {
    const supabase = await createClient();

    // Verify user has access to this project
    const { data: membership, error: membershipError } = await supabase
      .from("user_project")
      .select("project_id")
      .eq("project_id", projectId)
      .single();

    if (membershipError || !membership) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 403 }
        )
      );
    }

    // Fetch project boundary
    const { data, error: projectError } = await supabase
      .from("project")
      .select("id, boundary")
      .eq("id", projectId)
      .limit(1);

    if (projectError || !data || data.length === 0) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Project boundary not found" },
          { status: 404 }
        )
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectData = data[0] as any;
    const boundary = projectData.boundary as GeoJSON.MultiPolygon | null;

    if (!boundary) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Project has no boundary geometry" },
          { status: 404 }
        )
      );
    }

    const boundaryFC: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: boundary },
      ],
    };

    const clippedFeatures = clipToProjectBoundary(
      fireScarsGeoJSON,
      boundaryFC
    );

    return withSecurityHeaders(
      NextResponse.json(
        { type: "FeatureCollection", features: clippedFeatures },
        { headers: { "Cache-Control": "private, max-age=3600" } }
      )
    );
  } catch (err) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          error: "Failed to filter fire scars",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      )
    );
  }
}
