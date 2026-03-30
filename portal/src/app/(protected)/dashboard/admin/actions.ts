"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/check-access";
import { revalidatePath } from "next/cache";
import type { AppId, AppRole } from "@/lib/check-access";

export async function grantAccess(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const appId = formData.get("app_id") as string;
  const role = (formData.get("role") as string) || "viewer";

  if (!userId || !appId) return { error: "Missing user_id or app_id" };

  const supabase = await createClient();
  const admin = await isAdmin(supabase);
  if (!admin) return { error: "Unauthorized" };

  const { error } = await supabase
    .schema("portal")
    .from("app_access")
    .upsert(
      {
        user_id: userId,
        app_id: appId as AppId,
        role: role as AppRole,
        granted_by: (await supabase.auth.getUser()).data.user?.id,
      },
      { onConflict: "user_id,app_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function revokeAccess(formData: FormData) {
  const accessId = formData.get("access_id") as string;

  if (!accessId) return { error: "Missing access_id" };

  const supabase = await createClient();
  const admin = await isAdmin(supabase);
  if (!admin) return { error: "Unauthorized" };

  const { error } = await supabase
    .schema("portal")
    .from("app_access")
    .delete()
    .eq("id", accessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateRole(formData: FormData) {
  const accessId = formData.get("access_id") as string;
  const role = formData.get("role") as string;

  if (!accessId || !role) return { error: "Missing access_id or role" };

  const supabase = await createClient();
  const admin = await isAdmin(supabase);
  if (!admin) return { error: "Unauthorized" };

  const { error } = await supabase
    .schema("portal")
    .from("app_access")
    .update({ role })
    .eq("id", accessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}
