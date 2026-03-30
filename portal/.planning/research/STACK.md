# Stack Research

**Domain:** Monorepo unification — 4 separate Next.js 16 apps sharing Supabase, Tailwind v4, TypeScript strict
**Researched:** 2026-03-29
**Confidence:** MEDIUM-HIGH (tooling verified via official docs and multiple current sources; exact Tailwind v4 cross-package behavior is a known rough edge)

---

## Scope

This document covers only the NEW stack additions for the v1.0 Unification milestone. The existing validated stack (Next.js 16, TypeScript strict, Tailwind v4, Supabase, Vercel) is not re-researched here.

---

## Recommended Stack

### Monorepo Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pnpm workspaces | ^10.x | Link 4 apps + shared packages without moving repos | Strict isolation prevents phantom deps; content-addressable store saves disk; catalogs feature pins versions once for all packages; best-in-class for monorepos in 2026 |
| pnpm catalogs | pnpm 9.5+ (included in v10) | Centralize shared dependency versions (React, Supabase, Tailwind, TS) in `pnpm-workspace.yaml` | Single line to upgrade shared deps across all 4 apps; eliminates version drift and merge conflicts in `package.json` |

**Why pnpm over npm workspaces:** npm workspaces work but have weaker hoisting controls and no catalogs feature. For 4 tightly-coupled apps sharing React, Supabase, and Tailwind, version drift is a real risk. pnpm catalogs solves this at the workspace level with no extra tooling.

**Why NOT Turborepo:** For 4 apps with no complex build pipelines and no CI caching yet, Turborepo adds a `turbo.json` config layer and remote caching setup for marginal benefit. pnpm workspaces alone handles task orchestration adequately (`pnpm -r run build`, `pnpm --filter portal dev`). Add Turborepo later if build times become a pain point.

**Why NOT Nx:** Significant learning curve and opinionated file structure. Not worth the overhead for a 4-app suite with independent Vercel deployments.

### Shared Component Library

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `packages/ui` workspace package | — | Shared React components (buttons, cards, nav, layout primitives) authored as raw TypeScript/TSX | No build step required; Next.js `transpilePackages` compiles workspace packages through its bundler at app-level |
| Next.js `transpilePackages` | built into Next.js 13+ | Tell each app to compile the `@trackline/ui` workspace package | Eliminates the need for a separate build/watch process for the shared library |

**Approach:** The `packages/ui` package ships raw `.tsx` files (no compile step). Each consuming app adds `transpilePackages: ['@trackline/ui']` to its `next.config.ts`. This is the standard Next.js-native pattern for workspace component libraries and avoids Storybook, Rollup, or tsup complexity that adds no value at this scale.

**Tailwind v4 cross-package caveat (MEDIUM confidence):** Tailwind v4's automatic content scanning only scans the current app's directory. Components in `packages/ui` that use Tailwind classes will not be scanned unless the app's CSS file explicitly adds `@source "../../packages/ui/src/**/*"`. This is a known rough edge; every app's `globals.css` must include this directive. Without it, Tailwind will purge the component classes in production builds.

### Supabase Migration Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `supabase` CLI (npm dev dep) | ^2.84.x | `db push`, type generation, migration tracking | Already in camera-trap-dashboard and fire-app; centralizing at portal (which already owns the shared schema) is the natural home |

**Approach:** A single `supabase/` directory at the monorepo root (or kept in `portal/supabase/`) becomes the authoritative migration store for all schemas. The Supabase CLI's `supabase db push --db-url` flag allows pushing to the shared project from any location. Individual app `supabase/` dirs can remain for local dev (Docker-based) but the canonical migration sequence lives in one place.

**CLI linking:** `supabase link --project-ref <id>` stores the link in `.supabase/`. For monorepo use, prefer `--db-url` to avoid per-directory link state.

**Cross-app safety:** The CLI itself has no built-in cross-app schema protection. Custom safety checks (a pre-push shell script or npm script that greps migration files for forbidden table names) must be authored manually. This is a deliberate workflow convention, not a library.

### Shared TypeScript Configuration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `packages/tsconfig` workspace package | — | Root `tsconfig.base.json` with strict settings, shared paths conventions | Single source of truth for compiler options; apps extend it and add only app-specific paths |

**Approach:**
```
packages/tsconfig/tsconfig.base.json   ← shared strict settings
portal/tsconfig.json                    ← extends @trackline/tsconfig/base
camera-trap-dashboard/tsconfig.json     ← extends @trackline/tsconfig/base
```

**Why a package not a root file:** The 4 repos currently live as siblings in `c:\Software code GITs\LandManagment Website\`. A `packages/tsconfig` workspace package is importable via `@trackline/tsconfig` and works cleanly regardless of the physical directory structure. It also makes the intent explicit.

### Shared ESLint Configuration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `packages/eslint-config` workspace package | — | Shared flat config (ESLint v9) for Next.js + TypeScript | All 4 apps already use `eslint-config-next` flat config; a shared wrapper ensures identical rules without copy-paste |

**Approach:** The package exports a `next.js` config array. Each app's `eslint.config.mjs` imports and spreads it, then adds app-specific overrides. ESLint v9 flat config makes this straightforward — no `FlatCompat` adapter needed since all apps are already on flat config format.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` | ^2.1.x | Conditional className merging | Already in 3 of 4 apps — promote to shared catalog entry |
| `tailwind-merge` | ^3.5.x | Resolve Tailwind class conflicts | Already in camera-trap-dashboard and fire-app — promote to catalog |
| `class-variance-authority` | ^0.7.x | Variant-based component styling | Already in 2 apps; move to `packages/ui` as a peer dep |
| `lucide-react` | ^0.577.x | Icon set | All 4 apps use it — promote to catalog entry |

These are not new additions — they are existing dependencies that should be promoted to `pnpm-workspace.yaml` catalog entries to enforce a single version across all apps.

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm-workspace.yaml` | Workspace package glob + catalog version entries | Lives at monorepo root (`LandManagment Website/`); replaces nothing in app `package.json` files |
| `supabase` CLI | Migration push, type gen, local dev | Keep as dev dep in portal (already the schema owner); fire-app and camera-trap-dashboard can keep their own for local Docker dev |
| Custom migration guard script | Pre-push check for forbidden table names | Shell or Node script that fails if a migration file touches `public.organisations`, `public.org_members`, `public.organization`, `public.user_project`, or any non-portal function |

---

## Installation

```bash
# Install pnpm if not present (global, one-time)
# On Windows: winget install pnpm or npm install -g pnpm

# At monorepo root (LandManagment Website/)
# Create pnpm-workspace.yaml listing all 4 apps
# Then install from root:
pnpm install

# Shared packages (new, no published registry — workspace-local only)
# packages/ui          → @trackline/ui
# packages/tsconfig    → @trackline/tsconfig
# packages/eslint-config → @trackline/eslint-config
```

Each app's `package.json` references shared packages using the workspace protocol:
```json
{
  "dependencies": {
    "@trackline/ui": "workspace:*"
  },
  "devDependencies": {
    "@trackline/tsconfig": "workspace:*",
    "@trackline/eslint-config": "workspace:*"
  }
}
```

Supabase CLI (portal is the migration owner):
```bash
# In portal or monorepo root — push all migrations
npx supabase db push --db-url "$DATABASE_URL"
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| pnpm workspaces | npm workspaces | No catalogs feature; weaker hoisting controls; version drift risk across 4 apps |
| pnpm workspaces | Turborepo + pnpm | Turborepo adds value at scale (CI caching, build orchestration); overkill for 4 apps with independent Vercel deploys and no shared build pipeline |
| pnpm workspaces | Nx | High learning curve, opinionated structure, no benefit for this size |
| Raw TSX in `packages/ui` (no build) | Storybook / tsup-compiled library | Extra build step, watch process, and tooling for a 4-app internal library; `transpilePackages` makes it unnecessary |
| Single migration store in portal | Each app owns its own migrations | Portal already owns shared schema; having one canonical sequence prevents ordering errors and makes cross-app impact checks tractable |
| ESLint v9 flat config shared package | Root `eslint.config.mjs` with overrides | Root config requires a single flat file handling all 4 apps' Next.js plugins simultaneously; the `rootDir` setting breaks per-app plugin resolution |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Yarn Berry PnP | PnP module resolution breaks Next.js and Tailwind PostCSS in non-trivial ways; requires patching | pnpm workspaces |
| Changesets (`@changesets/cli`) | Designed for publishing to npm; these are private internal packages never published | Not needed — workspace protocol handles versioning |
| `nx` or `lerna` | Heavyweight for 4 apps; imposes structure on already-working repos | pnpm workspaces with catalog |
| tsup / rollup for `packages/ui` | Build toolchain for internal package adds rebuild-on-change complexity | `transpilePackages` in next.config.ts |
| Separate Supabase projects per app | The shared project is intentional (shared auth, shared profiles); splitting would require cross-project RPC | One project, one migration store |

---

## Stack Patterns by Variant

**If an app does not use Tailwind v4 (trap-monitor currently lacks `globals.css` structure):**
- Add `@source "../../packages/ui/src/**/*"` once Tailwind is confirmed set up correctly in that app
- Verify `@tailwindcss/postcss` is in devDependencies before consuming `packages/ui` components

**If adding a new schema for an app in the future:**
- Create a new numbered migration file in the central migration store
- Run migration guard script to verify no cross-app tables are touched
- Use `portal.check_app_access()` — do not modify its signature

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@16.1.6` | `react@19.2.3`, `react-dom@19.2.3` | All 4 apps already pinned to these — enforce via pnpm catalog |
| `tailwindcss@^4` | `@tailwindcss/postcss@^4` | v4 PostCSS plugin is separate package; must be in every app's devDeps |
| `supabase@^2.84.x` | Node.js 20+ required for npx/npm usage | Camera-trap already on 2.76.15; safe to bump to 2.84.x |
| `pnpm@^10.x` | Node.js 18.12+ | Windows: install via Scoop or npm; not via winget for latest v10 |
| `typescript@^5` | ESLint v9 + `typescript-eslint@^8` | All 4 apps already on TS5; `typescript-eslint@8` required for ESLint v9 typed linting |

---

## Sources

- pnpm workspaces docs (pnpm.io/workspaces) — workspace protocol, catalog feature — HIGH confidence
- pnpm blog 2025 (pnpm.io/blog/2025/12/29/pnpm-in-2025) — v10 feature summary — HIGH confidence
- WebSearch: "pnpm workspaces Vercel deployment monorepo independent apps 2025" — Vercel root directory pattern — MEDIUM confidence
- WebSearch: "Next.js transpilePackages shared component library workspace no build step 2025" — transpilePackages approach confirmed — MEDIUM confidence
- Next.js docs (nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) — transpilePackages — HIGH confidence
- GitHub discussion: tailwindlabs/tailwindcss #13136 — v4 @source directive requirement for monorepos — HIGH confidence (known issue)
- WebSearch: "Supabase CLI current version npm 2026" — CLI v2.84.x latest — MEDIUM confidence
- WebSearch: "ESLint v9 flat config shared config package monorepo 2025" — @repo/eslint-config pattern — MEDIUM confidence
- Existing `package.json` files for all 4 repos — read directly this session — HIGH confidence

---

*Stack research for: Trackline Portal — v1.0 Unification (monorepo, shared UI, migration management, shared conventions)*
*Researched: 2026-03-29*
