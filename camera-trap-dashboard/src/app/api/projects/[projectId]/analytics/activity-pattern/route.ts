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
    .select("observed_at")
    .eq("project_id", projectId)
    .eq("is_animal", true)
    .not("observed_at", "is", null)
    .order("observed_at", { ascending: true });

  if (!data) return NextResponse.json([]);

  const hourly = new Map<number, number>();
  for (let h = 0; h < 24; h++) {
    hourly.set(h, 0);
  }

  for (const obs of data as unknown as Array<{ observed_at: string }>) {
    const date = new Date(obs.observed_at);
    const hour = date.getUTCHours();
    hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
  }

  const result = Array.from(hourly.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  return NextResponse.json(result);
}
