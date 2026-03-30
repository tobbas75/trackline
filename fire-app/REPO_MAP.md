# Repository Map

This file gives AI agents a quick map of the repository layout.

Global behaviour rules: `C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

## Root Directories

- `src/app/(app)/` — authenticated app pages (map, burn plans, carbon, fire history, etc.)
- `src/app/api/` — API routes (sentinel, hotspots, NAFI, landgate, weather)
- `src/app/auth/` — Supabase OAuth callback
- `src/components/map/` — MapLibre GL map and layer controls
- `src/components/ui/` — shadcn/ui component library
- `src/hooks/` — React hooks for data fetching and state
- `src/lib/` — utilities, API clients, processing logic, Supabase clients
- `src/lib/supabase/` — Supabase client variants (browser, server, admin, middleware, types)
- `src/stores/` — Zustand state stores (12 stores)
- `src/workers/` — web workers (analysis engine)
- `supabase/migrations/` — SQL migrations (001–006)
- `public/data/` — static data and sentinel image cache
- `docs/` — detailed technical documentation

## Sensitive Areas

Changes require extra care and impact scanning:

- **Auth & sessions**: `src/lib/supabase/middleware.ts`, `src/lib/supabase/server.ts`, `src/app/auth/`
- **API security**: `src/lib/api-security.ts` — used by every API route
- **Carbon calculations**: `src/lib/carbon-data.ts` — methodology compliance
- **Fire metrics**: `src/lib/fire-metrics-data.ts`, `src/lib/analysis-engine.ts`
- **Sentinel pipeline**: `src/lib/sentinel-*.ts`, `src/lib/cdse-*.ts` — tightly coupled modules
- **Grid geometry**: `src/lib/tiwi-grid.ts` — Tiwi Islands bbox and chunk coordinates
- **Shared state**: `src/stores/` — state shared across many components
- **Database schema**: `supabase/migrations/` — never modify applied migrations
- **Cultural zones**: Traditional Owner data — restricted visibility rules

## Entry Points

- **App pages**: `src/app/(app)/[feature]/page.tsx`
- **API routes**: `src/app/api/[service]/route.ts`
- **Map rendering**: `src/components/map/fire-map.tsx`
- **State stores**: `src/stores/[name]-store.ts`
- **Analysis worker**: `src/workers/`
- **Supabase admin**: `src/lib/supabase/admin.ts` (server-side service role operations)

## Common Edit Paths

- **UI bug** → `src/app/(app)/[page]/page.tsx` + `src/components/` + relevant store
- **Map issue** → `src/components/map/fire-map.tsx` + `src/stores/map-store.ts`
- **Sentinel imagery bug** → `src/lib/sentinel-*.ts` + `src/lib/cdse-*.ts` + `src/app/api/sentinel/`
- **Fire metrics bug** → `src/lib/fire-metrics-data.ts` + `src/lib/analysis-engine.ts` + `src/workers/`
- **Carbon calculation bug** → `src/lib/carbon-data.ts` + related hooks/pages
- **API route issue** → `src/app/api/[service]/route.ts` + `src/lib/api-security.ts`
- **Auth issue** → `src/lib/supabase/middleware.ts` + `src/lib/supabase/server.ts` + `src/app/auth/`
- **Database change** → new migration in `supabase/migrations/` + update `src/lib/supabase/types.ts`
- **State management** → `src/stores/[name]-store.ts` + consuming hooks/components

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/api-security.ts` | `apiGuard()` + `withSecurityHeaders()` — all API routes |
| `src/lib/supabase/admin.ts` | `getAdminClient()` — server-side DB operations |
| `src/lib/sentinel-compositor.ts` | Image compositing, differencing, contrast enhancement |
| `src/lib/sentinel-evalscripts.ts` | 7 Sentinel Hub v3 evalscripts |
| `src/lib/sentinel-jobs.ts` | In-memory job state machine for async dMIBR |
| `src/lib/sentinel-storage.ts` | Supabase Storage persistence |
| `src/lib/cdse-auth.ts` | CDSE OAuth2 client credentials |
| `src/lib/cdse-process.ts` | CDSE Processing API client with retry |
| `src/lib/tiwi-grid.ts` | Tiwi Islands grid geometry |
| `src/lib/carbon-data.ts` | Carbon methodology data + calculations |
| `src/lib/fire-metrics-data.ts` | Fire metrics computation |
| `src/components/map/fire-map.tsx` | Main MapLibre GL map |
| `src/stores/map-store.ts` | Map state (layers, zoom, sentinel controls) |
