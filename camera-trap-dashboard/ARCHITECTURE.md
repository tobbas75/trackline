# System Architecture — WildTrack

Agents must respect this architecture.

# Core Principles

- clear separation of responsibilities
- predictable data flow (server components fetch, client components interact)
- minimal coupling between modules
- explicit validation at boundaries
- Row Level Security enforces data isolation per-organisation

# Layers

```
Client Components (React, Zustand stores)
  ↓
Next.js App Router (pages, layouts, route groups)
  ↓
API Routes (server-side, validation, caching, proxying)
  ↓
Supabase Client (database queries with RLS)
  ↓
PostgreSQL (Supabase-hosted, migrations in supabase/migrations/)
  ↓
External APIs (ALA — proxied, never called from client)
```

Agents should not bypass layers without approval.

# Route Groups

- `(auth)` — authenticated pages: dashboard, org management, project views
- `(public)` — unauthenticated pages: public explore, landing page
- `auth/` — login, register, callback flows
- `api/` — server-side API routes

# Authentication Flow

1. Supabase GoTrue handles signup/login/OAuth
2. `src/middleware.ts` refreshes the session cookie on every request
3. `src/lib/supabase/middleware.ts` contains the session update logic
4. Client-side auth state is managed via `src/stores/auth-store.ts`
5. Role-based access: Admin > Member > Viewer (per organisation)
6. `src/lib/auth/roles.ts` defines permission helpers (`canEdit`, `isAdmin`)

# Data Model

```
Organisations
  └─ Org Members (user + role)
  └─ Projects
       └─ Sites (camera trap locations)
       └─ Species (registry with ALA integration)
       └─ Observations (detection events)
       └─ Detection Histories (binary matrices for occupancy modelling)
       └─ CSV Uploads (import audit trail)
       └─ Column Mapping Templates (saved import mappings)
```

All tables enforce RLS policies scoped to organisation membership.

# External Integrations

## Atlas of Living Australia (ALA)

- **Purpose:** species taxonomy, conservation status, images
- **Auth:** none required (public API)
- **Proxy:** `src/app/api/ala/` routes with in-memory caching
- **Client lib:** `src/lib/ala/` (search, conservation, images)

## OpenStreetMap (Maps)

- **Purpose:** site location mapping
- **Auth:** none required
- **Client:** react-leaflet with OSM tile layer

# Shared Surfaces

Changes here require impact scanning:

- `src/lib/supabase/types.ts` — TypeScript interfaces for all DB tables
- `src/lib/auth/roles.ts` — permission logic used across all pages
- `src/lib/column-mapping/` — CSV import field definitions and auto-detection
- `src/lib/errors.ts` — error message mapping
- `src/stores/` — Zustand stores (auth, org, project)
- `src/components/ui/` — shadcn/ui base components
- `supabase/migrations/` — database schema (append-only, never edit existing migrations)
