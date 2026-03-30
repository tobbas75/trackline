# Trackline Portal — Unified Platform

## What This Is

The central hub for the Trackline conservation technology suite. A Next.js 16 portal that provides shared authentication, user-to-app access management, and a public landing page for four conservation tools: WildTrack (camera traps), Fire System (fire management & carbon), and Trap Monitor (SMS hardware monitoring). This milestone unifies all four projects under shared governance, centralized Supabase management, and a common UI/convention system.

## Core Value

One login, one place to manage access, one source of truth for shared infrastructure — so each app team can move fast without breaking each other.

## Current Milestone: v1.0 Unification

**Goal:** Unify four Trackline projects under the portal with shared conventions, centralized SQL governance, common UI system, and monorepo workspace.

**Target features:**
- Monorepo workspace at parent directory level (pnpm/npm workspaces)
- Shared component library (buttons, cards, nav, layout primitives)
- Centralized Supabase migration management with cross-app safety checks
- Full schema documentation across all apps
- Dashboard app switcher with status indicators and quick-launch
- Global CLAUDE.md and coding conventions installed in all 4 repos
- Shared UI rules system (design tokens, component patterns, responsive breakpoints)
- Shared TypeScript conventions (tsconfig, eslint, naming)
- Supabase RLS audit and policy documentation

## Requirements

### Validated

- ✓ Public landing page with hero, projects, about, approach, contact — existing
- ✓ Shared authentication (signup/login/signout) via Supabase GoTrue — existing
- ✓ User-to-app access management (portal.app_access with roles) — existing
- ✓ Admin panel for user management (grant/revoke/update access) — existing
- ✓ Portal schema with profiles, apps, app_access tables + RLS — existing
- ✓ Middleware session refresh — existing
- ✓ Between23-inspired design system (earthy palette, grain texture, DM Serif + Poppins) — existing

### Active

- [ ] Monorepo workspace linking all 4 repos
- [ ] Shared component library
- [ ] Centralized Supabase migration management
- [ ] Full shared schema documentation
- [ ] Dashboard app switcher upgrade
- [ ] Global CLAUDE.md conventions in all repos
- [ ] Shared UI rules system
- [ ] Shared TypeScript conventions
- [ ] Migration CLI tooling with cross-app safety checks
- [ ] Supabase RLS audit
- [ ] GSD installed in all 4 repos

### Out of Scope

- Merging apps into a single Next.js deployment — apps stay as separate deployments for independence
- Rewriting existing app internals — we add governance, not refactor working code
- Custom auth provider — Supabase GoTrue works fine
- Paid tier features — staying on free tiers for now

## Context

**Existing repos (all under `c:\Software code GITs\`):**
- `LandManagment Website\portal` — this repo, Next.js 16, Tailwind v4, Supabase
- `camera-trap-dashboard` — WildTrack, camera trap management
- `Fire project system\fire-app` — Fire System, fire management & carbon
- `Trap Monitor\frontend` — Trap Monitor, SMS hardware monitoring

**Shared infrastructure:**
- One Supabase project: `https://itgwanlfvnveljbgraoj.supabase.co`
- Portal owns `portal` schema (apps, app_access, profiles)
- Other apps own their own tables in `public` schema
- All deployed on Vercel free tier

**Key constraint:** The portal's `check_app_access()` RPC, `profiles` table, and `on_auth_user_created` trigger are called by all 3 downstream apps. Changes must not break them.

**Monorepo root:** `c:\Software code GITs\LandManagment Website\` (parent directory)

## Constraints

- **Tech stack**: Next.js 16, TypeScript strict, Tailwind v4, Supabase — no new frameworks
- **Deployment**: Vercel free tier — each app deploys independently
- **Database**: Shared Supabase project — portal schema changes require cross-app impact check
- **Budget**: $0 — free tiers only
- **Code style**: Elegant, concise, no verbose bloat

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gateway architecture (not monolith) | Apps are complex enough to warrant separate deployments; portal controls access | — Pending |
| Parent directory as monorepo root | All repos already live under LandManagment Website | — Pending |
| pnpm/npm workspaces | Link shared deps and tooling without moving repos | — Pending |
| Centralized migrations in portal | Portal already owns the shared schema; natural home for all SQL | — Pending |
| GSD in all 4 repos | Each app can be developed independently with shared conventions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after initialization*
