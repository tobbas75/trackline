import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single();

    if (error && error.code === "PGRST116") {
      // Not found - return defaults
      return NextResponse.json({
        user_id: user.id,
        org_id: orgId,
        trap_catch: true,
        unit_offline: true,
        low_battery: true,
        email_enabled: false,
        email_address: null,
      });
    }

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      orgId,
      trap_catch,
      unit_offline,
      low_battery,
      email_enabled,
      email_address,
    } = body;

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // Try to update, if not found, insert
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        org_id: orgId,
        trap_catch: trap_catch ?? true,
        unit_offline: unit_offline ?? true,
        low_battery: low_battery ?? true,
        email_enabled: email_enabled ?? false,
        email_address: email_address ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
