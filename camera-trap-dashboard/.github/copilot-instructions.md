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

## Expectations

- Read relevant files before editing
- Follow existing architecture
- Make the smallest safe change
- Scan impact before modifying shared code
- Verify behaviour before completion

## Project Stack

- Next.js 15 (App Router) with TypeScript strict mode
- shadcn/ui + Tailwind CSS for UI
- Supabase for database (PostgreSQL with RLS) and auth
- Zustand for client-side state
- Atlas of Living Australia (ALA) for species data — proxied via API routes

## Key Conventions

- Named exports only (except Next.js page/layout components)
- Supabase migrations are sequential and append-only (`supabase/migrations/`)
- All tables require Row Level Security policies
- External API calls go through `src/app/api/` routes — never from client code
- CSV import column definitions live in `src/lib/column-mapping/field-registry.ts`
- TypeScript interfaces for DB tables in `src/lib/supabase/types.ts`
