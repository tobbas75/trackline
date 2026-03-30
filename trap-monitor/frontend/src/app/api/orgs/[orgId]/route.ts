import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE /api/orgs/:orgId - Delete organization (owner only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const supabase = await createClient();
  const { orgId } = await params;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is owner of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only organization owners can delete organizations" },
      { status: 403 },
    );
  }

  // Delete org (CASCADE will handle units, events, commands, notifications, org_members)
  const { error } = await supabase
    .from("organisations")
    .delete()
    .eq("id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
