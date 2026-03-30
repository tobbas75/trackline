/**
 * SEC-05: Portal access fail-closed behavior tests
 *
 * Verifies that checkAppAccess() from check-access.ts:
 * 1. Returns { hasAccess: false, role: null } when portal infrastructure is missing
 * 2. Logs a structured warning for infrastructure errors
 * 3. Returns correct results on the normal success path
 * 4. Handles empty data and non-infrastructure errors correctly
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAppAccess, getUserApps } from './check-access';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Mock Supabase client factory ────────────────────────────────────────────
function createMockSupabase(rpcResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseClient;
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('checkAppAccess (SEC-05: fail-closed portal access)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Stub NODE_ENV=production so the shared package's SEC-01 dev-bootstrap fallback
    // does not fire. These tests verify fail-closed behavior which only applies in
    // production. The shared checkAppAccess returns {hasAccess:true} in non-production
    // when portal infra is missing — that path is intentional and tested separately.
    vi.stubEnv('NODE_ENV', 'production');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── Infrastructure-missing tests (SEC-05 core) ──────────────────────────

  it('returns { hasAccess: false, role: null } when error contains "check_app_access" (function not found)', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'Could not find the function public.check_app_access' },
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
  });

  it('returns { hasAccess: false, role: null } when error contains "schema cache" (schema not loaded)', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'schema cache lookup failed for schema portal' },
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
  });

  it('returns { hasAccess: false, role: null } when error contains "Invalid schema: portal" (portal schema missing)', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'Invalid schema: portal' },
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
  });

  it('logs structured warning with level, msg, app_id, error, and ts when portal infra is missing', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'Could not find the function public.check_app_access' },
    });

    await checkAppAccess(supabase, 'trap_monitor');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logArg = warnSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(logArg);
    expect(parsed.level).toBe('warn');
    expect(parsed.msg).toBe('portal_access_check_unavailable');
    expect(parsed.app_id).toBe('trap_monitor');
    expect(parsed.error).toContain('check_app_access');
    expect(parsed.ts).toBeDefined();
  });

  // ── Null data path ────────────────────────────────────────────────────────

  it('returns { hasAccess: false, role: null } when RPC returns null data (no error)', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: null,
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // ── Normal success path ──────────────────────────────────────────────────

  it('returns { hasAccess: true } with the correct role when RPC succeeds normally', async () => {
    const supabase = createMockSupabase({
      data: [{ has_access: true, user_role: 'admin' }],
      error: null,
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: true, role: 'admin' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns { hasAccess: false, role: null } when RPC succeeds with has_access=false', async () => {
    const supabase = createMockSupabase({
      data: [{ has_access: false, user_role: null }],
      error: null,
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('verifies rpc is called with correct arguments', async () => {
    const supabase = createMockSupabase({
      data: [{ has_access: true, user_role: 'admin' }],
      error: null,
    });

    await checkAppAccess(supabase, 'trap_monitor');

    expect(supabase.rpc).toHaveBeenCalledWith('check_app_access', { target_app_id: 'trap_monitor' });
  });

  // ── Empty data path ──────────────────────────────────────────────────────

  it('returns { hasAccess: false, role: null } when RPC returns empty data array (no access)', async () => {
    const supabase = createMockSupabase({
      data: [],
      error: null,
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // ── Non-infrastructure error path ────────────────────────────────────────

  it('returns { hasAccess: false, role: null } when RPC returns a non-infrastructure error (e.g., permission denied)', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'permission denied for table app_access' },
    });

    const result = await checkAppAccess(supabase, 'trap_monitor');

    expect(result).toEqual({ hasAccess: false, role: null });
    // Non-infrastructure errors should NOT trigger the special warning log
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ── getUserApps tests ──────────────────────────────────────────────────────
describe('getUserApps', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockSupabaseForApps(schemaResult: { data: unknown; error: unknown }): SupabaseClient {
    return {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(schemaResult),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it('returns array of app rows on success', async () => {
    const mockApps = [
      { app_id: 'trap_monitor', role: 'admin', granted_at: '2026-01-01', apps: { id: '1', name: 'Trap Monitor', description: null, url: null, icon: null } },
    ];
    const supabase = createMockSupabaseForApps({ data: mockApps, error: null });

    const result = await getUserApps(supabase);

    expect(result).toEqual(mockApps);
    expect(supabase.schema).toHaveBeenCalledWith('portal');
  });

  it('returns empty array on error', async () => {
    const supabase = createMockSupabaseForApps({ data: null, error: { message: 'some error' } });

    const result = await getUserApps(supabase);

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns empty array when data is null', async () => {
    const supabase = createMockSupabaseForApps({ data: null, error: null });

    const result = await getUserApps(supabase);

    expect(result).toEqual([]);
  });
});
