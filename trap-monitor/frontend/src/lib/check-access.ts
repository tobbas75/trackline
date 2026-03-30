/**
 * Re-exports from shared @trackline/supabase-config package.
 * Existing call sites and the test suite import from this path — no changes needed there.
 *
 * NOTE: The shared package's checkAppAccess has the SEC-01 NODE_ENV guard (dev bootstrap
 * fallback) which this app's original version lacked. Behavior change is intentional and
 * safe: development mode still fails closed unless portal schema is unreachable AND
 * NODE_ENV is 'development'. In production, behavior is identical — fail closed.
 */
export type { AppId, AppRole, AppAccess } from "@trackline/supabase-config/src/types";
export { checkAppAccess, getUserApps } from "@trackline/supabase-config/src/check-access";
