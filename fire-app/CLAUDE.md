# Fire Project System — AI Agent Instructions

This file defines project-specific development rules for all AI agents (Claude Code, GitHub Copilot).

Global behaviour rules:
`C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

Copilot-specific instructions: `.github/copilot-instructions.md`

## Critical Security Rules

These are non-negotiable. Global rules at the path above have full detail.

Never:
- hardcode API keys, tokens, or secrets
- commit `.env` or credential files
- expose tokens to client-side code
- run destructive commands (`rm -rf`, `git reset --hard`, `DROP TABLE`) without explicit approval
- call external APIs over HTTP — HTTPS only
- concatenate user input into SQL queries or shell commands

If a secret appears in code, stop and warn the user immediately.

## Required Reads

Before making significant changes, AI agents must read:

- `ARCHITECTURE.md` — system structure and boundaries
- `DOMAIN_RULES.md` — business invariants and calculations
- `REPO_MAP.md` — folder layout and sensitive areas

## Project Overview

Fire management platform for Indigenous ranger groups on the Tiwi Islands (NT, Australia). Manages savanna fire carbon methodology compliance, fire scar mapping, burn planning, vegetation analysis, and satellite imagery.

**Stack**: Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Zustand · MapLibre GL · Sharp

## Quick Start

```bash
cd fire-app
npm install
npm run dev         # http://localhost:3000
npx tsc --noEmit    # type-check
npm test            # vitest
```

### Required Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `CDSE_CLIENT_ID` | Copernicus Data Space OAuth2 client ID |
| `CDSE_CLIENT_SECRET` | Copernicus Data Space OAuth2 client secret |
| `NEXT_PUBLIC_APP_URL` | App base URL (default `http://localhost:3000`) |

## Project Structure

```
fire-app/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated app pages (layout with sidebar)
│   │   │   ├── map/            # Main map view (MapLibre GL + layers)
│   │   │   ├── burn-plans/     # Burn plan management
│   │   │   ├── carbon/         # Carbon methodology & SAVBAT
│   │   │   ├── fire-history/   # Fire scar history & uploads
│   │   │   ├── vegetation/     # Vegetation/fuel type analysis
│   │   │   ├── dashboard/      # Project dashboard
│   │   │   └── ...             # Other feature pages
│   │   ├── api/
│   │   │   ├── sentinel/       # Sentinel-2 imagery system (see docs/)
│   │   │   ├── hotspots/       # DEA Hotspots proxy
│   │   │   ├── nafi/           # NAFI fire scar WMS/import
│   │   │   ├── landgate/       # Landgate imagery proxy
│   │   │   └── weather/        # Weather data proxy
│   │   └── auth/callback/      # Supabase OAuth callback
│   ├── components/
│   │   ├── map/                # Map components (fire-map, layers, sentinel picker)
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/                  # React hooks (data fetching, state)
│   ├── lib/                    # Utilities, API clients, processing logic
│   │   ├── supabase/           # Supabase client (browser, server, admin, types)
│   │   ├── sentinel-*          # Sentinel-2 processing pipeline
│   │   ├── cdse-*              # CDSE auth & Processing API client
│   │   └── tiwi-grid.ts        # Tiwi Islands grid geometry
│   ├── stores/                 # Zustand state stores
│   └── workers/                # Web workers (analysis engine)
├── supabase/migrations/        # SQL migrations (001–006)
└── public/data/                # Static data + sentinel cache
```

## Key Systems

### Sentinel-2 Imagery Pipeline

Full documentation: `docs/sentinel-imagery-system.md`

- **9 products**: NDVI, NBR, NDWI, True Colour, False Colour, MIBR, MIBR (B&W), dMIBR, dMIBR (B&W)
- **Three-tier cache**: client blob URLs → server disk → Supabase Storage
- **Async processing**: dMIBR products use 202 + polling pattern (5-step background job)
- **Grid chunking**: 4×2 grid (8 chunks) to fit CDSE 2500px limit
- **Contrast enhancement**: Auto-levels + S-curve for grayscale products (mibr_bw)
- Key files: `src/lib/sentinel-*.ts`, `src/lib/cdse-*.ts`, `src/lib/tiwi-grid.ts`

### Map System

- **MapLibre GL** for vector + raster rendering
- **Zustand store** (`map-store.ts`) for all map state
- **Layer panel** with visibility toggles, sentinel controls, saved maps library
- **Reference layers** uploaded as GeoJSON/shapefiles
- Sentinel imagery rendered as `image` source with `raster` layer type

### Fire Scar System

- NAFI WMS overlay for current-season fire scars
- Historical fire scar import from shapefiles
- EDS/LDS classification (early/late dry season)
- Fire metrics analysis engine (web worker)

### Database (Supabase)

6 migrations in `supabase/migrations/`:
1. `001_initial_schema` — projects, burn plans, organizations, users
2. `002_analysis_zones` — project sub-areas for fire analysis
3. `003_burn_type_ignition_lines` — burn plan geometry details
4. `004_reference_layers` — uploaded GeoJSON reference data
5. `005_vegetation_analysis` — vegetation/fuel type data
6. `006_sentinel_imagery_cache` — processed imagery metadata + storage

## Conventions

- **API routes** use `apiGuard()` for method + rate limiting, `withSecurityHeaders()` on responses
- **Supabase admin client** (`getAdminClient()`) for server-side DB operations
- **All monetary values** as `DECIMAL(12,2)` — never float
- **State management** via Zustand stores — no Redux or React Context for app state
- **Component library** is shadcn/ui — don't install competing UI libraries
- **Styling** is Tailwind only — no CSS modules, styled-components, or inline style objects
- **Imports** use `@/` path alias for `src/`

## Testing

```bash
npm test              # Run all vitest tests
npm test -- --watch   # Watch mode
```

Test files live next to source: `__tests__/filename.test.ts`

## Security Notes

- CDSE OAuth2 tokens are server-side only — never sent to browser
- All API routes validate input and apply rate limiting
- Supabase RLS enabled on all tables
- Sentinel imagery bucket is private (authenticated download only)

## Agent Expectations

- Read relevant files before editing
- Follow existing architecture — do not bypass layers
- Make the smallest safe change
- Scan impact before modifying shared code (see `ARCHITECTURE.md` shared surfaces)
- Verify behaviour before completion

## Code Behaviour

Prefer:
- Editing existing files over creating new ones
- Reusing existing helpers
- Preserving interfaces

Avoid:
- Unrelated refactors
- Speculative abstractions
- Bypassing validation or architecture layers

## Copilot Handoff Workflow

Claude may delegate routine, low-risk tasks to GitHub Copilot.

When delegating:

1. Write a task prompt using the template at `C:\Users\tobyw\AI Global rules\handoff\COPILOT_TASK_TEMPLATE.md`
2. Save the prompt to `copilot-tasks/` in the repo root
3. Notify the user — they paste the prompt into Copilot manually
4. After Copilot completes the work, review the changes using `C:\Users\tobyw\AI Global rules\handoff\COPILOT_REVIEW_TEMPLATE.md`

Eligible tasks: boilerplate, tests for existing code, renames, style changes, repetitive patterns.

Never delegate: security code, financial logic, schema changes, shared interface changes, architectural decisions.

See global rules section 12 for full detail.

## Shared Database Rules — CRITICAL

All Trackline apps share **one Supabase project**. Fire App uses its own isolated tables but must not collide with shared infrastructure.

### Fire App Owns (this project may CREATE, ALTER, DROP)

- **Tables:** `organization` (singular), `project`, `user_project`, `fire_season`, `burn_plan`, `burn_execution`, `daily_plan`, `flight_plan`, `fire_scar`, `fire_history_overlay`, `fire_scar_upload`, `analysis_zone`, `cultural_zone`, `reference_layer`, `vegetation_map`, `hotspot`, `sentinel_scene`, `vegetation_analysis`, `sentinel_imagery_cache`, `carbon_project`, `accu_period`, `gps_track`, `incendiary_drop`, `daily_checklist`, `equipment`, `incendiary_inventory`, `document`, `audit_log`
- **Functions:** `classify_burn_season()`, `update_updated_at()` (if Fire App's own version)
- **Enums:** `user_role`, `burn_season`, `burn_plan_status`, `fire_scar_source`, `checklist_type`, `equipment_type`, `equipment_status`, `burn_type`, `vegetation_index_type`, `vegetation_source`
- **Storage buckets:** `sentinel-imagery`, `fire-scars`

### Portal Schema — READ ONLY from this project

- `portal.app_access` — Fire App calls `check_app_access('fire')` for access gating
- `portal.check_app_access()` — consumed via RPC
- **Never CREATE, ALTER, or DROP anything in the `portal` schema** from this project

### Never Touch from This Project

- `public.organisations` (plural) — owned by WildTrack, used by Trap Monitor
- `public.org_members` — owned by WildTrack, used by Trap Monitor
- `public.projects` (WildTrack's version) — note: Fire App has its own `project` table (singular, no conflict)
- `public.units`, `events`, `commands`, `notifications` — owned by Trap Monitor
- `is_org_member()`, `is_org_admin()`, `can_org_edit()` — owned by WildTrack
- `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()` — owned by Trap Monitor
- `create_organisation()`, `soft_delete_organisation()` — owned by WildTrack
- WildTrack domain tables (sites, species, observations, etc.)

### Rules for Schema Changes

1. **Never create tables named `organisations`, `org_members`, `profiles`, `units`, `events`, `commands`, `notifications`, `sites`, `species`, `observations`** — these names are taken by other apps
2. **Never create functions named `is_org_member`, `is_org_admin`, `can_org_edit`, `create_organisation`** — these exist in `public` schema from other apps
3. Fire App's `organization` (singular) is intentionally different from WildTrack's `organisations` (plural) — do not "fix" this naming
4. Fire App's `update_updated_at()` may collide with WildTrack's version in `public` schema — use `CREATE OR REPLACE` and ensure the function body is compatible (just sets `new.updated_at = now()`)
5. All new tables must have RLS enabled
6. New enums must not collide with WildTrack or Trap Monitor enum names

### Cross-App Impact Checklist

Before any migration change, verify:
- [ ] Does this create a new table or function in `public` schema? → Check name collisions across all apps
- [ ] Does this redefine `update_updated_at()`? → WildTrack uses the same function name in `public` schema — `CREATE OR REPLACE` will silently overwrite WildTrack's version
- [ ] Does this create new enums? → Check for name collisions with WildTrack's `org_type`, `org_role`, `project_role`, `upload_type`, `upload_status`

Run `node portal/scripts/db-check.cjs <migration.sql>` before applying any migration that touches portal or shared public surfaces.

See `portal/PROTECTED_SURFACES.md` for the authoritative cross-app surface inventory.

## Reporting

When work is complete, provide:
- What changed and why
- Files modified
- Verification performed
- Any risks or assumptions
