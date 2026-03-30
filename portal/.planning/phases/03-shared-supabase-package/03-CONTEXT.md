# Phase 3: Shared Supabase Package - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

A single @trackline/supabase-config package is the authoritative source for checkAppAccess, client factories, and shared types — consumed by all three satellite apps. Deliverables: packages/supabase-config with typed exports, all 3 downstream apps importing from the shared package, root db:types script.

Requirements: PKG-01, PKG-02, PKG-03

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Key context:
- Package lives at packages/supabase-config/ in the workspace
- Exports: createBrowserClient, createServerClient, checkAppAccess, types (AppId, AppRole, AppAccess)
- Zero runtime deps beyond @supabase/supabase-js and @supabase/ssr
- Consumed via workspace:* protocol and transpilePackages in next.config.ts
- SEC-01 fix already applied in Phase 1 — the shared package should preserve the NODE_ENV guard

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- portal/src/lib/supabase/client.ts — browser client factory
- portal/src/lib/supabase/server.ts — server client factory
- portal/src/lib/check-access.ts — access check with types and NODE_ENV guard

### Integration Points
- All 3 satellite apps have their own check-access.ts copies
- Each app has its own supabase client setup
- next.config.ts in each app needs transpilePackages: ['@trackline/supabase-config']

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
