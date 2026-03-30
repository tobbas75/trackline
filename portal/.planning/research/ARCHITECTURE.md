# Architecture Research

**Domain:** Multi-app conservation portal — monorepo unification of 4 existing Next.js repos
**Researched:** 2026-03-29
**Confidence:** HIGH (existing codebase read directly; patterns verified against pnpm and Next.js official docs)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Monorepo Root: c:\Software code GITs\LandManagment Website\        │
│  pnpm-workspace.yaml + turbo.json (optional)                        │
│                                                                      │
│  ┌──────────────┐  packages/                                         │
│  │   portal/    │  ┌──────────────┐  ┌─────────────────────────┐    │
│  │  (auth hub + │  │  @trackline/ │  │   @trackline/           │    │
│  │   landing)   │  │    ui        │  │   supabase-config       │    │
│  │              │  │  (shared     │  │   (shared client        │    │
│  │   ↑ OWNS     │  │   components)│  │    factories + types)   │    │
│  │  migrations/ │  └──────────────┘  └─────────────────────────┘    │
│  └──────────────┘         ↑                       ↑                 │
│                           │ workspace:*            │ workspace:*     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App Layer (4 independent Next.js apps, each deploys to Vercel│   │
│  │                                                               │   │
│  │  portal/     camera-trap-  fire-app/    Trap Monitor/        │   │
│  │  (this repo) dashboard/                 frontend/            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Shared Infrastructure                                        │   │
│  │  Supabase (one project)  ·  Vercel (4 separate projects)     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| Workspace root | `pnpm-workspace.yaml`, shared devDeps, root scripts | `LandManagment Website/` |
| `portal/` | Auth, user management, landing page, migration authority | `LandManagment Website/portal/` |
| `camera-trap-dashboard/` | WildTrack app, independent deployment | `camera-trap-dashboard/` |
| `fire-app/` | Fire system app, independent deployment | `Fire project system/fire-app/` |
| `frontend/` (Trap Monitor) | Trap monitoring app, independent deployment | `Trap Monitor/frontend/` |
| `packages/@trackline/ui` | Shared React components, design tokens, Tailwind source | `LandManagment Website/packages/ui/` |
| `packages/@trackline/supabase-config` | Shared Supabase client factories, `check-access.ts`, shared types | `LandManagment Website/packages/supabase-config/` |
| `portal/supabase/migrations/` | Central home for ALL migration files across all apps | `LandManagment Website/portal/supabase/` |

---

## Recommended Project Structure

```
LandManagment Website/          ← workspace root (new)
├── pnpm-workspace.yaml         ← defines all workspace packages
├── package.json                ← root devDeps (typescript, eslint, turbo)
├── turbo.json                  ← optional, build pipeline (add when needed)
├── .eslintrc.base.js           ← shared ESLint config
├── tsconfig.base.json          ← shared TypeScript base config
│
├── packages/                   ← shared internal packages (new)
│   ├── ui/                     ← @trackline/ui
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── components/     ← Button, Card, Badge, Nav, AppSwitcher...
│   │   │   ├── tokens.css      ← CSS custom properties (design tokens)
│   │   │   └── index.ts        ← barrel export
│   │   └── tsconfig.json       ← extends root tsconfig.base.json
│   │
│   └── supabase-config/        ← @trackline/supabase-config
│       ├── package.json
│       ├── src/
│       │   ├── client.ts       ← createBrowserClient factory
│       │   ├── server.ts       ← createServerClient factory
│       │   ├── check-access.ts ← checkAppAccess(), getUserApps(), isAdmin()
│       │   └── types.ts        ← AppId, AppRole, AppAccess shared types
│       └── tsconfig.json
│
├── portal/                     ← existing portal repo (auth hub + landing)
│   ├── package.json            ← adds workspace:* deps on @trackline/*
│   ├── next.config.ts          ← adds transpilePackages: ['@trackline/ui', ...]
│   ├── src/
│   │   └── app/globals.css     ← imports @trackline/ui/tokens.css
│   └── supabase/
│       └── migrations/         ← ALL migrations live here (portal + other apps)
│           ├── 001_portal_app_access.sql
│           ├── 002_admin_policies.sql
│           ├── 100_wildtrack_schema.sql    ← app-specific migrations
│           ├── 200_fire_schema.sql         ← prefixed by app namespace
│           └── 300_trap_monitor_schema.sql
│
├── camera-trap-dashboard/      ← existing WildTrack repo (separate git)
│   ├── package.json            ← adds workspace:* deps
│   └── next.config.ts          ← adds transpilePackages
│
├── Fire project system/
│   └── fire-app/               ← existing Fire app repo
│       ├── package.json
│       └── next.config.ts
│
└── Trap Monitor/
    └── frontend/               ← existing Trap Monitor repo
        ├── package.json
        └── next.config.ts
```

### Structure Rationale

- **workspace root at `LandManagment Website/`:** All four repos already live here. No files move. Adding `pnpm-workspace.yaml` at this level declares them as one workspace.
- **`packages/` next to `portal/`:** Shared packages sit alongside apps. `portal/` does not own shared code; it only owns migrations.
- **`@trackline/ui` — no build step:** Using Next.js `transpilePackages`, the consuming app compiles the package source directly. No pre-build, no watch process, no publish step required for local development.
- **`@trackline/supabase-config` — no build step:** Same pattern. Source TypeScript is consumed by each app's Next.js bundler.
- **Migrations in `portal/supabase/`:** Portal already has a linked Supabase project and two migrations. Other apps have no migration files at all. Natural centralisation with zero disruption.

---

## Architectural Patterns

### Pattern 1: Workspace-Protocol Linking (No Publishing)

**What:** Internal packages reference each other via `"workspace:*"` in `package.json`. pnpm creates symlinks in `node_modules`. No npm registry involved.

**When to use:** Always for internal `@trackline/*` packages. Never use file: paths — they do not hoist correctly.

**Trade-offs:** Requires pnpm at workspace root. All developers must run `pnpm install` from root, not from individual app directories.

**Example:**
```json
// camera-trap-dashboard/package.json (after migration)
{
  "dependencies": {
    "@trackline/ui": "workspace:*",
    "@trackline/supabase-config": "workspace:*"
  }
}
```

```ts
// camera-trap-dashboard/next.config.ts
const nextConfig = {
  transpilePackages: ['@trackline/ui', '@trackline/supabase-config'],
}
export default nextConfig
```

### Pattern 2: Source-First Shared Components (No Build Step)

**What:** `@trackline/ui` exports TypeScript source files directly. The `main` field in its `package.json` points to `./src/index.ts`. Each consuming Next.js app compiles it via `transpilePackages`.

**When to use:** This pattern applies only because all consumers are Next.js apps. Do not use this if any consumer is outside Next.js (e.g., a Node.js script or Storybook without configuration).

**Trade-offs:**
- Pro: Zero build tooling in the shared package. Edit a component, see it live immediately.
- Con: TypeScript errors in the package surface in the consuming app's build, not the package. Make sure the shared package has its own `tsc --noEmit` check in CI.

**Example:**
```json
// packages/ui/package.json
{
  "name": "@trackline/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  }
}
```

### Pattern 3: CSS Tokens via CSS Import (Tailwind v4)

**What:** Design tokens (custom properties) live in `packages/ui/src/tokens.css`. Each app's `globals.css` imports this file. Tailwind v4 picks up the tokens through `@theme inline` in the consuming app.

**When to use:** This is the correct pattern for Tailwind v4 — CSS-first config, no `tailwind.config.ts`. Tokens must not be duplicated in each app; they must come from the shared package.

**Trade-offs:** The shared package must be transpiled (already covered by `transpilePackages`). The consuming app must have the CSS import in place.

**Example:**
```css
/* portal/src/app/globals.css */
@import "tailwindcss";
@import "@trackline/ui/tokens.css";   /* ← imports shared design tokens */

@theme inline {
  --color-red-dust: var(--red-dust);
  /* ... rest of token mappings */
}
```

### Pattern 4: Centralised Supabase Migrations with Namespace Prefixing

**What:** All migration files live in `portal/supabase/migrations/`. Files are prefixed by app namespace to avoid ordering collisions and make ownership clear.

**When to use:** Immediately. This is the only safe approach given one shared Supabase project. No other app should have its own `supabase/` directory linked to the production project.

**Trade-offs:**
- Pro: One `supabase db push` deploys everything. One place to audit schema changes. Cross-app conflicts are visible in the same folder.
- Con: Any developer touching migrations must be aware of all app schemas to avoid prefix collisions.

**Naming convention:**
```
001–099   portal schema (existing)
100–199   wildtrack / public schema
200–299   fire system / public schema
300–399   trap monitor / public schema
```

### Pattern 5: Vercel Independent Deployments from Monorepo

**What:** Each app has its own Vercel Project. Each project's "Root Directory" is set to the app's subdirectory (e.g., `portal`). Each app has a `vercel.json` that overrides `installCommand` to run from the workspace root so pnpm can resolve workspace symlinks.

**When to use:** This is the only approach that works on Vercel free tier with pnpm workspaces. Turbo prune is the alternative but adds complexity.

**Trade-offs:**
- Pro: Each app deploys independently. A commit to `fire-app/` does not trigger a Portal redeploy.
- Con: Each Vercel project must be configured manually. `installCommand` must cd to workspace root.

**Example per-app `vercel.json`:**
```json
{
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter portal build"
}
```
Note: Path depth in `cd ../..` depends on the app's nesting level relative to the workspace root.

---

## Data Flow

### Auth and Access Control Flow (existing, unchanged by monorepo)

```
User visits app URL
    ↓
App middleware.ts  →  @supabase/ssr refreshes session cookie
    ↓
Protected layout   →  supabase.auth.getUser()
    ↓ (if no user)
Redirect /login (portal URL, or app's own auth pages)
    ↓ (if user)
checkAppAccess(supabase, appId)  →  portal.check_app_access() RPC
    ↓ (no access row)
Redirect /no-access
    ↓ (has access)
Render app dashboard
```

### Shared Component Consumption Flow

```
Developer edits packages/ui/src/components/Button.tsx
    ↓
Next.js dev server in consuming app (transpilePackages active)
    ↓
HMR picks up change immediately — no rebuild of package required
    ↓
Component update visible in app
```

### Migration Deployment Flow

```
Developer writes new migration:
  portal/supabase/migrations/NNN_description.sql
    ↓
Validated locally (supabase db reset or supabase migration up)
    ↓
Committed to portal repo
    ↓
supabase db push --linked  (from portal/ directory)
    ↓
Applied to shared Supabase project
    ↓
All 4 apps see updated schema immediately (shared project)
```

### Key Data Flows

1. **App access gating:** Every app calls `portal.check_app_access(appId)` via RPC on protected route load. This is the single cross-app contract. The function signature must never change without coordinating all four apps.

2. **Profile lookup:** `portal.profiles` is the source of truth for `display_name`, `email`, and `organisation`. WildTrack reads this for org member display. Downstream apps must never read from `public.profiles` (which conflicts — see PITFALLS.md).

3. **Design tokens:** Tokens flow from `packages/ui/src/tokens.css` → each app's `globals.css` → Tailwind v4 `@theme inline` → utility classes available in every component.

---

## Integration Points

### New Components Introduced by This Milestone

| Component | What It Does | Boundary |
|-----------|--------------|----------|
| `packages/ui` | Shared React components + CSS tokens | Consumed by all 4 apps via `transpilePackages` |
| `packages/supabase-config` | Shared Supabase client factories and `check-access.ts` | Consumed by all 4 apps |
| `pnpm-workspace.yaml` | Declares workspace, links packages | Workspace root only |
| `tsconfig.base.json` | Shared TypeScript compiler options | Imported by each app's `tsconfig.json` |
| `.eslintrc.base.js` | Shared lint rules | Imported by each app's ESLint config |
| `portal/supabase/migrations/` | Centralised migration store | All app migrations land here |
| Migration safety CLI | Pre-push script validating cross-app contracts | Runs before `supabase db push` |

### External Service Integration (unchanged)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase | `@supabase/ssr` per app | Credentials remain in each app's `.env.local` |
| Vercel | Per-app Vercel Projects with custom `installCommand` | Free tier, no monorepo-level config |

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| App ↔ `@trackline/ui` | Import via TypeScript, no runtime contract | No server-side code in `@trackline/ui` — React components only |
| App ↔ `@trackline/supabase-config` | Import via TypeScript | Must not import Next.js-specific modules; client/server split maintained |
| App ↔ Supabase | Via `@supabase/ssr` client factories | Each app uses its own env vars; no shared runtime credentials |
| Portal ↔ Satellite apps | Via database RPC `portal.check_app_access()` only | Never direct cross-app HTTP calls |

---

## Build Order

The following order is required when bootstrapping the monorepo:

1. **Create workspace root files** (`pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`)
   — No dependencies.

2. **Create `packages/ui` and `packages/supabase-config`**
   — Depend on root TypeScript config.

3. **Update each app's `package.json`** to add `workspace:*` deps.
   — Depends on packages existing.

4. **Run `pnpm install` from workspace root**
   — Creates symlinks. Must run from root, not app directories.

5. **Update each app's `next.config.ts`** to add `transpilePackages`.
   — Depends on packages being linked.

6. **Extract shared code** from portal into packages (Supabase clients, `check-access.ts`, design tokens).
   — Depends on packages being set up. Do this incrementally, one package at a time, verifying each app builds cleanly before moving to the next.

7. **Move satellite app migrations into `portal/supabase/migrations/`** using namespace prefixes.
   — Can happen independently of the component library work.

8. **Configure Vercel projects** with updated `installCommand` pointing to workspace root.
   — Final step; only needed when deploying.

---

## Anti-Patterns

### Anti-Pattern 1: Running `pnpm install` from an App Directory

**What people do:** `cd portal && pnpm install` to add a dependency.

**Why it's wrong:** Creates a local `node_modules` that shadows the workspace root, breaks symlinks to `@trackline/*` packages, causes "module not found" errors that are hard to trace.

**Do this instead:** Always run `pnpm install` and `pnpm add` from the workspace root, using `--filter` to target a specific app. Example: `pnpm add date-fns --filter portal`.

### Anti-Pattern 2: Keeping a Build Step in `@trackline/ui`

**What people do:** Add a `build` script that compiles TypeScript to `dist/`, point `main` at `dist/index.js`.

**Why it's wrong:** Creates a two-step development loop (edit component → run package build → see change in app). Hot reload breaks. `dist/` gets accidentally committed.

**Do this instead:** Point `main` and `types` at the TypeScript source. Let each consuming Next.js app compile it via `transpilePackages`. This is officially supported and used by Next.js's own monorepo starter.

### Anti-Pattern 3: Duplicating Design Tokens in Each App

**What people do:** Copy `globals.css` token definitions from portal into each app, then diverge.

**Why it's wrong:** Palette drifts. One app gets an updated `red-dust` value, others don't. Brand consistency breaks.

**Do this instead:** `@trackline/ui/src/tokens.css` is the single definition. Each app imports it. If an app needs a local override for a specific token, it overrides in its own `globals.css` after the import — documented, intentional, visible.

### Anti-Pattern 4: Putting Migrations in Satellite App Repos

**What people do:** Run `supabase init` in `camera-trap-dashboard/` and manage WildTrack migrations there.

**Why it's wrong:** Two `supabase` directories linked to the same project create a split migration history. Running `db push` from either becomes unsafe because neither directory knows about the other's migrations. `supabase migration list` diverges.

**Do this instead:** All migrations in `portal/supabase/migrations/`, namespaced by app prefix. Only one directory is linked to the production Supabase project.

### Anti-Pattern 5: Modifying `portal.check_app_access()` Signature Without Coordinating All Apps

**What people do:** Add a new return column to the RPC to carry extra data, breaking callers that destructure a fixed shape.

**Why it's wrong:** `checkAppAccess()` is called by all three satellite apps. The function return is typed in `@trackline/supabase-config/src/check-access.ts`. Changing the DB function without updating the shared type and all call sites causes silent runtime failures.

**Do this instead:** Any change to `portal.check_app_access()` must be treated as a breaking API change. Update the migration, the shared type, and all consuming call sites in a single coordinated commit.

---

## Scaling Considerations

This suite runs on Supabase free tier for a small number of conservation practitioners. Scaling is not a current concern. The architecture decisions that matter for this scale:

| Concern | Current Approach | When to Revisit |
|---------|-----------------|-----------------|
| Shared Supabase project | One project, shared rate limits | If any app hits Supabase free tier limits (500 MB DB, 2 GB bandwidth) |
| Package publish | Source-only, no versioning | If any consumer outside Next.js needs the package |
| Build caching | None (pnpm workspaces only) | If CI build time exceeds 5 min — add Turborepo |
| Type generation | Manual per app | If schema diverges frequently — centralise `supabase gen types` |

---

## Sources

- pnpm Workspaces documentation: [https://pnpm.io/workspaces](https://pnpm.io/workspaces)
- Next.js `transpilePackages`: [https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- Vercel Monorepo deployment: [https://vercel.com/docs/monorepos](https://vercel.com/docs/monorepos)
- Supabase Database Migrations: [https://supabase.com/docs/guides/deployment/database-migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- Tailwind v4 in Turbo Monorepo: [https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039](https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039)
- Existing codebase — portal `src/lib/check-access.ts` (read directly this session)
- Existing codebase — portal `supabase/migrations/001_portal_app_access.sql` (read directly this session)
- Existing codebase — portal `.planning/codebase/ARCHITECTURE.md` (read directly this session)
- Existing codebase — `TRACKLINE_INTEGRATION_MASTER.md` (read directly this session)

---

*Architecture research for: Trackline portal — monorepo unification*
*Researched: 2026-03-29*
