# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- No test runner configured in `frontend/package.json`
- Jest or Vitest not present in dependencies
- No `jest.config.*` or `vitest.config.*` files found

**Assertion Library:**
- None currently in use

**Run Commands:**
- Testing infrastructure not yet implemented in this project
- Current focus is on development and feature delivery

## Test File Organization

**Location:**
- No test files exist in the codebase
- Convention would be co-located with source files if tests were added
- Suggested pattern: `ComponentName.test.tsx` next to `ComponentName.tsx`

**Naming:**
- Future tests would follow `.test.ts` or `.spec.ts` suffix
- Examples: `BatteryChart.test.tsx`, `check-access.test.ts`

## Test Structure

**When tests are implemented, use this pattern:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { functionUnderTest } from '@/lib/types';

describe('getUnitStatus', () => {
  it('should return "caught" when unit has unacknowledged trap event', () => {
    const unit = { id: 'unit-1', armed: true, battery_pct: 50 };
    const events = [{ unit_id: 'unit-1', trap_caught: true, acknowledged: false }];

    expect(getUnitStatus(unit, events)).toBe('caught');
  });

  it('should return "offline" when unit has not been seen in 26+ hours', () => {
    const unit = {
      id: 'unit-1',
      last_seen: new Date(Date.now() - 27 * 3600000).toISOString()
    };
    const events = [];

    expect(getUnitStatus(unit, events)).toBe('offline');
  });
});
```

## Mocking

**Framework:**
- No mocking library currently in use
- If tests are added: would use `vitest` with `.mock()` or `@testing-library/react`

**Patterns when implemented:**
```typescript
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUnit })
        })
      })
    })
  })
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  useParams: () => ({ unitId: 'test-unit' })
}));
```

**What to Mock:**
- External API calls (Supabase, Telstra API)
- Next.js navigation (`useRouter`, `useParams`, `usePathname`)
- Large external libraries (Leaflet, Recharts) for unit tests
- Environment variables

**What NOT to Mock:**
- Helper functions from `@/lib/types` (test real implementations)
- Pure utility functions like `formatRelativeTime()`, `isOffline()`
- Custom hooks if testing the hook itself

## Fixtures and Factories

**Test Data:**
```typescript
function createTestUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'unit-test-1',
    name: 'Test Trap',
    org_id: 'org-test-1',
    phone_id: '+61400000000',
    last_lat: -25.2744,
    last_lng: 133.7751,
    last_seen: new Date().toISOString(),
    firmware_ver: '1.0.0',
    battery_pct: 85,
    solar_ok: true,
    armed: true,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

function createTestEvent(overrides?: Partial<TrapEvent>): TrapEvent {
  return {
    id: 1,
    unit_id: 'unit-test-1',
    event_type: 'TRAP',
    triggered_at: new Date().toISOString(),
    trap_caught: true,
    lat: -25.2744,
    lng: 133.7751,
    acknowledged: false,
    ...overrides
  };
}
```

**Location:**
- If/when tests are added, factories would be in `__fixtures__/` or at top of test files
- Example path: `frontend/src/__fixtures__/units.ts`

## Coverage

**Requirements:**
- No coverage target currently enforced
- Recommended minimum: 70% for critical paths (SMS parsing, auth, commands)

**View Coverage:**
```bash
# When test framework is added:
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Test pure functions in isolation: `getUnitStatus()`, `formatRelativeTime()`, `isOffline()`
- Test small helper functions: `slugify()`, `rolePriority()`
- No external dependencies mocked unless unavoidable

**Integration Tests:**
- Test API routes: `/api/orgs`, `/api/command` with mocked Supabase
- Test component + hook combinations
- Test data flow from fetch to render

**E2E Tests:**
- Not currently in use
- Recommended for critical flows: login → create org → view units → send command
- Would use Playwright or Cypress if implemented

## Priority Test Coverage

1. `backend/supabase/functions/ingest-sms/index.ts` — SMS parsing is mission-critical
2. `frontend/src/app/api/command/route.ts` — Command sending must work reliably
3. `frontend/src/lib/types.ts` — Helper functions used across dashboard
4. `frontend/src/app/api/orgs/route.ts` — Org creation and deduping logic

## Current Testing State

**Status:** No automated tests currently implemented

**Why:** Early-stage project focused on MVP delivery with manual testing

**When to Add Tests:**
- Before adding major features (filters, notifications, real-time sync)
- When fixing bugs (write test that reproduces, then fix)
- Before refactoring shared code (API routes, Supabase queries)

---

*Testing analysis: 2026-03-23*
