# Codebase Concerns

**Analysis Date:** 2026-03-29

## Missing Test Coverage

**All application code:**
- What's not tested: Core functionality across login, signup, dashboard, admin panel, and access control
- Files: All files in `src/app/`, `src/lib/`
- Risk: Without tests, refactoring and bug fixes are high-risk operations. Regressions in authentication, access control, and data mutations go undetected
- Priority: High — This is a security-critical application with no test infrastructure

**Recommended approach:** Establish a test framework (Jest or Vitest with React Testing Library) and implement:
- Unit tests for `checkAppAccess()`, `isAdmin()`, and profile queries in `src/lib/check-access.ts`
- Integration tests for auth flows (signup, login, signout, callback)
- Integration tests for admin actions (grant, revoke, role update)
- E2E test for complete user journey (signup → access → dashboard → admin panel)

## Cross-App Database Dependency Risk

**Shared Supabase infrastructure:**
- Issue: This portal manages the `portal` schema which is critical infrastructure for WildTrack, Fire System, and Trap Monitor. Changes to `portal.profiles`, `portal.app_access`, or `portal.apps` tables break all downstream apps
- Files:
  - `src/lib/check-access.ts` (queries portal schema)
  - `src/app/(protected)/dashboard/admin/actions.ts` (mutations portal schema)
  - `src/app/(auth)/signup/page.tsx` (creates profiles)
- Risk: A single bad migration or query bug cascades to three other applications. The portal trigger `on_auth_user_created` fires on every signup across all apps
- Impact:
  - Changing column names in `portal.profiles` breaks WildTrack member lookups
  - Changing `portal.check_app_access()` signature breaks access gating in all three apps
  - Removing columns from `portal.app_access` breaks access control everywhere
- Recommendations:
  1. Never perform schema migrations without testing impact on downstream apps
  2. Never modify RPC function signatures — add overloaded versions if behavior changes
  3. Document all portal schema changes with a cross-app impact checklist (see CLAUDE.md)
  4. Consider adding database integration tests that spin up a test schema and verify downstream app queries still work

## Authorization Gaps in Admin Actions

**Admin action security:**
- Issue: Authorization checks in `src/app/(protected)/dashboard/admin/actions.ts` rely on `isAdmin()` RPC call at action invocation time. If the RPC call fails, access is silently denied but no error is surfaced to the UI
- Files: `src/app/(protected)/dashboard/admin/actions.ts` (lines 16-17, 44-45, 66-67)
- Code pattern:
  ```typescript
  const admin = await isAdmin(supabase);
  if (!admin) return { error: "Unauthorized" };
  ```
- Risk:
  - If `isAdmin()` throws an error or returns falsy unexpectedly (e.g., schema not provisioned), the user gets silently denied. They see a generic error but no actionable feedback
  - Admins lose ability to grant/revoke access temporarily due to an RPC error, with no visibility into root cause
- Recommendations:
  1. Wrap `isAdmin()` calls in explicit error handling that distinguishes between "not an admin" and "check failed"
  2. Log failed authorization checks server-side for audit and debugging
  3. Return more granular error messages to clients (e.g., "Permission denied" vs. "Authorization check failed. Try again later")

## Missing Input Validation on Admin Actions

**Server actions without explicit validation:**
- Issue: Admin action handlers (`grantAccess`, `revokeAccess`, `updateRole`) extract values from FormData without schema validation
- Files: `src/app/(protected)/dashboard/admin/actions.ts`
- Code examples:
  ```typescript
  const userId = formData.get("user_id") as string;  // No length/format check
  const appId = formData.get("app_id") as string;    // No length/format check
  const role = (formData.get("role") as string) || "viewer";  // Allows arbitrary string
  const newRole = formData.get("role") as string;    // Could be any string value
  ```
- Risk:
  - Malformed UUIDs passed as `user_id` or `access_id` may cause Supabase errors that aren't handled gracefully
  - Invalid `appId` values could slip through to database mutations
  - Invalid role strings (e.g., `"superadmin"`, `"sudo"`) could be inserted into the database if RLS doesn't validate
  - If Supabase RLS doesn't validate the role enum strictly, invalid roles persist as data integrity issues
- Recommendations:
  1. Use Zod or similar schema validation for all FormData inputs before mutation
  2. Validate `role` against a strict enum: `["viewer", "member", "admin"]`
  3. Validate UUIDs have correct format before passing to database
  4. Return validation errors with clear feedback to UI
  5. Rely on database RLS policies as a safety net, but don't depend on them alone

## Signup Profile Upsert Timing Issue

**Race condition risk in signup flow:**
- Issue: In `src/app/(auth)/signup/page.tsx`, after `supabase.auth.signUp()` succeeds, the code immediately upserts a profile without checking if the auth server has finished provisioning the user
- Files: `src/app/(auth)/signup/page.tsx` (lines 40-47)
- Code:
  ```typescript
  if (data.user) {
    await supabase.schema("portal").from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      organisation,
    });
  }
  ```
- Risk:
  - If the client-side Supabase instance hasn't synchronized the new auth user before the upsert attempt, the insert may fail silently
  - The `on_auth_user_created` trigger on `auth.users` fires server-side and creates a profile, but the client-side upsert runs in parallel. If both fire simultaneously, it's unclear which wins
  - If the upsert fails with an error (e.g., FK constraint if auth user isn't replicated yet), the user sees success but their profile is missing data
- Recommendations:
  1. Remove the client-side upsert — rely on the `on_auth_user_created` trigger to create the profile server-side
  2. If client-side metadata is needed, use auth user metadata (`signUp` options.data) and let the trigger read it
  3. If client-side upsert is necessary, add explicit error handling and retry logic with a small delay
  4. Test the signup flow end-to-end to verify profiles are created correctly

## Error Logging and Observability Gaps

**Insufficient error context:**
- Issue: Multiple functions log errors to console but don't capture context for debugging
- Files:
  - `src/lib/check-access.ts` (lines 70, 114, 138, 164)
  - `src/app/(protected)/dashboard/admin/actions.ts` (returns error.message without additional context)
- Code examples:
  ```typescript
  if (error) {
    console.error("Failed to fetch user apps:", JSON.stringify(error, null, 2));
    return [];
  }
  ```
- Risk:
  - Production errors logged to browser console are invisible to operations/support
  - No way to track error trends or frequency
  - When a user reports "my apps aren't loading," there's no audit trail to diagnose the issue
  - Cross-app failures (e.g., schema not provisioned) won't be noticed until multiple reports come in
- Recommendations:
  1. Implement server-side error logging to a persistent store (Supabase Logs, Vercel Analytics, or Sentry)
  2. Log errors with structured metadata: function name, user ID, operation type, Supabase error code
  3. Distinguish between expected failures (e.g., "user has no access") and unexpected failures (e.g., "RPC function not found")
  4. Surface actionable error messages to the UI; reserve technical details for server logs

## Fragile Bootstrap Fallback for Access Control

**Production workaround in code:**
- Issue: `checkAppAccess()` in `src/lib/check-access.ts` (lines 28-36) contains a fallback that grants admin access if the portal schema/RPC is missing
- Files: `src/lib/check-access.ts`
- Code:
  ```typescript
  const accessInfraMissing =
    errorMessage.includes("check_app_access") ||
    errorMessage.includes("schema cache") ||
    errorMessage.includes("Invalid schema: portal");

  if (accessInfraMissing) {
    return { hasAccess: true, role: "admin" };  // GRANTS FULL ACCESS
  }
  ```
- Risk:
  - This is a **security bypass**: any error that looks like "schema not found" grants admin access to anyone
  - Error message matching is fragile — a small change to Supabase error text breaks the detection
  - If the portal schema is temporarily unavailable, ALL users become admins
  - Downstream apps (WildTrack, Fire, Trap Monitor) will inherit this broken state if they depend on `checkAppAccess()`
- Recommendations:
  1. Remove the fallback entirely once portal schema is stable in production
  2. If a bootstrap fallback is truly necessary, log it as CRITICAL and alert ops immediately
  3. Use a feature flag or environment variable to control fallback behavior, never hardcode error matching
  4. Test schema provisioning and error cases explicitly before deploying
  5. Add monitoring to alert if the fallback is triggered in production

## Missing Admin UI Audit Trail

**No action logging for admin operations:**
- Issue: When admins grant, revoke, or update user access, there's no audit log
- Files: `src/app/(protected)/dashboard/admin/actions.ts` and `src/app/(protected)/dashboard/admin/admin-panel.tsx`
- Risk:
  - If a user complains their access was revoked, there's no way to determine who did it or when
  - Accidental deletions go unnoticed
  - Compliance requirements (if any) can't be met
  - Malicious admin activity can't be detected
- Recommendations:
  1. Add an audit table to the portal schema (e.g., `portal.audit_log`)
  2. Log every access grant/revoke/role change with: admin user ID, target user ID, app ID, old role, new role, timestamp, action type
  3. Consider RLS on audit logs so admins can see what they changed but not what other admins did (depends on policy)
  4. Add a read-only view in the admin UI to show recent changes

## Admin Panel Performance with Large User Base

**Potential N+1 queries:**
- Issue: `getAllAppAccess()` in `src/lib/check-access.ts` (lines 124-142) performs a single query with a JOIN to `apps`, which is good. However, `getAllProfiles()` fetches all profiles, and the client-side admin panel builds a Map lookup on every render
- Files:
  - `src/lib/check-access.ts` (getAllProfiles, getAllAppAccess)
  - `src/app/(protected)/dashboard/admin/admin-panel.tsx` (lines 54-59)
- Risk:
  - If the portal scales to 1000+ users, fetching all profiles on page load becomes slow
  - The client-side Map rebuild on every render (when data changes) is inefficient
  - Search/filter on the client is O(n) per keystroke
  - No pagination or lazy loading
- Current behavior: Works fine for small user bases (< 100 users), but will degrade
- Recommendations:
  1. Add pagination to profile fetches: `limit(50).range(0, 50)` and increment on "load more"
  2. Add a server-side search endpoint that filters profiles before returning
  3. Memoize the access lookup Map in the admin panel component
  4. Consider a dedicated admin API route for full-text search

## Undefined Environment Variables

**Runtime errors if secrets are missing:**
- Issue: Code assumes environment variables exist and uses `!` assertions
- Files:
  - `src/middleware.ts` (lines 8-9)
  - `src/lib/supabase/server.ts` (lines 8-9)
- Code:
  ```typescript
  process.env.NEXT_PUBLIC_SUPABASE_URL!
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ```
- Risk:
  - If `.env.local` is missing or incomplete, the app crashes at runtime with unclear error
  - CI/CD pipelines may not catch this if environment isn't set up correctly
  - New developers will experience a cryptic "Cannot read property of undefined"
- Recommendations:
  1. Add a startup check that validates all required env vars are present
  2. Use a schema validation library (Zod) to parse and validate env vars at app boot
  3. Provide a clear error message with instructions if vars are missing
  4. Document required environment variables in a `.env.example` file (commit to repo)

## Middleware Performance on Every Request

**Supabase session refresh on every request:**
- Issue: The middleware (`src/middleware.ts`) calls `supabase.auth.getUser()` on every request to refresh the session
- Files: `src/middleware.ts` (lines 29)
- Code:
  ```typescript
  await supabase.auth.getUser();  // Runs on EVERY request
  ```
- Risk:
  - Every HTTP request to the site triggers an RPC call to Supabase to refresh the session
  - On a high-traffic site, this multiplies the load on Supabase auth servers
  - Adds latency to every page load and static asset request (though middleware skips `_next/static` etc.)
  - Session refresh could timeout if Supabase is slow, blocking the request
- Current impact: Low to medium (most requests are to static assets, which are skipped by the middleware matcher)
- Recommendations:
  1. Measure actual performance impact with real traffic
  2. Consider adding conditional refresh: only refresh if the session is nearing expiry
  3. Use a cache to avoid calling `getUser()` multiple times per request
  4. Monitor Supabase rate limits and latency

## Type Safety Issues in Admin Panel

**Unsafe type casts:**
- Issue: `admin-panel.tsx` and `actions.ts` pass string values without validating they match the `AppRole` type
- Files: `src/app/(protected)/dashboard/admin/admin-panel.tsx` and `src/app/(protected)/dashboard/admin/actions.ts`
- Code:
  ```typescript
  const role = (formData.get("role") as string) || "viewer";  // Could be any string
  const newRole = formData.get("role") as string;              // Could be any string
  // Later cast to AppRole:
  role: role as AppRole,  // Unsafe
  ```
- Risk:
  - TypeScript type assertions bypass type checking
  - If an invalid role like `"superadmin"` is passed, it silently becomes type `AppRole` but is incorrect in the database
  - The UI select dropdown controls this in practice, but direct API calls could send garbage
- Recommendations:
  1. Use a validation library (Zod) to parse and validate role values
  2. Define a `Role` type or enum and validate against it before casting
  3. Add a test case that attempts to set an invalid role and verifies it's rejected

---

*Concerns audit: 2026-03-29*
