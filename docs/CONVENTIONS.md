# Trackline — Code Conventions

Applies to all apps: portal, WildTrack (camera-trap-dashboard), Fire System (fire-app), Trap Monitor (trap-monitor).

## File Naming

- **Source files:** kebab-case — `check-access.ts`, `app-switcher.tsx`, `use-auth.ts`
- **Test files:** same stem with `.test.ts` or `.test.tsx` suffix — `check-access.test.ts`
- **Page/layout files:** Next.js conventions — `page.tsx`, `layout.tsx`, `loading.tsx`

## TypeScript Naming

| Entity | Convention | Examples |
|--------|------------|---------|
| Components | PascalCase | `AppSwitcher`, `UserAvatar`, `StatusBadge` |
| Hooks | camelCase with `use` prefix | `useAuth`, `useAppAccess` |
| Functions | camelCase | `checkAppAccess`, `getUserApps`, `formatDate` |
| Variables | camelCase | `currentUser`, `appList`, `isLoading` |
| Types / Interfaces | PascalCase, no `I` prefix | `AppAccess`, `UserProfile`, `SessionToken` |
| Enums | PascalCase | `AppStatus`, `UserRole` |
| Module-level constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Local constants | camelCase | `defaultColor`, `maxItems` |

## Export Rules

- **Named exports everywhere** — `export function`, `export type`, `export const`
- **Default exports only for:** Next.js page components (`page.tsx`, `layout.tsx`), root `error.tsx`
- Never use `export default` for utility functions, hooks, types, or shared components

## React / Next.js Conventions

- **Server Components by default** — no `"use client"` unless event handlers or React hooks are required
- **`"use client"` triggers:** `useState`, `useEffect`, `useCallback`, `useRef`, onClick, onChange
- **API routes:** `export async function GET/POST/PUT/DELETE` (App Router convention)
- **Server Actions:** file-level `"use server"` directive, not component-level

## Supabase Conventions

- Client factory: `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server)
- Never import `createBrowserClient` or `createServerClient` directly — always use the app's factory
- RLS enforced on all portal-schema tables — never bypass with `service_role` key in app code

## Import Order

1. External packages (`react`, `next/*`, `@supabase/*`)
2. Internal workspace packages (`@trackline/*`)
3. App-internal aliases (`@/components/*`, `@/lib/*`)
4. Relative imports (`./`, `../`)

## TypeScript Strictness

All apps extend `@trackline/tsconfig/base.json` which enables `"strict": true`. This means:
- No implicit `any`
- No unchecked optional chaining without null checks
- All function parameters typed explicitly
- Return types explicit on exported functions

## Adding New Shared Dependencies

1. Add the dep to the catalog in `pnpm-workspace.yaml` at workspace root
2. In the consuming app's `package.json`, use `"dep-name": "catalog:"`
3. Run `pnpm install` from workspace root (never from inside an app directory)
