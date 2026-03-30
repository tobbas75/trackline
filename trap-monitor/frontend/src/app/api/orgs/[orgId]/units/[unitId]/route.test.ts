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

const context = { params: Promise.resolve({ orgId: 'org-123', unitId: 'UNIT_001' }) };

// ── Tests: GET /api/orgs/:orgId/units/:unitId ────────────────────────────────
describe('GET /api/orgs/:orgId/units/:unitId', () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ orgId: string; unitId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./route');
    GET = mod.GET;
  });

  it('returns unit on success', async () => {
    const mockUnit = { id: 'UNIT_001', name: 'Trap A', org_id: 'org-123' };
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUnit, error: null }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001');
    const res = await GET(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('UNIT_001');
  });

  it('returns 404 when unit not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001');
    const res = await GET(req, context);
    expect(res.status).toBe(404);
  });
});

// ── Tests: PUT /api/orgs/:orgId/units/:unitId ────────────────────────────────
describe('PUT /api/orgs/:orgId/units/:unitId', () => {
  let PUT: (req: NextRequest, ctx: { params: Promise<{ orgId: string; unitId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./route');
    PUT = mod.PUT;
  });

  it('returns updated unit on success', async () => {
    const updated = { id: 'UNIT_001', name: 'Renamed Trap', org_id: 'org-123' };
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed Trap' }),
    });
    const res = await PUT(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Renamed Trap');
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'X' }),
    });
    const res = await PUT(req, context);
    expect(res.status).toBe(500);
  });
});

// ── Tests: DELETE /api/orgs/:orgId/units/:unitId ─────────────────────────────
describe('DELETE /api/orgs/:orgId/units/:unitId', () => {
  let deleteFn: (req: NextRequest, ctx: { params: Promise<{ orgId: string; unitId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./route');
    deleteFn = mod.DELETE;
  });

  it('returns 200 on successful delete', async () => {
    mockFrom.mockImplementation(() => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001', { method: 'DELETE' });
    const res = await deleteFn(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'FK constraint' } }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units/UNIT_001', { method: 'DELETE' });
    const res = await deleteFn(req, context);
    expect(res.status).toBe(500);
  });
});
