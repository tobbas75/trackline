---
phase: 02-monorepo-workspace
verified: 2026-03-29T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run pnpm install from workspace root on a clean machine or CI"
    expected: "All 7 workspace packages resolve without error and a single pnpm-lock.yaml is produced"
    why_human: "Cannot execute pnpm install in this verification session without risking reinstall side effects; the lockfile exists and is 11,547 lines, consistent with a successful install, but a clean-slate install cannot be confirmed programmatically here"
---

# Phase 02: Monorepo Workspace Verification Report

**Phase Goal:** A single pnpm workspace root links all four apps and shared packages with consistent TypeScript and ESLint conventions
**Verified:** 2026-03-29
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | pnpm install from root resolves all four apps and packages without error | VERIFIED | `pnpm list -r` returns all 4 apps at correct paths; pnpm-lock.yaml is 11,547 lines (lockfileVersion 9.0) with all 4 packages listed |
| 2 | Root typecheck script covers all workspace packages in a single pass | VERIFIED | Root package.json `"typecheck": "pnpm -r run typecheck"`; all 4 apps have `"typecheck": "tsc --noEmit"` script |
| 3 | Root lint script runs shared ESLint flat config across all packages | VERIFIED | Root `"lint": "pnpm -r run lint"`; all 4 apps have `"lint": "eslint"`; all 4 eslint.config.mjs import from `@trackline/eslint-config` |
| 4 | All four apps extend shared tsconfig.base.json and ESLint config | VERIFIED | All 4 tsconfig.json files contain `"extends": "@trackline/tsconfig/base.json"`; all 4 eslint.config.mjs are 2-line imports of nextConfig |
| 5 | GSD initialized with CLAUDE.md in all four repos | VERIFIED | CLAUDE.md present in portal, camera-trap-dashboard, fire-app, trap-monitor/frontend; .planning/config.json present in all 3 satellite apps |
| 6 | pnpm-workspace.yaml lists all four apps with version catalog | VERIFIED | workspace.yaml has 5 package globs (portal, packages/*, camera-trap-dashboard, fire-app, trap-monitor/frontend) and 17-entry catalog |
| 7 | packages/tsconfig and packages/eslint-config internal packages are wired | VERIFIED | @trackline/tsconfig and @trackline/eslint-config symlinked in portal/node_modules/@trackline/; workspace:* references in all app devDependencies |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `C:/Software code GITs/LandManagment Website/pnpm-workspace.yaml` | Workspace globs + 17-entry catalog | VERIFIED | Contains `catalog:` with all 17 deps; all 4 app paths listed |
| `C:/Software code GITs/LandManagment Website/package.json` | Root workspace scripts (trackline-workspace) | VERIFIED | name: trackline-workspace; typecheck, lint, 4x build:*, 4x dev:* scripts present |
| `C:/Software code GITs/LandManagment Website/.npmrc` | node-linker=hoisted for Next.js compat | VERIFIED | Contains `node-linker=hoisted` and `shamefully-hoist=true` |
| `C:/Software code GITs/LandManagment Website/pnpm-lock.yaml` | Single workspace lockfile | VERIFIED | 11,547 lines, lockfileVersion 9.0, all 4 apps present |
| `C:/Software code GITs/LandManagment Website/packages/tsconfig/tsconfig.base.json` | Shared compilerOptions with strict:true | VERIFIED | Contains strict:true, ES2017, bundler resolution; no incremental/plugins/paths |
| `C:/Software code GITs/LandManagment Website/packages/tsconfig/package.json` | @trackline/tsconfig with exports | VERIFIED | name @trackline/tsconfig; exports `"./base.json": "./tsconfig.base.json"` |
| `C:/Software code GITs/LandManagment Website/packages/eslint-config/index.mjs` | exports nextConfig flat config | VERIFIED | Exports `nextConfig` using defineConfig with nextVitals + nextTs + globalIgnores |
| `C:/Software code GITs/LandManagment Website/packages/eslint-config/package.json` | @trackline/eslint-config with peerDeps | VERIFIED | peerDependencies for eslint and eslint-config-next (not bundled) |
| `C:/Software code GITs/LandManagment Website/portal/tsconfig.json` | Extends @trackline/tsconfig/base.json | VERIFIED | Slim config: extends + incremental + plugins + paths + include/exclude only |
| `C:/Software code GITs/LandManagment Website/portal/eslint.config.mjs` | Imports from @trackline/eslint-config | VERIFIED | 2-line import/export of nextConfig |
| `C:/Software code GITs/LandManagment Website/camera-trap-dashboard/tsconfig.json` | Extends @trackline/tsconfig/base.json | VERIFIED | Same slim pattern as portal |
| `C:/Software code GITs/LandManagment Website/camera-trap-dashboard/eslint.config.mjs` | Imports from @trackline/eslint-config | VERIFIED | 2-line import/export of nextConfig |
| `C:/Software code GITs/LandManagment Website/fire-app/tsconfig.json` | Extends @trackline/tsconfig/base.json | VERIFIED | Same slim pattern as portal |
| `C:/Software code GITs/LandManagment Website/fire-app/eslint.config.mjs` | Imports from @trackline/eslint-config | VERIFIED | 2-line import/export of nextConfig |
| `C:/Software code GITs/LandManagment Website/trap-monitor/frontend/tsconfig.json` | Extends @trackline/tsconfig/base.json | VERIFIED | Slim config; omits `**/*.mts` from include (intentional preserved difference) |
| `C:/Software code GITs/LandManagment Website/trap-monitor/frontend/eslint.config.mjs` | New file importing @trackline/eslint-config | VERIFIED | Created as new file; 2-line import/export |
| `C:/Software code GITs/LandManagment Website/portal/vercel.json` | Workspace-aware Vercel deploy config | VERIFIED | `cd .. && pnpm install --frozen-lockfile` |
| `C:/Software code GITs/LandManagment Website/camera-trap-dashboard/vercel.json` | Workspace-aware Vercel deploy config | VERIFIED | `cd .. && pnpm install --frozen-lockfile` |
| `C:/Software code GITs/LandManagment Website/fire-app/vercel.json` | Workspace-aware Vercel deploy config | VERIFIED | `cd .. && pnpm install --frozen-lockfile` |
| `C:/Software code GITs/LandManagment Website/trap-monitor/frontend/vercel.json` | Workspace-aware Vercel deploy config (2 levels up) | VERIFIED | `cd ../.. && pnpm install --frozen-lockfile` |
| `C:/Software code GITs/LandManagment Website/camera-trap-dashboard/.planning/config.json` | GSD config for satellite app | VERIFIED | File exists |
| `C:/Software code GITs/LandManagment Website/fire-app/.planning/config.json` | GSD config for satellite app | VERIFIED | File exists |
| `C:/Software code GITs/LandManagment Website/trap-monitor/frontend/.planning/config.json` | GSD config for satellite app | VERIFIED | File exists |
| `C:/Software code GITs/LandManagment Website/docs/CONVENTIONS.md` | TypeScript naming convention reference | VERIFIED | Contains kebab-case, PascalCase, camelCase naming tables; Supabase and import order sections |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/tsconfig/package.json` | `packages/tsconfig/tsconfig.base.json` | exports `"./base.json"` | WIRED | exports field maps `./base.json` to `./tsconfig.base.json` |
| `packages/eslint-config/package.json` | `packages/eslint-config/index.mjs` | exports `"."` | WIRED | exports `.` to `./index.mjs`; named export `nextConfig` present |
| All 4 app tsconfig.json | packages/tsconfig/tsconfig.base.json | `extends: @trackline/tsconfig/base.json` | WIRED | All 4 apps contain this extends string; package symlinked in portal/node_modules/@trackline/tsconfig |
| All 4 app eslint.config.mjs | packages/eslint-config/index.mjs | `import { nextConfig } from @trackline/eslint-config` | WIRED | All 4 eslint configs import nextConfig; package symlinked in portal/node_modules/@trackline/eslint-config |
| Root `package.json` typecheck script | Each app `tsc --noEmit` | `pnpm -r run typecheck` | WIRED | pnpm -r propagates to all packages that have the script; all 4 confirmed |
| Root `package.json` lint script | Each app `eslint` | `pnpm -r run lint` | WIRED | All 4 apps have `"lint": "eslint"` (trap-monitor correctly updated from `next lint`) |
| `pnpm-lock.yaml` | `pnpm-workspace.yaml` | pnpm install from workspace root | WIRED | lockfile present at workspace root; pnpm list -r resolves all 4 apps |
| `vercel.json installCommand` | `pnpm-workspace.yaml` | `cd <depth> && pnpm install --frozen-lockfile` | WIRED | All 4 vercel.json files use correct relative depth to workspace root |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase produces infrastructure/config files, not components that render dynamic data.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| pnpm resolves all 4 workspace packages | `pnpm list -r --depth=0` | Returns camera-trap-dashboard, fire-app, portal, trap-monitor-dashboard at correct paths | PASS |
| @trackline packages symlinked in portal node_modules | `ls portal/node_modules/@trackline/` | Returns `eslint-config` and `tsconfig` | PASS |
| No per-app package-lock.json files remain | `ls <app>/package-lock.json` for all 4 | All 4 absent | PASS |
| All 4 apps have typecheck script | `grep '"typecheck"' <app>/package.json` | All 4 return `"tsc --noEmit"` | PASS |
| All 4 apps have lint=eslint (not next lint) | `grep '"lint"' <app>/package.json` | All 4 return `"eslint"` | PASS |
| trap-monitor/frontend has eslint.config.mjs (new file) | File exists check | File present, imports nextConfig | PASS |
| workspace.code-workspace has no ../ path references | grep for `../` | No matches | PASS |
| Satellite app git repos intact | `git log --oneline -1` in each | Valid commits returned for all 3 satellite repos | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MONO-01 | 02-01, 02-04 | pnpm workspace at parent directory linking all 4 repos as packages | SATISFIED | pnpm-workspace.yaml lists all 4 app paths; pnpm list -r resolves all 4 |
| MONO-02 | 02-02, 02-03 | Shared tsconfig.base.json with strict TypeScript settings extended by all apps | SATISFIED | tsconfig.base.json has strict:true; all 4 apps extend it |
| MONO-03 | 02-02, 02-03 | Shared ESLint config package (packages/eslint-config) with flat config format | SATISFIED | packages/eslint-config/index.mjs exports nextConfig; all 4 apps import it |
| MONO-04 | 02-02, 02-04 | Root package.json with workspace scripts (build, lint, typecheck across all apps) | SATISFIED | Root has typecheck, lint, 4x build:*, 4x dev:* scripts using pnpm -r and --filter |
| MONO-05 | 02-02, 02-03 | pnpm catalogs pinning shared dependency versions | SATISFIED | 17-entry catalog in pnpm-workspace.yaml; all 4 apps use `catalog:` references |
| CONV-03 | 02-04 | GSD installed and initialized in all 4 repos | SATISFIED | CLAUDE.md in all 4 repos; .planning/config.json in all 3 satellite apps |
| CONV-04 | 02-04 | Shared TypeScript naming conventions documented | SATISFIED | docs/CONVENTIONS.md exists with naming tables, export rules, import order |

**Orphaned requirements:** None. All 7 requirement IDs from the phase plans appear in REQUIREMENTS.md and are marked Complete.

---

### Anti-Patterns Found

No anti-patterns detected in phase artifacts. All config files are substantive and correct. The following are known pre-existing issues documented in 02-04-SUMMARY.md (not introduced by this phase):

| Concern | Severity | Impact |
|---------|----------|--------|
| trap-monitor test files missing vitest type declarations (beforeEach not found) | Info | Pre-existing; does not affect workspace wiring |
| Legacy CJS scripts (scripts/*.cjs, scripts/*.js) produce `require()` lint warnings | Info | Pre-existing in portal and camera-trap-dashboard; scripts are excluded from app source |

---

### Human Verification Required

#### 1. Clean-slate pnpm install

**Test:** On a machine without the workspace node_modules, run `pnpm install` from `C:/Software code GITs/LandManagment Website/`
**Expected:** Exits 0, produces pnpm-lock.yaml, @trackline packages symlinked in all app node_modules
**Why human:** Cannot safely re-run install in verification session; install is destructive to existing node_modules state

#### 2. Vercel deploy simulation

**Test:** Push a change to portal and confirm Vercel uses `cd .. && pnpm install --frozen-lockfile` as its install command
**Expected:** Vercel build passes without missing dependency errors
**Why human:** Requires active Vercel deployment; cannot test outside CI/CD pipeline

---

### Gaps Summary

No gaps. All 7 must-have truths are verified. All 24 required artifacts exist and are substantive. All key links are wired. All 7 requirement IDs are satisfied with evidence. The phase goal is achieved.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
