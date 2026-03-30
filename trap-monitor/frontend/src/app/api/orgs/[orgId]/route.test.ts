import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase server client ──────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// ── Tests: DELETE /api/orgs/:orgId ───────────────────────────────────────────
describe('DELETE /api/orgs/:orgId', () => {
  let DELETE: (req: Request, ctx: { params: Promise<{ orgId: string }> }) => Promise<Response>;
  const context = { params: Promise.resolve({ orgId: 'org-123' }) };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mod = await import('./route');
    DELETE = mod.DELETE;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(new Request('http://localhost'), context);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not owner', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }),
        }),
      }),
    }));

    const res = await DELETE(new Request('http://localhost'), context);
    expect(res.status).toBe(403);
  });

  it('returns 403 when membership not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }));

    const res = await DELETE(new Request('http://localhost'), context);
    expect(res.status).toBe(403);
  });

  it('returns 200 when owner deletes org successfully', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // org_members check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }),
        };
      }
      // organisations delete
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const res = await DELETE(new Request('http://localhost'), context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 when delete fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      };
    });

    const res = await DELETE(new Request('http://localhost'), context);
    expect(res.status).toBe(500);
  });
});
