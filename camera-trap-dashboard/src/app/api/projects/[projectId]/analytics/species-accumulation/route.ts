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
    .select("observed_at, species_id")
    .eq("project_id", projectId)
    .not("species_id", "is", null)
    .not("observed_at", "is", null)
    .order("observed_at", { ascending: true });

  if (!data) return NextResponse.json([]);

  const seenSpecies = new Set<string>();
  const firstSeenOnDate = new Map<string, number>();

  for (const obs of data as unknown as Array<{
    observed_at: string;
    species_id: string;
  }>) {
    if (seenSpecies.has(obs.species_id)) continue;

    seenSpecies.add(obs.species_id);
    const date = new Date(obs.observed_at);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    // Track how many cumulative species we have by the end of this date
    firstSeenOnDate.set(dateKey, seenSpecies.size);
  }

  const result = Array.from(firstSeenOnDate.entries())
    .map(([date, cumulativeSpecies]) => ({ date, cumulativeSpecies }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(result);
}
