import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/export?type=observations|sites|species
 *
 * Exports project data as CSV. Auth is enforced via Supabase RLS --
 * the server client uses the caller's session cookie.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!type || !["observations", "sites", "species"].includes(type)) {
    return NextResponse.json(
      { error: "Query param 'type' must be one of: observations, sites, species" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  // Verify the user can see this project (RLS will block if not)
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectName = (project as unknown as { name: string }).name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();

  let csv: string;
  let filename: string;

  switch (type) {
    case "observations": {
      csv = await buildObservationsCsv(supabase, projectId);
      filename = `${projectName}_observations.csv`;
      break;
    }
    case "sites": {
      csv = await buildSitesCsv(supabase, projectId);
      filename = `${projectName}_sites.csv`;
      break;
    }
    case "species": {
      csv = await buildSpeciesCsv(supabase, projectId);
      filename = `${projectName}_species.csv`;
      break;
    }
    default: {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ---------------------------------------------------------------------------
// CSV builders
// ---------------------------------------------------------------------------

/** Escape a CSV field value, wrapping in quotes if it contains commas, quotes, or newlines. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map(csvField).join(","));
  }
  return lines.join("\n");
}

interface ObservationRow {
  id: string;
  observed_at: string | null;
  is_animal: boolean | null;
  count: number | null;
  temperature: number | null;
  file_name: string | null;
  sites: { site_name: string } | null;
  species: { common_name: string } | null;
}

async function buildObservationsCsv(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string
): Promise<string> {
  const { data } = await supabase
    .from("observations")
    .select("id, observed_at, is_animal, count, temperature, file_name, sites(site_name), species(common_name)")
    .eq("project_id", projectId)
    .order("observed_at", { ascending: true });

  const rows = ((data ?? []) as unknown as ObservationRow[]).map((o) => [
    o.id,
    o.sites?.site_name ?? "",
    o.species?.common_name ?? "",
    o.observed_at ?? "",
    o.is_animal === null ? "" : String(o.is_animal),
    o.count === null ? "" : String(o.count),
    o.temperature === null ? "" : String(o.temperature),
    o.file_name ?? "",
  ]);

  return toCsv(
    ["id", "site_name", "species_name", "observed_at", "is_animal", "count", "temperature", "file_name"],
    rows
  );
}

interface SiteRow {
  site_name: string;
  latitude: number | null;
  longitude: number | null;
  date_deployed: string | null;
  date_end: string | null;
  comments: string | null;
}

async function buildSitesCsv(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string
): Promise<string> {
  const { data } = await supabase
    .from("sites")
    .select("site_name, latitude, longitude, date_deployed, date_end, comments")
    .eq("project_id", projectId)
    .order("site_name");

  const rows = ((data ?? []) as unknown as SiteRow[]).map((s) => [
    s.site_name,
    s.latitude === null ? "" : String(s.latitude),
    s.longitude === null ? "" : String(s.longitude),
    s.date_deployed ?? "",
    s.date_end ?? "",
    s.comments ?? "",
  ]);

  return toCsv(
    ["site_name", "latitude", "longitude", "date_deployed", "date_end", "comments"],
    rows
  );
}

interface SpeciesRow {
  common_name: string;
  scientific_name: string | null;
  species_group: string | null;
  conservation_status: Record<string, string> | null;
}

async function buildSpeciesCsv(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string
): Promise<string> {
  const { data } = await supabase
    .from("species")
    .select("common_name, scientific_name, species_group, conservation_status")
    .eq("project_id", projectId)
    .order("common_name");

  const rows = ((data ?? []) as unknown as SpeciesRow[]).map((s) => [
    s.common_name,
    s.scientific_name ?? "",
    s.species_group ?? "",
    s.conservation_status ? JSON.stringify(s.conservation_status) : "",
  ]);

  return toCsv(
    ["common_name", "scientific_name", "species_group", "conservation_status"],
    rows
  );
}
