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

  const { data } = await supabase
    .from("observations")
    .select("site_id, species_id, sites(site_name)")
    .eq("project_id", projectId)
    .eq("is_animal", true)
    .not("species_id", "is", null)
    .not("site_id", "is", null);

  if (!data) return NextResponse.json([]);

  const siteSpecies = new Map<string, { name: string; speciesSet: Set<string> }>();
  for (const obs of data as unknown as Array<{ site_id: string; species_id: string; sites: { site_name: string } | null }>) {
    const siteName = obs.sites?.site_name ?? "Unknown";
    const existing = siteSpecies.get(obs.site_id);
    if (existing) {
      existing.speciesSet.add(obs.species_id);
    } else {
      siteSpecies.set(obs.site_id, { name: siteName, speciesSet: new Set([obs.species_id]) });
    }
  }

  const result = Array.from(siteSpecies.values())
    .map(s => ({ site: s.name, richness: s.speciesSet.size }))
    .sort((a, b) => b.richness - a.richness)
    .slice(0, 30);

  return NextResponse.json(result);
}
