import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock env module ──────────────────────────────────────────────────────────
// Must be before any import of the route, since it evaluates publicEnv eagerly.
vi.mock('@/lib/env', () => ({
  getServerEnv: vi.fn(() => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    TELSTRA_API_TOKEN: 'test-telstra-token',
    DEFAULT_CMD_PIN: 'TEST_PIN_9999',
    VAPID_PRIVATE_KEY: 'test-vapid-private',
    VAPID_EMAIL: 'mailto:test@example.com',
    SUPABASE_WEBHOOK_SECRET: 'test-webhook-secret',
  })),
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3002',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-vapid-public',
  },
}));

// ── Mock Supabase client ─────────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockInsert = vi.fn(() => ({ error: null }));
const mockFrom = vi.fn((table: string) => {
  if (table === 'units') return { select: mockSelect };
  if (table === 'commands') return { insert: mockInsert };
  return { select: mockSelect };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ── Mock LRU Cache ───────────────────────────────────────────────────────────
// We mock LRUCache so rate limiting state is controlled per test.
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

vi.mock('lru-cache', () => {
  return {
    LRUCache: class MockLRUCache {
      get = mockCacheGet;
      set = mockCacheSet;
    },
  };
});

// ── Helper ───────────────────────────────────────────────────────────────────
function createMockRequest(
  body: object,
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest('http://localhost/api/command', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/command', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();

    // Re-setup mocks after module reset
    mockCacheGet.mockReturnValue(undefined);
    mockCacheSet.mockReturnValue(undefined);
    mockSingle.mockResolvedValue({ data: { phone_id: '+61400000000' }, error: null });
    mockInsert.mockReturnValue({ error: null });

    // Stub global fetch for Telstra API
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messageId: 'msg-123' }),
    }));

    // Dynamic import to get fresh module state
    const mod = await import('./route');
    POST = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 400 when unitId is missing', async () => {
    const req = createMockRequest({ command: 'STATUS' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing unitId or command');
  });

  it('returns 400 when command is missing', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing unitId or command');
  });

  it('returns 400 for invalid command "HACK"', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001', command: 'HACK' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid command: HACK');
  });

  it('returns 404 when unit is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const req = createMockRequest({ unitId: 'UNIT_MISSING', command: 'STATUS' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Unit not found');
  });

  it('returns 200 with valid command and calls Telstra API', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.command).toContain('STATUS');

    // Verify Telstra API was called
    expect(fetch).toHaveBeenCalledWith(
      'https://messages.telstra.com/v2/messages/sms',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-telstra-token',
        }),
      }),
    );
  });

  it('sources PIN from getServerEnv (not hardcoded)', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    await POST(req);

    // The PIN from env should appear in the SMS body sent to Telstra
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1]?.body as string);
    expect(fetchBody.body).toContain('TEST_PIN_9999');
  });

  it('returns 500 when Telstra API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Telstra error: rate limited'),
    }));

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Telstra error: rate limited');
  });

  it('logs to commands table after successful send', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001', command: 'ARM' });
    await POST(req);

    expect(mockFrom).toHaveBeenCalledWith('commands');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        unit_id: 'UNIT_001',
        sent_by: 'dashboard',
      }),
    );
  });

  it('handles all valid commands without error', async () => {
    const validCommands = ['STATUS', 'GPS', 'ARM', 'DISARM', 'RESET', 'SETPIN', 'SETGPS', 'SETHOUR', 'QUEUE', 'VERSION'];

    for (const cmd of validCommands) {
      const req = createMockRequest({ unitId: 'UNIT_001', command: cmd });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }
  });

  it('normalizes command case (lowercase input accepted)', async () => {
    const req = createMockRequest({ unitId: 'UNIT_001', command: 'status' });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/command - rate limiting', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    mockSingle.mockResolvedValue({ data: { phone_id: '+61400000000' }, error: null });
    mockInsert.mockReturnValue({ error: null });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messageId: 'msg-123' }),
    }));

    const mod = await import('./route');
    POST = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 429 when rate limited (11th request)', async () => {
    // Simulate accumulated timestamps: 10 requests already in the window
    const now = Date.now();
    const tenTimestamps = Array.from({ length: 10 }, (_, i) => now - i * 100);
    mockCacheGet.mockReturnValue(tenTimestamps);

    const req = createMockRequest(
      { unitId: 'UNIT_001', command: 'STATUS' },
      { 'x-forwarded-for': '192.168.1.100' },
    );
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Rate limit exceeded');
  });

  it('allows requests under the rate limit', async () => {
    // Only 5 timestamps in window — well under the 10-request limit
    const now = Date.now();
    const fiveTimestamps = Array.from({ length: 5 }, (_, i) => now - i * 100);
    mockCacheGet.mockReturnValue(fiveTimestamps);

    const req = createMockRequest(
      { unitId: 'UNIT_001', command: 'STATUS' },
      { 'x-forwarded-for': '192.168.1.200' },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/command - PIN validation (TEST-06)', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let mockedGetServerEnv: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    mockCacheGet.mockReturnValue(undefined);
    mockCacheSet.mockReturnValue(undefined);
    mockSingle.mockResolvedValue({ data: { phone_id: '+61400000000' }, error: null });
    mockInsert.mockReturnValue({ error: null });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messageId: 'msg-123' }),
    }));

    // Get a reference to the mocked getServerEnv
    const envMod = await import('@/lib/env');
    mockedGetServerEnv = vi.mocked(envMod.getServerEnv);

    const mod = await import('./route');
    POST = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('throws when getServerEnv fails (missing PIN)', async () => {
    mockedGetServerEnv.mockImplementation(() => {
      throw new Error('Missing or invalid environment variables:\n  - DEFAULT_CMD_PIN: missing');
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    await expect(POST(req)).rejects.toThrow('DEFAULT_CMD_PIN');
  });

  it('includes PIN in SMS body sent to device', async () => {
    mockedGetServerEnv.mockReturnValue({
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      TELSTRA_API_TOKEN: 'test-telstra-token',
      DEFAULT_CMD_PIN: '5678',
      VAPID_PRIVATE_KEY: 'test-vapid-private',
      VAPID_EMAIL: 'mailto:test@example.com',
      SUPABASE_WEBHOOK_SECRET: 'test-webhook-secret',
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'ARM' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1]?.body as string);
    expect(fetchBody.body).toContain('5678');
    expect(fetchBody.body).toContain('ARM');
  });

  it('uses PIN from env, not a hardcoded "0000"', async () => {
    mockedGetServerEnv.mockReturnValue({
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      TELSTRA_API_TOKEN: 'test-telstra-token',
      DEFAULT_CMD_PIN: 'CUSTOM_9876',
      VAPID_PRIVATE_KEY: 'test-vapid-private',
      VAPID_EMAIL: 'mailto:test@example.com',
      SUPABASE_WEBHOOK_SECRET: 'test-webhook-secret',
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1]?.body as string);
    expect(fetchBody.body).toContain('CUSTOM_9876');
    expect(fetchBody.body).not.toContain('0000');
  });

  it('throws when DEFAULT_CMD_PIN env var is missing entirely', async () => {
    mockedGetServerEnv.mockImplementation(() => {
      throw new Error(
        'Missing or invalid environment variables:\n  - DEFAULT_CMD_PIN: missing',
      );
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'ARM' });
    // getServerEnv() is called at the top of POST — if PIN is missing
    // the error propagates uncaught (fail-closed behaviour)
    await expect(POST(req)).rejects.toThrow(
      'Missing or invalid environment variables',
    );
  });

  it('throws when DEFAULT_CMD_PIN is empty string', async () => {
    // validateVars treats empty string as missing — getServerEnv will throw
    mockedGetServerEnv.mockImplementation(() => {
      throw new Error(
        'Missing or invalid environment variables:\n  - DEFAULT_CMD_PIN: missing',
      );
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    await expect(POST(req)).rejects.toThrow('DEFAULT_CMD_PIN');
  });

  it('empty string PIN is rejected by validateVars (env layer)', async () => {
    // Verify the env validation layer itself rejects empty PINs.
    // This is a belt-and-suspenders check: even if the route mock above
    // simulates the throw, we confirm validateVars actually flags it.
    // Use importActual to bypass the vi.mock and get the real implementation.
    const envMod = await vi.importActual<typeof import('@/lib/env')>('@/lib/env');
    const { errors } = envMod.validateVars(
      { DEFAULT_CMD_PIN: undefined },
      { DEFAULT_CMD_PIN: '' },
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('DEFAULT_CMD_PIN');
    expect(errors[0]).toContain('missing');
  });

  it('PIN is placed at the start of the SMS body (format: PIN COMMAND #UNIT)', async () => {
    mockedGetServerEnv.mockReturnValue({
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      TELSTRA_API_TOKEN: 'test-telstra-token',
      DEFAULT_CMD_PIN: 'MY_PIN',
      VAPID_PRIVATE_KEY: 'test-vapid-private',
      VAPID_EMAIL: 'mailto:test@example.com',
      SUPABASE_WEBHOOK_SECRET: 'test-webhook-secret',
    });

    const req = createMockRequest({ unitId: 'UNIT_007', command: 'DISARM' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1]?.body as string);
    // SMS format is: "<PIN> <command> #<unitId>"
    expect(fetchBody.body).toBe('MY_PIN DISARM #UNIT_007');
  });

  it('does not send SMS when getServerEnv throws (no partial execution)', async () => {
    mockedGetServerEnv.mockImplementation(() => {
      throw new Error('Missing or invalid environment variables:\n  - DEFAULT_CMD_PIN: missing');
    });

    const req = createMockRequest({ unitId: 'UNIT_001', command: 'STATUS' });
    await expect(POST(req)).rejects.toThrow();

    // fetch should NOT have been called — the route should fail before reaching Telstra
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(
      'https://messages.telstra.com/v2/messages/sms',
      expect.anything(),
    );
  });
});
