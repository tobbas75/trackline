import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock env module ──────────────────────────────────────────────────────────
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

// ── Mock web-push ────────────────────────────────────────────────────────────
const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn().mockResolvedValue({});

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

// ── Mock Supabase client (dynamic import inside route) ───────────────────────
const mockSubscriptionSelect = vi.fn();
const mockSubscriptionEq = vi.fn();
const mockSubscriptionFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSubscriptionFrom,
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function createPushRequest(
  body: object,
  authHeader?: string,
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  return new NextRequest('http://localhost/api/push/notify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/push/notify', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: no subscriptions
    mockSubscriptionFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const mod = await import('./route');
    POST = mod.POST;
  });

  it('returns 401 without authorization header', async () => {
    const req = createPushRequest({ orgId: 'org-1', title: 'Alert' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong webhook secret', async () => {
    const req = createPushRequest(
      { orgId: 'org-1', title: 'Alert' },
      'Bearer wrong-secret',
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when orgId is missing', async () => {
    const req = createPushRequest(
      { title: 'Alert' },
      'Bearer test-webhook-secret',
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing orgId or title');
  });

  it('returns 400 when title is missing', async () => {
    const req = createPushRequest(
      { orgId: 'org-1' },
      'Bearer test-webhook-secret',
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing orgId or title');
  });

  it('returns {ok: true, sent: 0} when no subscriptions exist', async () => {
    const req = createPushRequest(
      { orgId: 'org-1', title: 'Alert', body: 'Trap caught' },
      'Bearer test-webhook-secret',
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  it('sends push notifications and returns sent count', async () => {
    const subscriptions = [
      { endpoint: 'https://push.example.com/sub1', p256dh: 'key1', auth: 'auth1' },
      { endpoint: 'https://push.example.com/sub2', p256dh: 'key2', auth: 'auth2' },
    ];

    mockSubscriptionFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: subscriptions, error: null }),
      }),
    }));

    const req = createPushRequest(
      { orgId: 'org-1', title: 'Trap Alert', body: 'Unit UNIT_001 caught!' },
      'Bearer test-webhook-secret',
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.total).toBe(2);

    // Verify VAPID was configured
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'test-vapid-public',
      'test-vapid-private',
    );

    // Verify sendNotification was called for each subscription
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      }),
      expect.any(String),
    );
  });

  it('counts only fulfilled sends when some fail', async () => {
    const subscriptions = [
      { endpoint: 'https://push.example.com/sub1', p256dh: 'key1', auth: 'auth1' },
      { endpoint: 'https://push.example.com/sub2', p256dh: 'key2', auth: 'auth2' },
      { endpoint: 'https://push.example.com/sub3', p256dh: 'key3', auth: 'auth3' },
    ];

    mockSubscriptionFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: subscriptions, error: null }),
      }),
    }));

    // First call succeeds, second fails, third succeeds
    mockSendNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Push failed: 410 Gone'))
      .mockResolvedValueOnce({});

    const req = createPushRequest(
      { orgId: 'org-1', title: 'Alert', body: 'Body' },
      'Bearer test-webhook-secret',
    );
    const res = await POST(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.total).toBe(3);
  });

  it('includes url and tag in push payload', async () => {
    const subscriptions = [
      { endpoint: 'https://push.example.com/sub1', p256dh: 'key1', auth: 'auth1' },
    ];

    mockSubscriptionFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: subscriptions, error: null }),
      }),
    }));

    const req = createPushRequest(
      {
        orgId: 'org-1',
        title: 'Alert',
        body: 'Body',
        url: '/dashboard/unit/1',
        tag: 'custom-tag',
      },
      'Bearer test-webhook-secret',
    );
    await POST(req);

    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
    expect(sentPayload.url).toBe('/dashboard/unit/1');
    expect(sentPayload.tag).toBe('custom-tag');
  });

  it('uses default url and tag when not provided', async () => {
    const subscriptions = [
      { endpoint: 'https://push.example.com/sub1', p256dh: 'key1', auth: 'auth1' },
    ];

    mockSubscriptionFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: subscriptions, error: null }),
      }),
    }));

    const req = createPushRequest(
      { orgId: 'org-1', title: 'Alert', body: 'Body' },
      'Bearer test-webhook-secret',
    );
    await POST(req);

    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
    expect(sentPayload.url).toBe('/dashboard');
    expect(sentPayload.tag).toBe('trap-alert');
  });
});
