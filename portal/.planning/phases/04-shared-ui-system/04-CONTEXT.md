# Phase 4: Shared UI System - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous — discuss skipped)

<domain>
## Phase Boundary

Design tokens and a core component library are published as @trackline/ui and consumed by all apps — all apps render the correct brand tokens and component styles in production builds. Deliverables: tokens.css, Button/Card/Badge/Avatar components, Tailwind @source directives, UI rules document, Between23 aesthetic tokens.

Requirements: UI-01, UI-02, UI-03, UI-04, UI-05

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — autonomous mode.

Key context from research:
- Package at packages/ui/ using source-first exports (no build step)
- tokens.css with CSS custom properties for colours, typography, spacing
- Components use Tailwind v4 utility classes referencing token variables
- Each consuming app's globals.css needs @source directive for packages/ui
- Between23-inspired aesthetic: red-dust, ochre, eucalypt, sky, stone scale
- DM Serif Display headings, Poppins body (fonts loaded per-app via next/font)
- Grain texture overlay pattern (already in portal)
- transpilePackages: ['@trackline/ui'] in each app's next.config.ts
- Keep components minimal and elegant — no verbose abstractions

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- portal/src/app/globals.css — full @theme inline with all colour tokens
- portal/src/components/ — header, hero, projects, about, approach, contact, footer
- portal/src/app/layout.tsx — font loading pattern (DM Serif Display + Poppins)

### Established Patterns
- Tailwind v4 @theme inline in globals.css
- lucide-react for icons
- Subtle animations (fade-up on scroll)
- Clean whitespace, earthy palette

### Integration Points
- Each app's globals.css needs @import for tokens.css and @source for packages/ui
- next.config.ts needs transpilePackages entry
- Components should work with any app's existing layout

</code_context>

<specifics>
## Specific Ideas

User specifically requested: "common UI rules system" and "elegance is key, no verbose crap."

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
