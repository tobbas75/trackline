# Fire App — Architecture & File Map

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | Server + client rendering, API routes |
| Language | TypeScript (strict) | Type safety across full stack |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | shadcn/ui | Accessible, composable UI primitives |
| Maps | MapLibre GL JS | Open-source vector/raster map rendering |
| State | Zustand | Lightweight client state management |
| Database | Supabase (Postgres) | Auth, DB, Storage, RLS |
| Image Processing | Sharp | Server-side image compositing & enhancement |
| Satellite Data | CDSE Processing API | Sentinel-2 L2A imagery via evalscripts |
| Testing | Vitest | Unit tests with React Testing Library |

## Application Pages

All app pages live under `src/app/(app)/` and share a layout with sidebar navigation.

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Project overview, key metrics |
| Map | `/map` | Interactive map with all layers, sentinel imagery |
| Fire History | `/fire-history` | Historical fire scars, import/upload |
| Burn Plans | `/burn-plans` | Create and manage prescribed burn plans |
| Vegetation | `/vegetation` | Vegetation/fuel type analysis |
| Carbon | `/carbon` | Carbon methodology compliance |
| SAVBAT | `/carbon/savbat` | Savanna burning abatement tool |
| Hotspots | `/hotspots` | Near-real-time satellite fire detections |
| Cultural Zones | `/cultural-zones` | Traditional Owner restrictions |
| Analysis Zones | `/zones` | Project sub-areas for fire metrics |
| Daily Plans | `/daily-plans` | Field operations daily planning |
| Flights | `/flights` | Aerial operations tracking |
| Seasons | `/seasons` | Fire season management |
| Inventory | `/inventory` | Equipment and resource tracking |
| Checklists | `/checklists` | Operational checklists |
| Reports | `/reports` | Report generation and vegetation uploads |
| Reference Layers | `/reference-layers` | Upload and manage reference GeoJSON |
| Methodology | `/methodology` | Savanna fire methodology documentation |
| Settings | `/settings` | App and project settings |
| Audit Log | `/audit-log` | Change history and audit trail |

## API Routes

| Endpoint | Method | Description | Key Dependencies |
|----------|--------|-------------|------------------|
| `/api/sentinel/imagery` | GET | Fetch/cache Sentinel-2 imagery | cdse-auth, cdse-process, sentinel-compositor, tiwi-grid |
| `/api/sentinel/imagery/status` | GET | Poll dMIBR job progress | sentinel-jobs |
| `/api/sentinel/imagery/library` | GET | List saved imagery records | supabase/admin |
| `/api/sentinel/scenes` | GET | Search STAC catalog for scenes | CDSE STAC API (public) |
| `/api/hotspots` | GET | DEA Hotspots proxy | DEA API |
| `/api/nafi/wms` | GET | NAFI WMS tile proxy | NAFI WMS |
| `/api/nafi/import` | POST | Import NAFI fire scars | Supabase |
| `/api/landgate` | GET | Landgate imagery proxy | Landgate API |
| `/api/weather` | GET | Weather data proxy | Weather API |
| `/auth/callback` | GET | Supabase OAuth callback | Supabase Auth |

All API routes use `apiGuard()` for method validation + rate limiting and `withSecurityHeaders()` on responses.

## State Stores (Zustand)

| Store | File | Key State |
|-------|------|-----------|
| Map | `stores/map-store.ts` | Layers, center, zoom, sentinel controls, drawing mode |
| Auth | `stores/auth-store.ts` | Current user, session |
| Organization | `stores/org-store.ts` | Active organization |
| Project | `stores/project-store.ts` | Active project, project list |
| Fire Scars | `stores/fire-scar-store.ts` | Fire scar datasets, selected year |
| Analysis | `stores/analysis-store.ts` | Analysis results, progress |
| Baseline | `stores/baseline-store.ts` | Carbon baseline parameters |
| Vegetation | `stores/vegetation-store.ts` | Vegetation/fuel type data |
| Reference Layers | `stores/reference-layer-store.ts` | Uploaded reference GeoJSON layers |
| Zones | `stores/zone-store.ts` | Analysis zones |
| Notifications | `stores/notification-store.ts` | In-app notifications |
| Audit | `stores/audit-store.ts` | Audit log entries |

## React Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useSentinelImagery` | `hooks/use-sentinel-imagery.ts` | Fetch sentinel imagery with polling + blob cache |
| `useSentinelLibrary` | `hooks/use-sentinel-library.ts` | Saved maps list with auto-refresh |
| `useSentinelScenes` | `hooks/use-sentinel-scenes.ts` | STAC scene discovery for date picker |
| `useFireScars` | `hooks/use-fire-scars.ts` | Fire scar data for selected year |
| `useHotspots` | `hooks/use-hotspots.ts` | DEA Hotspots data |
| `useWeather` | `hooks/use-weather.ts` | Weather data |
| `useAnalysis` | `hooks/use-analysis.ts` | Fire metrics analysis engine |
| `useCachedFetch` | `hooks/use-cached-fetch.ts` | Generic SWR-like fetch with cache |
| `useGpsTracker` | `hooks/use-gps-tracker.ts` | GPS location tracking |
| `useMobile` | `hooks/use-mobile.ts` | Responsive breakpoint detection |
| `useServiceWorker` | `hooks/use-service-worker.ts` | PWA service worker registration |

## Library Modules

### Sentinel/CDSE Pipeline
| Module | Purpose |
|--------|---------|
| `lib/sentinel-evalscripts.ts` | 7 Sentinel Hub v3 evalscripts (NDVI, NBR, NDWI, TC, FC, MIBR, MIBR-BW) |
| `lib/sentinel-compositor.ts` | Sharp-based compositing, differencing, contrast enhancement |
| `lib/sentinel-jobs.ts` | In-memory job state machine for async dMIBR processing |
| `lib/sentinel-storage.ts` | Supabase Storage persistence (upload/download) |
| `lib/cdse-auth.ts` | CDSE OAuth2 client credentials with token caching |
| `lib/cdse-process.ts` | CDSE Processing API client with retry logic |
| `lib/tiwi-grid.ts` | Tiwi Islands grid geometry (bbox, chunks, coordinates) |

### Core Utilities
| Module | Purpose |
|--------|---------|
| `lib/api-security.ts` | API route guard (methods, rate limiting) + security headers |
| `lib/geo-utils.ts` | Geographic utilities (bbox buffering, coordinate transforms) |
| `lib/spatial-utils.ts` | Spatial analysis (intersection, area calculation) |
| `lib/carbon-data.ts` | Carbon methodology data and calculations |
| `lib/fire-metrics-data.ts` | Fire metrics computation |
| `lib/analysis-engine.ts` | Analysis engine orchestration |
| `lib/analysis-types.ts` | Analysis type definitions |
| `lib/export-utils.ts` | Data export (CSV, GeoJSON, PDF) |
| `lib/mock-data.ts` | Development mock data |
| `lib/offline-store.ts` | Offline data persistence (IndexedDB) |
| `lib/help-content.ts` | Help dialog content |
| `lib/methodology-content.ts` | Methodology documentation content |
| `lib/utils.ts` | General utilities (cn, formatting) |

### Supabase
| Module | Purpose |
|--------|---------|
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `lib/supabase/server.ts` | Server-side Supabase client (cookies) |
| `lib/supabase/admin.ts` | Service-role admin client (server only) |
| `lib/supabase/middleware.ts` | Auth middleware for protected routes |
| `lib/supabase/types.ts` | Auto-generated TypeScript types from schema |

## Map Components

| Component | Purpose |
|-----------|---------|
| `components/map/fire-map.tsx` | Main MapLibre GL map — all layers + sentinel rendering |
| `components/map/map-layer-panel.tsx` | Layer visibility, sentinel controls, saved maps library |
| `components/map/sentinel-date-range-picker.tsx` | Date selection + "Find Clear" scene discovery |
| `components/map/map-buffer-toggle.tsx` | Data buffer radius control |
| `components/map/map-status-bar.tsx` | Map status information |
| `components/map/draw-map.tsx` | Drawing/editing map for geometry input |
| `components/map/operations-map.tsx` | Operations-specific map view |

## Database Migrations

Applied in order via `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: projects, organizations, users, burn plans, fire scars, hotspots, cultural zones |
| `002_analysis_zones.sql` | Analysis zone geometry + project relationships |
| `003_burn_type_ignition_lines.sql` | Burn plan detail geometry (ignition lines, burn types) |
| `004_reference_layers.sql` | Uploaded GeoJSON reference data with styling |
| `005_vegetation_analysis.sql` | Vegetation/fuel type classification data |
| `006_sentinel_imagery_cache.sql` | Processed sentinel imagery metadata, storage bucket, RLS |

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
Map state in Zustand drives MapLibre rendering via React effects:
```
Zustand store → useEffect in fire-map.tsx → MapLibre API calls
```

### Async Processing Pattern (dMIBR)
```
Client GET → 202 { jobId } → fire-and-forget background processing
Client polls status every 3s → { step, progress }
Job completes → client fetches cached image → displays on map
```

### Cross-Hook Communication
`useSentinelImagery` dispatches a custom DOM event when new imagery loads. `useSentinelLibrary` listens for this event to auto-refresh the saved maps list:
```
useSentinelImagery → window.dispatchEvent("sentinel-image-loaded")
useSentinelLibrary → window.addEventListener("sentinel-image-loaded", refresh)
```
