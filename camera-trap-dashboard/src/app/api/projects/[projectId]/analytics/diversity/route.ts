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

  // Get observations with site names
  const { data } = await supabase
    .from("observations")
    .select("site_id, species_id, sites:site_id(site_name)")
    .eq("project_id", projectId)
    .eq("is_animal", true)
    .not("species_id", "is", null);

  if (!data) return NextResponse.json([]);

  // Group observations by site, then by species within each site
  const siteMap = new Map<
    string,
    { name: string; speciesCounts: Map<string, number> }
  >();

  for (const obs of data as unknown as Array<{
    site_id: string;
    species_id: string;
    sites: { site_name: string } | null;
  }>) {
    if (!siteMap.has(obs.site_id)) {
      siteMap.set(obs.site_id, {
        name: obs.sites?.site_name ?? "Unknown",
        speciesCounts: new Map(),
      });
    }
    const site = siteMap.get(obs.site_id)!;
    site.speciesCounts.set(
      obs.species_id,
      (site.speciesCounts.get(obs.species_id) ?? 0) + 1
    );
  }

  const result = Array.from(siteMap.entries())
    .map(([, { name, speciesCounts }]) => {
      const totalObservations = Array.from(speciesCounts.values()).reduce(
        (sum, c) => sum + c,
        0
      );
      const speciesCount = speciesCounts.size;

      // Shannon-Wiener diversity index: H' = -SUM(pi * ln(pi))
      let shannon = 0;
      // Simpson's diversity index: 1 - D where D = SUM(pi^2)
      let simpsonD = 0;

      for (const count of speciesCounts.values()) {
        const pi = count / totalObservations;
        if (pi > 0) {
          shannon -= pi * Math.log(pi);
          simpsonD += pi * pi;
        }
      }

      const simpson = 1 - simpsonD;

      return {
        site: name,
        speciesCount,
        totalObservations,
        shannon: Math.round(shannon * 1000) / 1000,
        simpson: Math.round(simpson * 1000) / 1000,
      };
    })
    .sort((a, b) => b.shannon - a.shannon);

  return NextResponse.json(result);
}
