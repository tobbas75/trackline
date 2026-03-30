# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Server-Driven Next.js App Router with Shared Auth and Per-App Access Control

**Key Characteristics:**
- Server Components by default with minimal Client Components
- Middleware-based session refresh and auth state synchronization
- Shared Supabase authentication across three conservation apps (WildTrack, Fire System, Trap Monitor)
- Portal-managed access control layer via `portal.app_access` table
- Server Actions for admin operations on protected routes
- Tailwind v4 with CSS-based design tokens (no config file)

## Layers

**Route Layer (Presentation):**
- Purpose: Handle HTTP requests and render pages
- Location: `src/app/`
- Contains: Layout components, page components, route handlers
- Depends on: Supabase client/server, utility functions
- Used by: User browsers

**Middleware Layer:**
- Purpose: Intercept all requests, refresh auth session, manage cookies
- Location: `src/middleware.ts`
- Contains: Session refresh logic, cookie management
- Depends on: `@supabase/ssr`, Next.js request/response objects
- Used by: All routes

**Access Control Layer:**
- Purpose: Authorize app access via RPC and database queries
- Location: `src/lib/check-access.ts`
- Contains: `checkAppAccess()`, `getUserApps()`, `isAdmin()`, `getAllProfiles()`, `getAllAppAccess()`, `getAllApps()`
- Depends on: Supabase client, RPC `portal.check_app_access()`
- Used by: Dashboard, admin panel, protected layouts

**Data Layer:**
- Purpose: Encapsulate Supabase client initialization
- Location: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Contains: Server-side and browser client factory functions
- Depends on: `@supabase/ssr`
- Used by: All components needing Supabase access

**UI Component Layer:**
- Purpose: Reusable, stateless presentational pieces
- Location: `src/components/`
- Contains: Header, Hero, Projects, About, Approach, Contact, Footer
- Depends on: Tailwind CSS, lucide-react icons, Next.js Link
- Used by: Page components, layouts

**Server Action Layer:**
- Purpose: Isolated server-side mutations with authorization
- Location: `src/app/(protected)/dashboard/admin/actions.ts`
- Contains: `grantAccess()`, `revokeAccess()`, `updateRole()`
- Depends on: Supabase server client, `isAdmin()` check, revalidation
- Used by: Admin panel client component

## Data Flow

**Public Landing Page:**
1. User accesses `/`
2. `src/app/page.tsx` renders static composition of components
3. Header provides nav links to `/login`, `/dashboard` (unauthenticated)
4. Components fetch no data (fully static)

**Authentication Flow (Sign In):**
1. User navigates to `/login`
2. `src/app/(auth)/login/page.tsx` renders login form (Client Component)
3. User enters email/password, form calls `supabase.auth.signInWithPassword()`
4. Supabase redirects to `/auth/callback?code=...`
5. `src/app/auth/callback/route.ts` exchanges code for session via `exchangeCodeForSession()`
6. Sets auth cookies and redirects to `/dashboard`

**Dashboard Access (Protected):**
1. User navigates to `/dashboard`
2. `src/app/(protected)/layout.tsx` (Server Component) runs auth check:
   - Calls `supabase.auth.getUser()`
   - If no user, redirects to `/login`
3. `src/app/(protected)/dashboard/page.tsx` (Server Component) loads user's apps:
   - Calls `getUserApps(supabase)` → queries `portal.app_access` with app details via foreign key
   - Calls `isAdmin(supabase)` → checks if user has any "admin" role
   - Renders app grid with access badges
4. Unauthenticated user is blocked before any data is fetched

**Admin Panel Access:**
1. User clicks "Manage users" link (shown only if `isAdmin() === true`)
2. Navigates to `/dashboard/admin`
3. `src/app/(protected)/dashboard/admin/page.tsx` runs two checks:
   - Protected layout check (auth required)
   - Admin check via `isAdmin(supabase)`, redirects to `/dashboard` if not admin
4. Fetches three datasets in parallel:
   - `getAllProfiles()` → all portal.profiles rows
   - `getAllAppAccess()` → all portal.app_access rows with app details
   - `getAllApps()` → all portal.apps rows
5. Passes data to `AdminPanel` Client Component
6. User can search, expand users, grant/revoke access

**Admin Action Flow (Grant Access):**
1. User clicks "UserPlus" button in AdminPanel to grant app access
2. `AdminPanel` (Client Component) calls `handleGrant(userId, appId, role)`
3. Forms FormData and calls `grantAccess(formData)` Server Action
4. `grantAccess()` verifies admin via `isAdmin()`, then:
   - Calls `supabase.schema("portal").from("app_access").upsert(...)`
   - Calls `revalidatePath("/dashboard/admin")` to refresh data
   - Returns `{ success: true }` or `{ error: message }`
5. AdminPanel shows toast feedback

**State Management:**
- Auth state: Managed by Supabase, stored in cookies, refreshed on every request via middleware
- User's accessible apps: Fetched server-side on `/dashboard` load, never stored in browser
- Admin interface state: Local React state in AdminPanel (search, expanded users, pending action)
- Data consistency: Revalidation on mutation ensures fresh data on next page load

## Key Abstractions

**Access Control Model:**
- Purpose: Express per-user, per-app role grants
- Examples: `src/lib/check-access.ts` (`AppAccess` type), `portal.app_access` table
- Pattern: Users have explicit rows in `app_access` for each app they can access. Absence = no access.

**Role Hierarchy:**
- Purpose: Distinguish authorization levels within each app
- Values: `"viewer"` (read-only), `"member"` (full access), `"admin"` (can manage users)
- Scope: Per-app (a user is "admin" only on specific apps, not globally)
- Enforcement: RLS policies on `portal.app_access` require `role = 'admin'` to modify

**Portal Schema:**
- Purpose: Single source of truth for user identity, app registry, and access grants across all Trackline apps
- Tables: `portal.apps`, `portal.app_access`, `portal.profiles`
- Isolation: RLS ensures users see only their own data; admins see all access grants

**Trigger-Based Profile Creation:**
- Purpose: Auto-create `portal.profiles` row when user signs up via Supabase Auth
- Trigger: `on_auth_user_created` fires on `auth.users` insert
- Function: `portal.handle_new_user()` extracts display_name and email from user metadata

## Entry Points

**Page: Landing Site**
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Render public landing with all sections, no data fetching

**Page: Login**
- Location: `src/app/(auth)/login/page.tsx`
- Triggers: Unauthenticated user visits `/login` or is redirected there
- Responsibilities: Render dark-themed login form, handle password auth, redirect to callback

**Route Handler: Auth Callback**
- Location: `src/app/auth/callback/route.ts`
- Triggers: OAuth/email-link callbacks from Supabase with `?code=...`
- Responsibilities: Exchange auth code for session, set cookies, redirect to `/dashboard`

**Page: Dashboard**
- Location: `src/app/(protected)/dashboard/page.tsx`
- Triggers: Authenticated user visits `/dashboard`
- Responsibilities: Fetch user's apps from `portal.app_access`, render app grid

**Page: Admin Panel**
- Location: `src/app/(protected)/dashboard/admin/page.tsx`
- Triggers: Admin user visits `/dashboard/admin`
- Responsibilities: Fetch all profiles, access rows, and apps; pass to AdminPanel component

**Route Handler: Sign Out**
- Location: `src/app/auth/signout/route.ts`
- Triggers: User submits form with `action="/auth/signout"` method="post"`
- Responsibilities: Call `supabase.auth.signOut()`, redirect to `/login`

## Error Handling

**Strategy:** Bootstrap gracefully, fail safely, show user-friendly messages

**Patterns:**

1. **Auth Fallback (Local Development):**
   - `src/lib/check-access.ts` detects when `portal.check_app_access()` RPC is not yet available
   - Returns `{ hasAccess: true, role: "admin" }` to allow app usage during schema provisioning
   - Once Supabase migrations run, real access control takes over

2. **Missing Data:**
   - If queries return null/empty, functions return empty arrays (e.g., `getUserApps()` returns `[]`)
   - Dashboard shows "You don't have access to any applications yet" message
   - No exceptions thrown; graceful degradation

3. **Admin Check Before Mutation:**
   - All Server Actions (`grantAccess`, `revokeAccess`, `updateRole`) verify `isAdmin()` before operating
   - Returns `{ error: "Unauthorized" }` if not admin
   - Prevents escalation

4. **Login Errors:**
   - `signInWithPassword()` error displays as toast in login form
   - No stack traces exposed to user
   - User can retry

5. **Protected Route Redirects:**
   - `src/app/(protected)/layout.tsx` redirects unauthenticated users to `/login`
   - `src/app/(protected)/dashboard/admin/page.tsx` redirects non-admins to `/dashboard`
   - Prevents 403 pages; user sees login or app grid instead

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.error()` for query failures (e.g., `getAllProfiles()`)
- Logs not collected; suitable for development and debugging in production logs
- Admin actions are not explicitly logged; audit trail could be added via Supabase triggers

**Validation:**
- Approach: Minimal client-side (form inputs are `required`), server-side via RLS
- FormData validation in Server Actions (e.g., `if (!userId || !appId) return { error: ... }`)
- Supabase RLS policies enforce data isolation; users cannot bypass via SQL

**Authentication:**
- Approach: Supabase Auth (email/password)
- Session stored in `auth-token` and `auth-refresh-token` cookies
- Middleware refreshes session on every request
- No client-side token storage beyond cookies (secure, httpOnly)

**Authorization:**
- Approach: Two-tier
  1. **Route-level:** Protected layouts check `supabase.auth.getUser()`, redirect if missing
  2. **Access-level:** `getUserApps()` queries `portal.app_access`, only shows apps user has explicit rows for
  3. **Admin-level:** `isAdmin()` checks for role="admin" on any row, gates admin UI and Server Actions

**Error Messages:**
- Approach: User-facing messages are generic ("Sign in failed", "Access denied")
- Technical details logged to console for debugging
- Production errors are not exposed to prevent information leakage

---

*Architecture analysis: 2026-03-29*
