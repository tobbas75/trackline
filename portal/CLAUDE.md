# Project AI Instructions — Trackline Portal

This file defines project-specific development rules for all AI agents (Claude Code, GitHub Copilot).

Global behaviour rules come from:
`C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

# Critical Security Rules

Never:
- hardcode API keys, tokens, or secrets
- commit `.env` or credential files
- expose tokens to client-side code
- run destructive commands without explicit approval
- call external APIs over HTTP — HTTPS only

If a secret appears in code, stop and warn the user immediately.

# Project Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **UI:** Tailwind CSS v4 (CSS-based config, no tailwind.config.ts)
- **Fonts:** DM Serif Display (display), Poppins (body) via next/font
- **Database & Auth:** Supabase (shared project across all Trackline apps)
- **Deployment:** Vercel (free tier)

# Architecture

This is the **portal/landing site** for the Trackline conservation technology suite.

## Related Apps (same Supabase project)
- **WildTrack** — camera trap management (`camera-trap-dashboard/`)
- **Fire System** — fire management & carbon (`Fire project system/fire-app/`)
- **Trap Monitor** — SMS trap hardware monitoring (`Trap Monitor/`)

## Shared Supabase
All apps share one Supabase project for auth and data. RLS policies are managed per-app schema. The portal handles:
- Public landing page
- Shared authentication (login/signup)
- User profile and app access management

# Key Conventions

- Tailwind v4: theme tokens defined in `globals.css` via `@theme inline`, NOT a config file
- Named exports only (except Next.js page/layout components)
- Server Components by default; `"use client"` only when needed (event handlers, hooks)
- Between23-inspired design: earthy palette, grain texture, DM Serif headings, Poppins body
- All Supabase tables must have RLS policies

# Design System

## Colour Tokens
- `stone-50` to `stone-900` — neutral scale
- `red-dust` / `red-dust-light` — primary accent (CTA, branding)
- `ochre` / `ochre-light` — secondary accent (contact, highlights)
- `eucalypt` / `eucalypt-light` — nature/success
- `sky` — info/technology

## Typography
- Display: `font-[family-name:var(--font-dm-serif)]`
- Body: default (Poppins via --font-sans)
- Section labels: `text-xs font-semibold tracking-widest uppercase text-red-dust`

# Shared Database Rules — CRITICAL

All Trackline apps share **one Supabase project**. The portal owns the `portal` schema. Careless changes here break WildTrack, Fire System, and Trap Monitor.

## Portal Owns (this project may CREATE, ALTER, DROP)

- **Schema:** `portal`
- **Tables:** `portal.apps`, `portal.app_access`, `portal.profiles`
- **Functions:** `portal.handle_new_user()`, `portal.update_updated_at()`, `portal.check_app_access()`
- **Triggers:** `on_auth_user_created` (on `auth.users`), `set_updated_at` (on `portal.profiles`)

## Shared Infrastructure the Portal Depends On

- `auth.users` — Supabase managed. The portal trigger `on_auth_user_created` fires on every signup across all apps.

## Never Touch from This Project

- `public.organisations` — owned by WildTrack, also used by Trap Monitor
- `public.org_members` — owned by WildTrack, also used by Trap Monitor
- `public.organization` (singular) — owned by Fire App
- `public.user_project` — owned by Fire App
- Any `public.*` helper functions (`is_org_member`, `is_org_admin`, `can_org_edit`, `create_organisation`, `trap_can_*`)
- Any app-specific tables (units, events, observations, sites, species, fire_scar, burn_plan, etc.)

## Rules for Schema Changes

1. **Never DROP or ALTER tables/functions outside the `portal` schema** without explicit user approval
2. **Never modify the `on_auth_user_created` trigger** without confirming impact on all three downstream apps — they all depend on `portal.profiles` being auto-created
3. **Never change the signature of `portal.check_app_access()`** — WildTrack, Fire, and Trap Monitor all call this RPC
4. **Never change the `portal.app_access` table structure** — all apps read it for access gating
5. **Never rename or remove columns from `portal.profiles`** — other apps query display_name and email
6. If adding columns to portal tables, use `ALTER TABLE ... ADD COLUMN ... DEFAULT` to avoid breaking existing queries
7. New portal tables must have RLS enabled and grants for the `authenticated` role

## Cross-App Impact Checklist

Before any migration change, verify:
- [ ] Does this affect `portal.check_app_access()` return shape? → All 3 apps break
- [ ] Does this affect `portal.profiles` columns? → WildTrack member lookups break
- [ ] Does this change the `on_auth_user_created` trigger? → New signups across all apps affected
- [ ] Does this add/change RLS on `portal.app_access`? → App access gating across all apps affected

Run `node portal/scripts/db-check.cjs <migration.sql>` before applying any migration that touches portal surfaces.

See `portal/PROTECTED_SURFACES.md` for the authoritative cross-app surface inventory.

# Reporting

When work is complete provide:
- what changed
- why it changed
- files modified
- verification performed
- any risks or assumptions

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Trackline Portal — Unified Platform**

The central hub for the Trackline conservation technology suite. A Next.js 16 portal that provides shared authentication, user-to-app access management, and a public landing page for four conservation tools: WildTrack (camera traps), Fire System (fire management & carbon), and Trap Monitor (SMS hardware monitoring). This milestone unifies all four projects under shared governance, centralized Supabase management, and a common UI/convention system.

**Core Value:** One login, one place to manage access, one source of truth for shared infrastructure — so each app team can move fast without breaking each other.

### Constraints

- **Tech stack**: Next.js 16, TypeScript strict, Tailwind v4, Supabase — no new frameworks
- **Deployment**: Vercel free tier — each app deploys independently
- **Database**: Shared Supabase project — portal schema changes require cross-app impact check
- **Budget**: $0 — free tiers only
- **Code style**: Elegant, concise, no verbose bloat
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - Full codebase (strict mode enabled)
- JavaScript - Config files (ESLint, PostCSS)
## Runtime
- Node.js (implicit from package.json, no specific version pinned)
- npm
- Lockfile: `package-lock.json` (present in repository)
## Frameworks
- Next.js 16.1.6 - Full application framework with App Router
- React 19.2.3 - UI library and rendering engine
- React DOM 19.2.3 - DOM-specific React methods
- Tailwind CSS 4.x - Utility-first CSS framework
- No testing framework detected (no Jest, Vitest, or test runner configuration present)
- TypeScript 5.x - Compilation and type checking
- ESLint 9.x - Linting
- PostCSS - CSS transformation pipeline
## Key Dependencies
- `@supabase/supabase-js` 2.98.0 - Supabase client for authentication and database access
- `@supabase/ssr` 0.9.0 - SSR-specific Supabase utilities for secure cookie-based session management
- `lucide-react` 0.577.0 - Lightweight icon library
- `DM_Serif_Display` - Google Font for display headings (loaded via next/font)
- `Poppins` - Google Font for body text (loaded via next/font)
## Configuration
- Method: `.env.local` (local only, not committed)
- Template: `.env.local.example` provides reference structure
- Required variables:
- `next.config.ts` - Next.js configuration (currently empty with default settings)
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.mjs` - ESLint configuration (flat config format, Next.js presets)
- No Prettier configuration detected
- `postcss.config.mjs` - Minimal PostCSS setup for Tailwind
## Platform Requirements
- Node.js (version unspecified, typically 18+ recommended for Next.js 16)
- npm (version unspecified)
- Git
- Deployment target: Vercel (mentioned in CLAUDE.md as free tier)
- Framework supports Node.js, Edge Runtime, or Serverless
## Dev Scripts
## Notable Omissions
- No database driver libraries (data access only via Supabase SDK)
- No testing framework or test runner
- No authentication library beyond Supabase
- No state management library (managed via Supabase and Next.js server components)
- No API client wrapper (direct Supabase SDK usage)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Component files: PascalCase followed by `.tsx` — `Header.tsx`, `AdminPanel.tsx`, `Projects.tsx`
- Utility/service files: camelCase `.ts` — `client.ts`, `server.ts`, `check-access.ts`, `actions.ts`
- API routes: directory-based with `route.ts` — `/auth/callback/route.ts`, `/auth/signout/route.ts`
- CSS files: `globals.css` for global styles
- Page files: `page.tsx` in route directories
- Named exports for all utilities and services — `export function checkAppAccess()`, `export async function getUserApps()`
- Async functions when they handle async operations
- Server actions prefixed with context: `grantAccess`, `revokeAccess`, `updateRole` in `actions.ts`
- Handler functions with `handle` prefix in client components — `handleSubmit`, `handleGrant`, `handleRevoke`, `handleRoleChange`
- camelCase for all variables and state: `email`, `password`, `userApps`, `expandedUser`, `isPending`
- React state uses `const [stateName, setStateName] = useState()`
- Constants in UPPER_SNAKE_CASE for lookup maps and arrays: `NAV_LINKS`, `PROJECTS`, `VALUES`, `ROLE_OPTIONS`, `ICON_MAP`, `COLOR_MAP`, `APP_COLORS`
- Type names (interfaces) use PascalCase: `AppAccess`, `UserAppRow`, `AllAccessRow`, `Profile`, `AccessRow`, `Project`
- Exported type aliases for API/database types — `type AppId = "wildtrack" | "fire" | "trap_monitor"`
- Interfaces for object shapes — `interface AppAccess`, `interface Project`, `interface Profile`
- Imported from Supabase: `type SupabaseClient`
- React types: `type ReactNode` for icon/element unions
## Code Style
- ESLint 9 with `eslint-config-next` (core web vitals + TypeScript)
- No Prettier config — ESLint handles all formatting
- 2-space indentation (Next.js default)
- No explicit line width enforcement observed
- ESLint strict configuration enabled
- Uses `eslint-config-next/core-web-vitals` for performance/accessibility rules
- Uses `eslint-config-next/typescript` for strict TypeScript rules
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run with: `npm run lint`
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: `bundler`
- JSX: `react-jsx`
- Path alias: `@/*` maps to `./src/*`
## Import Organization
- `@/*` → `./src/*` — used consistently for all internal imports
- Examples: `@/components/header`, `@/lib/supabase/server`, `@/lib/check-access`
## Error Handling
- Async functions destructure Supabase responses: `const { data, error } = await supabase.rpc(...)`
- Check for error first, return early: `if (error) { console.error(...); return []; }`
- Fallback to empty arrays/null on error: `return data ?? []`
- Server actions return error objects: `return { error: "message" }` or `{ success: true }`
- Client components track error state: `const [error, setError] = useState<string | null>(null)`
- Error messages display in UI with AlertCircle icon and red-dust color
- Specific error detection for provisioning (bootstrap fallback in `checkAppAccess`) — detects missing RPC/schema and returns admin access as fallback
- Try-catch silently ignored in Server Component cookie setting (documented) — Middleware handles refresh
- Async error chains without re-throw
## Logging
- Errors logged with `console.error()` and full context: `console.error("Failed to fetch user apps:", JSON.stringify(error, null, 2))`
- No info/debug logging observed — only error logging for failures
- Error logging paired with fallback return values (never throws)
## Comments
- Algorithm explanation and non-obvious logic: `// Local bootstrap fallback: allow signed-in users while portal schema/RPC is being provisioned.`
- Business rules and constraints: `/* Ignored in Server Components where cookies can't be set. Middleware will handle session refresh. */`
- Significant section dividers: `{/* Logo */}`, `{/* Desktop nav */}`, `{/* Expanded panel */}`
- Inline for error detection patterns: `// Auth code exchange failed — redirect to login with error`
- Used for exported functions that serve as API entry points
- Includes usage examples: `Usage in any Trackline app: const { hasAccess, role } = await checkAppAccess(supabase, 'wildtrack');`
- Documents function purpose and usage clearly
## Function Design
- Functions keep single responsibility — `checkAppAccess`, `getUserApps`, `isAdmin`, `getAllProfiles` each do one thing
- Utility functions typically 5–20 lines
- Page components vary (15–140 lines) based on layout needs
- Dependency injection via parameters: `function checkAppAccess(supabase: SupabaseClient, appId: AppId)`
- Explicit typing for all parameters and return values
- Server action parameters use `FormData` — `async function grantAccess(formData: FormData)`
- Promise-based for async: `Promise<AppAccess>`
- Error-first objects for mutations: `{ error: string }` or `{ success: true }`
- Arrays as fallback: return empty array `[]` on failure rather than null
- Null-coalescing for data: `data ?? []`
## Module Design
- Named exports only (except Next.js pages which use default export)
- Examples: `export function Header()`, `export async function checkAppAccess()`
- Server action files group related actions: `grantAccess`, `revokeAccess`, `updateRole` in `/admin/actions.ts`
- Not used in this codebase — each component imports directly from its source file
- `lib/supabase/` contains both client and server Supabase factories
- `components/` organized flat (no sub-directories)
- `app/` follows Next.js App Router structure with grouped routes like `(auth)` and `(protected)`
## Tailwind & Styling
- Inline Tailwind classes directly in JSX — no CSS modules
- Custom color tokens defined in `globals.css` via CSS variables
- Color palette: `stone-*` for neutrals, `red-dust`, `ochre`, `eucalypt`, `sky` for accents
- Layout: `mx-auto max-w-*` for container sizing, `px-6` for horizontal padding
- Responsive: `sm:`, `md:`, `lg:` breakpoints
- `.dust-line` — gradient divider between sections
- `.grain` — fixed grain texture overlay (pseudo-element)
- `.img-zoom` — smooth image scale on hover
- `.animate-fade-up` with `animation-delay-*` classes
- Display text: `font-[family-name:var(--font-dm-serif)]`
- Body text: default (Poppins via `--font-poppins`)
- No tailwind.config.ts — theme tokens inline in globals.css with `@theme inline`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server Components by default with minimal Client Components
- Middleware-based session refresh and auth state synchronization
- Shared Supabase authentication across three conservation apps (WildTrack, Fire System, Trap Monitor)
- Portal-managed access control layer via `portal.app_access` table
- Server Actions for admin operations on protected routes
- Tailwind v4 with CSS-based design tokens (no config file)
## Layers
- Purpose: Handle HTTP requests and render pages
- Location: `src/app/`
- Contains: Layout components, page components, route handlers
- Depends on: Supabase client/server, utility functions
- Used by: User browsers
- Purpose: Intercept all requests, refresh auth session, manage cookies
- Location: `src/middleware.ts`
- Contains: Session refresh logic, cookie management
- Depends on: `@supabase/ssr`, Next.js request/response objects
- Used by: All routes
- Purpose: Authorize app access via RPC and database queries
- Location: `src/lib/check-access.ts`
- Contains: `checkAppAccess()`, `getUserApps()`, `isAdmin()`, `getAllProfiles()`, `getAllAppAccess()`, `getAllApps()`
- Depends on: Supabase client, RPC `portal.check_app_access()`
- Used by: Dashboard, admin panel, protected layouts
- Purpose: Encapsulate Supabase client initialization
- Location: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Contains: Server-side and browser client factory functions
- Depends on: `@supabase/ssr`
- Used by: All components needing Supabase access
- Purpose: Reusable, stateless presentational pieces
- Location: `src/components/`
- Contains: Header, Hero, Projects, About, Approach, Contact, Footer
- Depends on: Tailwind CSS, lucide-react icons, Next.js Link
- Used by: Page components, layouts
- Purpose: Isolated server-side mutations with authorization
- Location: `src/app/(protected)/dashboard/admin/actions.ts`
- Contains: `grantAccess()`, `revokeAccess()`, `updateRole()`
- Depends on: Supabase server client, `isAdmin()` check, revalidation
- Used by: Admin panel client component
## Data Flow
- Auth state: Managed by Supabase, stored in cookies, refreshed on every request via middleware
- User's accessible apps: Fetched server-side on `/dashboard` load, never stored in browser
- Admin interface state: Local React state in AdminPanel (search, expanded users, pending action)
- Data consistency: Revalidation on mutation ensures fresh data on next page load
## Key Abstractions
- Purpose: Express per-user, per-app role grants
- Examples: `src/lib/check-access.ts` (`AppAccess` type), `portal.app_access` table
- Pattern: Users have explicit rows in `app_access` for each app they can access. Absence = no access.
- Purpose: Distinguish authorization levels within each app
- Values: `"viewer"` (read-only), `"member"` (full access), `"admin"` (can manage users)
- Scope: Per-app (a user is "admin" only on specific apps, not globally)
- Enforcement: RLS policies on `portal.app_access` require `role = 'admin'` to modify
- Purpose: Single source of truth for user identity, app registry, and access grants across all Trackline apps
- Tables: `portal.apps`, `portal.app_access`, `portal.profiles`
- Isolation: RLS ensures users see only their own data; admins see all access grants
- Purpose: Auto-create `portal.profiles` row when user signs up via Supabase Auth
- Trigger: `on_auth_user_created` fires on `auth.users` insert
- Function: `portal.handle_new_user()` extracts display_name and email from user metadata
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Render public landing with all sections, no data fetching
- Location: `src/app/(auth)/login/page.tsx`
- Triggers: Unauthenticated user visits `/login` or is redirected there
- Responsibilities: Render dark-themed login form, handle password auth, redirect to callback
- Location: `src/app/auth/callback/route.ts`
- Triggers: OAuth/email-link callbacks from Supabase with `?code=...`
- Responsibilities: Exchange auth code for session, set cookies, redirect to `/dashboard`
- Location: `src/app/(protected)/dashboard/page.tsx`
- Triggers: Authenticated user visits `/dashboard`
- Responsibilities: Fetch user's apps from `portal.app_access`, render app grid
- Location: `src/app/(protected)/dashboard/admin/page.tsx`
- Triggers: Admin user visits `/dashboard/admin`
- Responsibilities: Fetch all profiles, access rows, and apps; pass to AdminPanel component
- Location: `src/app/auth/signout/route.ts`
- Triggers: User submits form with `action="/auth/signout"` method="post"`
- Responsibilities: Call `supabase.auth.signOut()`, redirect to `/login`
## Error Handling
## Cross-Cutting Concerns
- Approach: `console.error()` for query failures (e.g., `getAllProfiles()`)
- Logs not collected; suitable for development and debugging in production logs
- Admin actions are not explicitly logged; audit trail could be added via Supabase triggers
- Approach: Minimal client-side (form inputs are `required`), server-side via RLS
- FormData validation in Server Actions (e.g., `if (!userId || !appId) return { error: ... }`)
- Supabase RLS policies enforce data isolation; users cannot bypass via SQL
- Approach: Supabase Auth (email/password)
- Session stored in `auth-token` and `auth-refresh-token` cookies
- Middleware refreshes session on every request
- No client-side token storage beyond cookies (secure, httpOnly)
- Approach: Two-tier
- Approach: User-facing messages are generic ("Sign in failed", "Access denied")
- Technical details logged to console for debugging
- Production errors are not exposed to prevent information leakage
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
