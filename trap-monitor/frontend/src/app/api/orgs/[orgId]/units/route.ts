import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/orgs/[orgId]/units - List all units in organization
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const supabase = await createClient();
  const { orgId } = await context.params;

  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(units);
}

// POST /api/orgs/[orgId]/units - Create new unit
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const supabase = await createClient();
  const { orgId } = await context.params;
  const body = await req.json();

  const { id, name, phone_id, last_lat, last_lng, device_type, model, cam_firmware_version } = body;

  if (!id || !name) {
    return NextResponse.json(
      { error: "id and name are required" },
      { status: 400 }
    );
  }

  const { data: unit, error } = await supabase
    .from("units")
    .insert({
      id,
      name,
      phone_id,
      last_lat,
      last_lng,
      org_id: orgId,
      device_type: device_type || 'trap_monitor',
      armed: device_type === 'camera_trap' ? undefined : true,
      model,
      cam_firmware_version,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(unit, { status: 201 });
}
