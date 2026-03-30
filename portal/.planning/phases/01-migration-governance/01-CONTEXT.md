# Phase 1: Migration Governance - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The shared Supabase project is protected by tooling, documentation, and a security fix before any workspace changes begin. Deliverables: centralized migration folder, cross-app safety check script (db-check.cjs), PROTECTED_SURFACES.md, migration naming convention, schema docs for all 4 apps, RLS policy audit, CLAUDE.md in all 4 repos with shared Supabase safety rules, and bootstrap fallback security fix gated behind NODE_ENV.

Requirements: MIGR-01, MIGR-02, MIGR-03, MIGR-04, MIGR-05, MIGR-06, SEC-01, CONV-01, CONV-02

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/001_portal_app_access.sql` — existing portal schema migration
- `supabase/migrations/002_admin_policies.sql` — existing admin RLS policies
- `src/lib/check-access.ts` — current access check implementation with bootstrap fallback
- `CLAUDE.md` — existing portal AI rules (template for other repos)

### Established Patterns
- Migrations use sequential numbering (001_, 002_)
- Portal owns `portal` schema exclusively
- Other apps own tables in `public` schema
- RLS policies follow naming convention: `{table}_{action}_{scope}`

### Integration Points
- `portal.check_app_access()` RPC — called by WildTrack, Fire System, Trap Monitor
- `portal.profiles` — queried by all downstream apps
- `on_auth_user_created` trigger — fires on every signup across all apps
- Bootstrap fallback in check-access.ts returns admin access when RPC fails

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
