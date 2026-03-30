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
 *   const { hasAccess, role } = await checkAppAccess(supabase, 'wildtrack');
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

  // SEC-01: Bootstrap fallback gated by NODE_ENV. In production, fail closed.
  if (accessInfraMissing) {
    if (process.env.NODE_ENV !== 'production') {
      // Development only: bootstrap while portal schema is being provisioned.
      // This branch MUST NOT execute in production. Verified: Next.js sets
      // NODE_ENV=production for `next build` and `next start`.
      // Safe context: called from Server Components only — not Edge Runtime.
      return { hasAccess: true, role: "admin" };
    }
    // Production: fail closed. Portal must be reachable.
    console.warn(JSON.stringify({
      level: 'warn',
      msg: 'portal_access_check_unavailable',
      app_id: appId,
      error: errorMessage,
      ts: new Date().toISOString(),
    }));
    return { hasAccess: false, role: null };
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
        icon,
        status
      )
    `) as { data: UserAppRow[] | null; error: unknown };

  if (error) {
    console.error("Failed to fetch user apps:", JSON.stringify(error, null, 2));
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
    status: string;
  };
}

/**
 * Check if the current user holds an admin role on any app.
 */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .schema("portal")
    .from("app_access")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Admin-only: fetch all portal profiles.
 */
export async function getAllProfiles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema("portal")
    .from("profiles")
    .select("id, display_name, email, organisation, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Admin-only: fetch all app_access rows with app info.
 */
export async function getAllAppAccess(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema("portal")
    .from("app_access")
    .select(`
      id,
      user_id,
      app_id,
      role,
      granted_at,
      apps ( id, name )
    `) as { data: AllAccessRow[] | null; error: unknown };

  if (error) {
    console.error("Failed to fetch all app access:", error);
    return [];
  }
  return data ?? [];
}

interface AllAccessRow {
  id: string;
  user_id: string;
  app_id: string;
  role: AppRole;
  granted_at: string;
  apps: { id: string; name: string };
}

/**
 * Admin-only: fetch the app registry.
 */
export async function getAllApps(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .schema("portal")
    .from("apps")
    .select("id, name, description, icon")
    .order("name");

  if (error) {
    console.error("Failed to fetch apps:", error);
    return [];
  }
  return data ?? [];
}
