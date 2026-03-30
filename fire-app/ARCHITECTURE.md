# System Architecture

This document describes the structure of the Fire Project System.

Agents must respect this architecture.

## Core Principles

- Clear separation of responsibilities (client / API / services / data / external)
- Predictable data flow: Zustand stores → React effects → MapLibre API calls
- Minimal coupling between modules
- Explicit validation at boundaries (all API routes use `apiGuard()` + `withSecurityHeaders()`)
- Server-side only for secrets — CDSE tokens, Supabase service role key never reach the browser

## Layers

| Layer | Implementation |
|-------|---------------|
| Client / Interface | Next.js 15 App Router pages under `src/app/(app)/`, MapLibre GL map, shadcn/ui components |
| API / Controllers | Next.js API routes under `src/app/api/` — Sentinel, Hotspots, NAFI, Landgate, Weather |
| Business Logic / Services | `src/lib/` modules — analysis engine, carbon calculations, fire metrics, spatial utils |
| State Management | Zustand stores in `src/stores/` (12 stores) |
| Data Access | Supabase clients in `src/lib/supabase/` — browser, server, admin |
| External Integrations | CDSE Processing API (Sentinel-2), DEA Hotspots, NAFI WMS, Landgate, Weather API |

Agents should not bypass layers without approval.

## Key Architectural Patterns

### API Security

All API routes follow the same pattern:
```typescript
export async function GET(request: NextRequest) {
  const guard = apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (guard) return guard;
  // ... handler logic ...
  return withSecurityHeaders(response);
}
```

### State → Map Binding

```
Zustand store → useEffect in fire-map.tsx → MapLibre API calls
```

### Async Processing (dMIBR)

```
Client GET → 202 { jobId } → fire-and-forget background processing
Client polls status every 3s → { step, progress }
Job completes → client fetches cached image → displays on map
```

### Cross-Hook Communication

```
useSentinelImagery → window.dispatchEvent("sentinel-image-loaded")
useSentinelLibrary → window.addEventListener("sentinel-image-loaded", refresh)
```

### Three-Tier Image Cache

```
Tier 1: Client in-memory blob URLs (session lifetime)
Tier 2: Server disk cache (public/data/sentinel-cache/)
Tier 3: Supabase Storage (persistent, private bucket)
```

## Known Technical Debt

- **Rate limiting is in-memory** (`src/lib/api-security.ts` uses a `Map`). This resets on server restart and does not work across multiple instances. Replace with Redis (Upstash or Supabase) before scaling beyond a single server.
- **Carbon data is mock** (`src/lib/carbon-data.ts`). The `carbon_project` / `accu_period` Supabase tables do not yet exist. This file must be replaced with DB queries when those migrations are added.
- **Supabase types are hand-written** (`src/lib/supabase/types.ts`). These should be auto-generated from the schema using `supabase gen types`.

## Key Analysis Dependencies

The analysis engine (`src/lib/analysis-engine.ts`) uses **Turf.js** for all spatial operations:

- `@turf/area` — geodesic area calculation
- `@turf/length` — perimeter calculation
- `@turf/intersect` — fire scar × boundary / fire scar × vegetation clipping
- `@turf/bbox` — bounding box for point-grid generation
- `@turf/point-grid` — 0.5km sample grid for burn history
- `@turf/boolean-contains` — point-in-polygon testing

Do not replace Turf.js with planar geometry — area results will be wrong for large polygons at this latitude.

## Shared Surfaces

Changes here require impact scanning:

- `src/lib/api-security.ts` — used by every API route
- `src/lib/supabase/` — database access for all features
- `src/stores/` — state shared across components
- `src/lib/sentinel-*.ts` — imagery pipeline modules (tightly coupled)
- `src/lib/carbon-data.ts` — carbon methodology calculations
- `src/lib/fire-metrics-data.ts` — fire metrics computation
- `src/lib/analysis-types.ts` — shared type definitions for analysis
- `src/lib/geo-utils.ts` and `src/lib/spatial-utils.ts` — used by map + analysis

## Detailed File Map

For comprehensive tables of all pages, API routes, stores, hooks, libraries, and components, see:

- [docs/architecture.md](docs/architecture.md) — full file map with tables
- [docs/data-flow.md](docs/data-flow.md) — how fire scars drive all calculations
- [docs/sentinel-imagery-system.md](docs/sentinel-imagery-system.md) — Sentinel-2 pipeline deep dive
