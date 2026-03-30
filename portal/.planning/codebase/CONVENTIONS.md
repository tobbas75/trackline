# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- Component files: PascalCase followed by `.tsx` — `Header.tsx`, `AdminPanel.tsx`, `Projects.tsx`
- Utility/service files: camelCase `.ts` — `client.ts`, `server.ts`, `check-access.ts`, `actions.ts`
- API routes: directory-based with `route.ts` — `/auth/callback/route.ts`, `/auth/signout/route.ts`
- CSS files: `globals.css` for global styles
- Page files: `page.tsx` in route directories

**Functions:**
- Named exports for all utilities and services — `export function checkAppAccess()`, `export async function getUserApps()`
- Async functions when they handle async operations
- Server actions prefixed with context: `grantAccess`, `revokeAccess`, `updateRole` in `actions.ts`
- Handler functions with `handle` prefix in client components — `handleSubmit`, `handleGrant`, `handleRevoke`, `handleRoleChange`

**Variables:**
- camelCase for all variables and state: `email`, `password`, `userApps`, `expandedUser`, `isPending`
- React state uses `const [stateName, setStateName] = useState()`
- Constants in UPPER_SNAKE_CASE for lookup maps and arrays: `NAV_LINKS`, `PROJECTS`, `VALUES`, `ROLE_OPTIONS`, `ICON_MAP`, `COLOR_MAP`, `APP_COLORS`
- Type names (interfaces) use PascalCase: `AppAccess`, `UserAppRow`, `AllAccessRow`, `Profile`, `AccessRow`, `Project`

**Types:**
- Exported type aliases for API/database types — `type AppId = "wildtrack" | "fire" | "trap_monitor"`
- Interfaces for object shapes — `interface AppAccess`, `interface Project`, `interface Profile`
- Imported from Supabase: `type SupabaseClient`
- React types: `type ReactNode` for icon/element unions

## Code Style

**Formatting:**
- ESLint 9 with `eslint-config-next` (core web vitals + TypeScript)
- No Prettier config — ESLint handles all formatting
- 2-space indentation (Next.js default)
- No explicit line width enforcement observed

**Linting:**
- ESLint strict configuration enabled
- Uses `eslint-config-next/core-web-vitals` for performance/accessibility rules
- Uses `eslint-config-next/typescript` for strict TypeScript rules
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run with: `npm run lint`

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Module resolution: `bundler`
- JSX: `react-jsx`
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. External packages (React, Next.js, libraries) — `import { useState } from "react"`
2. Next.js utilities — `import Link from "next/link"`
3. Internal components/utils with path alias — `import { createClient } from "@/lib/supabase/server"`
4. Icons from `lucide-react` — `import { Mail, MapPin } from "lucide-react"`
5. Type imports — `import type { ReactNode } from "react"` or `import type { AppId, AppRole } from "@/lib/check-access"`

**Path Aliases:**
- `@/*` → `./src/*` — used consistently for all internal imports
- Examples: `@/components/header`, `@/lib/supabase/server`, `@/lib/check-access`

## Error Handling

**Patterns:**
- Async functions destructure Supabase responses: `const { data, error } = await supabase.rpc(...)`
- Check for error first, return early: `if (error) { console.error(...); return []; }`
- Fallback to empty arrays/null on error: `return data ?? []`
- Server actions return error objects: `return { error: "message" }` or `{ success: true }`
- Client components track error state: `const [error, setError] = useState<string | null>(null)`
- Error messages display in UI with AlertCircle icon and red-dust color
- Specific error detection for provisioning (bootstrap fallback in `checkAppAccess`) — detects missing RPC/schema and returns admin access as fallback

**Exception handling in middleware:**
- Try-catch silently ignored in Server Component cookie setting (documented) — Middleware handles refresh
- Async error chains without re-throw

## Logging

**Framework:** `console` (no wrapper library)

**Patterns:**
- Errors logged with `console.error()` and full context: `console.error("Failed to fetch user apps:", JSON.stringify(error, null, 2))`
- No info/debug logging observed — only error logging for failures
- Error logging paired with fallback return values (never throws)

## Comments

**When to Comment:**
- Algorithm explanation and non-obvious logic: `// Local bootstrap fallback: allow signed-in users while portal schema/RPC is being provisioned.`
- Business rules and constraints: `/* Ignored in Server Components where cookies can't be set. Middleware will handle session refresh. */`
- Significant section dividers: `{/* Logo */}`, `{/* Desktop nav */}`, `{/* Expanded panel */}`
- Inline for error detection patterns: `// Auth code exchange failed — redirect to login with error`

**JSDoc/TSDoc:**
- Used for exported functions that serve as API entry points
- Includes usage examples: `Usage in any Trackline app: const { hasAccess, role } = await checkAppAccess(supabase, 'wildtrack');`
- Documents function purpose and usage clearly

**Example:**
```typescript
/**
 * Check if the current user has access to a specific app.
 * This is the single function every dashboard should call on load.
 *
 * Usage in any Trackline app:
 *   const { hasAccess, role } = await checkAppAccess(supabase, 'wildtrack');
 *   if (!hasAccess) redirect('/no-access');
 */
export async function checkAppAccess(
  supabase: SupabaseClient,
  appId: AppId
): Promise<AppAccess>
```

## Function Design

**Size:**
- Functions keep single responsibility — `checkAppAccess`, `getUserApps`, `isAdmin`, `getAllProfiles` each do one thing
- Utility functions typically 5–20 lines
- Page components vary (15–140 lines) based on layout needs

**Parameters:**
- Dependency injection via parameters: `function checkAppAccess(supabase: SupabaseClient, appId: AppId)`
- Explicit typing for all parameters and return values
- Server action parameters use `FormData` — `async function grantAccess(formData: FormData)`

**Return Values:**
- Promise-based for async: `Promise<AppAccess>`
- Error-first objects for mutations: `{ error: string }` or `{ success: true }`
- Arrays as fallback: return empty array `[]` on failure rather than null
- Null-coalescing for data: `data ?? []`

## Module Design

**Exports:**
- Named exports only (except Next.js pages which use default export)
- Examples: `export function Header()`, `export async function checkAppAccess()`
- Server action files group related actions: `grantAccess`, `revokeAccess`, `updateRole` in `/admin/actions.ts`

**Barrel Files:**
- Not used in this codebase — each component imports directly from its source file

**Directory Structure for Related Modules:**
- `lib/supabase/` contains both client and server Supabase factories
- `components/` organized flat (no sub-directories)
- `app/` follows Next.js App Router structure with grouped routes like `(auth)` and `(protected)`

## Tailwind & Styling

**Classes:**
- Inline Tailwind classes directly in JSX — no CSS modules
- Custom color tokens defined in `globals.css` via CSS variables
- Color palette: `stone-*` for neutrals, `red-dust`, `ochre`, `eucalypt`, `sky` for accents
- Layout: `mx-auto max-w-*` for container sizing, `px-6` for horizontal padding
- Responsive: `sm:`, `md:`, `lg:` breakpoints

**Custom Utilities:**
- `.dust-line` — gradient divider between sections
- `.grain` — fixed grain texture overlay (pseudo-element)
- `.img-zoom` — smooth image scale on hover
- `.animate-fade-up` with `animation-delay-*` classes

**Font Application:**
- Display text: `font-[family-name:var(--font-dm-serif)]`
- Body text: default (Poppins via `--font-poppins`)
- No tailwind.config.ts — theme tokens inline in globals.css with `@theme inline`

---

*Convention analysis: 2026-03-29*
