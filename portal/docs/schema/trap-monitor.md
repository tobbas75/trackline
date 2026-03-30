# Trap Monitor Schema Reference

**Schema:** `public`
**Owner:** Trap Monitor/frontend repo (`c:/Software code GITs/Trap Monitor/frontend/`)
**Source:** Reconstructed from `scripts/verify-shared-db-impact.cjs` and `src/lib/check-access.ts`
**Generated:** Phase 1 Migration Governance

---

> **GOVERNANCE GAP:** Trap Monitor has no `supabase/migrations/` directory. Its schema was applied via the
> Supabase dashboard, bypassing migration files. This means:
>
> 1. Schema changes cannot be version-controlled or audited from source.
> 2. The schema state documented below is **inferred** from the verification script and check-access.ts — it may not be complete.
> 3. Any future Trap Monitor schema changes **MUST** be done via a new `supabase/migrations/` directory following the `trap_` naming convention.
> 4. Without migration files, disaster recovery (recreating the schema on a fresh Supabase project) cannot be automated.
>
> This is a MIGR-06 audit finding (FINDING-3). See `docs/schema/rls-audit.md`.

---

## Known Tables (Inferred)

The following tables are inferred from `scripts/verify-shared-db-impact.cjs` which queries them directly. Column definitions are inferred — the authoritative state is in the live Supabase database.

### `public.units`

Individual hardware monitoring units (SMS traps). The primary Trap Monitor entity.

| Column | Type (inferred) | Notes |
|--------|----------------|-------|
| `id` | `uuid` | Primary key — queried in verify script |
| `org_id` | `uuid` | FK → `public.organisations(id)` — WildTrack-owned table. This FK creates a cross-app dependency. |
| *(other columns)* | *unknown* | Schema was applied via dashboard — full column list not available from source |

**Verified by:** `verify-shared-db-impact.cjs` queries `units.select("id, org_id")`

---

### `public.events`

Trap event records (triggers, alerts, status changes).

| Column | Type (inferred) | Notes |
|--------|----------------|-------|
| *(unknown)* | — | Presence inferred from script structure — exact columns not verifiable from source |

---

### `public.commands`

Commands sent to hardware units.

| Column | Type (inferred) | Notes |
|--------|----------------|-------|
| *(unknown)* | — | Inferred from application context — not directly queried in verify script |

---

### `public.notifications`

User/system notifications for trap events.

| Column | Type (inferred) | Notes |
|--------|----------------|-------|
| *(unknown)* | — | Inferred from application context — not directly queried in verify script |

---

## Cross-App Dependencies

Trap Monitor creates a runtime dependency on WildTrack-owned tables and functions:

| Dependency | Owner | How Used | Risk if Changed |
|------------|-------|----------|----------------|
| `public.organisations` | WildTrack | `units.org_id` FK — units belong to WildTrack organisations | Cascade changes (DROP COLUMN, rename) on `organisations` break the FK |
| `public.org_members` | WildTrack | Queried by `trap_can_*` RLS functions to check org membership | Any change to `org_members` schema breaks Trap Monitor access checks |
| `public.is_org_member(p_org_id, p_user_id)` | WildTrack | Called inside `trap_can_*` functions | Signature or return value change breaks Trap Monitor RLS |
| `public.is_org_admin(p_org_id, p_user_id)` | WildTrack | Called inside `trap_can_*` functions | Same |
| `public.can_org_edit(p_org_id, p_user_id)` | WildTrack | Called inside `trap_can_*` functions | Same |
| `portal.check_app_access(target_app_id)` | Portal | Called from `src/lib/check-access.ts` on app load | Signature change breaks Trap Monitor access gating |

**Verified by:** `verify-shared-db-impact.cjs` tests that a demo org member can read `org_members`, `units`, and `organisations`; and that an outsider gets 0 rows (confirming RLS is working).

---

## RLS Helper Functions (Inferred)

Trap Monitor defines access-check functions in the `public` schema. These functions query `public.org_members` (WildTrack-owned). Their signatures are inferred from naming conventions and the verification script — not verified from SQL source.

### `public.trap_can_view_org(org_id uuid)`

**Inferred purpose:** Returns `true` if the current user is a member of the specified organisation (any role). Used as the basis for SELECT policies on Trap Monitor tables.

---

### `public.trap_can_edit_org(org_id uuid)`

**Inferred purpose:** Returns `true` if the current user has edit-level membership (`member` or above) in the specified organisation.

---

### `public.trap_can_admin_org(org_id uuid)`

**Inferred purpose:** Returns `true` if the current user has admin-level membership (`admin` or `owner`) in the specified organisation.

---

## check-access.ts

The file `src/lib/check-access.ts` shows Trap Monitor uses the standard portal access check pattern:

```typescript
// Trap Monitor is already fail-closed (correct):
if (accessInfraMissing) {
  console.warn(JSON.stringify({
    level: "warn",
    msg: "portal_access_check_unavailable",
    app_id: appId,
    error: errorMessage,
    ts: new Date().toISOString(),
  }));
  return { hasAccess: false, role: null };
}
```

This is the production-safe pattern (fail-closed). No SEC-01 fix needed for Trap Monitor.

---

## Remediation Note

Trap Monitor should create a `supabase/migrations/` directory and reconstruct its migration history as a Phase 2 governance task. The recommended approach:

1. Use `supabase db dump --schema public` against the live project to capture current state
2. Save the output as `trap_001_initial_schema.sql` using the `trap_` namespace prefix
3. Document all known columns and RLS policies in that file with full `CREATE TABLE` and `CREATE POLICY` statements
4. Add the `supabase/` directory to the Trap Monitor/frontend repo
5. All future schema changes must go through migration files — never the Supabase dashboard

Until this is done, the schema documented here is best-effort and should not be treated as authoritative. The live Supabase database is the only authoritative source.

---

## Related Documentation

- `docs/schema/wildtrack.md` — documents `public.organisations` and `public.org_members` (WildTrack-owned tables that Trap Monitor depends on)
- `docs/schema/rls-audit.md` — documents FINDING-3 (Trap Monitor governance gap)
- `PROTECTED_SURFACES.md` — documents the cross-app dependency between Trap Monitor and WildTrack
