# Roadmap: Trackline Portal — v1.0 Unification

## Overview

Four independently-developed conservation apps already share one Supabase project. This milestone
unifies them under shared governance, a common monorepo workspace, shared packages, and a consistent
UI system — without moving files or merging deployments. The work proceeds in strict dependency order:
governance first (highest blast radius if skipped), then workspace structure, then shared runtime code,
then UI tokens and components, then dashboard polish that consumes the new shared UI.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Migration Governance** - Lock down the shared Supabase project with safety tooling, schema docs, and security fix (completed 2026-03-30)
- [ ] **Phase 2: Monorepo Workspace** - Establish pnpm workspace root with shared TypeScript and ESLint config
- [ ] **Phase 3: Shared Supabase Package** - Extract checkAppAccess and client factories into @trackline/supabase-config
- [ ] **Phase 4: Shared UI System** - Publish design tokens and core component library as @trackline/ui
- [x] **Phase 5: Dashboard Upgrade** - Upgrade app switcher with status indicators and role badges using shared UI (completed 2026-03-30)

## Phase Details

### Phase 1: Migration Governance
**Goal**: The shared Supabase project is protected by tooling, documentation, and a security fix before any workspace changes begin
**Depends on**: Nothing (first phase)
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-04, MIGR-05, MIGR-06, SEC-01, CONV-01, CONV-02
**Success Criteria** (what must be TRUE):
  1. Running db-check.cjs against a migration that alters portal.check_app_access() signature prints a blocking error and exits non-zero
  2. PROTECTED_SURFACES.md lists every RPC, table, column, and trigger that downstream apps depend on, with the owning app and breakage consequence for each
  3. All migrations in portal/supabase/migrations/ follow the namespace-prefix scheme and there are no filename collisions
  4. Schema documentation files exist in portal/docs/schema/ for all four apps with current table and column definitions
  5. The bootstrap fallback (hasAccess: true, role: 'admin') is absent from production builds across all consuming apps
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Migration renames (all repos) + PROTECTED_SURFACES.md
- [x] 01-02-PLAN.md — db-check.cjs safety script
- [x] 01-03-PLAN.md — Schema documentation (all 4 apps) + RLS policy audit
- [x] 01-04-PLAN.md — CLAUDE.md propagation (all repos) + SEC-01 bootstrap fallback fix

### Phase 2: Monorepo Workspace
**Goal**: A single pnpm workspace root links all four apps and shared packages with consistent TypeScript and ESLint conventions
**Depends on**: Phase 1
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05, CONV-03, CONV-04
**Success Criteria** (what must be TRUE):
  1. Running pnpm install from the workspace root resolves dependencies for all four apps and shared packages without error
  2. Running the root-level typecheck script reports TypeScript errors across all workspace packages in a single pass
  3. Running the root-level lint script reports ESLint errors across all workspace packages using the shared flat config
  4. All four apps extend tsconfig.base.json and the shared ESLint config — no app defines its own base TS or lint rules
  5. GSD is initialized in all four repos with project-specific CLAUDE.md files installed
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Install pnpm + move satellite apps into workspace root
- [x] 02-02-PLAN.md — Create workspace infrastructure (pnpm-workspace.yaml, packages/tsconfig, packages/eslint-config)
- [x] 02-03-PLAN.md — Migrate all 4 apps to use workspace (tsconfig extends, eslint imports, catalog: deps)
- [x] 02-04-PLAN.md — pnpm install, delete lockfiles, vercel.json, GSD init, CONVENTIONS.md

### Phase 3: Shared Supabase Package
**Goal**: A single @trackline/supabase-config package is the authoritative source for checkAppAccess, client factories, and shared types — consumed by all three satellite apps
**Depends on**: Phase 2
**Requirements**: PKG-01, PKG-02, PKG-03
**Success Criteria** (what must be TRUE):
  1. All three satellite apps import checkAppAccess from @trackline/supabase-config via workspace:* — no local check-access.ts copies remain
  2. Running the root-level db:types script regenerates Supabase TypeScript types for all apps from a single command
  3. A TypeScript type error in the shared checkAppAccess return type surfaces in all three consuming apps at typecheck time
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Create packages/supabase-config package with source files and typecheck
- [x] 03-02-PLAN.md — Wire all 3 satellite apps + portal to @trackline/supabase-config
- [x] 03-03-PLAN.md — Root db:types script covering all 4 apps

### Phase 4: Shared UI System
**Goal**: Design tokens and a core component library are published as @trackline/ui and consumed by all apps — all apps render the correct brand tokens and component styles in production builds
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Importing Button, Card, and Badge from @trackline/ui renders correctly styled components in a production build of each consuming app
  2. A production build of each app does not strip shared component CSS classes (Tailwind @source directive is correctly configured)
  3. All brand colour, typography, and spacing tokens are defined once in packages/ui/tokens.css and imported — no app defines its own copy of the earthy palette or red-dust/ochre/eucalypt variables
  4. The UI rules document describes responsive breakpoints, layout patterns, and component conventions in a single reference
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Scaffold packages/ui package + tokens.css (full Trackline design token set)
- [x] 04-02-PLAN.md — Implement Button, Card, Badge, Avatar components
- [x] 04-03-PLAN.md — Wire all 4 apps (transpilePackages + @source + token import) + UI-RULES.md

### Phase 5: Dashboard Upgrade
**Goal**: The portal dashboard app switcher shows live app status and user role badges, built with shared UI components
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. A logged-in user sees every app they have access to on the dashboard with their assigned role displayed as a badge
  2. Each app tile displays a status indicator (active / maintenance / down) sourced from portal.apps.status
  3. Clicking an app tile navigates directly to that app (quick-launch)
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Add portal.apps.status column (migration portal_003_app_status.sql)
- [x] 05-02-PLAN.md — Upgrade dashboard page (Card/Badge from @trackline/ui, status dot, role badge)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Migration Governance | 4/4 | Complete   | 2026-03-30 |
| 2. Monorepo Workspace | 3/4 | In Progress|  |
| 3. Shared Supabase Package | 2/3 | In Progress|  |
| 4. Shared UI System | 2/3 | In Progress|  |
| 5. Dashboard Upgrade | 2/2 | Complete   | 2026-03-30 |
