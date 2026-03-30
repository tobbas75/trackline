---
phase: 02-monorepo-workspace
plan: "04"
subsystem: infra
tags: [pnpm, workspace, vercel, eslint, typescript, conventions]

# Dependency graph
requires:
  - phase: 02-monorepo-workspace plan 03
    provides: shared tsconfig and eslint-config packages migrated to all apps

provides:
  - Single pnpm-lock.yaml at workspace root (workspace install verified working)
  - vercel.json with workspace-aware install/build in all 4 apps
  - GSD .planning/config.json in all 3 satellite apps (camera-trap-dashboard, fire-app, trap-monitor)
  - docs/CONVENTIONS.md with TypeScript naming, export rules, Supabase, and import conventions
  - All per-app package-lock.json files deleted

affects: [phase-03, phase-04, phase-05, deploy, vercel, satellite-apps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pnpm workspace-aware Vercel deploy: cd .. && pnpm install --frozen-lockfile in vercel.json"
    - "Satellite apps use minimal .planning/config.json (no full GSD project setup needed)"

key-files:
  created:
    - "C:/Software code GITs/LandManagment Website/pnpm-lock.yaml"
    - "C:/Software code GITs/LandManagment Website/portal/vercel.json"
    - "C:/Software code GITs/LandManagment Website/camera-trap-dashboard/vercel.json"
    - "C:/Software code GITs/LandManagment Website/fire-app/vercel.json"
    - "C:/Software code GITs/LandManagment Website/trap-monitor/frontend/vercel.json"
    - "C:/Software code GITs/LandManagment Website/camera-trap-dashboard/.planning/config.json"
    - "C:/Software code GITs/LandManagment Website/fire-app/.planning/config.json"
    - "C:/Software code GITs/LandManagment Website/trap-monitor/frontend/.planning/config.json"
    - "C:/Software code GITs/LandManagment Website/docs/CONVENTIONS.md"
  modified:
    - "portal/package-lock.json (deleted)"
    - "camera-trap-dashboard/package-lock.json (deleted)"
    - "fire-app/package-lock.json (deleted)"
    - "trap-monitor/frontend/package-lock.json (deleted)"

key-decisions:
  - "pnpm install succeeded with node-linker=hoisted (set in Plan 02) — 998 packages, all 7 workspace projects resolved"
  - "supabase CLI binary warning on Windows is expected (platform-specific .EXE not found) — not a functional issue"
  - "trap-monitor typecheck pre-existing failures: test files missing vitest/jest types (beforeEach not found) — known debt, not Plan 04 scope"
  - "lint pre-existing failures: require() imports in legacy scripts, unused vars in test files — known debt across all apps"
  - "CONVENTIONS.md placed at workspace root docs/ (outside all git repos) — living workspace doc, not tied to portal repo"
  - "Satellite app .planning/config.json is minimal (no ROADMAP/REQUIREMENTS) — sufficient for gsd-tools to operate"

patterns-established:
  - "Vercel workspace deploy: vercel.json with cd <depth> && pnpm install --frozen-lockfile + pnpm --filter <name> build"
  - "Satellite GSD init: minimal config.json only, not full GSD project"

requirements-completed: [MONO-01, MONO-04, CONV-03, CONV-04]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 02 Plan 04: Wire and Verify Workspace Summary

**pnpm workspace wired and verified: single lockfile, 4 vercel.json deploy configs, GSD inited in 3 satellite apps, CONVENTIONS.md written**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-30T01:36:36Z
- **Completed:** 2026-03-30T01:41:15Z
- **Tasks:** 3 (Tasks 1-2 file changes committed; Task 3 verification-only, no commit)
- **Files modified:** 9 created, 4 deleted

## Accomplishments

- pnpm install from workspace root resolved all 7 workspace projects (1100 deps, 998 added) and created a single pnpm-lock.yaml
- All 4 apps have vercel.json with workspace-aware install (`cd .. && pnpm install --frozen-lockfile`) and per-app build commands using `--filter`
- All 4 per-app package-lock.json files deleted (replaced by workspace-root pnpm-lock.yaml)
- GSD .planning/config.json created in camera-trap-dashboard, fire-app, and trap-monitor/frontend
- docs/CONVENTIONS.md written at workspace root with TypeScript naming, export rules, React/Next.js, Supabase, import order, and strictness guidelines
- Workspace-wide `pnpm -r run typecheck` and `pnpm -r run lint` confirmed to run in all 4 apps using shared @trackline config

## Task Commits

Each task was committed atomically across the relevant git repos:

1. **Task 1: Run pnpm install, delete package-lock.json files, create vercel.json files**
   - portal: `f3190b2` (chore)
   - camera-trap-dashboard: `495ad68` (chore)
   - fire-app: `1d5839e` (chore)
   - trap-monitor/frontend: `d3f4807` (chore)

2. **Task 2: GSD init satellite apps and create CONVENTIONS.md**
   - camera-trap-dashboard: `4e71c8d` (chore)
   - fire-app: `edeedfa` (chore)
   - trap-monitor/frontend: `3b052d9` (chore)
   - CONVENTIONS.md: workspace-root docs/ (outside all git repos, not committed)

3. **Task 3: Verify workspace-wide typecheck and lint run** — verification only, no files changed

## Files Created/Modified

- `C:/Software code GITs/LandManagment Website/pnpm-lock.yaml` — single workspace lockfile (998 packages)
- `portal/vercel.json` — Vercel workspace-aware deploy config
- `camera-trap-dashboard/vercel.json` — Vercel workspace-aware deploy config
- `fire-app/vercel.json` — Vercel workspace-aware deploy config
- `trap-monitor/frontend/vercel.json` — Vercel workspace-aware deploy config (two levels up to workspace root)
- `camera-trap-dashboard/.planning/config.json` — minimal GSD config for satellite app
- `fire-app/.planning/config.json` — minimal GSD config for satellite app
- `trap-monitor/frontend/.planning/config.json` — minimal GSD config for satellite app
- `docs/CONVENTIONS.md` — TypeScript and code conventions reference for all 4 apps
- `portal/package-lock.json` — deleted
- `camera-trap-dashboard/package-lock.json` — deleted
- `fire-app/package-lock.json` — deleted
- `trap-monitor/frontend/package-lock.json` — deleted

## Decisions Made

- pnpm install succeeded without `--no-strict-peer-dependencies` flag — the node-linker=hoisted setting from Plan 02 resolved all peer dep issues cleanly
- The supabase CLI binary warning (`ENOENT: supabase.EXE not found`) is a known Windows pnpm limitation with the Supabase CLI package — the CLI itself is not used in CI/install, only by developers manually. Not a functional blocker.
- CONVENTIONS.md placed at workspace root (`docs/`) which has no .git repository. It is a workspace-level living document, not part of any single app repo. Future phases can reference it via the workspace path.
- Satellite app .planning/config.json uses minimal structure (no ROADMAP.md, REQUIREMENTS.md) — these apps don't need full GSD project tracking; the portal repo is the source of truth for Phase 2 planning.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Pre-existing typecheck errors (documented, not fixed):**
- trap-monitor/frontend: test files missing vitest/jest types — `beforeEach` not found (2 files)
- trap-monitor/frontend: Supabase mock typing issues in rls-policies.test.ts

**Pre-existing lint errors (documented, not fixed):**
- portal: `require()` imports in `scripts/db-check.cjs` — CJS script, cannot use ESM import
- camera-trap-dashboard: `require()` imports in legacy `scripts/*.js` build scripts
- trap-monitor/frontend: `require()` in `scripts/verify-shared-db-impact.cjs`, unused vars in test files, React hook patterns
- fire-app: lint passed with only a pages-directory warning (not an error)

All pre-existing errors were present before Plan 04. They are known technical debt for future phases.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 02 is complete. All 4 apps are linked in the pnpm workspace with a single lockfile.
- Shared @trackline/tsconfig and @trackline/eslint-config are symlinked in all app node_modules.
- All apps have Vercel deploy configs ready for workspace-aware deployment.
- GSD is initialized in all 4 repos.
- CONVENTIONS.md provides a reference for future development conventions.
- Phase 03 (shared component library) can begin — workspace infrastructure is proven working.

**Known blockers for future phases:**
- Pre-existing lint errors in legacy scripts may need eslint ignores added (scripts/*.js, scripts/*.cjs) before CI lint gates can be enforced
- trap-monitor typecheck failures require vitest type declarations to be added (`@vitest/globals` or `/// <reference types="vitest/globals" />`)

---
*Phase: 02-monorepo-workspace*
*Completed: 2026-03-30*

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log.
