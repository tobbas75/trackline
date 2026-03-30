import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Fire Scar Upload API — stores custom fire scar GeoJSON per project+year.
 *
 * POST body (JSON):
 *   project_id    - UUID of the project
 *   year          - Fire scar year (2000+)
 *   label         - Human-readable label
 *   source        - Data source type
 *   feature_count - Number of features
 *   total_ha      - Total burnt area
 *   eds_ha        - EDS burnt area
 *   lds_ha        - LDS burnt area
 *   geojson       - GeoJSON FeatureCollection
 */

interface UploadPayload {
  project_id: string;
  year: number;
  label: string;
  source: string;
  feature_count: number;
  total_ha: number;
  eds_ha: number;
  lds_ha: number;
  geojson: GeoJSON.FeatureCollection;
}

export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["POST"],
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  });
  if (guard) return guard;

  let body: UploadPayload;
  try {
    body = (await request.json()) as UploadPayload;
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    );
  }

  const { project_id, year, label, source, feature_count, total_ha, eds_ha, lds_ha, geojson } = body;

  // Basic validation
  if (!project_id || !year || !geojson?.features) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "Missing required fields: project_id, year, geojson" },
        { status: 400 }
      )
    );
  }

  if (year < 2000 || year > new Date().getFullYear() + 1) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Invalid year" }, { status: 400 })
    );
  }

  // Verify user has access to this project
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    );
  }

  const { data: membership } = await supabase
    .from("user_project")
    .select("project_id")
    .eq("project_id", project_id)
    .single();

  if (!membership) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Project access denied" }, { status: 403 })
    );
  }

  // Upload GeoJSON to Supabase Storage
  const storagePath = `${project_id}/${year}.json`;
  const admin = getAdminClient();

  try {
    const { error: storageError } = await admin.storage
      .from("fire-scars")
      .upload(storagePath, JSON.stringify(geojson), {
        contentType: "application/json",
        upsert: true,
      });

    if (storageError) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Failed to upload to storage", details: storageError.message },
          { status: 500 }
        )
      );
    }
  } catch (err) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          error: "Storage upload failed",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      )
    );
  }

  // Upsert metadata row (replace previous upload for this project+year)
  // Table not yet in generated types — use raw query via admin client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: uploadRecord, error: dbError } = await (admin as any)
    .from("fire_scar_upload")
    .upsert(
      {
        project_id,
        year,
        label: label || `Custom ${year}`,
        source: source || "field_mapped",
        feature_count: feature_count || geojson.features.length,
        total_ha: total_ha || 0,
        eds_ha: eds_ha || 0,
        lds_ha: lds_ha || 0,
        storage_path: storagePath,
        uploaded_by: user.id,
      },
      { onConflict: "project_id,year" }
    )
    .select()
    .single();

  if (dbError) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "Failed to save upload metadata", details: dbError.message },
        { status: 500 }
      )
    );
  }

  return withSecurityHeaders(
    NextResponse.json({
      success: true,
      upload: uploadRecord,
    })
  );
}
