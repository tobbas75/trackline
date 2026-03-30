import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DetectionHistory, DetectionHistoryRow } from "@/lib/supabase/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; historyId: string }> }
) {
  const { projectId, historyId } = await params;

  if (!z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  if (!z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).safeParse(historyId).success) {
    return NextResponse.json({ error: "Invalid history ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Fetch the detection history record
  const { data: historyRaw, error: historyError } = await supabase
    .from("detection_histories")
    .select("*")
    .eq("id", historyId)
    .eq("project_id", projectId)
    .single();

  if (historyError || !historyRaw) {
    return NextResponse.json(
      { error: "Detection history not found" },
      { status: 404 }
    );
  }

  const history = historyRaw as unknown as DetectionHistory;

  // Fetch all rows for this detection history
  const { data: rowsRaw, error: rowsError } = await supabase
    .from("detection_history_rows")
    .select("*")
    .eq("detection_history_id", historyId)
    .order("site_name", { ascending: true });

  if (rowsError) {
    return NextResponse.json(
      { error: rowsError.message },
      { status: 500 }
    );
  }

  const rows = (rowsRaw as unknown as DetectionHistoryRow[]) ?? [];

  // Build CSV content
  const occasionHeaders: string[] = [];
  const start = new Date(history.occasion_start);

  for (let i = 0; i < history.num_occasions; i++) {
    const occStart = new Date(
      start.getTime() + i * history.occasion_length_days * 24 * 60 * 60 * 1000
    );
    const occEnd = new Date(
      occStart.getTime() + (history.occasion_length_days - 1) * 24 * 60 * 60 * 1000
    );

    const fmtStart = formatShortDate(occStart);
    const fmtEnd = formatShortDate(occEnd);
    occasionHeaders.push(`Occ${i + 1} (${fmtStart}-${fmtEnd})`);
  }

  const headerRow = ["Site", ...occasionHeaders].join(",");

  const dataRows = rows.map((row) => {
    // Escape site name in case it contains commas
    const siteName = row.site_name.includes(",")
      ? `"${row.site_name}"`
      : row.site_name;

    const detections = row.detections.join(",");
    return `${siteName},${detections}`;
  });

  const csv = [headerRow, ...dataRows].join("\n");

  // Build a safe filename
  const safeName = history.species_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `detection_history_${safeName}_${history.occasion_start}_${history.occasion_end}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Format a date as "Jan 1" short form for CSV headers */
function formatShortDate(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
