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

  // Get observation counts per species
  const { data: observations } = await supabase
    .from("observations")
    .select("species_id, species(common_name)")
    .eq("project_id", projectId)
    .eq("is_animal", true)
    .not("species_id", "is", null);

  if (!observations) return NextResponse.json([]);

  const counts = new Map<string, { name: string; count: number }>();
  for (const obs of observations as unknown as Array<{ species_id: string; species: { common_name: string } | null }>) {
    const name = obs.species?.common_name ?? "Unknown";
    const existing = counts.get(name);
    if (existing) {
      existing.count++;
    } else {
      counts.set(name, { name, count: 1 });
    }
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  return NextResponse.json(sorted);
}
