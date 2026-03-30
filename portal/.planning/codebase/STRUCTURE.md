# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
portal/
├── src/
│   ├── app/                              # Next.js App Router routes
│   │   ├── (auth)/                       # Unauthenticated auth pages (login, signup, no-access)
│   │   │   ├── layout.tsx                # Dark-themed auth wrapper
│   │   │   ├── login/page.tsx            # Password sign-in form
│   │   │   ├── signup/page.tsx           # Account creation
│   │   │   └── no-access/page.tsx        # User lacks app access (fallback page)
│   │   ├── (protected)/                  # Requires authenticated user
│   │   │   ├── layout.tsx                # Auth guard, redirects to /login if not signed in
│   │   │   └── dashboard/
│   │   │       ├── page.tsx              # User's accessible apps grid
│   │   │       └── admin/
│   │   │           ├── page.tsx          # Admin-only user/access management
│   │   │           ├── admin-panel.tsx   # Client Component for search, grant, revoke
│   │   │           └── actions.ts        # Server Actions: grantAccess, revokeAccess, updateRole
│   │   ├── auth/                         # Server-only auth routes
│   │   │   ├── callback/route.ts         # OAuth/email callback, exchanges auth code
│   │   │   └── signout/route.ts          # POST endpoint to sign out
│   │   ├── layout.tsx                    # Root layout (fonts, metadata, grain overlay)
│   │   ├── page.tsx                      # Public landing page
│   │   └── globals.css                   # Tailwind imports, design tokens (@theme), animations
│   ├── components/                       # Reusable presentational components
│   │   ├── header.tsx                    # Navigation header (landing page)
│   │   ├── hero.tsx                      # Hero section with CTAs
│   │   ├── projects.tsx                  # Three-app cards (WildTrack, Fire, Trap Monitor)
│   │   ├── about.tsx                     # Mission and vision
│   │   ├── approach.tsx                  # Feature overview
│   │   ├── contact.tsx                   # Contact form (mailto, feedback)
│   │   └── footer.tsx                    # Footer links and copyright
│   └── lib/                              # Utilities and services
│       ├── check-access.ts               # Access control: checkAppAccess, getUserApps, isAdmin, getAllProfiles, getAllAppAccess, getAllApps
│       └── supabase/
│           ├── server.ts                 # Supabase server client factory (uses cookies)
│           └── client.ts                 # Supabase browser client factory
├── supabase/                             # Database migrations and local config
│   ├── migrations/
│   │   ├── 001_portal_app_access.sql     # Schema, tables, RLS, triggers (portal schema)
│   │   └── 002_admin_policies.sql        # Additional admin authorization policies
│   └── .temp/                            # Local Supabase CLI generated files
├── public/                               # Static assets (favicon, images, fonts)
├── docs/                                 # Documentation (external references)
├── .planning/
│   └── codebase/                         # GSD planning documents (this file)
├── .claude/                              # Local AI context storage
├── .next/                                # Next.js build output (ignored)
├── .git/                                 # Version control (ignored)
├── node_modules/                         # Dependencies (ignored)
├── .gitignore                            # Git exclude rules
├── .env.local.example                    # Template for environment variables
├── CLAUDE.md                             # Project-specific AI instructions
├── ARCHITECTURE.md                       # Architecture reference
├── README.md                             # Project overview
├── package.json                          # Dependencies: next, react, @supabase/ssr, @supabase/supabase-js, lucide-react, tailwindcss
├── package-lock.json                     # Locked dependency versions
├── tsconfig.json                         # TypeScript config: strict mode, @/* alias
├── next.config.ts                        # Next.js config (minimal)
├── postcss.config.mjs                    # PostCSS with Tailwind v4
├── eslint.config.mjs                     # ESLint with Next.js preset
└── middleware.ts                         # Root middleware for session refresh
```

## Directory Purposes

**`src/app/`**
- Purpose: Next.js App Router pages and layouts
- Contains: Route definitions, Server Components, Client Components, Server Actions
- Key files: `page.tsx` (landing), `layout.tsx` (root and route groups), `route.ts` (API handlers)

**`src/app/(auth)/`**
- Purpose: Unauthenticated user flows (login, signup)
- Contains: Password auth page, signup page, no-access fallback
- Key files: `login/page.tsx`, `signup/page.tsx`, `layout.tsx` (dark theme wrapper)
- Routing: Public group; users can access before signing in

**`src/app/(protected)/`**
- Purpose: Authenticated user area with access control
- Contains: Dashboard pages, admin panel
- Key files: `layout.tsx` (auth guard), `dashboard/page.tsx`, `admin/page.tsx`
- Routing: Protected group; layout redirects unauthenticated users to `/login`

**`src/app/auth/`**
- Purpose: Server-only OAuth/auth callback endpoints
- Contains: Code exchange, sign-out handlers
- Key files: `callback/route.ts`, `signout/route.ts`
- Routing: Not user-facing; internal redirect targets

**`src/components/`**
- Purpose: Reusable UI components for landing page
- Contains: Static, presentational components (Header, Hero, Projects, About, Approach, Contact, Footer)
- Key files: All files export named functions
- Naming: kebab-case filenames, PascalCase exports

**`src/lib/`**
- Purpose: Shared utilities and data services
- Contains: Access control logic, Supabase client factories
- Key files: `check-access.ts` (RPC calls and queries), `supabase/server.ts`, `supabase/client.ts`

**`supabase/migrations/`**
- Purpose: Database schema and initial data
- Contains: SQL migrations for portal schema, tables, RLS policies, triggers
- Key files: `001_portal_app_access.sql` (main), `002_admin_policies.sql` (refinements)
- Ordering: Numbered; applied sequentially

**`public/`**
- Purpose: Static assets served as-is
- Contains: Favicon, images, fonts
- Committed: Yes

**`.planning/codebase/`**
- Purpose: GSD planning documents for future phases
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md (as created)
- Generated: No (hand-written by Claude)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout—loads fonts (DM Serif, Poppins), sets metadata, applies grain overlay
- `src/app/page.tsx`: Landing page—composes public-facing sections
- `src/app/(auth)/login/page.tsx`: Login form—Client Component with email/password auth
- `src/app/(protected)/dashboard/page.tsx`: User dashboard—lists accessible apps
- `src/middleware.ts`: Request middleware—refreshes Supabase session on every request

**Configuration:**
- `tsconfig.json`: TypeScript strict mode, `@/*` alias for `src/*`
- `next.config.ts`: Next.js config (minimal, no custom logic)
- `postcss.config.mjs`: PostCSS with Tailwind v4
- `eslint.config.mjs`: ESLint rules (Next.js preset)
- `.env.local.example`: Template for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`

**Core Logic:**
- `src/lib/check-access.ts`: Access control functions (`checkAppAccess`, `getUserApps`, `isAdmin`, `getAllProfiles`, `getAllAppAccess`, `getAllApps`)
- `src/lib/supabase/server.ts`: Server Supabase client factory
- `src/lib/supabase/client.ts`: Browser Supabase client factory
- `src/app/(protected)/dashboard/admin/actions.ts`: Server Actions for grant/revoke/update access

**Testing:**
- Not detected—no test files (`*.test.ts`, `*.spec.ts`) in codebase

**Styling:**
- `src/app/globals.css`: Design tokens (CSS custom properties), Tailwind imports, animations
- No `tailwind.config.ts`; Tailwind v4 uses `@theme inline` in globals.css

## Naming Conventions

**Files:**
- Components: kebab-case (e.g., `header.tsx`, `admin-panel.tsx`)
- Pages: `page.tsx`
- Routes: `route.ts`
- Utilities: kebab-case (e.g., `check-access.ts`)
- Migrations: `NNN_description.sql` (zero-padded number, snake_case description)

**Directories:**
- Route groups: parentheses `(auth)`, `(protected)`
- Feature directories: lowercase (e.g., `dashboard`, `admin`)
- Utility modules: `lib/` for services and utilities

**Functions:**
- Async data-fetching functions: camelCase (e.g., `getUserApps`, `checkAppAccess`)
- Server Actions: camelCase (e.g., `grantAccess`, `revokeAccess`)
- React components: PascalCase (e.g., `export function Header() {}`)

**Variables:**
- State hooks: camelCase (e.g., `const [search, setSearch]`)
- Type names: PascalCase (e.g., `AppAccess`, `UserAppRow`)
- Constants: UPPER_SNAKE_CASE (e.g., `ROLE_OPTIONS`, `COLOR_MAP`)

**Types:**
- Interfaces: PascalCase (e.g., `AppAccess`, `Profile`)
- Type unions: PascalCase (e.g., `AppId = "wildtrack" | "fire" | "trap_monitor"`)
- Type parameters: Single letter (e.g., `<T>`)

## Where to Add New Code

**New Landing Page Section:**
- Create: `src/components/[section-name].tsx` with named export function
- Import: Add to `src/app/page.tsx` in composition
- Style: Use Tailwind classes from `globals.css` token palette
- Testing: Manual (no automated tests currently)

**New Page in Dashboard:**
- Create: `src/app/(protected)/[feature]/page.tsx`
- Auth: Automatically protected by `(protected)` layout
- Data: Use `src/lib/supabase/server.ts` to fetch data
- Type: Server Component by default; use `"use client"` only if needed

**New Server Action (Admin-only):**
- Create: Function in `src/app/(protected)/dashboard/admin/actions.ts`
- Export: Mark with `"use server"` at top
- Security: Call `isAdmin(supabase)` before operating on data
- Revalidation: Call `revalidatePath()` after mutations to refresh UI
- Return: `{ success: true }` or `{ error: message }`

**New Utility Function:**
- Create: `src/lib/[module-name].ts`
- Naming: camelCase function names
- Types: Export TypeScript interfaces for return types
- Usage: Import via `@/lib/[module-name]`

**New Supabase Table or Migration:**
- Create: `supabase/migrations/NNN_[description].sql`
- Ownership: Only `portal` schema tables—never modify other apps' schemas
- RLS: Enable row-level security, create at least one policy
- Permissions: Add appropriate grants to `authenticated` role
- Triggers: Use `security definer` for auto-update logic (e.g., `updated_at`)

**New Reusable Component:**
- Create: `src/components/[name].tsx`
- Export: Named export function, not default
- Props: Type with inline interface or separate type file if complex
- Style: Use Tailwind; use color tokens from `globals.css`

## Special Directories

**`.next/`**
- Purpose: Next.js build output (dev and production)
- Generated: Yes (by `next dev` and `next build`)
- Committed: No (.gitignore)

**`.planning/codebase/`**
- Purpose: GSD (Google Software Design) planning documents
- Generated: No (created manually by Claude)
- Committed: Yes (supports future planning phases)

**`supabase/.temp/`**
- Purpose: Local Supabase CLI state
- Generated: Yes (by `supabase` CLI)
- Committed: No (.gitignore)

**`node_modules/`**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**`.claude/`**
- Purpose: Claude workspace context (user's global instructions)
- Generated: No (user-created)
- Committed: No (project .gitignore)

## Import Path Aliases

**`@/*`** → `src/*`

Example:
```typescript
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
```

Use `@/` prefix for all internal imports to avoid relative paths (`../../../lib/...`).

## File Organization Quick Reference

| What | Where | Example |
|------|-------|---------|
| Public page | `src/app/[route]/page.tsx` | `src/app/page.tsx` (landing) |
| Protected page | `src/app/(protected)/[route]/page.tsx` | `src/app/(protected)/dashboard/page.tsx` |
| Auth flow | `src/app/auth/[action]/route.ts` | `src/app/auth/callback/route.ts` |
| Client page | Mark with `"use client"` | `src/app/(auth)/login/page.tsx` |
| Server Action | `"use server"` at file top | `src/app/(protected)/dashboard/admin/actions.ts` |
| Shared component | `src/components/[name].tsx` | `src/components/header.tsx` |
| Data service | `src/lib/[service].ts` | `src/lib/check-access.ts` |
| Supabase client | `src/lib/supabase/[target].ts` | `src/lib/supabase/server.ts` |
| Database schema | `supabase/migrations/NNN_*.sql` | `supabase/migrations/001_portal_app_access.sql` |
| Type definitions | Inline in component/service file | `src/lib/check-access.ts` (AppAccess interface) |
| Global styles | `src/app/globals.css` | Tailwind config, tokens, animations |

---

*Structure analysis: 2026-03-29*
