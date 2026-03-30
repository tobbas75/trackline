import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 10 });

/** Zod schema for the detection history generation request body */
const generateBodySchema = z.object({
  speciesId: z.string().uuid("speciesId must be a valid UUID"),
  speciesName: z.string().min(1, "speciesName is required"),
  startDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format for startDate",
  }),
  endDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format for endDate",
  }),
  occasionLengthDays: z.number().int().min(1, "occasionLengthDays must be at least 1"),
});

type GenerateBody = z.infer<typeof generateBodySchema>;

interface SiteRow {
  id: string;
  site_name: string;
}

interface ObservationRow {
  id: string;
  site_id: string | null;
  observed_at: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { projectId } = await params;

  if (!z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = generateBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message ?? "Invalid request body";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { speciesId, speciesName, startDate, endDate, occasionLengthDays } =
    parseResult.data;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return NextResponse.json(
      { error: "endDate must be after startDate" },
      { status: 400 }
    );
  }

  // Calculate occasions
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const numOccasions = Math.ceil(totalDays / occasionLengthDays);

  if (numOccasions < 1) {
    return NextResponse.json(
      { error: "Date range too short for the given occasion length" },
      { status: 400 }
    );
  }

  // Fetch all sites for the project
  const { data: sitesRaw, error: sitesError } = await supabase
    .from("sites")
    .select("id, site_name")
    .eq("project_id", projectId)
    .order("site_name", { ascending: true });

  if (sitesError) {
    return NextResponse.json(
      { error: sitesError.message },
      { status: 500 }
    );
  }

  const sites = (sitesRaw as unknown as SiteRow[]) ?? [];

  if (sites.length === 0) {
    return NextResponse.json(
      { error: "No sites found for this project" },
      { status: 400 }
    );
  }

  // Fetch all observations for the species in the date range
  const { data: obsRaw, error: obsError } = await supabase
    .from("observations")
    .select("id, site_id, observed_at")
    .eq("project_id", projectId)
    .eq("species_id", speciesId)
    .gte("observed_at", startDate)
    .lte("observed_at", endDate);

  if (obsError) {
    return NextResponse.json(
      { error: obsError.message },
      { status: 500 }
    );
  }

  const observations = (obsRaw as unknown as ObservationRow[]) ?? [];

  // Index observations by site_id and occasion
  // Build a set of "siteId:occasionIndex" for quick lookup
  const detectionSet = new Set<string>();

  for (const obs of observations) {
    if (!obs.site_id || !obs.observed_at) continue;

    const obsDate = new Date(obs.observed_at);
    const daysSinceStart = Math.floor(
      (obsDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const occasionIndex = Math.floor(daysSinceStart / occasionLengthDays);

    if (occasionIndex >= 0 && occasionIndex < numOccasions) {
      detectionSet.add(`${obs.site_id}:${occasionIndex}`);
    }
  }

  // Build detection rows for each site
  const detectionRows = sites.map((site) => {
    const detections: number[] = [];
    for (let i = 0; i < numOccasions; i++) {
      detections.push(detectionSet.has(`${site.id}:${i}`) ? 1 : 0);
    }
    return {
      site_id: site.id,
      site_name: site.site_name,
      detections,
    };
  });

  // Create the detection_history record
  const { data: historyRaw, error: historyError } = await supabase
    .from("detection_histories")
    .insert({
      project_id: projectId,
      species_id: speciesId,
      species_name: speciesName,
      occasion_start: startDate,
      occasion_end: endDate,
      occasion_length_days: occasionLengthDays,
      num_occasions: numOccasions,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message },
      { status: 500 }
    );
  }

  const history = historyRaw as unknown as { id: string };

  // Insert all detection_history_rows in batch
  const rowPayloads = detectionRows.map((row) => ({
    detection_history_id: history.id,
    site_id: row.site_id,
    site_name: row.site_name,
    detections: row.detections,
  }));

  const { error: rowsError } = await supabase
    .from("detection_history_rows")
    .insert(rowPayloads);

  if (rowsError) {
    // Clean up the parent record if rows fail
    await supabase
      .from("detection_histories")
      .delete()
      .eq("id", history.id);

    return NextResponse.json(
      { error: rowsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: history.id }, { status: 201 });
}
