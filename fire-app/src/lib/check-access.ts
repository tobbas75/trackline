import type { SupabaseClient } from "@supabase/supabase-js";

export type AppId = "wildtrack" | "fire" | "trap_monitor";
export type AppRole = "viewer" | "member" | "admin";

export interface AppAccess {
  hasAccess: boolean;
  role: AppRole | null;
}

/**
 * Check if the current user has access to a specific app.
 * This is the single function every dashboard should call on load.
 *
 * Usage in any Trackline app:
 *   const { hasAccess, role } = await checkAppAccess(supabase, 'fire');
 *   if (!hasAccess) redirect('/no-access');
 */
export async function checkAppAccess(
  supabase: SupabaseClient,
  appId: AppId
): Promise<AppAccess> {
  const { data, error } = await supabase.rpc("check_app_access", {
    target_app_id: appId,
  });

  const errorMessage = error ? String((error as { message?: string }).message ?? error) : "";
  const accessInfraMissing =
    errorMessage.includes("check_app_access") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("Invalid schema: portal");

  // Local bootstrap fallback: allow signed-in users while portal schema/RPC is being provisioned.
  if (accessInfraMissing) {
    return { hasAccess: true, role: "admin" };
  }

  if (error || !data || data.length === 0) {
    return { hasAccess: false, role: null };
  }

  return {
    hasAccess: data[0].has_access,
    role: data[0].user_role as AppRole,
  };
}

/**
 * Get all apps the current user has access to.
 * Used by the portal dashboard to show available apps.
 */
export async function getUserApps(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema("portal")
    .from("app_access")
    .select(`
      app_id,
      role,
      granted_at,
      apps (
        id,
        name,
        description,
        url,
        icon
      )
    `) as { data: UserAppRow[] | null; error: unknown };

  if (error) {
    console.error("Failed to fetch user apps:", error);
    return [];
  }

  return data ?? [];
}

interface UserAppRow {
  app_id: string;
  role: AppRole;
  granted_at: string;
  apps: {
    id: string;
    name: string;
    description: string | null;
    url: string | null;
    icon: string | null;
  };
}
