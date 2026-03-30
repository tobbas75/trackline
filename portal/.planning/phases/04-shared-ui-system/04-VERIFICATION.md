---
phase: 04-shared-ui-system
verified: 2026-03-29T00:00:00Z
status: gaps_found
score: 3/4 success criteria verified
gaps:
  - truth: "Production builds do not strip shared component CSS — @source directive verified"
    status: failed
    reason: "portal production build fails with CssSyntaxError — @import and @source paths use one too few directory traversals (../../ instead of ../../../) from portal/src/app/globals.css"
    artifacts:
      - path: "portal/src/app/globals.css"
        issue: "@import '../../packages/ui/tokens.css' resolves to portal/packages/ui/tokens.css (does not exist). Correct path: '../../../packages/ui/tokens.css'. @source '../../packages/ui/src' has the same depth error."
      - path: "trap-monitor/frontend/src/app/globals.css"
        issue: "@import '../../../packages/ui/tokens.css' resolves to trap-monitor/packages/ui/tokens.css (does not exist). Correct path from frontend/src/app/ is '../../../../packages/ui/tokens.css'. @source has the same depth error."
    missing:
      - "Fix portal/src/app/globals.css: change @import '../../packages/ui/tokens.css' to '../../../packages/ui/tokens.css' and @source '../../packages/ui/src' to '../../../packages/ui/src'"
      - "Fix trap-monitor/frontend/src/app/globals.css: change @import '../../../packages/ui/tokens.css' to '../../../../packages/ui/tokens.css' and @source '../../../packages/ui/src' to '../../../../packages/ui/src'"
      - "Verify camera-trap-dashboard and fire-app @source paths (both use '../../packages/ui/src' but need '../../../packages/ui/src')"
      - "Run pnpm build in portal after fix and confirm zero CSS resolution errors"
---

# Phase 4: Shared UI System Verification Report

**Phase Goal:** Design tokens and a core component library are published as @trackline/ui and consumed by all apps — all apps render the correct brand tokens and component styles in production builds
**Verified:** 2026-03-29
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Button, Card, Badge render correctly styled in production builds of all consuming apps | ? UNCERTAIN | Components are fully implemented and TypeScript-clean, but production build of portal fails — rendering in production is unverifiable until path bug is fixed |
| 2 | Production builds do not strip shared component CSS (@source directive verified) | ✗ FAILED | `pnpm build` in portal exits 1: `CssSyntaxError: Can't resolve '../../packages/ui/tokens.css' in '…portal/src/app'` — path depth is wrong by one level |
| 3 | Colour/typography/spacing tokens defined once in tokens.css — no app duplicates the palette | ✓ VERIFIED | portal/src/app/globals.css has zero `:root` token definitions; all tokens are in packages/ui/tokens.css only |
| 4 | UI rules document describes breakpoints, layout, component conventions | ✓ VERIFIED | docs/UI-RULES.md exists at workspace root, 7002 bytes, contains colour table, typography, breakpoints, component API |

**Score:** 2/4 truths verified (SC3 and SC4). SC1 is blocked by SC2 failure. SC2 fails due to wrong relative path in globals.css files.

---

## Required Artifacts

### Plan 04-01: Token Package

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/package.json` | @trackline/ui package manifest | ✓ VERIFIED | name "@trackline/ui", exports map with "./tokens.css" entry, workspace:* deps |
| `packages/ui/tokens.css` | All design token CSS custom properties | ✓ VERIFIED | Contains --red-dust: #b5452a, --ochre: #c9913a, --eucalypt: #4a7c59, @theme inline block, all utility classes, no @import tailwindcss |
| `packages/ui/src/index.ts` | Package entry point | ✓ VERIFIED | Exports Button, Card, CardHeader, CardBody, Badge, Avatar, cn |
| `packages/ui/src/cn.ts` | cn() utility | ✓ VERIFIED | twMerge(clsx(inputs)) — substantive implementation |

### Plan 04-02: Components

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/src/button.tsx` | Button component | ✓ VERIFIED | primary/secondary/ghost variants, sm/md sizes, uses cn(), 47 lines |
| `packages/ui/src/card.tsx` | Card, CardHeader, CardBody | ✓ VERIFIED | hover prop, stone-200/60 border, rounded-sm — matches dashboard pattern |
| `packages/ui/src/badge.tsx` | Badge component | ✓ VERIFIED | 5 colour variants matching role pill pattern exactly |
| `packages/ui/src/avatar.tsx` | Avatar component | ✓ VERIFIED | initials fallback, 3 sizes, no next/image dependency |

### Plan 04-03: App Integration

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `portal/next.config.ts` | transpilePackages includes @trackline/ui | ✓ VERIFIED | ["@trackline/supabase-config", "@trackline/ui"] |
| `portal/src/app/globals.css` | imports tokens.css, has @source | ✗ WRONG_PATH | File exists, @import and @source present but paths have wrong depth (../../ should be ../../../) |
| `camera-trap-dashboard/next.config.ts` | transpilePackages includes @trackline/ui | ✓ VERIFIED | Present with all other config preserved (headers, images, poweredByHeader) |
| `camera-trap-dashboard/src/app/globals.css` | @source directive only (shadcn app) | ✗ WRONG_PATH | @source "../../packages/ui/src" — needs "../../../packages/ui/src" |
| `fire-app/next.config.ts` | transpilePackages includes @trackline/ui | ✓ VERIFIED | Present, fire-app src/ now restored (0 deleted files) |
| `fire-app/src/app/globals.css` | @source directive only (shadcn app) | ✗ WRONG_PATH | @source "../../packages/ui/src" — needs "../../../packages/ui/src" |
| `trap-monitor/frontend/next.config.ts` | transpilePackages includes @trackline/ui | ✓ VERIFIED | ["@trackline/supabase-config", "@trackline/ui"] with reactStrictMode |
| `trap-monitor/frontend/src/app/globals.css` | imports tokens.css + @source | ✗ WRONG_PATH | @import "../../../packages/ui/tokens.css" — needs "../../../../packages/ui/tokens.css"; @source has same error |
| `docs/UI-RULES.md` | Opinionated UI reference | ✓ VERIFIED | 7002 bytes, colour table, typography, breakpoints, components, integration checklist |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| portal/src/app/globals.css | packages/ui/tokens.css | @import relative path | ✗ NOT_WIRED | Path "../../packages/ui/tokens.css" resolves to portal/packages/ui/tokens.css (DNE). Correct: "../../../packages/ui/tokens.css" |
| portal/src/app/globals.css | packages/ui/src | @source directive | ✗ NOT_WIRED | Same depth error — would not tell Tailwind to scan the correct directory |
| camera-trap-dashboard/src/app/globals.css | packages/ui/src | @source directive | ✗ NOT_WIRED | Same depth error — "../../" resolves wrong; needs "../../../" |
| fire-app/src/app/globals.css | packages/ui/src | @source directive | ✗ NOT_WIRED | Same depth error — "../../" resolves wrong; needs "../../../" |
| trap-monitor/frontend/src/app/globals.css | packages/ui/tokens.css | @import relative path | ✗ NOT_WIRED | "../../../packages/ui/tokens.css" resolves to trap-monitor/packages/ui (DNE). Correct: "../../../../packages/ui/tokens.css" |
| trap-monitor/frontend/src/app/globals.css | packages/ui/src | @source directive | ✗ NOT_WIRED | Same depth error as token import |
| portal/package.json | @trackline/ui | workspace:* dep | ✓ WIRED | Present |
| camera-trap-dashboard/package.json | @trackline/ui | workspace:* dep | ✓ WIRED | Present |
| fire-app/package.json | @trackline/ui | workspace:* dep | ✓ WIRED | Present |
| trap-monitor/frontend/package.json | @trackline/ui | workspace:* dep | ✓ WIRED | Present |
| packages/ui/src/index.ts | packages/ui/src/button.tsx | named export | ✓ WIRED | export { Button } from "./button" |
| packages/ui/src/index.ts | packages/ui/src/card.tsx | named export | ✓ WIRED | export { Card, CardHeader, CardBody } from "./card" |

---

## Data-Flow Trace (Level 4)

Not applicable — this phase delivers configuration and CSS tokens, not components that render dynamic data.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| @trackline/ui resolves in workspace | pnpm list --filter @trackline/ui | Package listed with all deps linked | ✓ PASS |
| TypeScript compiles packages/ui with no errors | pnpm --filter @trackline/ui exec tsc --noEmit | No output (exit 0) | ✓ PASS |
| portal production build succeeds | cd portal && pnpm build | CssSyntaxError: Can't resolve '../../packages/ui/tokens.css' in '…portal/src/app' | ✗ FAIL |
| tokens.css has no @import tailwindcss | grep @import packages/ui/tokens.css | No match (exit 1) | ✓ PASS |
| portal globals.css has no duplicate token definitions | grep red-dust portal/src/app/globals.css | No match (exit 1) — no duplication | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-01 | 04-01 | Design token CSS file (tokens.css) with colour palette, typography, spacing | ✓ SATISFIED | packages/ui/tokens.css exists with all hex values verbatim from portal's original globals.css; @theme inline block maps all tokens to Tailwind utilities |
| UI-02 | 04-02 | Shared component library with Button, Card, Badge, Avatar primitives | ✓ SATISFIED | All four components implemented, substantive, TypeScript-clean, exported from src/index.ts |
| UI-03 | 04-03 | Tailwind v4 @source directives configured in all consuming apps | ✗ BLOCKED | @source directives present in all four apps' globals.css files but path depths are wrong — production build confirms CSS cannot resolve the paths. Tailwind would not scan shared component source in production. |
| UI-04 | 04-03 | Common UI rules document defining responsive breakpoints, layout patterns, component conventions | ✓ SATISFIED | docs/UI-RULES.md at workspace root, 7002 bytes, contains colour table, breakpoints table, typography guide, layout patterns, component API reference |
| UI-05 | 04-01 | Between23-inspired aesthetic tokens propagated to all apps via CSS variables | ✗ BLOCKED | tokens.css is correct and complete but the @import path in globals.css files is broken — tokens cannot be loaded in production builds |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| portal/src/app/globals.css | @import "../../packages/ui/tokens.css" — wrong depth | Blocker | Production build fails; CSS custom properties not loaded; all brand styling breaks |
| camera-trap-dashboard/src/app/globals.css | @source "../../packages/ui/src" — wrong depth | Blocker | Tailwind won't scan shared components in production; component classes purged from CSS bundle |
| fire-app/src/app/globals.css | @source "../../packages/ui/src" — wrong depth | Blocker | Same as camera-trap-dashboard |
| trap-monitor/frontend/src/app/globals.css | @import "../../../packages/ui/tokens.css" — wrong depth | Blocker | Tokens not loaded; brand styling breaks in trap-monitor |
| trap-monitor/frontend/src/app/globals.css | @source "../../../packages/ui/src" — wrong depth | Blocker | Tailwind purges shared component classes in trap-monitor production build |

No TODO/FIXME markers, placeholder returns, or hardcoded empty values found in packages/ui/src/.

---

## Human Verification Required

None — all checks for this phase are automatable (path resolution, build, file content). The one outstanding item (production CSS rendering of components in the browser) is blocked by the path bug and is not needed once the paths are fixed and a production build succeeds.

---

## Root Cause Analysis

All five path errors share the same root cause. The plan specified paths based on where the apps sit relative to the workspace root, but the paths in globals.css are resolved by PostCSS relative to the **CSS file's directory on disk**, not the project root.

**Correct depth counting (PostCSS resolves relative to the CSS file location):**

| CSS file location | Levels to workspace root | Correct token import | Correct @source |
|-------------------|--------------------------|----------------------|-----------------|
| `portal/src/app/globals.css` | 3 levels | `../../../packages/ui/tokens.css` | `../../../packages/ui/src` |
| `camera-trap-dashboard/src/app/globals.css` | 3 levels | N/A (shadcn, @source only) | `../../../packages/ui/src` |
| `fire-app/src/app/globals.css` | 3 levels | N/A (shadcn, @source only) | `../../../packages/ui/src` |
| `trap-monitor/frontend/src/app/globals.css` | 4 levels | `../../../../packages/ui/tokens.css` | `../../../../packages/ui/src` |

**What is correct:** All `transpilePackages` entries, all `package.json` workspace:* dependencies, all component implementations, tokens.css content, docs/UI-RULES.md.

**What needs fixing:** Only the relative paths in four globals.css files.

---

## Gaps Summary

One root cause produces five broken paths across four files. The phase is otherwise complete — the package scaffold, component library, workspace linking, transpilePackages config, and docs are all correct. The paths in globals.css were off by one directory level, which causes a hard build failure when PostCSS tries to resolve the @import. Until fixed, no portal production build can succeed and no app gets the Tailwind @source scanning it needs.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_
