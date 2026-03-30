# Requirements: Trackline Portal — v1.0 Unification

**Defined:** 2026-03-30
**Core Value:** One login, one place to manage access, one source of truth for shared infrastructure

## v1 Requirements

### Migration Governance

- [x] **MIGR-01**: All Supabase migrations live in portal/supabase/migrations/ as single source of truth
- [x] **MIGR-02**: Cross-app safety check script (db-check.cjs) validates new migrations against protected surfaces
- [x] **MIGR-03**: PROTECTED_SURFACES.md documents all shared RPCs, tables, and columns that downstream apps depend on
- [x] **MIGR-04**: Migration naming convention with namespace prefixes prevents filename collisions
- [x] **MIGR-05**: Schema documentation for all 4 apps in portal/docs/schema/ (one file per app)
- [x] **MIGR-06**: RLS policy audit documenting current policies across all schemas

### Monorepo Workspace

- [x] **MONO-01**: pnpm workspace at parent directory linking all 4 repos as packages
- [x] **MONO-02**: Shared tsconfig.base.json with strict TypeScript settings extended by all apps
- [x] **MONO-03**: Shared ESLint config package (packages/eslint-config) with flat config format
- [x] **MONO-04**: Root package.json with workspace scripts (build, lint, typecheck across all apps)
- [x] **MONO-05**: pnpm catalogs pinning shared dependency versions (React, Next.js, Supabase, Tailwind)

### Shared UI System

- [x] **UI-01**: Design token CSS file (packages/ui/tokens.css) with colour palette, typography, spacing
- [x] **UI-02**: Shared component library (packages/ui) with Button, Card, Badge, Avatar primitives
- [x] **UI-03**: Tailwind v4 @source directives configured in all consuming apps
- [x] **UI-04**: Common UI rules document defining responsive breakpoints, layout patterns, component conventions
- [x] **UI-05**: Between23-inspired aesthetic tokens propagated to all apps via CSS variables

### Portal Dashboard

- [x] **DASH-01**: App switcher with status indicators (active/maintenance/down) and quick-launch
- [x] **DASH-02**: App status column added to portal.apps table
- [x] **DASH-03**: User can see which apps they have access to with role badges

### Global Conventions

- [x] **CONV-01**: CLAUDE.md installed in all 4 repos with shared rules and project-specific context
- [x] **CONV-02**: Supabase safety rules documented and enforced (schema ownership, migration checks)
- [x] **CONV-03**: GSD installed and initialized in all 4 repos
- [x] **CONV-04**: Shared TypeScript naming conventions documented

### Shared Packages

- [x] **PKG-01**: @trackline/supabase-config package exporting Supabase client factories and check-access utilities
- [x] **PKG-02**: All 3 downstream apps consume @trackline/supabase-config via workspace:* protocol
- [x] **PKG-03**: Root-level db:types script generating Supabase types for all apps

### Security

- [x] **SEC-01**: Bootstrap fallback (hasAccess: true, role: 'admin') gated behind NODE_ENV !== 'production' in all apps

## v2 Requirements

### Enhanced Governance

- **GOV-01**: Pre-commit hook running db-check.cjs automatically on migration files
- **GOV-02**: CI pipeline running workspace-wide typecheck and lint
- **GOV-03**: Automated schema drift detection between migration files and live database

### Portal Features

- **PORT-01**: User profile editing from portal dashboard
- **PORT-02**: App usage analytics dashboard
- **PORT-03**: Notification system for app status changes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Turborepo / Nx build orchestration | Overkill at this scale — pnpm workspaces sufficient |
| Merging apps into single deployment | Apps have divergent deps; independent deploys required |
| Custom migration runner replacing Supabase CLI | Augment existing CLI, don't replace it |
| Automated RLS policy generation | Security-critical; manual review preferred |
| Per-app Supabase projects | Budget constraint ($0); schema isolation with RLS is correct |
| Semver for shared packages | workspace:* protocol sufficient for single-team monorepo |
| Storybook for component library | Overhead > value at this scale |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIGR-01 | Phase 1 | Complete |
| MIGR-02 | Phase 1 | Complete |
| MIGR-03 | Phase 1 | Complete |
| MIGR-04 | Phase 1 | Complete |
| MIGR-05 | Phase 1 | Complete |
| MIGR-06 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| CONV-01 | Phase 1 | Complete |
| CONV-02 | Phase 1 | Complete |
| MONO-01 | Phase 2 | Complete |
| MONO-02 | Phase 2 | Complete |
| MONO-03 | Phase 2 | Complete |
| MONO-04 | Phase 2 | Complete |
| MONO-05 | Phase 2 | Complete |
| CONV-03 | Phase 2 | Complete |
| CONV-04 | Phase 2 | Complete |
| PKG-01 | Phase 3 | Complete |
| PKG-02 | Phase 3 | Complete |
| PKG-03 | Phase 3 | Complete |
| UI-01 | Phase 4 | Complete |
| UI-02 | Phase 4 | Complete |
| UI-03 | Phase 4 | Complete |
| UI-04 | Phase 4 | Complete |
| UI-05 | Phase 4 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation — all 27 requirements mapped*
