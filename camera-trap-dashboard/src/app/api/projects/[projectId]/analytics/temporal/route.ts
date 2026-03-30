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
    .not("observed_at", "is", null)
    .order("observed_at", { ascending: true });

  if (!data) return NextResponse.json([]);

  const monthly = new Map<string, number>();
  for (const obs of data as unknown as Array<{ observed_at: string }>) {
    const date = new Date(obs.observed_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, (monthly.get(key) ?? 0) + 1);
  }

  const result = Array.from(monthly.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json(result);
}
