# WT MASTER REPORT — Security & Integrity Audit

**Application**: WildTrack — Ecological Monitoring Dashboard
**Audit Date**: 2026-03-03
**Phase Tested**: Phase 1 (Foundation + Orgs)
**Environment**: Local Supabase (Docker) + Next.js dev server
**Auditor**: Claude Opus 4.6

---

## Executive Summary

Phase 1 of WildTrack has a **solid RLS foundation** — all 14 automated cross-org isolation tests passed. However, the audit uncovered **2 critical bugs**, **2 high-severity vulnerabilities**, and several medium issues that must be addressed before production deployment.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Must fix before any deployment |
| HIGH | 2 | Must fix before production |
| MEDIUM | 4 | Should fix before production |
| LOW | 3 | Recommended improvements |
| INFO | 2 | Notes for future phases |

---

## CRITICAL Findings

### C-1: Private Org Creation Fails (RLS SELECT + INSERT Conflict)

**Severity**: CRITICAL
**Agent**: WT2 (Intern Felix) — first-time user creating their first private org
**File**: [src/app/(auth)/org/new/page.tsx:96-108](src/app/(auth)/org/new/page.tsx#L96-L108)

**Description**: Creating an organisation with `is_public: false` will always fail. The Supabase JS client uses `.insert({...}).select().single()` which translates to `INSERT ... RETURNING *`. The `RETURNING` clause triggers the SELECT RLS policy, which requires `is_public = TRUE OR is_org_member(id, auth.uid())`. For a brand-new org, neither condition is true — the user isn't a member yet (that happens on line 121, after the insert).

**Impact**: No user can create a private organisation. The default `is_public` value is `false`, so this affects the default flow. Only public orgs work.

**Reproduction**:
```bash
# Authenticated user tries to create private org via REST API:
curl -X POST http://127.0.0.1:54321/rest/v1/organisations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"Test","slug":"test","type":"other","is_public":false}'
# Returns: 42501 "new row violates row-level security policy"

# Same request with is_public:true succeeds
```

**Fix options**:
1. **Recommended**: Use a Postgres function (SECURITY DEFINER) that atomically creates the org AND adds the creator as owner in a single transaction, bypassing the SELECT policy timing issue.
2. **Quick fix**: Remove `.select()` from the insert call, then separately query the org by slug. But this introduces a race condition.
3. **Alternative**: Add a permissive SELECT policy: `auth.uid() IS NOT NULL AND created_at > now() - interval '5 seconds'` (fragile, not recommended).

---

### C-2: Open Redirect in Auth Callback

**Severity**: CRITICAL
**Agent**: WT3 (Spectre) — external attacker
**File**: [src/app/auth/callback/route.ts:7,13](src/app/auth/callback/route.ts#L7)

**Description**: The `next` query parameter is used directly in a redirect with zero validation:
```typescript
const next = searchParams.get("next") ?? "/dashboard";
return NextResponse.redirect(`${origin}${next}`);
```

An attacker can craft: `https://app.wildtrack.dev/auth/callback?code=valid&next=//evil.com` — the browser interprets `//evil.com` as a protocol-relative URL and redirects to the attacker's domain after successful authentication.

**Impact**: Post-authentication phishing. User logs in via a legitimate WildTrack page, then gets redirected to a fake WildTrack clone that harvests credentials or session tokens.

**Fix**:
```typescript
function isSafeRedirect(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}
const next = searchParams.get("next") ?? "/dashboard";
const safeNext = isSafeRedirect(next) ? next : "/dashboard";
return NextResponse.redirect(`${origin}${safeNext}`);
```

---

## HIGH Findings

### H-1: Open Redirect in Login Page

**Severity**: HIGH
**Agent**: WT3 (Spectre)
**File**: [src/app/auth/login/page.tsx:32,57](src/app/auth/login/page.tsx#L32)

**Description**: Same pattern as C-2 but in the client-side login flow:
```typescript
const redirect = searchParams.get("redirect") || "/dashboard";
// ... after successful login:
router.push(redirect);
```

An attacker can craft: `https://app.wildtrack.dev/auth/login?redirect=https://evil.com` and the user gets redirected after login.

**Impact**: Same as C-2 but slightly lower severity since Next.js `router.push()` with an absolute URL may behave differently than `NextResponse.redirect()`.

**Fix**: Validate the `redirect` parameter before using it:
```typescript
const rawRedirect = searchParams.get("redirect") || "/dashboard";
const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
  ? rawRedirect : "/dashboard";
```

---

### H-2: No Client-Side Authorization on Settings/Members Pages

**Severity**: HIGH
**Agent**: WT4 (Rogue Admin) / WT2 (Felix)
**Files**:
- [src/app/(auth)/org/[orgId]/settings/page.tsx](src/app/(auth)/org/[orgId]/settings/page.tsx) — No role check
- [src/app/(auth)/org/[orgId]/members/page.tsx](src/app/(auth)/org/[orgId]/members/page.tsx) — No role check before rendering admin UI

**Description**: The settings page renders the full edit form and delete button to ALL org members, including viewers. While RLS blocks unauthorized mutations server-side, the UI gives no indication that the user lacks permission. A viewer sees the form, fills it out, clicks "Save", and gets a cryptic error.

**Impact**:
- Poor UX for viewers/members who see controls they can't use
- RLS error messages leak internal details (error codes, table names)
- If RLS were ever misconfigured or disabled, these pages become fully exploitable

**Fix**: Fetch the user's org role and conditionally render the form:
```typescript
// Fetch role before rendering
const { data: membership } = await supabase
  .from("org_members").select("role")
  .eq("org_id", orgId).eq("user_id", user.id).single();
if (!canAdmin(membership?.role)) {
  return <AccessDenied message="You need admin access to change settings." />;
}
```

---

## MEDIUM Findings

### M-1: Middleware Regex Misses Project Routes

**Severity**: MEDIUM
**Agent**: WT3 (Spectre)
**File**: [src/lib/supabase/middleware.ts:38-40](src/lib/supabase/middleware.ts#L38-L40)

**Description**: The middleware route protection regex intentionally excludes `/project/` paths:
```typescript
const isAuthRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
  request.nextUrl.pathname.match(/^\/org\/(?!.*\/project\/)/) ||
  request.nextUrl.pathname.startsWith("/org/new");
```

This means 7 project-related routes under `(auth)` are NOT protected by middleware. They ARE protected by the `(auth)/layout.tsx` server-side redirect, but that's a single point of failure.

**Impact**: If `layout.tsx` is accidentally deleted or broken, all project routes become accessible without authentication.

**Fix**: Simplify the regex to cover all `/org/` routes:
```typescript
const isAuthRoute = request.nextUrl.pathname.startsWith("/dashboard") ||
  request.nextUrl.pathname.startsWith("/org/");
```

---

### M-2: Cascade Delete Without Soft-Delete or Grace Period

**Severity**: MEDIUM
**Agent**: WT4 (Rogue Admin)
**File**: [src/app/(auth)/org/[orgId]/settings/page.tsx:128-148](src/app/(auth)/org/[orgId]/settings/page.tsx#L128-L148)
**Database**: FK constraints use `ON DELETE CASCADE`

**Description**: Deleting an organisation cascades to:
- `org_members` → all membership records deleted
- `projects` → all projects deleted
- `project_members` → all project access records deleted
- (Future: sites, species, observations — all gone)

The only protection is a browser `window.confirm()` dialog. No soft-delete, no grace period, no "type org name to confirm" pattern, no audit log.

**Impact**: An owner (or anyone who compromises an owner's session) can permanently destroy all org data with a single click. With future phases, this could mean 400K+ observation records lost.

**Fix**:
1. Add a "type the org name to confirm" dialog (like GitHub's repo deletion)
2. Implement soft-delete (`deleted_at` timestamp) with a 30-day grace period
3. Log the deletion event for audit trail
4. Consider requiring re-authentication before destructive actions

---

### M-3: No CSRF State Validation on OAuth Callback

**Severity**: MEDIUM
**Agent**: WT3 (Spectre)
**File**: [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)

**Description**: The OAuth callback accepts an authorization `code` without validating the `state` parameter. Supabase's `exchangeCodeForSession()` likely handles PKCE internally, but the app has no explicit state validation. If the Supabase SDK doesn't enforce this, the callback is CSRF-vulnerable.

**Impact**: An attacker could potentially force-login a victim with the attacker's account (session fixation) or exploit race conditions in the OAuth flow.

**Fix**: Verify that Supabase's PKCE implementation is enabled (it is by default in recent versions). Add a comment documenting this trust decision. Optionally add explicit state validation.

---

### M-4: All Mutations Use Client-Side Supabase (No Server Actions)

**Severity**: MEDIUM
**Agent**: General architecture concern
**Files**: All `"use client"` pages that perform mutations

**Description**: Every mutation (create org, update settings, invite member, delete org, create project) goes directly from the browser to Supabase via the client SDK. There are no Next.js Server Actions or API routes mediating these calls.

**Impact**:
- No centralized audit logging
- No server-side business logic validation beyond RLS
- No rate limiting on mutations
- Harder to add complex authorization logic (e.g., "owner can't delete if org has active projects")
- Direct Supabase errors exposed to users (including internal table/column names)

**Fix**: Migrate mutations to Server Actions or API routes for future phases. Not urgent for Phase 1, but critical before Phase 3+ (CSV import, bulk data operations).

---

## LOW Findings

### L-1: Profiles Visible to All Authenticated Users

**Severity**: LOW
**File**: [001_foundation.sql:177-179](supabase/migrations/001_foundation.sql#L177-L179)

**Description**: The profiles SELECT policy is `USING (true)` — any authenticated user can read all profiles (display_name, email, avatar_url).

**Impact**: Minor privacy concern. Users can enumerate all registered users and their email addresses.

**Fix**: Restrict profile visibility to org co-members:
```sql
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members a JOIN org_members b ON a.org_id = b.org_id
    WHERE a.user_id = auth.uid() AND b.user_id = profiles.id
  )
)
```

---

### L-2: No Rate Limiting on Auth Endpoints

**Severity**: LOW
**Agent**: WT3 (Spectre)

**Description**: Login, registration, and password reset have no rate limiting. Supabase GoTrue has built-in rate limits, but these are generous (30 requests per minute for signup, 30 for token).

**Impact**: Brute-force attacks on weak passwords are possible at 30 attempts/minute.

**Fix**: Add rate limiting via middleware or Supabase's built-in `SECURITY_CAPTCHA` setting for production.

---

### L-3: Error Messages May Leak Internal Details

**Severity**: LOW
**Agent**: WT3 (Spectre)

**Description**: When RLS blocks a mutation, the raw Supabase error is shown to the user via `toast.error(error.message)`. Messages like `"new row violates row-level security policy for table 'organisations'"` reveal table names and security implementation details.

**Impact**: Information disclosure helps attackers understand the database structure.

**Fix**: Map known error codes to user-friendly messages:
```typescript
function friendlyError(code: string, message: string): string {
  if (code === "42501") return "You don't have permission to do this.";
  if (code === "23505") return "This already exists. Choose a different name.";
  return "Something went wrong. Please try again.";
}
```

---

## INFO Notes

### I-1: Phase 2+ Features Not Yet Testable

The following features exist only as stub placeholder pages with "Coming in Phase N" messages:
- CSV upload/column mapping (Phase 2-3)
- Sites management (Phase 2)
- Species registry + ALA integration (Phase 2)
- Observations data table (Phase 3)
- Detection histories (Phase 6)
- Public explore page (Phase 7)
- Export (Camtrap DP, Darwin Core) (Phase 7)

**Security notes for future phases**:
- CSV import MUST validate file size, content type, and parse in a sandboxed context
- Species autocomplete proxy to ALA should cache and rate-limit to prevent abuse
- Export endpoints must enforce RLS (only export data the user can see)
- Detection history matrix rendering with large datasets needs pagination to prevent DoS

---

### I-2: Seed Data Has Both Orgs Public

Both seed organisations (`Tiwi Islands Rangers` and `Kakadu National Park`) have `is_public: true`, which means anonymous users can see both orgs. This is fine for testing but means the "private org visibility" path wasn't exercised in the seed data.

---

## RLS Test Results (14/14 PASS)

| # | Test | Actor | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Anon sees only published projects | Anon | 1 project | PASS |
| 2 | Published project is Yellow Water | Anon | Correct name | PASS |
| 3 | Owner sees all 3 projects (both orgs) | test@ | 3 projects | PASS |
| 4 | Member sees own org + published | ranger@ | 3 projects | PASS |
| 5 | Ranger cannot see Kakadu org_members | ranger@ | 0 rows | PASS |
| 6 | Ranger cannot UPDATE Tiwi org name | ranger@ | Blocked | PASS |
| 7 | Ranger cannot DELETE Tiwi org | ranger@ | Blocked | PASS |
| 8 | Ranger cannot UPDATE Kakadu org | ranger@ | Blocked | PASS |
| 9 | Ranger cannot self-insert into Kakadu | ranger@ | Blocked | PASS |
| 10 | Ranger cannot escalate own role | ranger@ | Still member | PASS |
| 11 | Ranger cannot DELETE Tiwi projects | ranger@ | Blocked | PASS |
| 12 | Ranger cannot create project in Kakadu | ranger@ | Blocked | PASS |
| 13 | Anon cannot create org | Anon | Blocked | PASS |
| 14 | Ranger cannot update other user's profile | ranger@ | Blocked | PASS |

---

## Agent Persona Summaries

### WT1 — Ranger Janet (Power User)
- Can log in, see her orgs and projects
- Cannot create private orgs (C-1 bug blocks her)
- Settings/members pages show full admin UI even though she may be a member (H-2)
- Overall: functional for read operations, blocked on org creation

### WT2 — Intern Felix (First-Time User)
- Registration works
- Creating first org fails if `is_public: false` (C-1)
- Sees admin controls they can't use (H-2) — confusing
- Error messages are technical/unclear (L-3)
- Would benefit from better onboarding flow

### WT3 — Spectre (External Attacker)
- Cannot access data without authentication (middleware + layout)
- Open redirect vulnerabilities in callback and login (C-2, H-1) enable phishing
- RLS is solid — all 14 cross-org tests passed
- No service role key exposure in client bundle
- Profile enumeration possible (L-1)
- No rate limiting on auth (L-2)

### WT4 — Rogue Admin (Insider Threat)
- Cannot escalate role (RLS blocks)
- Cannot access other orgs' data (RLS blocks)
- Could delete org with single click if they're owner (M-2)
- No audit trail for destructive actions
- Cascade deletes destroy all downstream data instantly

---

## Recommended Fix Priority

1. **C-1**: Fix org creation RLS (blocks basic functionality)
2. **C-2**: Fix open redirect in callback (security vulnerability)
3. **H-1**: Fix open redirect in login (security vulnerability)
4. **H-2**: Add client-side role checks on settings/members pages
5. **M-1**: Expand middleware to cover project routes
6. **M-2**: Add soft-delete + confirmation for org deletion
7. **M-4**: Plan migration to Server Actions for Phase 2+
8. **L-3**: Add user-friendly error messages
9. **L-1**: Restrict profile visibility (before production)
10. **L-2**: Add rate limiting (before production)
