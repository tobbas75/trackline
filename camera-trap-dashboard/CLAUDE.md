# Project AI Instructions — WildTrack

This file defines project-specific development rules for all AI agents (Claude Code, GitHub Copilot).

Global behaviour rules come from:

`C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

Copilot-specific instructions are in `.github/copilot-instructions.md`. Keep both files aligned.

# Critical Security Rules

These are non-negotiable. Global rules at the path above have full detail.

Never:
- hardcode API keys, tokens, or secrets
- commit `.env` or credential files
- expose tokens to client-side code
- run destructive commands (`rm -rf`, `git reset --hard`, `DROP TABLE`) without explicit approval
- call external APIs over HTTP — HTTPS only
- concatenate user input into SQL queries or shell commands

If a secret appears in code, stop and warn the user immediately.

# Expectations

Agents must:

- read relevant files before editing
- follow existing architecture
- make the smallest safe change
- scan impact before modifying shared code
- verify behaviour before completion

# Code Behaviour

Prefer:

- editing existing files
- reusing existing helpers
- preserving interfaces

Avoid:

- unrelated refactors
- speculative abstractions
- bypassing validation or architecture layers

# Required Reads

Before making significant changes, AI agents should read:

- `ARCHITECTURE.md`
- `DOMAIN_RULES.md`
- `REPO_MAP.md`

# Project Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **UI:** shadcn/ui + Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL, RLS, GoTrue auth)
- **State:** Zustand stores (`src/stores/`)
- **Maps:** react-leaflet + OpenStreetMap tiles
- **External API:** Atlas of Living Australia (ALA) — unauthenticated, proxied via API routes

# Key Conventions

- All monetary/coordinate values use `DECIMAL` — never float
- Supabase migrations live in `supabase/migrations/` with sequential numbering (`001_`, `002_`, etc.)
- All Supabase tables use Row Level Security — every new table must have RLS policies
- API routes proxy external calls (ALA) and add caching — never call external APIs from client code
- CSV import uses a column-mapping system (`src/lib/column-mapping/`) — extend field registries when adding new import fields
- Use Zod for API route input validation (`src/lib/validators/`)
- Named exports only — no default exports (except Next.js page/layout components)
- Auth middleware in `src/middleware.ts` refreshes Supabase sessions on every request

# Shared Database Rules — CRITICAL

All Trackline apps share **one Supabase project**. WildTrack owns the `public` schema multitenancy tables. Careless changes here break Trap Monitor (and potentially Fire App).

## WildTrack Owns (this project may CREATE, ALTER, DROP)

- **Tables:** `organisations`, `org_members`, `projects`, `project_members`, `sites`, `species`, `observations`, `csv_uploads`, `column_mapping_templates`, `detection_histories`, `detection_history_rows`
- **Functions:** `is_org_member()`, `is_org_admin()`, `can_org_edit()`, `project_org_id()`, `create_organisation()`, `soft_delete_organisation()`, `update_updated_at()` (public schema version)
- **Enums:** `org_type`, `org_role`, `project_role`, `upload_type`, `upload_status`
- **All RLS policies** on the above tables

## Shared Tables — HIGH RISK

### `public.organisations` — also used by Trap Monitor
- Trap Monitor has `units.org_id` FK → `organisations(id) ON DELETE CASCADE`
- **Never rename, DROP, or remove columns** from this table without coordinating with Trap Monitor
- **Never change the primary key type** (uuid)
- Adding columns is safe (use `DEFAULT`)

### `public.org_members` — also used by Trap Monitor
- Trap Monitor RLS policies query `org_members` to check access via `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()`
- **Never DROP or recreate RLS policies on `org_members`** without checking Trap Monitor impact — this has caused breakage before (Trap Monitor migration 005 was a hotfix for this)
- **Never change the `(org_id, user_id)` primary key** or the `role` column values
- The `role` values `'owner'`, `'admin'`, `'member'`, `'viewer'` are used by both apps

### `is_org_member()` / `is_org_admin()` — shared helper functions
- Both WildTrack and Trap Monitor define these in the `public` schema
- **Never change the function signature** `(p_org_id uuid, p_user_id uuid) → boolean`
- If updating logic, ensure it remains compatible with Trap Monitor's usage

## Portal Schema — READ ONLY from this project

- `portal.profiles` — WildTrack reads `display_name` and `email` for member lookups
- `portal.app_access` — WildTrack calls `check_app_access('wildtrack')` for access gating
- `portal.check_app_access()` — consumed via RPC
- **Never CREATE, ALTER, or DROP anything in the `portal` schema** from this project

## Never Touch from This Project

- `public.organization` (singular) — owned by Fire App (different table from `organisations`)
- `public.user_project` — owned by Fire App
- `public.units`, `events`, `commands`, `notifications` — owned by Trap Monitor
- `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()` — owned by Trap Monitor
- `get_user_orgs()` — owned by Trap Monitor
- Fire App enums (`user_role`, `burn_season`, `burn_plan_status`, etc.)

## Rules for Schema Changes

1. **Never DROP or ALTER `organisations` or `org_members`** without explicit user approval confirming Trap Monitor compatibility
2. **Never recreate RLS policies on `org_members`** — add/modify individual policies only, and verify Trap Monitor's `trap_can_*` functions still work
3. **Never change function signatures** for `is_org_member`, `is_org_admin`, `can_org_edit` — Trap Monitor depends on them
4. New tables in `public` schema must not collide with Fire App or Trap Monitor table names
5. All new tables must have RLS enabled
6. When adding org_members policies, avoid recursive policy definitions (SELECT policies that themselves query org_members)

## Cross-App Impact Checklist

Before any migration change, verify:
- [ ] Does this ALTER `organisations`? → Check Trap Monitor FK and queries
- [ ] Does this change `org_members` policies? → Trap Monitor access checks may break
- [ ] Does this change `is_org_member()`/`is_org_admin()` signatures or logic? → Trap Monitor depends on these
- [ ] Does this add a new function to `public` schema? → Check for name collisions with Fire App / Trap Monitor

Run `node portal/scripts/db-check.cjs <migration.sql>` before applying any migration that touches portal or shared public surfaces.

See `portal/PROTECTED_SURFACES.md` for the authoritative cross-app surface inventory.

# Reporting

When work is complete provide:

- what changed
- why it changed
- files modified
- verification performed
- any risks or assumptions
