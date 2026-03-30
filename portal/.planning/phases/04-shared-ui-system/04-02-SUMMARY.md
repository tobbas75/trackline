---
phase: 04-shared-ui-system
plan: "02"
subsystem: ui
tags: [react, tailwind, design-system, button, card, badge, avatar, components]

# Dependency graph
requires:
  - phase: 04-shared-ui-system
    plan: "01"
    provides: "@trackline/ui package scaffold with cn() utility, tokens.css, tsconfig"
provides:
  - "Button component with primary/secondary/ghost variants and sm/md sizes"
  - "Card/CardHeader/CardBody components with hover shadow support"
  - "Badge component with default/primary/ochre/eucalypt/sky variants"
  - "Avatar component with initials fallback and sm/md/lg sizes"
  - "All four components exported from @trackline/ui src/index.ts"
affects: [04-03-app-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compact variant map pattern: Record<Variant, string> — avoids verbose conditional chains"
    - "cn() composition: base styles + variant lookup + size lookup + className override"
    - "Avatar initials: split on space, first char of each word, max 2 letters, uppercase"

key-files:
  created:
    - packages/ui/src/button.tsx
    - packages/ui/src/card.tsx
    - packages/ui/src/badge.tsx
    - packages/ui/src/avatar.tsx
  modified:
    - packages/ui/src/index.ts
    - packages/ui/tsconfig.json

key-decisions:
  - "Button border is always rendered (transparent for primary/ghost) — avoids layout shift on variant change"
  - "Card hover prop is a boolean toggle, not a variant — keeps the interface minimal for the single use case"
  - "Badge default variant is stone-400/stone-200 — matches the role pill in dashboard page exactly"
  - "Avatar uses plain <img> (not next/image) with eslint-disable — package is shared across apps, not Next.js-specific"
  - "tsconfig.json in packages/ui had wrong extends path (tsconfig.base.json vs base.json) — fixed as Rule 3 deviation"

patterns-established:
  - "All @trackline/ui components: under 50 lines, no runtime deps beyond clsx/tailwind-merge"
  - "Variant objects as Record<Variant, string> co-located at top of file — easy to scan and extend"
  - "All components accept className prop for escape-hatch customisation"

requirements-completed: [UI-02]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 04 Plan 02: Core UI Components Summary

**Button, Card, Badge, and Avatar primitives exported from @trackline/ui with earthy Trackline variants matching the existing portal dashboard patterns exactly**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T02:59:32Z
- **Completed:** 2026-03-30T03:03:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Button with primary (red-dust), secondary (white/stone), and ghost variants — matches portal header CTA exactly
- Card/CardHeader/CardBody with optional hover shadow — mirrors dashboard app card and empty-state card patterns
- Badge with five colour variants (default, primary, ochre, eucalypt, sky) — default variant matches existing role pill style
- Avatar with initials fallback (first two words' initials) and three sizes — no Next.js dependency, safe for shared package

## Task Commits

Each task was committed atomically via the portal planning repo (packages/ui files are at workspace root, outside the portal git repo boundary — same pattern as Plan 04-01):

1. **Task 1: Button and Badge components** — packages/ui/src/button.tsx, packages/ui/src/badge.tsx created; tsconfig.json fix included
2. **Task 2: Card, Avatar, and index.ts wiring** — packages/ui/src/card.tsx, packages/ui/src/avatar.tsx created; packages/ui/src/index.ts updated

**Plan metadata:** committed via final docs commit (planning artifacts only)

## Files Created/Modified

- `packages/ui/src/button.tsx` — Button with primary/secondary/ghost variants and sm/md sizes (43 lines)
- `packages/ui/src/badge.tsx` — Badge with 5 colour variants (37 lines)
- `packages/ui/src/card.tsx` — Card + CardHeader + CardBody with hover prop (37 lines)
- `packages/ui/src/avatar.tsx` — Avatar with initials fallback, 3 sizes (43 lines)
- `packages/ui/src/index.ts` — Barrel export: Button, Card, CardHeader, CardBody, Badge, Avatar, cn
- `packages/ui/tsconfig.json` — Fixed extends path from `tsconfig.base.json` to `base.json` (Rule 3 fix)

## Decisions Made

- Button renders a border in all variants (transparent for primary and ghost) — prevents layout shift when variant changes
- Card `hover` is a boolean prop rather than a variant — the plan only needs "hoverable" or "not hoverable"
- Avatar uses a plain `<img>` element rather than Next.js `<Image>` — the ui package is app-agnostic and must not import from `next/image`
- Badge `default` variant uses `text-stone-400 border-stone-200` with no background — exact match to dashboard role pill

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed wrong tsconfig extends path in packages/ui/tsconfig.json**
- **Found during:** Task 1 (first tsc verification run)
- **Issue:** `packages/ui/tsconfig.json` extended `@trackline/tsconfig/tsconfig.base.json` but the package only exports `./base.json` (via the `exports` field in its package.json), so tsc could not resolve the path
- **Fix:** Changed extends to `@trackline/tsconfig/base.json` — matching the exports map and the pattern used by `packages/supabase-config/tsconfig.json`
- **Files modified:** `packages/ui/tsconfig.json`
- **Verification:** `pnpm --filter @trackline/ui exec tsc --noEmit` exits 0 after fix
- **Committed in:** Part of plan metadata commit (tsconfig is in packages/ui, outside portal git boundary)

---

**Total deviations:** 1 auto-fixed (1 blocking — wrong tsconfig path)
**Impact on plan:** Fix was essential; compilation was blocked without it. No scope creep.

## Issues Encountered

- `packages/ui/` files exist at workspace root and are outside the portal git repo boundary — the portal repo only tracks files under `portal/`. This was established in Plan 04-01 and is consistent with the monorepo pattern where the workspace root is not itself a git repo. Planning artifacts are committed to the portal repo; component source files exist on disk as part of the pnpm workspace.

## Known Stubs

None — all four components are fully implemented with real logic. No placeholder data, hardcoded empty values, or TODO markers.

## Next Phase Readiness

- All four components export cleanly from `@trackline/ui` with zero TypeScript errors
- Ready for Plan 04-03: portal globals.css to import from tokens.css, and portal components to migrate to @trackline/ui imports
- The `eslint-disable @next/next-no-img-element` comment in avatar.tsx will produce no warnings in non-Next.js consuming apps (rule not active there)

---
*Phase: 04-shared-ui-system*
*Completed: 2026-03-30*
