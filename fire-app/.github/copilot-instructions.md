# Copilot Instructions

This repository uses a centralized AI development system.

Before making significant changes, read:

- `CLAUDE.md` — project working instructions and critical security rules
- `ARCHITECTURE.md` — system structure and boundaries
- `DOMAIN_RULES.md` — business invariants and calculations
- `REPO_MAP.md` — folder layout and sensitive areas

Global behaviour rules:
`C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

## Critical Security Rules

Never:
- hardcode API keys, tokens, or secrets
- commit .env or credential files
- expose tokens to client-side code
- run destructive commands without explicit approval
- call external APIs over HTTP — HTTPS only
- concatenate user input into SQL queries or shell commands

If a secret appears in code, stop and warn the user immediately.

## Project Context

Fire management platform for Indigenous ranger groups on the Tiwi Islands (NT, Australia). Manages savanna fire carbon methodology compliance, fire scar mapping, burn planning, vegetation analysis, and Sentinel-2 satellite imagery.

**Stack**: Next.js 15 (App Router) · TypeScript strict · Tailwind · shadcn/ui · Supabase · Zustand · MapLibre GL · Sharp

## Expectations

- Read relevant files before editing
- Follow existing architecture
- Make the smallest safe change
- Scan impact before modifying shared code
- Verify behaviour before completion

## Code Conventions

- TypeScript strict mode — no `any` types unless commented
- `apiGuard()` + `withSecurityHeaders()` on all API routes
- Zustand for client state — no Redux or React Context for app state
- shadcn/ui only — don't install competing UI libraries
- Tailwind only — no CSS modules, styled-components, or inline styles
- `@/` path alias for `src/`
- All monetary values as `DECIMAL(12,2)` — never float
- CDSE/OAuth2 tokens server-side only — never sent to browser

## Key Technical Details

- Sentinel-2 imagery uses 4×2 grid chunking (8 chunks) for CDSE 2500px limit
- dMIBR uses async 202 + polling pattern
- MIBR evalscript is inverted (`1 - norm`), so differencing swaps subtraction order
- Three-tier image cache: client blob URLs → server disk → Supabase Storage
- Map rendering: Zustand store → useEffect → MapLibre API calls
