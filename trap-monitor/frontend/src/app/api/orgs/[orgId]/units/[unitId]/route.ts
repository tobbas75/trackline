import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/orgs/[orgId]/units/[unitId] - Get single unit
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orgId: string; unitId: string }> }
) {
  const supabase = await createClient();
  const { orgId, unitId } = await context.params;

  const { data: unit, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", unitId)
    .eq("org_id", orgId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(unit);
}

// PUT /api/orgs/[orgId]/units/[unitId] - Update unit
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ orgId: string; unitId: string }> }
) {
  const supabase = await createClient();
  const { orgId, unitId } = await context.params;
  const body = await req.json();

  const { name, phone_id, last_lat, last_lng, armed, model, cam_firmware_version } = body;

  const { data: unit, error } = await supabase
    .from("units")
    .update({
      name,
      phone_id,
      last_lat,
      last_lng,
      armed,
      model,
      cam_firmware_version,
    })
    .eq("id", unitId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(unit);
}

// DELETE /api/orgs/[orgId]/units/[unitId] - Delete unit
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ orgId: string; unitId: string }> }
) {
  const supabase = await createClient();
  const { orgId, unitId } = await context.params;

  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
