# RLS Policy Audit

**Scope:** All four Trackline apps on the shared Supabase project
**Audited:** Phase 1 Migration Governance (derived from migration SQL)
**Status:** Point-in-time audit — not auto-generated. Update this file when policies change.

---

## 1. Portal Schema RLS (`portal.*`)

Source: `supabase/migrations/001_portal_app_access.sql` and `002_admin_policies.sql`

| Table | Policy Name | Operation | Using Condition | Check Condition | Notes |
|-------|-------------|-----------|-----------------|-----------------|-------|
| `portal.apps` | `apps_read_all` | SELECT | `true` | — | Public read — anyone can list apps |
| `portal.app_access` | `app_access_read_own` | SELECT | `auth.uid() = user_id` | — | Users see their own access rows |
| `portal.app_access` | `app_access_read_admin` | SELECT | `portal.is_admin()` | — | Admins see all access rows |
| `portal.app_access` | `app_access_insert_admin` | INSERT | — | `EXISTS (SELECT 1 FROM portal.app_access aa WHERE aa.user_id = auth.uid() AND aa.role = 'admin')` | **001 version — RECURSIVE SUBQUERY.** See Known Issue below. |
| `portal.app_access` | `app_access_insert_admin` | INSERT | — | `portal.is_admin()` | **002 version — SECURITY DEFINER function, avoids recursion.** Both exist; 002 supersedes 001. |
| `portal.app_access` | `app_access_delete_admin` | DELETE | `EXISTS (SELECT 1 FROM portal.app_access aa WHERE aa.user_id = auth.uid() AND aa.role = 'admin')` | — | **001 version — RECURSIVE SUBQUERY.** See Known Issue below. |
| `portal.app_access` | `app_access_delete_admin` | DELETE | `portal.is_admin()` | — | **002 version — SECURITY DEFINER function, avoids recursion.** Both exist; 002 supersedes 001. |
| `portal.app_access` | `app_access_update_admin` | UPDATE | `portal.is_admin()` | — | Only in 002 — admins can update role |
| `portal.profiles` | `profiles_read_own` | SELECT | `auth.uid() = id` | — | Set in 001; dropped and replaced in WildTrack 001 with co-member visibility |
| `portal.profiles` | `profiles_update_own` | UPDATE | `auth.uid() = id` | — | — |
| `portal.profiles` | `profiles_insert_own` | INSERT | — | `auth.uid() = id` | — |
| `portal.profiles` | `profiles_read_admin` | SELECT | `portal.is_admin()` | — | Set in 002 — admins can see all profiles |

---

## 2. Known Issue: Duplicate Policies in Portal Migrations

> **KNOWN ISSUE:** `001_portal_app_access.sql` and `002_admin_policies.sql` both define `app_access_insert_admin` and `app_access_delete_admin` policies on `portal.app_access`. In Supabase, policies with the same name on the same table are **additive** — both apply simultaneously.
>
> The **001 version** uses a direct subquery on `portal.app_access` as the admin check. This creates **recursive policy evaluation**: evaluating the INSERT policy requires checking `portal.app_access`, which triggers the same INSERT policy, causing infinite recursion.
>
> The **002 version** replaces the admin check with `portal.is_admin()` — a `SECURITY DEFINER` function that bypasses RLS when reading `portal.app_access`. This avoids the recursion.
>
> Because both policies exist, the 001 recursive versions remain active alongside the 002 fixed versions. The practical effect is that Supabase evaluates both policies for each INSERT/DELETE; the 002 policy grants access if `portal.is_admin()` returns true, but the 001 policy may still cause recursion depending on evaluation order.
>
> **Resolution needed:** The 001 non-definer INSERT/DELETE policies should be dropped in a future migration (`portal_003_cleanup_recursive_policies.sql`):
> ```sql
> -- Cleanup: remove recursive 001 policies superseded by 002 security-definer versions
> DROP POLICY IF EXISTS "app_access_insert_admin" ON portal.app_access; -- drops both; 002 will be recreated
> DROP POLICY IF EXISTS "app_access_delete_admin" ON portal.app_access; -- drops both; 002 will be recreated
> -- Then recreate the correct 002 versions only:
> CREATE POLICY "app_access_insert_admin" ON portal.app_access FOR INSERT WITH CHECK (portal.is_admin());
> CREATE POLICY "app_access_delete_admin" ON portal.app_access FOR DELETE USING (portal.is_admin());
> ```
>
> This is a **MIGR-06 finding** (FINDING-1), not a blocking issue in Phase 1.

---

## 3. WildTrack Public Schema RLS (Summary)

Source: `camera-trap-dashboard/supabase/migrations/001_foundation.sql` through `007_fix_detection_histories_trigger.sql`

RLS is enabled on all WildTrack tables. Policies use the `is_org_member()`, `is_org_admin()`, and `can_org_edit()` helper functions for org-based access control.

**Key policy patterns:**
- **SELECT:** `is_public = TRUE OR public.is_org_member(id, auth.uid())` — public orgs/projects visible to all; private ones require org membership
- **INSERT:** `public.can_org_edit(org_id, auth.uid())` — any org member with `member`+ role can create records
- **UPDATE:** `public.can_org_edit(...)` — same as INSERT
- **DELETE:** `public.is_org_admin(...)` — only owners and admins can delete

**Cross-app risk:** The `is_org_member()`, `is_org_admin()`, and `can_org_edit()` functions are WildTrack-owned but are called by Trap Monitor's `trap_can_*` RLS functions. Any change to these function signatures or return values breaks Trap Monitor access checks. See `PROTECTED_SURFACES.md`.

**Profile policy extension:** WildTrack migration 001 drops the portal's `profiles_read_own` policy and replaces it with `profiles_read_own_or_comembers` — allowing users to read the profiles of other members in the same organisation. This is an intentional extension that operates on the shared `portal.profiles` table.

---

## 4. Fire App Public Schema RLS (Summary)

Source: `fire-app/supabase/migrations/001_initial_schema.sql` and subsequent migrations

RLS is enabled on all Fire App tables. Policies use `auth.uid()` and `user_project` membership checks for project-scoped access control.

**Key policy pattern:**
```sql
project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid())
```

Write operations (INSERT, UPDATE) additionally check role:
```sql
project_id IN (
  SELECT project_id FROM user_project
  WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
)
```

**Cross-app risk:** Fire App RLS policies are fully isolated to Fire App tables and use `auth.uid()` directly (not portal functions). No cross-app risk from changing Fire App RLS policies, provided the underlying tables and `user_project` structure remain unchanged.

**Naming collision note:** Fire App's `update_updated_at()` function shares a name with WildTrack's version in the same `public` schema. See FINDING-2.

---

## 5. Trap Monitor RLS (Summary)

Source: Inferred from `Trap Monitor/frontend/scripts/verify-shared-db-impact.cjs` and `src/lib/check-access.ts`

Trap Monitor uses `trap_can_view_org()`, `trap_can_edit_org()`, and `trap_can_admin_org()` functions in the `public` schema to gate access to `units`, `events`, `commands`, and `notifications` tables.

These functions query `public.org_members` (WildTrack-owned). This creates a cross-app coupling point: if WildTrack changes `public.org_members` structure, Trap Monitor's access checks fail silently or with RLS errors.

**Verification status:** The `verify-shared-db-impact.cjs` script confirms that RLS is functioning correctly — demo org members can read their own data, and outsider users get 0 rows. However, the **full policy list is unverifiable from source** because Trap Monitor has no migration files. The complete RLS policy definitions exist only in the live Supabase database.

See `docs/schema/trap-monitor.md` for the governance gap note.

---

## 6. Findings Summary

| ID | Severity | Finding |
|----|----------|---------|
| FINDING-1 | LOW | Portal migrations 001 and 002 define duplicate `app_access_insert_admin` and `app_access_delete_admin` policies on `portal.app_access`. Both policies are applied. The 001 versions use a recursive subquery as the admin check (now superseded by the 002 security-definer version). A future migration (`portal_003_cleanup_recursive_policies.sql`) should drop the 001 versions. Not blocking in Phase 1. |
| FINDING-2 | LOW | `public.update_updated_at()` is defined by both WildTrack (`001_foundation.sql`) and Fire App (`001_initial_schema.sql`) using `CREATE OR REPLACE`. In the shared database, whichever migration last ran wins. Currently both versions are functionally identical (set `NEW.updated_at = now()`), so the collision is benign. However, any future divergence in either app's version will silently overwrite the other's. This should be resolved by namespacing: `wildtrack_update_updated_at()` and `fire_update_updated_at()`. Not blocking in Phase 1. |
| FINDING-3 | MEDIUM | Trap Monitor schema and RLS policies **cannot be audited from source**. No migration files exist. Cannot confirm policy completeness or correctness without live DB introspection (`supabase db dump`). This means: (a) schema drift is undetectable from the codebase, (b) disaster recovery requires a live DB dump, (c) AI agents working in the Trap Monitor repo have no SQL reference. **Remediation:** Create `supabase/migrations/trap_001_initial_schema.sql` from a DB dump as a Phase 2 governance task. |

---

## How to Update This Document

This audit is derived from migration SQL files — it is not auto-generated. When adding or changing RLS policies:

1. Update the relevant table in Section 1 (portal) or add a note in Sections 3–5 (other apps)
2. If a new finding is identified, add it to Section 6 with a severity (LOW / MEDIUM / HIGH)
3. Mark resolved findings with ~~strikethrough~~ and a resolution note
4. Update the `Audited:` date in this file header
