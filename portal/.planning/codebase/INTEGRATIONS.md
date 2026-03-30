# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**Supabase (Primary Backend):**
- Project: Shared across all Trackline apps (WildTrack, Fire System, Trap Monitor)
- URL: `https://itgwanlfvnveljbgraoj.supabase.co` (from `.env.local.example`)
- What it's used for:
  - Authentication (signup, login, session management)
  - User profiles and access control
  - App registry and access grants
  - User-app role assignments (viewer, member, admin)
  - Admin management across all Trackline apps
  - RLS policy enforcement per app schema
- SDK: `@supabase/supabase-js` 2.98.0
- SSR Integration: `@supabase/ssr` 0.9.0
- Auth: Anonymous key in browser (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), session cookies managed via middleware

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Via `@supabase/supabase-js` REST/WebSocket API
  - Authentication: Supabase RLS policies and session-based auth
  - Schemas accessed by portal:
    - `portal` - Portal-owned tables and functions (safe to create/modify)
    - `public` - Shared infrastructure (read-only for this project)
  - Portal-owned tables:
    - `portal.apps` - Application registry (id, name, description, url, icon)
    - `portal.app_access` - User-to-app access matrix (user_id, app_id, role, granted_at)
    - `portal.profiles` - User profile data (id, display_name, email, organisation, created_at)
  - Portal-owned functions:
    - `portal.check_app_access(target_app_id)` - Check current user access to specific app (called by all Trackline apps)
    - `portal.handle_new_user()` - Auto-create portal profile on signup
    - `portal.update_updated_at()` - Trigger for updated_at timestamp
  - Portal-owned triggers:
    - `on_auth_user_created` - Fires on `auth.users` insert to auto-provision portal.profiles
  - Shared but NOT owned by portal (read-only):
    - `public.organisations` (owned by WildTrack, also used by Trap Monitor)
    - `public.org_members` (owned by WildTrack, also used by Trap Monitor)
    - `public.organization` (owned by Fire App)
    - `public.user_project` (owned by Fire App)

**File Storage:**
- None detected - portal does not handle file uploads or object storage

**Caching:**
- None detected - no Redis, Memcached, or application-level cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed service)
  - Implementation: Email-based authentication (signup/login via email/password)
  - Session flow:
    1. User signs up/logs in via `src/app/(auth)/signup/page.tsx` or `src/app/(auth)/login/page.tsx`
    2. Auth callback (`src/app/auth/callback/route.ts`) exchanges auth code for session
    3. Middleware (`src/middleware.ts`) refreshes session on every request via cookies
    4. Signed-in users auto-create portal profile via `on_auth_user_created` trigger
  - Signout: `src/app/auth/signout/route.ts` clears session and cookies
  - Role assignment: Granted post-signup by admins via `portal.app_access` table

**Session Management:**
- Supabase SSR pattern via `@supabase/ssr`
- Cookies managed by Next.js middleware
- Server Components access session via `createClient()` from `src/lib/supabase/server.ts`
- Client Components access session via `createClient()` from `src/lib/supabase/client.ts`
- Middleware refresh: Every request triggers `supabase.auth.getUser()` to check/refresh session

## Monitoring & Observability

**Error Tracking:**
- Not detected - no Sentry, Rollbar, or error tracking service

**Logs:**
- Console logging only
  - Examples: `console.error()` in `src/lib/check-access.ts` for failed RPC calls
  - Logged to stdout/stderr in development and Vercel logs in production

**Metrics:**
- None detected - no analytics or metrics collection library

## CI/CD & Deployment

**Hosting:**
- Vercel (implicit from Next.js convention and CLAUDE.md)
- Deployment: Connected to git repository (branch-based auto-deployments)

**CI Pipeline:**
- Not explicitly configured
- Pre-commit hooks: None detected
- Test suite: None detected (no test execution in CI)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, required for browser client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, required for browser client)
- `NEXT_PUBLIC_APP_URL` - Portal application base URL for OAuth callbacks (default: http://localhost:3001)

**Optional env vars:**
- None detected

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- Vercel environment variables - Production secrets stored in Vercel project settings
- Notes: Supabase keys are `NEXT_PUBLIC_*` (intentionally public for browser access)

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/callback?code={...}&next={path}` - OAuth callback from Supabase Auth
  - Handler: `src/app/auth/callback/route.ts`
  - Exchanges code for session and redirects to dashboard or login error
  - Redirect target: `next` query param (default: `/dashboard`)

**Outgoing:**
- None detected
- Portal does not call external APIs or trigger webhooks

## Cross-App Supabase Dependencies

**Critical RPC Calls:**
- `portal.check_app_access(target_app_id)` - Called by WildTrack, Fire System, and Trap Monitor
  - Signature: Returns `{ has_access: boolean, user_role: "viewer" | "member" | "admin" }`
  - Location where called: `src/lib/check-access.ts`
  - Safe to modify: NO - breaking this breaks all three downstream apps

**Shared Auth Trigger:**
- `on_auth_user_created` - Fires when user signs up in ANY Trackline app
  - Calls `portal.handle_new_user()` to auto-create `portal.profiles` row
  - Safe to modify: NO - affects new signups across all Trackline apps
  - Fallback: `src/lib/check-access.ts` detects missing schema and allows access during bootstrap

**Shared Tables Read by Other Apps:**
- `portal.profiles.display_name` - Queried by WildTrack for user mentions
- `portal.profiles.email` - Queried by Trap Monitor for notifications
- `portal.app_access` - Read by all apps for access control
- Safe to modify: NO - don't rename or remove columns

---

*Integration audit: 2026-03-29*
