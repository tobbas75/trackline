import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get project to find org_id
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check if user is org admin
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .single();

  const role = (orgMember as { role: string } | null)?.role;

  if (role !== "admin" && role !== "owner") {
    return NextResponse.json(
      { error: "Only org admins can delete projects" },
      { status: 403 }
    );
  }

  // Delete the project (cascades will handle sites, observations, etc.)
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, message: "Project deleted successfully" },
    { status: 200 }
  );
}
