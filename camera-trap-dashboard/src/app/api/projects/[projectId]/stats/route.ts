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

  const [sitesRes, speciesRes, obsRes, dateRes] = await Promise.all([
    supabase.from("sites").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("species").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("observations").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("observations").select("observed_at").eq("project_id", projectId)
      .order("observed_at", { ascending: true }).limit(1),
  ]);

  const lastDateRes = await supabase.from("observations").select("observed_at").eq("project_id", projectId)
    .order("observed_at", { ascending: false }).limit(1);

  // Calculate trap-nights from sites
  const { data: siteDates } = await supabase.from("sites")
    .select("date_deployed, date_end").eq("project_id", projectId);

  let trapNights = 0;
  if (siteDates) {
    for (const site of siteDates) {
      if (site.date_deployed && site.date_end) {
        const start = new Date(site.date_deployed as string);
        const end = new Date(site.date_end as string);
        trapNights += Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
  }

  return NextResponse.json({
    totalSites: sitesRes.count ?? 0,
    totalSpecies: speciesRes.count ?? 0,
    totalObservations: obsRes.count ?? 0,
    trapNights,
    dateRange: {
      start: (dateRes.data?.[0] as Record<string, unknown>)?.observed_at ?? null,
      end: (lastDateRes.data?.[0] as Record<string, unknown>)?.observed_at ?? null,
    },
  });
}
