# PROTECTED_SURFACES.md

## Purpose

This file is the authoritative inventory of every Supabase surface that downstream apps depend on. It is the companion to `scripts/db-check.cjs`, which enforces these rules statically. Before writing any migration that touches these surfaces, consult this document. All surface IDs listed in the `db-check ID` column are the canonical identifiers used by `db-check.cjs` check definitions.

---

## Naming Convention

All Supabase migration files across the Trackline suite must follow the `{namespace}_{NNN}_{description}.sql` convention. The four defined namespace tokens are:

- `portal_` — Portal repo (`portal/supabase/migrations/`)
- `wildtrack_` — WildTrack repo (`camera-trap-dashboard/supabase/migrations/`)
- `fire_` — Fire App repo (`Fire project system/fire-app/supabase/migrations/`)
- `trap_` — Trap Monitor (reserved; Trap Monitor currently has **no** `supabase/migrations/` directory — its schema was applied via the Supabase dashboard, not migration files; this is a known governance gap)

The `NNN` counter is independent per namespace. A `portal_003_*` and a `wildtrack_003_*` are different migrations and there is no collision risk between apps.

---

## Portal Schema — Protected Surfaces

The portal owns the `portal` schema. Every surface below is called by one or more downstream apps. Changing any of these surfaces without checking the impact column will break live production apps.

| Surface | Type | Signature / Key Columns | Consumers | Breakage if Changed | db-check ID |
|---------|------|------------------------|-----------|---------------------|-------------|
| `portal.app_access` | Table | `id`, `user_id`, `app_id`, `role`, `granted_by`, `granted_at` | WildTrack, Fire, Trap Monitor | Access gating breaks for all three apps | `drop_portal_app_access` / `drop_column_app_access` |
| `portal.profiles` | Table | `id`, `display_name`, `email`, `full_name`, `avatar_url`, `organisation`, `created_at`, `updated_at` | WildTrack (`display_name`, `email`), all apps (`id` FK) | WildTrack member lookups break | `drop_portal_profiles` / `drop_column_profiles` |
| `portal.apps` | Table | `id`, `name`, `description`, `url`, `icon`, `created_at` | All apps (app registry) | App registry queries fail | `drop_portal_apps` |
| `portal.check_app_access(target_app_id text)` | RPC function | Returns `table(has_access boolean, user_role text)` | WildTrack, Fire, Trap Monitor | All three apps' access gating fails immediately | `drop_check_app_access` / `signature_change_check_app_access` |
| `portal.is_admin()` | Function | Returns `boolean` | Portal admin UI | Admin actions break (portal only — lower cross-app risk) | *(no db-check; portal-scoped)* |
| `portal.handle_new_user()` | Trigger function | Inserts into `portal.profiles` on `auth.users` INSERT | All apps (new user signups) | Profile not created on signup across all apps | *(covered by `drop_on_auth_user_created`)* |
| `on_auth_user_created` | Trigger | `AFTER INSERT ON auth.users` → calls `portal.handle_new_user()` | All apps | Signup profile creation silently broken for all new users | `drop_on_auth_user_created` |

### Notes on portal.app_access RLS

Migration `portal_001_app_access.sql` defines `app_access_insert_admin` and `app_access_delete_admin` using a direct subquery (which is recursive). Migration `portal_002_admin_policies.sql` redefines these using `portal.is_admin()` (security definer, avoids recursion). Both policy definitions exist simultaneously in Supabase (policies are additive). A future migration should `DROP POLICY` the original recursive versions from `portal_001`. This is a known debt item tracked in MIGR-06 audit scope.

---

## Public Schema — Cross-App Dependencies

These surfaces are owned by WildTrack but consumed by Trap Monitor. The portal does not own them and must never modify them.

| Surface | Type | Owner | Consumers | Breakage if Changed |
|---------|------|-------|-----------|---------------------|
| `public.organisations` | Table | WildTrack | Trap Monitor (`units.org_id` FK) | Trap Monitor org FK breaks on CASCADE changes |
| `public.org_members` | Table | WildTrack | Trap Monitor (`trap_can_*` functions query it) | Trap Monitor access checks fail |
| `public.is_org_member(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor RLS policies using this function break |
| `public.is_org_admin(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor admin checks break |
| `public.can_org_edit(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor edit permission checks break |

---

## Naming Collision Risks

These are surfaces where two apps define the same identifier in the same schema, creating a silent overwrite risk.

| Collision | App A | App B | Risk |
|-----------|-------|-------|------|
| `public.update_updated_at()` | WildTrack (`wildtrack_001_foundation.sql`) | Fire App (`fire_001_initial_schema.sql`) | `CREATE OR REPLACE` in either app silently overwrites the other's version if logic ever differs. Both currently implement identical logic (`NEW.updated_at = now()`), but this must be guarded. |
| Enum names in `public` schema | WildTrack: `org_role`, `org_type` | Fire App: `user_role` | Currently distinct names — no collision. Must remain distinct. Any new enum in either app must be checked against the full public schema enum list before creation. |

---

## Migration Filename Tracking Note

Portal migration files were renamed from `001_portal_app_access.sql` and `002_admin_policies.sql` to `portal_001_app_access.sql` and `portal_002_admin_policies.sql` as part of Phase 1 Migration Governance. Downstream WildTrack files (`001_foundation.sql` through `007_fix_detection_histories_trigger.sql`) were renamed to `wildtrack_001_foundation.sql` through `wildtrack_007_fix_detection_trigger.sql`. Fire App files (`001_initial_schema.sql` through `008_fire_scar_uploads.sql`) were renamed to `fire_001_initial_schema.sql` through `fire_008_fire_scar_uploads.sql`.

The live Supabase database still records the **original filenames** in `supabase_migrations.schema_migrations`. This divergence is intentional and documented in each renamed file's header comment. Do **NOT** run `supabase db push` or `supabase migration up` for these renamed files — they are already applied to the live database. Running push after rename would cause the Supabase CLI to treat them as new, unapplied migrations and attempt to re-apply them, causing duplicate-object errors. All future migrations must use the namespace-prefix convention from the start so no further divergence occurs.

---

## Rules for Schema Changes

These rules are mandatory for all agents and developers working on the Trackline portal or any downstream app. They are reproduced verbatim from `CLAUDE.md`.

1. **Never DROP or ALTER tables/functions outside the `portal` schema** without explicit user approval
2. **Never modify the `on_auth_user_created` trigger** without confirming impact on all three downstream apps — they all depend on `portal.profiles` being auto-created
3. **Never change the signature of `portal.check_app_access()`** — WildTrack, Fire, and Trap Monitor all call this RPC
4. **Never change the `portal.app_access` table structure** — all apps read it for access gating
5. **Never rename or remove columns from `portal.profiles`** — other apps query `display_name` and `email`
6. If adding columns to portal tables, use `ALTER TABLE ... ADD COLUMN ... DEFAULT` to avoid breaking existing queries
7. New portal tables must have RLS enabled and grants for the `authenticated` role

---

## Cross-App Impact Checklist

Before any migration change, verify:

- [ ] Does this affect `portal.check_app_access()` return shape? → All 3 apps break
- [ ] Does this affect `portal.profiles` columns? → WildTrack member lookups break
- [ ] Does this change the `on_auth_user_created` trigger? → New signups across all apps affected
- [ ] Does this add/change RLS on `portal.app_access`? → App access gating across all apps affected
