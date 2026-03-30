# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Status:** Not yet implemented

This codebase does not currently have automated tests. No test framework dependencies are present in `package.json` — no Jest, Vitest, Mocha, or other test runners are configured.

**Recommended setup (not yet in place):**
- Jest or Vitest would be typical for Next.js 16
- No configuration files exist: no `jest.config.js`, `vitest.config.ts`, etc.
- No `*.test.ts`, `*.spec.ts`, or test directory structure in `src/`

## Test File Organization

**Current state:** Not applicable — no tests exist

**For future implementation:**
- Tests would likely follow Next.js convention: co-locate with source or in `__tests__` directories
- Naming: `*.test.ts` or `*.spec.ts`
- Library/utility tests: `src/lib/__tests__/check-access.test.ts`
- Component tests: `src/components/__tests__/Header.test.tsx` (if tests are added)
- Route handler tests: `src/app/__tests__/auth/callback.test.ts`

## Test Structure

**No existing patterns to reference**

For future tests, based on codebase patterns:
- Likely to use `describe()` / `it()` suite structure
- Would need mocking setup for Supabase client (critical dependency)
- Test data fixtures for types: `Profile`, `AccessRow`, `AppAccess`, `UserAppRow`

## Mocking

**Critical to Mock:**
- **Supabase client** (`@supabase/supabase-js`)
  - All database queries go through Supabase
  - Used in: `checkAppAccess`, `getUserApps`, `isAdmin`, `getAllProfiles`, `getAllAppAccess`, `getAllApps`
  - Mock pattern needed: RPC calls, table selects, upserts, deletes

- **Next.js functions**
  - `next/cookies` — used in `lib/supabase/server.ts` for session management
  - `next/cache` — `revalidatePath()` used in server actions
  - `next/navigation` — `useRouter()` in client pages

- **Environment variables**
  - `process.env.NEXT_PUBLIC_SUPABASE_URL`
  - `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`

**What NOT to Mock:**
- Custom business logic functions — test them directly: `checkAppAccess`, `getUserApps`, etc.
- Type definitions and interfaces
- Utility path aliases (`@/` imports)
- React hooks directly (except through component testing)

**Mocking Pattern Example (if implemented):**
```typescript
// Would need to mock Supabase response structure:
const mockSupabaseClient = {
  rpc: jest.fn().mockResolvedValue({
    data: [{ has_access: true, user_role: 'admin' }],
    error: null
  }),
  schema: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [...],
          error: null
        })
      })
    })
  })
};
```

## Fixtures and Test Data

**Not currently used — no tests exist**

**For future implementation, sample types to fixture:**

```typescript
// Profile fixture
const mockProfile = {
  id: "user-123",
  display_name: "Alice Smith",
  email: "alice@example.com",
  organisation: "Top End Rangers",
  created_at: "2024-01-15T10:00:00Z"
};

// AppAccess fixture
const mockAppAccess = {
  id: "access-456",
  user_id: "user-123",
  app_id: "wildtrack" as AppId,
  role: "member" as AppRole,
  granted_at: "2024-02-01T14:30:00Z",
  apps: {
    id: "wildtrack",
    name: "WildTrack"
  }
};

// Supabase RPC response (checkAppAccess)
const mockAccessResponse = {
  data: [{
    has_access: true,
    user_role: "admin"
  }],
  error: null
};
```

**Fixture locations (if tests added):**
- Shared fixtures: `src/__fixtures__/` or `src/lib/__fixtures__/`
- Per-feature fixtures: co-located in `__tests__` directories
- Type-safe: use actual TypeScript types (`Profile`, `AppAccess`, etc.)

## Coverage

**Requirements:** Not enforced — no coverage thresholds configured

**For future setup:**
- No `.nycrc`, `coverage/` threshold in `package.json`, or coverage gates in CI
- Jest/Vitest would generate coverage with `npm run test:coverage` (when configured)

## Test Types

**Unit Tests (when implemented):**
- **Scope:** Individual functions like `checkAppAccess()`, `getUserApps()`, `isAdmin()`
- **Approach:** Mock Supabase responses, assert return values match expectations
- **Critical areas:**
  - `src/lib/check-access.ts` — all access control logic
  - Server actions in `src/app/(protected)/dashboard/admin/actions.ts` — auth checks and DB mutations
  - Error handling paths (RPC missing, network failures)

**Integration Tests (would cover):**
- Supabase client factory functions (`createClient()` in `lib/supabase/server.ts` and `lib/supabase/client.ts`)
- Full auth flow: signup → profile creation → access grant
- Admin panel: user search, access grant/revoke/update
- Middleware auth session refresh

**Component Tests (if added):**
- Form submissions: `LoginPage`, `SignupPage`, `AdminPanel`
- State management: expanded user rows, search filtering, loading states
- Error display: AlertCircle notifications, form validation
- Conditional rendering: no-access state, empty results

**E2E Tests (not currently used):**
- Would use Playwright, Cypress, or similar
- Would test full user journeys: login → dashboard → grant access → logout
- Would test cross-app access control

## Common Patterns

**Async Testing (future):**
Supabase queries are async, so tests would use `async/await`:

```typescript
describe('checkAppAccess', () => {
  it('should return hasAccess=true for admin user', async () => {
    const mockSupabase = {
      rpc: jest.fn().mockResolvedValue({
        data: [{ has_access: true, user_role: 'admin' }],
        error: null
      })
    };

    const result = await checkAppAccess(mockSupabase, 'wildtrack');
    expect(result).toEqual({ hasAccess: true, role: 'admin' });
  });
});
```

**Error Testing (future):**
Critical error paths that need testing:
- Supabase RPC fails: `error` is set, function returns `{ hasAccess: false, role: null }`
- Schema not yet provisioned: function detects error message and returns bootstrap fallback `{ hasAccess: true, role: 'admin' }`
- Missing data: `data` is null/empty, function returns `{ hasAccess: false, role: null }`

```typescript
it('should return fallback on provisioning error', async () => {
  const mockSupabase = {
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid schema: portal' }
    })
  };

  const result = await checkAppAccess(mockSupabase, 'wildtrack');
  expect(result).toEqual({ hasAccess: true, role: 'admin' });
});
```

**Form Submission Testing (future):**
For client components like `AdminPanel`:

```typescript
it('should grant access on form submit', async () => {
  const mockGrantAccess = jest.fn().mockResolvedValue({ success: true });
  render(
    <AdminPanel
      profiles={[mockProfile]}
      accessRows={[]}
      apps={[]}
    />
  );

  const grantButton = screen.getByText('WildTrack');
  await userEvent.click(grantButton);

  expect(mockGrantAccess).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'user-123', app_id: 'wildtrack' })
  );
});
```

## Run Commands (when configured)

```bash
npm run test              # Run all tests (when added)
npm run test:watch       # Watch mode (when added)
npm run test:coverage    # Generate coverage report (when added)
npm run typecheck        # TypeScript type check (exists now)
npm run lint             # ESLint (exists now)
npm run check            # Full check: typecheck + lint + build
```

**Current verification commands:**
```bash
npm run typecheck        # TypeScript strict mode check
npm run lint             # ESLint with Next.js config
npm run build            # Next.js build (catches type/lint errors)
```

## Gaps and Recommendations

**High Priority (should add tests):**
1. **Access control logic** (`src/lib/check-access.ts`)
   - Bootstrap fallback detection
   - Multiple error scenarios
   - Type casting safety

2. **Server actions** (`src/app/(protected)/dashboard/admin/actions.ts`)
   - Admin authorization checks
   - Form data extraction
   - Supabase mutations (upsert, delete)
   - Revalidation after mutations

3. **Auth flow** (`src/app/(auth)/signup/page.tsx`, `login/page.tsx`)
   - Form validation
   - Error states and display
   - Success states
   - Redirect on success

**Medium Priority:**
- Component state management (search, expand/collapse in admin panel)
- Middleware session refresh

**Low Priority (harder to test):**
- Landing page layout and styling
- Responsive behavior (could use visual regression testing)

---

*Testing analysis: 2026-03-29*
