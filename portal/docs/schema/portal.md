# Portal Schema Reference

**Schema:** `portal`
**Owner:** portal repo (`c:/Software code GITs/LandManagment Website/portal/`)
**Source:** `supabase/migrations/001_portal_app_access.sql`, `002_admin_policies.sql`
**Generated:** Phase 1 Migration Governance (derived from migration SQL — not a live DB dump)

---

> **CROSS-APP SURFACE:** `portal.check_app_access()` is called by WildTrack, Fire App, and Trap Monitor.
> Never change its signature. See `PROTECTED_SURFACES.md`.

---

## Tables

### `portal.apps`

App registry — one row per Trackline app. Read by all consuming apps to retrieve display name, URL, and icon.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `text` | NOT NULL | — | Primary key — e.g. `'wildtrack'`, `'fire'`, `'trap_monitor'` |
| `name` | `text` | NOT NULL | — | Display name, e.g. `'WildTrack'` |
| `description` | `text` | NULL | — | Short description |
| `url` | `text` | NULL | — | Production URL for the app |
| `icon` | `text` | NULL | — | Icon identifier |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Seeded rows:** `wildtrack`, `fire`, `trap_monitor`

**Indexes:** none (primary key lookup only)

---

### `portal.app_access`

Per-user, per-app role grants. Absence of a row = no access. All three downstream apps call `portal.check_app_access()` which queries this table.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE |
| `app_id` | `text` | NOT NULL | — | FK → `portal.apps(id)` ON DELETE CASCADE |
| `role` | `text` | NOT NULL | `'viewer'` | CHECK: `viewer`, `member`, `admin` |
| `granted_by` | `uuid` | NULL | — | FK → `auth.users(id)` — who granted access |
| `granted_at` | `timestamptz` | NOT NULL | `now()` | — |

**Unique constraint:** `(user_id, app_id)`

**Indexes:**
- `idx_app_access_user` on `(user_id)`
- `idx_app_access_app` on `(app_id)`

---

### `portal.profiles`

Single source of truth for user identity across all Trackline apps. Auto-created on signup by `portal.handle_new_user()` trigger.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | — | Primary key — FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | `text` | NULL | — | — |
| `display_name` | `text` | NULL | — | Queried by WildTrack for member lists — never remove |
| `email` | `text` | NULL | — | Queried by WildTrack and portal admin — never remove |
| `avatar_url` | `text` | NULL | — | — |
| `organisation` | `text` | NULL | — | Free-text org name (not a FK) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by `set_updated_at` trigger |

---

## Functions

### `portal.check_app_access(target_app_id text)`

**Returns:** `TABLE(has_access boolean, user_role text)`
**Language:** `sql`
**Security:** `SECURITY DEFINER`
**Stability:** `STABLE`

Checks whether the currently authenticated user has access to the specified app. Returns a single row if access exists; empty set if not. All three downstream apps call this as an RPC:

```sql
SELECT has_access, user_role FROM portal.check_app_access('wildtrack');
```

**WARNING:** Never change the function signature `(target_app_id text)` or the return columns `(has_access, user_role)`. All three downstream apps call `rpc("check_app_access", { target_app_id })` and destructure `has_access` and `user_role` from the result.

---

### `portal.is_admin()`

**Returns:** `boolean`
**Language:** `sql`
**Security:** `SECURITY DEFINER`
**Stability:** `STABLE`

Returns `true` if the current user has `role = 'admin'` on any app in `portal.app_access`. Used by RLS policies to gate admin-only operations. Uses SECURITY DEFINER to avoid recursive RLS evaluation when `app_access` policies call this function.

---

### `portal.handle_new_user()`

**Returns:** `trigger`
**Language:** `plpgsql`
**Security:** `SECURITY DEFINER` (with `set search_path = ''`)

Trigger function called on every `INSERT` into `auth.users`. Creates a `portal.profiles` row for the new user, setting `display_name` from `raw_user_meta_data` (falling back to email) and `email` from the user record.

**WARNING:** This trigger fires for every signup across all four Trackline apps. Any change must be tested against all downstream signup flows.

---

### `portal.update_updated_at()`

**Returns:** `trigger`
**Language:** `plpgsql`

Sets `NEW.updated_at = now()` on `BEFORE UPDATE` events. Used by the `set_updated_at` trigger on `portal.profiles`.

---

## Triggers

| Trigger Name | Event | Table | Function Called | Notes |
|-------------|-------|-------|-----------------|-------|
| `on_auth_user_created` | AFTER INSERT | `auth.users` | `portal.handle_new_user()` | Auto-creates profile row on every signup across all apps |
| `set_updated_at` | BEFORE UPDATE | `portal.profiles` | `portal.update_updated_at()` | Maintains `updated_at` timestamp |

---

## Enums

No enum types are defined in the portal schema. Role values (`viewer`, `member`, `admin`) are enforced via a `CHECK` constraint on `portal.app_access.role`.

---

## Grants

```sql
GRANT USAGE ON SCHEMA portal TO authenticated;
GRANT SELECT ON portal.apps TO authenticated;
GRANT SELECT ON portal.app_access TO authenticated;
GRANT INSERT, UPDATE ON portal.profiles TO authenticated;
GRANT SELECT ON portal.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION portal.check_app_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION portal.is_admin() TO authenticated;
```

---

## RLS Policies

RLS is enabled on all three tables. See `docs/schema/rls-audit.md` for the full policy table.

Summary:
- `portal.apps` — public read (no login required)
- `portal.app_access` — users read own rows; admins read all; admins insert/update/delete
- `portal.profiles` — users read/update/insert own row; co-members via WildTrack extension; admins read all

---

## Cross-App Dependencies

This schema is the foundation of the entire Trackline platform:

| Surface | Used By | Risk if Changed |
|---------|---------|----------------|
| `portal.check_app_access(target_app_id text)` | WildTrack, Fire App, Trap Monitor | All three apps' access gating fails immediately |
| `portal.app_access` table structure | All three apps | Access gating breaks for all apps |
| `portal.profiles.display_name` | WildTrack member lists | Member display names disappear |
| `portal.profiles.email` | WildTrack, portal admin | Email lookup fails |
| `on_auth_user_created` trigger | All apps (all signups) | New user profiles not created on signup |

See `PROTECTED_SURFACES.md` for the complete governance inventory.
