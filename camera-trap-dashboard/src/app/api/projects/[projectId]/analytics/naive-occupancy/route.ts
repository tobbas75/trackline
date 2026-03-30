import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Get total site count for the project
  const { count: totalSites } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (!totalSites) return NextResponse.json([]);

  // Get observations with species data
  const { data } = await supabase
    .from("observations")
    .select("species_id, site_id, species:species_id(common_name)")
    .eq("project_id", projectId)
    .eq("is_animal", true)
    .not("species_id", "is", null);

  if (!data) return NextResponse.json([]);

  // Group by species_id and collect distinct site_ids
  const speciesMap = new Map<
    string,
    { name: string; sites: Set<string> }
  >();

  for (const obs of data as unknown as Array<{
    species_id: string;
    site_id: string;
    species: { common_name: string } | null;
  }>) {
    if (!speciesMap.has(obs.species_id)) {
      speciesMap.set(obs.species_id, {
        name: obs.species?.common_name ?? "Unknown",
        sites: new Set(),
      });
    }
    speciesMap.get(obs.species_id)!.sites.add(obs.site_id);
  }

  const result = Array.from(speciesMap.values())
    .map(({ name, sites }) => ({
      species: name,
      sitesDetected: sites.size,
      totalSites,
      occupancy: Math.round((sites.size / totalSites) * 1000) / 1000,
    }))
    .sort((a, b) => b.occupancy - a.occupancy);

  return NextResponse.json(result);
}
