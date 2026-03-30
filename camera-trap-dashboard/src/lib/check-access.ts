/**
 * Re-exports from shared @trackline/supabase-config package.
 * Local call sites (import { checkAppAccess } from "@/lib/check-access") continue to work
 * without modification.
 */
export type { AppId, AppRole, AppAccess } from "@trackline/supabase-config";
export { checkAppAccess, getUserApps } from "@trackline/supabase-config";
