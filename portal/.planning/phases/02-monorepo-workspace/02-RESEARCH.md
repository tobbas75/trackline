# Phase 2: Monorepo Workspace - Research

**Researched:** 2026-03-30
**Domain:** pnpm workspaces v10, shared TypeScript config, shared ESLint flat config, GSD initialization
**Confidence:** HIGH (core pnpm/TS/ESLint patterns verified; workspace root layout decision documented with evidence)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase
goal, success criteria, and codebase conventions to guide decisions.

Key context from research:
- pnpm workspaces v10 with catalogs is the target
- Parent directory (LandManagment Website/) is the monorepo root
- Each app stays in its current directory — no file moves
- transpilePackages in next.config.ts for shared packages
- Tailwind v4 @source directives needed for cross-package CSS
- No Turborepo — pnpm --filter is sufficient at this scale

### Claude's Discretion
All implementation details (file layout, script names, catalog entries, tsconfig structure, ESLint export shape).

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MONO-01 | pnpm workspace at parent directory linking all 4 repos as packages | Workspace root layout decision in Architecture section; critical directory layout finding below |
| MONO-02 | Shared tsconfig.base.json with strict TypeScript settings extended by all apps | All 4 apps have identical tsconfig — extraction is straightforward; see Standard Stack |
| MONO-03 | Shared ESLint config package (packages/eslint-config) with flat config format | 3 of 4 apps already use identical flat config; trap-monitor uses `next lint` (legacy); see Common Pitfalls |
| MONO-04 | Root package.json with workspace scripts (build, lint, typecheck across all apps) | pnpm `--filter` or `-r` flags enable workspace-wide scripts; see Code Examples |
| MONO-05 | pnpm catalogs pinning shared dependency versions (React, Next.js, Supabase, Tailwind) | Version audit below shows minor drift across apps — see Catalog Entries section |
| CONV-03 | GSD installed and initialized in all 4 repos | Portal and camera-trap already have `.claude/` settings; fire-app and trap-monitor need init; see Environment section |
| CONV-04 | Shared TypeScript naming conventions documented | Conventions can be derived from existing codebase patterns; a CONVENTIONS.md document is the deliverable |
</phase_requirements>

---

## Summary

This phase establishes a pnpm v10 workspace linking the Trackline portal, WildTrack
(camera-trap-dashboard), Fire System (fire-app), and Trap Monitor (trap-monitor frontend) as a single
workspace. Shared infrastructure — `packages/tsconfig` and `packages/eslint-config` — is created
once and extended by all four apps. pnpm catalogs pin shared dependency versions to prevent drift.

**Critical finding:** The CONTEXT.md statement "each app stays in its current directory — no file
moves" conflicts with the actual filesystem layout. The satellite apps are NOT inside
`LandManagment Website/` — they are siblings of it inside `C:/Software code GITs/`. pnpm workspace's
`packages` field does not support `../` paths outside the workspace root (confirmed bug pnpm/pnpm
#10096, filed Oct 2025, open as of research date). The workspace root MUST contain all app
directories. The planner must resolve this before creating task files. The recommended resolution is
documented under Open Questions.

**Primary recommendation:** Establish the workspace root at `LandManagment Website/` and move the
three satellite apps into `LandManagment Website/` subdirectories. Each app keeps its own git history
(they are independent git repos). This contradicts the stated "no file moves" constraint, which
appears to have been written without accurate knowledge of the physical directory layout.

---

## Critical Directory Layout Finding

**Current state (verified by ls and git rev-parse):**

```
C:/Software code GITs/
├── LandManagment Website/          ← VS Code workspace root, only portal/ is here
│   ├── portal/                     ← git repo, has .planning/
│   └── workspace.code-workspace    ← references ../camera-trap-dashboard etc.
├── camera-trap-dashboard/          ← independent git repo (OUTSIDE LandManagment Website/)
├── Fire project system/
│   └── fire-app/                   ← independent git repo (OUTSIDE LandManagment Website/)
└── Trap Monitor/
    └── frontend/                   ← NOT its own git repo; parent Trap Monitor/ is git root
```

The `workspace.code-workspace` file references satellite apps via `../` relative paths, confirming
they live outside `LandManagment Website/`.

**Why this matters for pnpm workspace:** pnpm-workspace.yaml `packages` glob patterns resolve
relative to the directory containing the file. Patterns like `'../camera-trap-dashboard'` are not
supported — pnpm issue #10096 (filed Oct 2025) confirms that packages in ancestor directories
cause pnpm install to produce no node_modules. This is an open bug, not a planned feature.

**Resolution required by planner (see Open Questions #1).**

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 10.33.0 (latest) | Package manager + workspace linking | Catalogs feature, strict hoisting, content-addressable store — best monorepo PM in 2026 |
| pnpm workspaces | Built into pnpm v10 | Link packages without publishing | `workspace:*` protocol; no registry needed for internal packages |
| pnpm catalogs | pnpm 9.5+ / v10 | Pin shared dep versions in pnpm-workspace.yaml | Single upgrade point for React, Next.js, Supabase, Tailwind across all apps |

**Version verified:** `npm view pnpm version` → 10.33.0 (checked 2026-03-30).

**pnpm not currently installed on this machine.** Must be installed as part of Phase 2 Wave 0.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| packages/tsconfig | (internal) | Shared tsconfig.base.json | Extended by all 4 apps and shared packages |
| packages/eslint-config | (internal) | Shared ESLint v9 flat config wrapper | Imported by each app's eslint.config.mjs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm workspaces | npm workspaces | No catalogs; weaker hoisting; version drift risk |
| pnpm workspaces | Turborepo + pnpm | Turborepo adds value at CI scale with caching; overkill for 4 apps |
| Shared `packages/tsconfig` | Root tsconfig.base.json only | Package form is importable via `@trackline/tsconfig`; clearer ownership |
| Per-app ESLint configs (current) | Shared `packages/eslint-config` | Current approach = copy-paste drift; shared package enforces consistency |

**Installation (after workspace root is established):**

```bash
# Install pnpm globally (one-time, on this machine)
npm install -g pnpm@10

# From workspace root
pnpm install
```

---

## Current App State Audit

### package.json names (workspace package identifiers)

| App | `name` field | Location |
|-----|-------------|----------|
| Portal | `portal` | `LandManagment Website/portal/` |
| WildTrack | `camera-trap-dashboard` | `camera-trap-dashboard/` |
| Fire System | `fire-app` | `Fire project system/fire-app/` |
| Trap Monitor | `trap-monitor-dashboard` | `Trap Monitor/frontend/` |

### Lock file state

All 4 apps have `package-lock.json` (npm). These must be replaced with a single `pnpm-lock.yaml` at
the workspace root after running `pnpm install`.

### Dependency version audit

| Package | portal | camera-trap | fire-app | trap-monitor | Catalog target |
|---------|--------|-------------|----------|--------------|----------------|
| react | `19.2.3` | `19.2.3` | `19.2.3` | `^19.2.3` | `19.2.3` (exact) |
| react-dom | `19.2.3` | `19.2.3` | `19.2.3` | `^19.2.3` | `19.2.3` (exact) |
| next | `16.1.6` | `16.1.6` | `16.1.6` | `^16.1.6` | `16.1.6` (exact) |
| @supabase/ssr | `^0.9.0` | `^0.9.0` | `^0.9.0` | `^0.9.0` | `^0.9.0` |
| @supabase/supabase-js | `^2.98.0` | `^2.98.0` | `^2.98.0` | `^2.98.0` | `^2.98.0` |
| tailwindcss | `^4` | `^4` | `^4` | `^4.0.0` | `^4` |
| @tailwindcss/postcss | `^4` | `^4` | `^4` | `^4.0.0` | `^4` |
| typescript | `^5` | `^5` | `^5` | `^5.4.0` | `^5` |
| eslint | `^9` | `^9` | `^9` | `^9.0.0` | `^9` |
| eslint-config-next | `16.1.6` | `16.1.6` | `16.1.6` | `^16.1.6` | `16.1.6` (exact) |
| lucide-react | `^0.577.0` | `^0.576.0` | `^0.575.0` | absent | `^0.577.0` |
| clsx | absent | `^2.1.1` | `^2.1.1` | `^2.1.0` | `^2.1.1` |
| tailwind-merge | absent | `^3.5.0` | `^3.5.0` | absent | `^3.5.0` |
| @types/react | `^19` | `^19` | `^19` | `^19.0.0` | `^19` |
| @types/node | `^20` | `^20` | `^20` | `^20.0.0` | `^20` |

**Key observation:** lucide-react has minor patch divergence across apps — portal is newest at
^0.577.0. Catalog should use portal's version as it is the most recent.

### tsconfig.json audit

All 4 apps have **identical** `compilerOptions` (verified by reading all 4 files this session):

```json
{
  "target": "ES2017",
  "lib": ["dom", "dom.iterable", "esnext"],
  "allowJs": true,
  "skipLibCheck": true,
  "strict": true,
  "noEmit": true,
  "esModuleInterop": true,
  "module": "esnext",
  "moduleResolution": "bundler",
  "resolveJsonModule": true,
  "isolatedModules": true,
  "jsx": "react-jsx",
  "incremental": true,
  "plugins": [{ "name": "next" }],
  "paths": { "@/*": ["./src/*"] }
}
```

Only the `include` field differs slightly (trap-monitor omits `**/*.mts`). All have identical
`exclude: ["node_modules"]`. Extraction to `tsconfig.base.json` is clean — every option is shared.
App-level tsconfig only needs to extend the base and add app-specific `include`/`paths`.

### ESLint config audit

| App | Config file | Format | Content |
|-----|-------------|--------|---------|
| portal | `eslint.config.mjs` | flat (v9) | `nextVitals + nextTs` |
| camera-trap | `eslint.config.mjs` | flat (v9) | `nextVitals + nextTs` (identical to portal) |
| fire-app | `eslint.config.mjs` | flat (v9) | `nextVitals + nextTs` (identical to portal) |
| trap-monitor | none | n/a (uses `next lint`) | No config file at project root |

Portal, camera-trap, and fire-app have **identical** `eslint.config.mjs`. Trap-monitor uses the
legacy `next lint` command (which uses a built-in Next.js config, no flat config file). Trap-monitor
needs a new `eslint.config.mjs` before it can consume the shared package.

---

## Architecture Patterns

### Recommended Project Structure (after workspace root resolution)

```
LandManagment Website/                  ← workspace root
├── pnpm-workspace.yaml                 ← workspace definition + catalogs
├── package.json                        ← name: "trackline-workspace", root scripts
├── .npmrc                              ← pnpm settings (node-linker, shamefully-hoist)
├── packages/
│   ├── tsconfig/                       ← @trackline/tsconfig
│   │   ├── package.json
│   │   └── tsconfig.base.json
│   └── eslint-config/                  ← @trackline/eslint-config
│       ├── package.json
│       └── index.mjs
├── portal/                             ← existing app (no changes to internals)
│   ├── package.json                    ← deps updated to catalog:
│   ├── tsconfig.json                   ← extends @trackline/tsconfig
│   └── eslint.config.mjs              ← imports @trackline/eslint-config
├── [camera-trap-dashboard or apps/wildtrack]    ← satellite app (location TBD — see Open Questions)
├── [fire-app or apps/fire]
└── [trap-monitor or apps/trap-monitor]
```

### Pattern 1: pnpm-workspace.yaml with Catalogs

**What:** Root workspace definition file combining package glob patterns and shared version catalog.

**Example:**
```yaml
# pnpm-workspace.yaml at LandManagment Website/
packages:
  - 'portal'
  - 'packages/*'
  - 'camera-trap-dashboard'       # ← only works if apps are INSIDE LandManagment Website/
  - 'Fire project system/fire-app'
  - 'Trap Monitor/frontend'

catalog:
  react: '19.2.3'
  react-dom: '19.2.3'
  next: '16.1.6'
  '@supabase/ssr': '^0.9.0'
  '@supabase/supabase-js': '^2.98.0'
  tailwindcss: '^4'
  '@tailwindcss/postcss': '^4'
  typescript: '^5'
  eslint: '^9'
  'eslint-config-next': '16.1.6'
  lucide-react: '^0.577.0'
  clsx: '^2.1.1'
  'tailwind-merge': '^3.5.0'
  '@types/react': '^19'
  '@types/react-dom': '^19'
  '@types/node': '^20'
```

**Using catalog in package.json (after migration):**
```json
{
  "dependencies": {
    "react": "catalog:",
    "next": "catalog:",
    "@supabase/ssr": "catalog:"
  }
}
```

### Pattern 2: packages/tsconfig — Shared Base Config

**What:** A minimal internal package that exports `tsconfig.base.json`. Each app's tsconfig extends it.

**packages/tsconfig/package.json:**
```json
{
  "name": "@trackline/tsconfig",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./base.json": "./tsconfig.base.json"
  }
}
```

**packages/tsconfig/tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

Note: `incremental`, `plugins: [{ "name": "next" }]`, and `paths` are app-specific — kept in each
app's `tsconfig.json`, not in the base.

**App-level tsconfig.json (after migration):**
```json
{
  "extends": "@trackline/tsconfig/base.json",
  "compilerOptions": {
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Pattern 3: packages/eslint-config — Shared Flat Config

**What:** An internal package that exports a pre-composed ESLint flat config array for Next.js apps.
Each app imports and re-exports it (with optional overrides). This is the pattern used by major
monorepos (Turborepo's own template uses `@repo/eslint-config`).

**packages/eslint-config/package.json:**
```json
{
  "name": "@trackline/eslint-config",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.mjs",
  "exports": {
    ".": "./index.mjs"
  },
  "peerDependencies": {
    "eslint": "^9",
    "eslint-config-next": "*"
  }
}
```

**packages/eslint-config/index.mjs:**
```js
// Source: verified pattern from ESLint v9 monorepo research
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export const nextConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
```

**App-level eslint.config.mjs (after migration):**
```js
import { nextConfig } from "@trackline/eslint-config";
export default nextConfig;
```

### Pattern 4: Root package.json Workspace Scripts

**What:** The workspace root `package.json` defines scripts that run across all packages using pnpm
filter flags.

**Root package.json:**
```json
{
  "name": "trackline-workspace",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "typecheck": "pnpm -r --filter='./packages/*' --filter='./portal' --filter='./camera-trap-dashboard' run typecheck",
    "lint": "pnpm -r run lint",
    "build": "pnpm -r run build",
    "dev:portal": "pnpm --filter portal dev",
    "dev:wildtrack": "pnpm --filter camera-trap-dashboard dev",
    "dev:fire": "pnpm --filter fire-app dev",
    "dev:trap": "pnpm --filter trap-monitor-dashboard dev"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

Note: `pnpm -r run` runs a script in every workspace package that has it. Packages without the
script are skipped silently.

### Pattern 5: Vercel Per-App vercel.json

**What:** Each app needs a `vercel.json` so Vercel can install from the workspace root, not the app
directory. Without this, Vercel runs `npm install` in the app dir and fails to resolve workspace
symlinks.

**Example per-app vercel.json (path depth depends on final layout):**
```json
{
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter portal build"
}
```

The `cd` depth depends on the app's nesting relative to the workspace root. This should be set
correctly for each app once the workspace root layout is finalized.

### Anti-Patterns to Avoid

- **Running `pnpm install` from an app directory:** Creates a local `node_modules` that shadows
  workspace root, breaking `@trackline/*` symlinks. Always `pnpm add --filter <app>` from root.
- **Adding `incremental` or `plugins` to tsconfig.base.json:** These are Next.js-specific; they break
  non-Next.js consumers. Keep in app-level tsconfig only.
- **Building `packages/eslint-config` with tsc:** It uses `.mjs` source directly — no build step.
  Same for `packages/tsconfig` — it exports JSON, no compilation needed.
- **Leaving package-lock.json files in place:** After `pnpm install` from root, delete all
  `package-lock.json` files from individual apps. Having both causes confusion and stale installs.
- **Using `eslint-config-next` as a direct dep in `packages/eslint-config`:** It should be a
  `peerDependency` — the consuming app (which already has `eslint-config-next`) provides it. Adding
  it as a direct dep in the shared package creates two copies of the plugin.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version pinning across apps | Custom version check script | pnpm catalogs | Catalogs integrate with lockfile; custom scripts miss transitive pinning |
| Shared TypeScript base | Copy-paste tsconfig in each app | `packages/tsconfig` extends pattern | Copy-paste drifts silently; one edit breaks apps inconsistently |
| Shared ESLint rules | Root `.eslintrc` with ignore patterns | `packages/eslint-config` shared package | Root config cannot scope `eslint-config-next`'s `rootDir` correctly per app |
| Workspace-wide typecheck | Shell loop with per-app `tsc` | `pnpm -r run typecheck` | pnpm -r parallelizes, reports per-package, exits non-zero on any failure |

**Key insight:** ESLint flat config shares naturally through packages (import + spread). A root
eslint.config.mjs that tries to handle all 4 apps fails because `eslint-config-next` needs a
`rootDir` per project for typed linting — the shared package pattern avoids this entirely.

---

## Common Pitfalls

### Pitfall 1: pnpm packages field cannot use ../ paths

**What goes wrong:** `pnpm install` from `LandManagment Website/` with packages like
`'../camera-trap-dashboard'` silently produces no node_modules for the referenced packages.

**Why it happens:** pnpm's glob resolver does not support traversing outside the workspace root. This
is a confirmed open bug (pnpm/pnpm #10096, filed Oct 2025). The PR to fix it (#10097) was pending
as of research date.

**How to avoid:** All workspace packages must be inside the workspace root directory. Move satellite
apps into `LandManagment Website/` before attempting `pnpm install`.

**Warning signs:** `pnpm install` completes without error but satellite apps have no `node_modules`,
or workspace packages are not found by `pnpm --filter <name>`.

### Pitfall 2: `eslint-config-next` as direct dep in shared ESLint package

**What goes wrong:** Each app's `eslint-config-next` is version-locked to its Next.js version
(both should be `16.1.6`). If the shared package bundles its own copy of `eslint-config-next`, it
creates two plugin instances, causing "definition for rule X was not found" errors.

**Why it happens:** ESLint flat config does not deduplicate plugins automatically.

**How to avoid:** Declare `eslint-config-next` as `peerDependencies` only in `packages/eslint-config`.
The consuming app already has it in its own `devDependencies`.

### Pitfall 3: Trap Monitor uses `next lint` not `eslint` directly

**What goes wrong:** Trap Monitor's `package.json` has `"lint": "next lint"`, not `"lint": "eslint"`.
It also has no `eslint.config.mjs`. Running `pnpm -r run lint` will execute `next lint` for that app
only — which uses a built-in legacy Next.js lint config, not the shared flat config.

**Why it happens:** Trap Monitor was never set up with ESLint flat config.

**How to avoid:** Create `eslint.config.mjs` in trap-monitor that imports from
`@trackline/eslint-config`, and update its `package.json` lint script to `"lint": "eslint"`.

### Pitfall 4: Windows pnpm installation via npm global (permissions)

**What goes wrong:** `npm install -g pnpm` on Windows with npm@11 may fail with EPERM errors if
npm's global prefix is a protected directory.

**Why it happens:** Windows npm global installs go to `%APPDATA%\npm` by default; some machines
restrict this.

**How to avoid:** Use `winget install pnpm.pnpm` (winget v1.28.220 is available on this machine) or
install via Corepack (`corepack enable && corepack prepare pnpm@10 --activate`). Verify with
`pnpm --version` after install.

### Pitfall 5: package-lock.json conflicts after pnpm install

**What goes wrong:** Apps retain their `package-lock.json` files after pnpm workspace install.
Running `npm install` inside an app directory re-creates an npm lockfile that shadows the workspace
linkage.

**Why it happens:** Developers muscle-memory `npm install` in an app directory.

**How to avoid:** Delete all 4 `package-lock.json` files during Phase 2. Add `.npmrc` at workspace
root with `package-manager-strict=false` warning, and document in CONTRIBUTING or `CLAUDE.md` that
`pnpm` from workspace root is the only valid install command.

### Pitfall 6: `tsconfig.json` paths conflict with workspace packages

**What goes wrong:** Each app currently has `"paths": { "@/*": ["./src/*"] }`. After extending the
shared base, this path alias must remain in the app-level config — not in `tsconfig.base.json`.
If accidentally placed in base, all apps get the alias but the relative path resolves from the wrong
directory.

**Why it happens:** The `@/*` alias looks like a shared convention but its meaning is
app-relative.

**How to avoid:** Keep `paths` in the app-level `tsconfig.json` only. The base config contains no
`paths` entry.

### Pitfall 7: pnpm Windows hard-links across drives

**What goes wrong:** pnpm uses hard-links from its content-addressable store. If the store is on a
different drive than the workspace, pnpm falls back to copying — which is slower and uses more disk.

**Why it happens:** Hard links cannot span drives on Windows.

**How to avoid:** Verify that pnpm store is on the same drive as `C:/Software code GITs/`. The
default store at `%LOCALAPPDATA%\pnpm\store` is on the C: drive, same as the workspace. This should
be fine unless the user has a custom store location.

---

## Code Examples

### pnpm-workspace.yaml (complete)

```yaml
# Source: pnpm.io/pnpm-workspace_yaml + pnpm.io/catalogs

packages:
  - 'portal'
  - 'packages/*'
  # Satellite app entries depend on final directory layout (see Open Questions #1)
  - 'camera-trap-dashboard'
  - 'fire-app'
  - 'trap-monitor'

catalog:
  react: '19.2.3'
  react-dom: '19.2.3'
  next: '16.1.6'
  '@supabase/ssr': '^0.9.0'
  '@supabase/supabase-js': '^2.98.0'
  tailwindcss: '^4'
  '@tailwindcss/postcss': '^4'
  typescript: '^5'
  eslint: '^9'
  'eslint-config-next': '16.1.6'
  'lucide-react': '^0.577.0'
  clsx: '^2.1.1'
  'tailwind-merge': '^3.5.0'
  '@types/react': '^19'
  '@types/react-dom': '^19'
  '@types/node': '^20'
```

### .npmrc (workspace root)

```ini
# Source: pnpm.io/faq + Windows workspace experience
node-linker=hoisted
shamefully-hoist=true
```

Note: `node-linker=hoisted` is recommended when any app uses tools that rely on flat
node_modules resolution (e.g., shadcn, Next.js). Without it, Next.js occasionally fails to resolve
peer dependencies from nested workspace packages.

### Root package.json (complete)

```json
{
  "name": "trackline-workspace",
  "version": "0.0.1",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "typecheck": "pnpm -r run typecheck",
    "lint": "pnpm -r run lint",
    "build:portal": "pnpm --filter portal build",
    "build:wildtrack": "pnpm --filter camera-trap-dashboard build",
    "build:fire": "pnpm --filter fire-app build",
    "build:trap": "pnpm --filter trap-monitor-dashboard build",
    "dev:portal": "pnpm --filter portal dev",
    "dev:wildtrack": "pnpm --filter camera-trap-dashboard dev",
    "dev:fire": "pnpm --filter fire-app dev",
    "dev:trap": "pnpm --filter trap-monitor-dashboard dev"
  }
}
```

The `packageManager` field enables Corepack enforcement — developers using npm or yarn get an error
message directing them to use pnpm.

### GSD initialization in satellite apps (CONV-03)

GSD is installed globally at `~/.claude/get-shit-done/`. "Initialized" for a repo means:
1. A `.planning/config.json` exists with project-appropriate settings
2. A `CLAUDE.md` is present (already done in Phase 1 for all 4 apps — CONV-01 complete)

Current state:
- portal: `.planning/` exists — GSD already initialized
- camera-trap-dashboard: has `.claude/settings.local.json` but no `.planning/` — needs init
- fire-app: no `.claude/` and no `.planning/` — needs init
- trap-monitor: no `.claude/` and no `.planning/` — needs init

For satellite apps, "init" means creating a minimal `.planning/config.json` that matches the
workspace's preferences. The satellite apps do not need a full GSD project setup (no REQUIREMENTS.md,
ROADMAP.md) — just the `.planning/` directory with config so GSD tools can run there.

### TypeScript naming conventions document (CONV-04)

This is a documentation deliverable, not code. The document should capture patterns already present
in the codebase:

- **Files:** kebab-case (`check-access.ts`, `app-switcher.tsx`)
- **Components:** PascalCase (`AppSwitcher`, `UserAvatar`)
- **Functions/variables:** camelCase (`checkAppAccess`, `getUserApps`)
- **Types/interfaces:** PascalCase with no `I` prefix (`AppAccess`, `UserProfile`)
- **Constants:** `SCREAMING_SNAKE_CASE` for module-level, camelCase for local
- **Named exports everywhere** (except Next.js page/layout default exports)
- **Server Components by default** — `"use client"` only when event handlers or hooks required

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | pnpm, workspace scripts | YES | 24.14.0 | — |
| npm | pnpm installation | YES | 11.9.0 | — |
| winget | pnpm installation (alt) | YES | 1.28.220 | npm install -g pnpm |
| pnpm | All workspace operations | NO | — | Must install; see Pitfall 4 |
| git (portal) | Phase 2 commits | YES | (portal is a git repo) | — |
| git (camera-trap) | Phase 2 commits | YES | independent git repo | — |
| git (fire-app) | Phase 2 commits | YES | independent git repo | — |
| git (trap-monitor) | Phase 2 commits | YES | (Trap Monitor/ is git root) | — |

**Missing dependencies with no fallback:**
- pnpm — must be installed before `pnpm install` can run. Use `winget install pnpm.pnpm` or
  `npm install -g pnpm@10`.

**Missing dependencies with fallback:**
- None beyond pnpm.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint v8 `.eslintrc.js` format | ESLint v9 flat config (`eslint.config.mjs`) | ESLint v9.0 (2024) | 3 of 4 apps already use flat config; trap-monitor needs migration |
| Shared ESLint via `extends: "@repo/config"` (legacy) | Import array spread in flat config | ESLint v9 | Simpler — no `FlatCompat` adapter needed; direct import |
| tsup/rollup compiled shared packages | Raw TypeScript source + `transpilePackages` | Next.js 13+ | No separate build step for internal packages |
| npm workspaces | pnpm workspaces with catalogs | pnpm 9.5+ | Catalogs feature is the key differentiator |

---

## Open Questions

### 1. Workspace Root Layout — PLANNER MUST RESOLVE BEFORE TASK CREATION

**What we know:** pnpm-workspace.yaml `packages` field cannot reference directories outside the
workspace root (pnpm/pnpm #10096, confirmed open bug). The satellite apps are currently outside
`LandManagment Website/`, making a standard workspace install impossible without restructuring.

**What's unclear:** The ROADMAP states "without moving files" but this appears to have been written
without knowing the actual directory layout. The user may or may not be willing to move files.

**Options for the planner:**

Option A (recommended): Move satellite apps into `LandManagment Website/` as direct children.
```
LandManagment Website/
├── portal/
├── camera-trap-dashboard/     ← moved from C:/Software code GITs/camera-trap-dashboard/
├── fire-app/                  ← moved from C:/Software code GITs/Fire project system/fire-app/
├── trap-monitor/              ← moved from C:/Software code GITs/Trap Monitor/frontend/
└── packages/
```
- Git histories are preserved (each is its own git repo, `git mv` is not needed — just move folders)
- Vercel project Root Directory settings need updating
- VS Code workspace.code-workspace paths need updating
- This is the clean monorepo pattern; all known tooling supports it

Option B: Set workspace root at `C:/Software code GITs/`. This would include all 15+ sibling
repos as potential workspace packages — unacceptable scope pollution.

Option C: Phase 2 establishes workspace for `portal + packages` only; satellite apps remain
independent npm projects that will use file: or registry references in Phase 3. This defers full
workspace integration but satisfies MONO-02/03/04/05 for portal. MONO-01 ("linking all 4 repos")
is not satisfied by this option.

**Recommendation:** Option A. Ask the user to confirm before creating tasks that involve moving
directories. A one-time restructure is far preferable to a permanent architectural compromise.

### 2. CONV-04 conventions document — format and location

**What we know:** CONV-04 requires "shared TypeScript naming conventions documented". The user has
not specified where this lives.

**What's unclear:** Should it be a `CONVENTIONS.md` at workspace root, added to each app's
`CLAUDE.md`, or embedded in the shared `packages/tsconfig/README.md`?

**Recommendation:** Create `LandManagment Website/CONVENTIONS.md` (workspace root). Each app's
`CLAUDE.md` can reference it with a relative path. This is the highest-visibility location.

---

## Sources

### Primary (HIGH confidence)
- pnpm.io/workspaces — workspace protocol, packages field behavior
- pnpm.io/catalogs — catalog: syntax, named catalogs, package.json usage
- pnpm.io/pnpm-workspace_yaml — packages field glob patterns
- pnpm/pnpm GitHub Issue #10096 — confirmed: `../` paths in packages field not supported
- pnpm/pnpm PR #10097 — fix in progress (not yet merged as of research date)
- nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages — transpilePackages API
- All 4 app package.json, tsconfig.json, eslint.config.mjs — read directly this session (HIGH)
- workspace.code-workspace — read directly this session, confirms satellite apps outside LandManagment Website/

### Secondary (MEDIUM confidence)
- medium.com/@brianonchain — vercel.json installCommand pattern for pnpm monorepo, confirmed against Vercel docs
- medium.com/@felipeprodev — ESLint v9 shared config package pattern (peerDependencies approach)
- pnpm.io/faq + pnpm/discussions/6800 — Windows junctions vs hard-links behavior

### Tertiary (LOW confidence — flag for validation)
- `.npmrc` node-linker=hoisted recommendation — widely cited in 2025 guides for Next.js + pnpm;
  should be tested on this specific project before committing to it

---

## Project Constraints (from CLAUDE.md)

Directives from `portal/CLAUDE.md` relevant to this phase:

- Framework: Next.js 16 (App Router) — confirmed, all 4 apps
- Language: TypeScript (strict) — all 4 apps already have strict: true
- UI: Tailwind CSS v4 (CSS-based config, no tailwind.config.ts) — 3 of 4 apps; trap-monitor has `tailwind.config.js.backup` suggesting a v3→v4 migration was partially done
- No hardcoded secrets, no `.env` committed
- Named exports only (except Next.js page/layout components) — planner must preserve this in shared packages
- Server Components by default; `"use client"` only when needed
- All Supabase tables must have RLS (not directly relevant to this phase)
- Never touch public.* tables owned by other apps (not directly relevant to this phase)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pnpm v10, catalogs verified via official docs and npm registry
- Architecture patterns: HIGH — all 4 app tsconfig/eslint configs read directly; patterns verified
- Directory layout finding: HIGH — confirmed by reading workspace.code-workspace and running ls
- pnpm ../ limitation: HIGH — confirmed by GitHub issue #10096 with PR reference
- Pitfalls: HIGH for documented issues, MEDIUM for Windows-specific behaviors (single-source)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (pnpm catalogs/workspace stable; ESLint v9 stable; Next.js 16 stable)
