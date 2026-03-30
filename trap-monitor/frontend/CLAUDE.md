# Project AI Instructions — Trap Monitor

This file defines project-specific development rules for all AI agents (Claude Code, GitHub Copilot).

Global behaviour rules come from:
`C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

# Critical Security Rules

Never:
- hardcode API keys, tokens, or secrets
- commit `.env` or credential files
- expose tokens to client-side code
- run destructive commands without explicit approval
- call external APIs over HTTP — HTTPS only

If a secret appears in code, stop and warn the user immediately.

# Project Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict)
- **Database & Auth:** Supabase (shared project across all Trackline apps)
- **SMS Integration:** Twilio (inbound/outbound SMS for trap hardware)
- **Deployment:** Vercel

# Architecture

This is the **Trap Monitor** app in the Trackline conservation technology suite. It monitors SMS-connected hardware traps and notifies users of trap events.

## Related Apps (same Supabase project)
- **Portal** — authentication and access control (`LandManagment Website/portal/`)
- **WildTrack** — camera trap management (`camera-trap-dashboard/`)
- **Fire System** — fire management & carbon (`Fire project system/fire-app/`)

# Shared Database Rules — CRITICAL

All Trackline apps share **one Supabase project**. Careless changes here break the Portal, WildTrack, and Fire System.

See `portal/PROTECTED_SURFACES.md` for the authoritative cross-app surface inventory.

## Trap Monitor Owns (this project may CREATE, ALTER, DROP)

- **Tables (public schema):** `units`, `events`, `commands`, `notifications`
- **Functions (public schema):** `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()`

## Shared Infrastructure Trap Monitor Depends On

- **`portal.app_access`** — Supabase RPC `check_app_access()` called on every page load for access gating
- **`portal.profiles`** — User profile data (display_name, email)
- **`public.organisations`** — OWNED BY WildTrack. Trap Monitor units have `org_id` FK to this table. Do NOT ALTER or DROP `organisations` columns without checking Trap Monitor FK dependencies.
- **`public.org_members`** — OWNED BY WildTrack. `trap_can_*` functions query this table for permission checks. Do NOT DROP or rename columns without checking `trap_can_*` functions.
- **`public.is_org_member(p_org_id uuid, p_user_id uuid)`** — OWNED BY WildTrack. Used in Trap Monitor RLS policies. Signature must not change.
- **`public.is_org_admin(p_org_id uuid, p_user_id uuid)`** — OWNED BY WildTrack. Used in Trap Monitor RLS policies.
- **`public.can_org_edit(p_org_id uuid, p_user_id uuid)`** — OWNED BY WildTrack. Used in Trap Monitor RLS policies.

## Never Touch from This Project

- `portal.*` tables and functions (Portal owns the portal schema)
- `public.organisations` — owned by WildTrack
- `public.org_members` — owned by WildTrack
- `public.is_org_member`, `public.is_org_admin`, `public.can_org_edit` — owned by WildTrack
- Any Fire App tables (`organization`, `project`, `user_project`, `burn_plan`, `fire_season`, `fire_scar`, etc.)

## Governance Gap — No Migration Files

**IMPORTANT:** Trap Monitor has no `supabase/migrations/` directory. The schema was applied via the Supabase dashboard. This means:
1. Schema history is not version-controlled
2. Any future schema change MUST create a `supabase/migrations/` directory and use the `trap_` naming convention: `trap_001_description.sql`
3. See `portal/docs/schema/trap-monitor.md` for the reconstructed schema reference
4. See `portal/PROTECTED_SURFACES.md` for the full cross-app surface inventory

## Rules for Schema Changes

1. Never DROP or ALTER tables/functions outside Trap Monitor-owned surfaces without explicit user approval
2. Never modify `trap_can_*` functions without confirming the WildTrack helper functions they depend on are unchanged
3. If adding columns to Trap Monitor tables, use `ALTER TABLE ... ADD COLUMN ... DEFAULT` to avoid breaking existing queries
4. New Trap Monitor tables must have RLS enabled and grants for the `authenticated` role
5. Run `node portal/scripts/db-check.cjs <migration.sql>` before applying any migration that touches portal surfaces

## Cross-App Impact Checklist

Before any migration change, verify:
- [ ] Does this affect `public.organisations` or `public.org_members`? → WildTrack breaks
- [ ] Does this change `trap_can_*` function signatures? → Trap Monitor RLS policies break
- [ ] Does this affect `portal.app_access`? → Access gating breaks for all apps
- [ ] Does this change the `units.org_id` FK relationship? → WildTrack org association breaks

# Reporting

When work is complete provide:
- what changed
- why it changed
- files modified
- verification performed
- any risks or assumptions
