# Stack Research

**Domain:** IoT dashboard hardening — Next.js App Router + Supabase + ESP32 PlatformIO
**Researched:** 2026-03-23
**Confidence:** HIGH (testing, env validation), MEDIUM (rate limiting — Vercel Hobby constraint), MEDIUM (firmware testing)

---

## Recommended Stack

### Frontend Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| vitest | ^4.1.0 | Test runner for Next.js frontend | Official Next.js recommendation for App Router projects; native ESM, TypeScript first, Vite-powered (shares config toolchain with project); significantly faster than Jest; v4.1 released March 12 2026 |
| @vitejs/plugin-react | ^4.x | Transforms React JSX in Vitest | Required by Next.js Vitest setup; pairs with vitest to handle JSX/hooks in jsdom environment |
| @testing-library/react | ^16.3.0 | Renders React components in tests | The standard for component testing — tests behavior not implementation; v16 required for React 19 compatibility (v13/14 will error on peer dep with React 19) |
| @testing-library/dom | ^10.x | DOM query helpers (underlying RTL dependency) | Pulled in by @testing-library/react; explicit install avoids version drift |
| @testing-library/user-event | ^14.x | Simulates real user interactions | Preferred over `fireEvent` for testing interactive components (clicks, typing); produces more realistic test behavior |
| jsdom | ^25.x | Browser DOM simulation for Vitest | The `environment: 'jsdom'` target in vitest config — simulates browser APIs in Node.js for component rendering |
| vite-tsconfig-paths | ^5.x | Resolves `@/*` path aliases in tests | Required: project uses `@/*` alias in tsconfig; without this, Vitest cannot resolve imports and tests fail immediately |
| msw | ^2.x | Mock Service Worker — intercepts fetch/HTTP | Best approach for testing API routes in isolation; intercepts at the network layer rather than mocking modules — more realistic than `vi.mock` for HTTP calls |

### Database Testing (RLS Policies)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pgTAP | built-in (Supabase) | SQL-level unit testing for Postgres | Official Supabase RLS testing path; runs via `supabase test db`; the only reliable way to test multi-org isolation without spinning up a full app layer |
| supabase CLI | latest | Runs pgTAP tests via `supabase test db` | Required to execute pgTAP test suites against local Supabase instance; already should be installed for local dev |

### Rate Limiting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @upstash/ratelimit | ^2.0.8 | Sliding window rate limiting for Next.js API routes | The only production-viable rate limiter for serverless/Vercel; in-memory rate limiting is broken on serverless because each function invocation is isolated — no shared state. Upstash Redis persists counts across invocations |
| @upstash/redis | ^1.x | Redis client for Upstash (peer dep of ratelimit) | Required companion to @upstash/ratelimit; Upstash provides a free-tier Redis database that works on Vercel Hobby plan |

### Environment Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @t3-oss/env-nextjs | ^0.13.x | Runtime and build-time env var validation | The standard for Next.js env validation; understands the Next.js client/server split (`NEXT_PUBLIC_*` vs server-only); fails at build time if required vars are missing or wrong type; provides full TypeScript inference — env vars become typed constants, not `string \| undefined` |
| zod | ^3.x | Schema validation (peer dep of t3-env) | Already the dominant schema library in the ecosystem; t3-env uses it internally; may already be in project dependencies via Supabase |

### Firmware Testing (ESP32 / PlatformIO)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Unity (built-in PlatformIO) | bundled | C unit test framework for embedded targets | PlatformIO's native test framework — zero additional install; runs on-device (`pio test -e esp32s3`) or on desktop (`pio test -e native`); the only framework with first-class PlatformIO support |
| ArduinoFake | ^0.x (PlatformIO registry) | Mocks Arduino core functions for native (desktop) tests | Required when you want to test firmware logic without hardware; mocks `Serial`, `millis()`, `digitalWrite()`, etc. via FakeIt; enables testing of state machine logic, SMS parser, retry queue on a desktop CI runner — no ESP32 attached |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | ^6.x | Custom matchers for DOM assertions (`.toBeVisible()`, `.toHaveTextContent()`) | Add to vitest setup file; makes component test assertions readable |
| @vitejs/plugin-react-swc | optional | SWC-based React transform (faster than Babel) | Only if build times become a concern; default `@vitejs/plugin-react` is Babel-based but sufficient |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `supabase start` | Starts local Postgres + Auth + Realtime | Required before running pgTAP tests; needs Docker |
| `supabase test db` | Runs all pgTAP test files | Test files live in `supabase/tests/*.sql` |
| `pio test -e native` | Runs firmware tests on desktop without hardware | Fast — runs in seconds; requires ArduinoFake for Arduino API mocks |
| `pio test -e esp32s3` | Runs firmware tests on physical device | Slower; useful for integration tests that need real hardware behaviour |

---

## Installation

```bash
# Frontend testing (run from frontend/)
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom jsdom vite-tsconfig-paths msw

# Rate limiting (run from frontend/)
npm install @upstash/ratelimit @upstash/redis

# Environment validation (run from frontend/)
npm install @t3-oss/env-nextjs zod

# Firmware testing: add to firmware/platformio.ini
# lib_deps =
#   fabiobatsilva/ArduinoFake @ ^0.3.2   (for native test environment only)
# Then: pio test -e native
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vitest | Jest | Never for new Next.js projects; Jest requires heavy Babel transform config for App Router and has no native ESM support — setup is painful. Use Jest only if inheriting an existing Jest suite too large to migrate |
| Vitest | Playwright component testing | For async Server Components (Vitest cannot render them); Playwright CT works in a real browser — useful if server component rendering logic is critical, but overkill for unit/component tests |
| @upstash/ratelimit + Redis | In-memory Map/LRU-cache | Only acceptable for local development or non-serverless Node.js servers. On Vercel serverless, function instances are isolated — in-memory state is not shared between concurrent requests. Do not use in production |
| @upstash/ratelimit + Redis | express-rate-limit | express-rate-limit requires a persistent Node.js process. Vercel serverless functions are stateless. Not applicable |
| @t3-oss/env-nextjs | Plain Zod schema in `env.ts` | Simpler alternative — write a `src/env.ts` with `z.object({...}).parse(process.env)` at module top-level. Works well; t3-env adds Next.js-specific edge runtime handling and client/server variable splitting. Either is acceptable |
| @t3-oss/env-nextjs | envalid | envalid is older (2018-era), less TypeScript-native, and not aware of Next.js client/server split. No reason to choose it for a new project |
| Unity (PlatformIO) | Google Test (gtest) | Google Test is more feature-rich but requires more build system integration and is harder to run on-device. Unity's minimal footprint is correct for constrained embedded targets and native desktop simulation |
| ArduinoFake | Custom stubs | ArduinoFake provides ready-made mocks for the full Arduino API surface. Custom stubs work but require writing and maintaining mock implementations for every Arduino function you use — not worth it |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Jest | In Next.js App Router projects, requires complex `moduleNameMapper` config, manual `TextEncoder` polyfills, and does not support native ESM. Community consensus has moved to Vitest | Vitest |
| In-memory rate limiting (Map, lru-cache) on Vercel | Vercel serverless function instances are isolated — state in one instance is invisible to others. Rate limit counts reset per cold start, per instance. Provides false security | @upstash/ratelimit + Upstash Redis |
| `@testing-library/react` v13/14 | Requires `react@^18.0.0` peer dep — will error against React 19.2.3 (the version in this project) | @testing-library/react ^16.3.0 |
| Enzyme | Unmaintained since React 17 era; no React 19 support; tests implementation details rather than user behaviour | @testing-library/react |
| Playwright for unit/component tests | Playwright starts a real browser — startup time is 10-30x Vitest. Wrong tool for unit and component tests | Vitest for unit/component; Playwright only for full E2E flows |
| pgTAP with `CREATE EXTENSION` on shared Supabase project | pgTAP should only run against the local Supabase instance. Never run test mutations against the shared `landmanager` project — it will corrupt WildTrack and Fire App data | Run `supabase test db` against local instance only |
| Firmware tests on-device for pure logic tests | Flashing firmware to test a retry queue algorithm takes 30-60 seconds per cycle. Save on-device testing for hardware integration; run logic tests with native + ArduinoFake | `pio test -e native` for logic; `pio test -e esp32s3` for hardware-dependent behaviour |

---

## Stack Patterns by Variant

**For Next.js API route unit tests (no database):**
- Use Vitest + `vi.mock` to stub Supabase client calls
- Test: correct status codes, correct body shapes, error paths
- Do NOT spin up a real Supabase instance for these

**For RLS and multi-tenant isolation tests:**
- Use pgTAP via `supabase test db`
- Authenticate as different roles using `tests.authenticate_as()`
- Test: org A cannot see org B's units/events; viewer cannot write

**For SMS parsing tests (edge function):**
- Use Vitest to import and call the parsing logic directly (pure functions)
- These are the highest-value tests: the SMS format is the firmware-to-backend contract
- Test: all three formats (TRAP, HEALTH, ALERT), malformed input, GPS edge cases

**For firmware logic tests (no hardware):**
- Add `[env:native]` environment to `platformio.ini`
- Use ArduinoFake to mock Serial, millis(), delays
- Test: retry queue priority ordering, GPS stale detection, command PIN validation

**For firmware integration tests (on-device):**
- Use Unity directly with `[env:esp32s3]`
- Test: actual UART communication, deep sleep wake, modem init sequence

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @testing-library/react ^16.3.0 | React 19.2.3 | v16 explicitly supports React 19; v13 does not |
| vitest ^4.1.0 | Next.js 16, Vite 6, React 19 | Vitest 4 requires Vite 6; Next.js 16 is compatible |
| @t3-oss/env-nextjs ^0.13.x | Next.js 13.4.4+ | Designed for App Router; works with Next.js 16 |
| @upstash/ratelimit ^2.0.8 | Edge Runtime, Node.js | Works in both Vercel Edge Middleware and standard API routes |
| Unity (PlatformIO built-in) | ESP32-S3 Arduino framework | No additional install; bundled with PlatformIO |
| ArduinoFake ^0.3.x | PlatformIO native environment | Only works in `[env:native]` — do not add to ESP32 device environments |

---

## Vitest Configuration for This Project

The project uses `@/*` path aliases defined in `frontend/tsconfig.json`. The `vite-tsconfig-paths` plugin is mandatory — without it, every import using `@/` will fail in tests.

```ts
// frontend/vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

```ts
// frontend/src/test/setup.ts
import '@testing-library/jest-dom'
```

---

## PlatformIO Configuration for Native Testing

```ini
; firmware/platformio.ini additions
[env:native]
platform = native
test_framework = unity
lib_deps =
  fabiobatsilva/ArduinoFake @ ^0.3.2
build_flags =
  -std=c++17
```

Tests in `firmware/test/test_native/` run with `pio test -e native` and do not require hardware.

---

## Rate Limiting Setup Notes

Upstash requires an external Redis database. On Vercel Hobby:
1. Go to Vercel Dashboard > Storage > Connect Store > Create Upstash Redis (free tier: 10,000 req/day)
2. Vercel injects `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` as environment variables automatically
3. The `@upstash/redis` client reads these without additional configuration

The command endpoint (`/api/command`) is the specific target for rate limiting — it triggers real SMS sends via Telstra API. A sliding window of 5 requests per minute per IP is a sensible starting limit.

---

## Sources

- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) — official setup instructions, verified current (last updated 2026-02-11, Next.js 16.2.1); HIGH confidence
- [Vitest 4.1 Release](https://vitest.dev/blog/vitest-4-1.html) — confirmed v4.1.0 released March 12 2026; HIGH confidence
- [Upstash Rate Limit npm](https://www.npmjs.com/package/@upstash/ratelimit) — v2.0.8 current; HIGH confidence
- [Upstash Ratelimit Overview](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — API and algorithm docs; HIGH confidence
- [T3 Env Next.js docs](https://env.t3.gg/docs/nextjs) — @t3-oss/env-nextjs setup and API; HIGH confidence
- [T3 Env npm package](https://www.npmjs.com/package/@t3-oss/env-nextjs) — v0.13.x current; MEDIUM confidence (version cited from search result summary)
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) — pgTAP setup and `supabase test db`; HIGH confidence
- [pgTAP Unit Testing](https://supabase.com/docs/guides/database/extensions/pgtap) — RLS testing patterns; HIGH confidence
- [PlatformIO Unity Framework](https://docs.platformio.org/en/stable/advanced/unit-testing/frameworks/unity.html) — native + embedded test configs; HIGH confidence
- [ArduinoFake PlatformIO Registry](https://registry.platformio.org/libraries/fabiobatsilva/ArduinoFake) — library availability; MEDIUM confidence
- [Vercel KV (Upstash) availability](https://vercel.com/docs/redis) — Hobby plan confirmed; MEDIUM confidence (transition from Vercel KV to Upstash KV in progress)
- [React Testing Library v16 React 19 support](https://github.com/testing-library/react-testing-library/releases) — v16.3.0 confirmed; HIGH confidence

---
*Stack research for: Trap Monitor hardening milestone (testing, rate limiting, env validation, firmware testing)*
*Researched: 2026-03-23*
