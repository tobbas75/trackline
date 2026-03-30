# Deferred Items — Phase 03 shared-supabase-package

## Pre-existing TypeScript Errors in trap-monitor (out of scope)

Discovered during Plan 03-02 Task 2 execution.

These errors existed BEFORE any Plan 03-02 changes and are unrelated to the @trackline/supabase-config wiring.

### Errors

1. `src/components/dashboard/CameraEventList.test.tsx(41,3)`: `TS2304: Cannot find name 'beforeEach'`
2. `src/components/dashboard/ImageViewer.test.tsx(48,3)`: `TS2304: Cannot find name 'beforeEach'`
3. `src/lib/rls-policies.test.ts` — multiple `TS2339` errors on mock object property access

### Root Cause
- `beforeEach` not found: vitest globals not included in `tsconfig.json` types. The vitest config has `globals: true` at runtime but the tsconfig doesn't include `@vitest/globals` or `vitest/globals` in `compilerOptions.types`.
- `rls-policies.test.ts` mock type errors: Supabase mock objects use `as unknown as SupabaseClient` casting in a way that tsc can't resolve property chains.

### Action Needed
Add `"vitest/globals"` to `tsconfig.json` `compilerOptions.types` in trap-monitor, and review rls-policies mock types.

Owner: Future trap-monitor cleanup task.
