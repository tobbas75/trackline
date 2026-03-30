# Repository Map — WildTrack

Quick reference for AI agents to find the right modules.

# Root Directories

- `src/app/` — Next.js App Router pages, layouts, and API routes
- `src/components/` — reusable UI components (shadcn/ui base + custom)
- `src/lib/` — shared logic, helpers, and service modules
- `src/stores/` — Zustand client-side state stores
- `src/hooks/` — custom React hooks
- `supabase/` — database migrations and Supabase config
- `scripts/` — utility scripts (seed data, etc.)

# App Routes

## Authenticated `src/app/(auth)/`
- `dashboard/` — main dashboard after login
- `org/[orgId]/` — organisation overview
- `org/[orgId]/settings/` — org settings
- `org/[orgId]/members/` — member management
- `org/[orgId]/project/new/` — create project
- `org/[orgId]/project/[projectId]/` — project dashboard (analytics)
- `org/[orgId]/project/[projectId]/sites/` — camera station management
- `org/[orgId]/project/[projectId]/species/` — species registry
- `org/[orgId]/project/[projectId]/observations/` — observation records
- `org/[orgId]/project/[projectId]/upload/` — CSV import wizard
- `org/[orgId]/project/[projectId]/detection-histories/` — occupancy matrices

## Public `src/app/(public)/`
- `explore/` — public project browser
- `explore/project/[projectId]/` — public project view

## Auth `src/app/auth/`
- `login/` — sign in
- `register/` — sign up

## API Routes `src/app/api/`
- `ala/species/search/` — ALA species autocomplete proxy
- `ala/species/[guid]/` — ALA species profile proxy (image + conservation)
- `orgs/[orgId]/` — organisation API
- `projects/[projectId]/` — project data API (export, detection histories)

# Library Modules `src/lib/`

- `ala/` — Atlas of Living Australia client (search, images, conservation)
- `auth/roles.ts` — permission helpers (canEdit, isAdmin)
- `column-mapping/` — CSV column detection and mapping system
  - `field-registry.ts` — system field definitions and aliases
  - `auto-detect.ts` — automatic column matching logic
- `supabase/` — Supabase client factories and middleware
  - `client.ts` — browser client
  - `server.ts` — server component client
  - `middleware.ts` — session refresh middleware
  - `types.ts` — TypeScript interfaces for all DB tables
- `validators/` — Zod schemas for API validation
- `errors.ts` — Supabase error code → user-friendly message mapping
- `help-content.ts` — help text, glossary, and getting-started content

# Components `src/components/`

- `ui/` — shadcn/ui base components (Button, Card, Dialog, etc.)
- `dashboard/` — project dashboard charts and stat cards
- `explore/` — public explore page components
- `help/` — help dialog and tooltip components
- `layout/` — app shell, sidebar, navigation
- `org/` — organisation-specific components

# Stores `src/stores/`

- `auth-store.ts` — current user session
- `org-store.ts` — current organisation and member role
- `project-store.ts` — current project context

# Database `supabase/migrations/`

Migrations are sequential and append-only. Never edit existing migrations.

- `001_foundation.sql` — profiles, organisations, projects, org_members
- `002_security_fixes.sql` — RLS policy fixes
- `003_phase2_sites_species.sql` — sites, species, csv_uploads, column_mapping_templates
- `004_phase3_observations.sql` — observations table
- `005_phase6_detection_histories.sql` — detection_histories and detection_history_rows
- `006_add_species_local_name.sql` — local_name column on species

# Sensitive Areas

Changes here require extra care and impact scanning:

- `src/lib/supabase/types.ts` — all components depend on these interfaces
- `src/lib/auth/roles.ts` — permission logic gates all write operations
- `src/lib/column-mapping/field-registry.ts` — defines what CSV columns can be imported
- `supabase/migrations/` — schema changes affect everything downstream
- `src/middleware.ts` — auth session refresh on every request
- `src/stores/` — shared state used across many pages

# Common Edit Paths

- **UI bug** → route page component + `src/components/` + Zustand store
- **Import bug** → `src/app/(auth)/.../upload/page.tsx` + `src/lib/column-mapping/`
- **Species/ALA issue** → `src/lib/ala/` + `src/app/api/ala/` + species page
- **Auth issue** → `src/lib/auth/roles.ts` + `src/middleware.ts` + `src/lib/supabase/middleware.ts`
- **New DB field** → new migration + `src/lib/supabase/types.ts` + affected pages
- **Analytics bug** → `src/components/dashboard/` + project page
