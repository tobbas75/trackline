import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock Supabase server client ──────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// ── Tests: GET /api/notifications/preferences ────────────────────────────────
describe('GET /api/notifications/preferences', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    const mod = await import('./route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new NextRequest('http://localhost/api/notifications/preferences?orgId=org-1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when orgId is missing', async () => {
    const req = new NextRequest('http://localhost/api/notifications/preferences');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('orgId is required');
  });

  it('returns preference data when found', async () => {
    const mockPrefs = { user_id: 'user-123', org_id: 'org-1', trap_catch: false, unit_offline: true, low_battery: true, email_enabled: true, email_address: 'user@example.com' };
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/notifications/preferences?orgId=org-1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trap_catch).toBe(false);
    expect(body.email_address).toBe('user@example.com');
  });

  it('returns defaults when PGRST116 (not found)', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Row not found' },
            }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/notifications/preferences?orgId=org-1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trap_catch).toBe(true);
    expect(body.unit_offline).toBe(true);
    expect(body.low_battery).toBe(true);
    expect(body.email_enabled).toBe(false);
    expect(body.email_address).toBeNull();
  });

  it('returns 500 on non-PGRST116 error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Internal error' },
            }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/notifications/preferences?orgId=org-1');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ── Tests: PUT /api/notifications/preferences ────────────────────────────────
describe('PUT /api/notifications/preferences', () => {
  let PUT: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    const mod = await import('./route');
    PUT = mod.PUT;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new NextRequest('http://localhost/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ orgId: 'org-1' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when orgId is missing', async () => {
    const req = new NextRequest('http://localhost/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ trap_catch: false }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('orgId is required');
  });

  it('returns 200 with upserted data on success', async () => {
    const upserted = { user_id: 'user-123', org_id: 'org-1', trap_catch: false, unit_offline: true, low_battery: true, email_enabled: false, email_address: null };
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: upserted, error: null }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ orgId: 'org-1', trap_catch: false }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trap_catch).toBe(false);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ orgId: 'org-1' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });
});
