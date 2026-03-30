---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: "Completed 05-dashboard-upgrade Plan 02: dashboard app switcher upgrade"
last_updated: "2026-03-30T04:08:56.994Z"
last_activity: 2026-03-30
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 16
  completed_plans: 16
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** One login, one place to manage access, one source of truth for shared infrastructure
**Current focus:** Phase 05 — dashboard-upgrade

## Current Position

Phase: 05
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-03-30

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 2 | 1 tasks | 5 files |
| Phase 01-migration-governance P04 | 15 | 2 tasks | 6 files |
| Phase 01-migration-governance P03 | 20 | 2 tasks | 5 files |
| Phase 01-migration-governance P01 | 12 | 2 tasks | 19 files |
| Phase 02-monorepo-workspace P01 | 5 | 2 tasks | 1 files |
| Phase 02-monorepo-workspace P02 | 7 | 2 tasks | 7 files |
| Phase 02-monorepo-workspace P03 | 20 | 2 tasks | 12 files |
| Phase 02-monorepo-workspace P04 | 5 | 3 tasks | 9 files |
| Phase 03-shared-supabase-package P03 | 5 | 1 tasks | 4 files |
| Phase 03-shared-supabase-package P01 | 15 | 3 tasks | 7 files |
| Phase 03-shared-supabase-package P02 | 16 | 3 tasks | 10 files |
| Phase 04-shared-ui-system P01 | 3 | 2 tasks | 5 files |
| Phase 04-shared-ui-system P02 | 4 | 2 tasks | 6 files |
| Phase 04-shared-ui-system P04-03 | 25 | 2 tasks | 11 files |
| Phase 05-dashboard-upgrade P01 | 1 | 1 tasks | 1 files |
| Phase 05-dashboard-upgrade P02 | 4 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: SEC-01 (bootstrap fallback security fix) placed in Phase 1 alongside migration governance — it is a production security hole and should not wait for Phase 3 when the package is extracted
- Roadmap: CONV-01/CONV-02 placed in Phase 1 — CLAUDE.md and safety rules must be in all repos before workspace tooling begins, so AI agents in satellite apps know the rules from day one
- Roadmap: CONV-03/CONV-04 placed in Phase 2 — GSD init and naming conventions require workspace to exist first
- [Phase 01]: db-check.cjs uses static text analysis with SQL comment stripping — zero dependencies, no live DB needed, CI-compatible
- [Phase 01]: Migration safety check IDs align with PROTECTED_SURFACES.md surface inventory (8 checks matching documented surfaces)
- [Phase 01-migration-governance]: SEC-01: production fail-closed in portal and WildTrack checkAppAccess() — NODE_ENV gates bootstrap fallback
- [Phase 01-migration-governance]: CONV-01/CONV-02: all four repos now have CLAUDE.md referencing PROTECTED_SURFACES.md and db-check.cjs for cross-app safety
- [Phase 01-migration-governance]: Schema docs derived from migration SQL only — no live DB dump required; Trap Monitor gap documented as FINDING-3
- [Phase 01-migration-governance]: Trap Monitor inferred schema documented with GOVERNANCE GAP callout rather than omitted — partial docs are more useful than none
- [Phase 01-migration-governance]: Namespace tokens portal_, wildtrack_, fire_, trap_ — each app NNN counter is independent, no filename collision possible
- [Phase 01-migration-governance]: do NOT run supabase db push for renamed files — live DB tracks original names in schema_migrations; divergence is intentional and documented
- [Phase 02-monorepo-workspace]: pnpm installed via npm install -g (not winget) for immediate PATH availability
- [Phase 02-monorepo-workspace]: Satellite app moves used robocopy+delete on Windows to handle long .next paths and file locks; .next excluded (regeneratable)
- [Phase 02-monorepo-workspace]: workspace.code-workspace paths updated from ../ relative refs to workspace-root-relative (camera-trap-dashboard, fire-app, trap-monitor/frontend)
- [Phase 02-monorepo-workspace]: pnpm catalog used for dep pinning — catalog: references in app package.json files (Plan 03) will track these versions
- [Phase 02-monorepo-workspace]: node-linker=hoisted in .npmrc — Next.js 16 peer dep resolution requires flat node_modules in pnpm workspace
- [Phase 02-monorepo-workspace]: eslint-config-next as peerDependency in @trackline/eslint-config — avoids dual plugin instances in consuming apps
- [Phase 02-monorepo-workspace]: App tsconfigs retain only extends/incremental/plugins/paths/include/exclude — all shared compilerOptions delegated to @trackline/tsconfig/base.json
- [Phase 02-monorepo-workspace]: trap-monitor lint script changed from 'next lint' to 'eslint' — next lint uses legacy built-in config incompatible with ESLint flat config
- [Phase 02-monorepo-workspace]: pnpm install succeeded without --no-strict-peer-dependencies: node-linker=hoisted resolved all peer deps cleanly
- [Phase 02-monorepo-workspace]: Satellite app .planning/config.json is minimal (no ROADMAP/REQUIREMENTS): portal is source of truth for Phase 2 planning
- [Phase 02-monorepo-workspace]: CONVENTIONS.md placed at workspace root docs/ (outside all git repos): living workspace doc, not tied to portal repo
- [Phase 03-shared-supabase-package]: fire-app already had db:types — unchanged; other three apps received identical script pattern
- [Phase 03-shared-supabase-package]: Removed next plugin from supabase-config tsconfig: IDE-only, causes standalone tsc errors outside Next.js app context
- [Phase 03-shared-supabase-package]: Portal-only admin functions excluded from shared package: isAdmin/getAllProfiles/getAllAppAccess/getAllApps stay in portal/src/lib only
- [Phase 03-shared-supabase-package]: Added @trackline/tsconfig as workspace:* devDependency in supabase-config for standalone tsc extends resolution
- [Phase 03-shared-supabase-package]: supabase-config supabase deps moved to peerDependencies: avoids dual SupabaseClient class instances across workspace packages
- [Phase 03-shared-supabase-package]: trap-monitor check-access.test.ts NODE_ENV=production stub: shared package SEC-01 dev-bootstrap guard fires in NODE_ENV=test, requiring production stub to preserve fail-closed test assertions
- [Phase 04-shared-ui-system]: tokens.css is single source of truth for brand tokens — portal globals.css will import from here in Plan 03, no @import tailwindcss in tokens.css to prevent double-import conflicts
- [Phase 04-shared-ui-system]: @theme inline block in tokens.css includes -light colour variants (red-dust-light, ochre-light, eucalypt-light) enabling Tailwind utility classes for all light-variant colours
- [Phase 04-shared-ui-system]: Button renders border in all variants (transparent for primary/ghost) — prevents layout shift on variant change
- [Phase 04-shared-ui-system]: Avatar uses plain <img> not next/image — ui package is app-agnostic, must not import from next/image
- [Phase 04-shared-ui-system]: Badge default variant matches dashboard role pill exactly: text-stone-400 border-stone-200, no background
- [Phase 04-shared-ui-system]: camera-trap-dashboard treated as shadcn app: @source only, no token import — tokens.css --accent/--muted/--background would override shadcn oklch values
- [Phase 04-shared-ui-system]: fire-app src/ directory was deleted (281 files) — globals.css restored from git history; remaining src/ restore is deferred blocker
- [Phase 04-shared-ui-system]: Shadcn detection rule established: if app has @import shadcn/tailwind.css in globals.css, use @source only — never @import tokens.css
- [Phase 05-dashboard-upgrade]: ADD COLUMN IF NOT EXISTS with DEFAULT 'active' — existing portal.apps rows get status without rewrite; idempotent and downstream-safe

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Downstream app schemas (WildTrack, Fire App, Trap Monitor) were applied via Supabase dashboard, not migration files. Schema documentation requires running `supabase db dump` against live project to reconstruct. Exact state unverified from code alone.
- Phase 2: Windows 11 symlink behavior with pnpm — pnpm uses hard-links by default which should be fine, but verify with a test install before declaring Phase 2 complete.
- Phase 4: Tailwind v4 @source cross-package path syntax is MEDIUM confidence. Verify with a production build test early in Phase 4 before rolling to all four apps.

## Session Continuity

Last session: 2026-03-30T04:05:32.070Z
Stopped at: Completed 05-dashboard-upgrade Plan 02: dashboard app switcher upgrade
Resume file: None
