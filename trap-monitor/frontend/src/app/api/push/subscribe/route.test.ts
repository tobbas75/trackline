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

// ── Tests: POST /api/push/subscribe ──────────────────────────────────────────
describe('POST /api/push/subscribe', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    const mod = await import('./route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'https://push.example.com' }, orgId: 'org-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when subscription.endpoint is missing', async () => {
    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: {}, orgId: 'org-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing subscription or orgId');
  });

  it('returns 400 when orgId is missing', async () => {
    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'https://push.example.com' } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful upsert', async () => {
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: { endpoint: 'https://push.example.com', keys: { p256dh: 'key1', auth: 'auth1' } },
        orgId: 'org-1',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 500 on upsert error', async () => {
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    }));

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: { endpoint: 'https://push.example.com', keys: { p256dh: 'k', auth: 'a' } },
        orgId: 'org-1',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── Tests: DELETE /api/push/subscribe ────────────────────────────────────────
describe('DELETE /api/push/subscribe', () => {
  let deleteFn: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    const mod = await import('./route');
    deleteFn = mod.DELETE;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await deleteFn();
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    mockFrom.mockImplementation(() => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));

    const res = await deleteFn();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
