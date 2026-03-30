# Phase 2: Monorepo Workspace - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

A single pnpm workspace root links all four apps and shared packages with consistent TypeScript and ESLint conventions. Deliverables: pnpm-workspace.yaml at parent directory, shared tsconfig.base.json, shared ESLint config package (packages/eslint-config), root package.json with workspace scripts, pnpm catalogs for shared deps, GSD initialized in all 4 repos, shared TypeScript naming conventions.

Requirements: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05, CONV-03, CONV-04

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key context from research:
- pnpm workspaces v10 with catalogs is the target
- Parent directory (LandManagment Website/) is the monorepo root
- Each app stays in its current directory — no file moves
- transpilePackages in next.config.ts for shared packages
- Tailwind v4 @source directives needed for cross-package CSS
- No Turborepo — pnpm --filter is sufficient at this scale

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Each app has its own tsconfig.json, eslint config
- Portal uses eslint.config.mjs (flat config)
- All apps use TypeScript strict mode
- All apps use Next.js 16 App Router

### Established Patterns
- Named exports (except page/layout components)
- Server Components by default
- Tailwind v4 CSS-based config (@theme inline in globals.css)

### Integration Points
- Vercel deploys each app independently — Root Directory setting needs updating
- pnpm install from monorepo root must resolve all 4 apps
- Shared packages will be consumed via workspace:* protocol

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
