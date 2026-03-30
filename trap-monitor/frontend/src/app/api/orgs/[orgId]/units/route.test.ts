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

const context = { params: Promise.resolve({ orgId: 'org-123' }) };

// ── Tests: GET /api/orgs/:orgId/units ────────────────────────────────────────
describe('GET /api/orgs/:orgId/units', () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./route');
    GET = mod.GET;
  });

  it('returns units filtered by org_id', async () => {
    const mockUnits = [{ id: 'UNIT_001', name: 'Trap A', org_id: 'org-123' }];
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units');
    const res = await GET(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockUnits);
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units');
    const res = await GET(req, context);
    expect(res.status).toBe(500);
  });
});

// ── Tests: POST /api/orgs/:orgId/units ───────────────────────────────────────
describe('POST /api/orgs/:orgId/units', () => {
  let POST: (req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./route');
    POST = mod.POST;
  });

  it('returns 400 when id is missing', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-123/units', {
      method: 'POST',
      body: JSON.stringify({ name: 'Trap A' }),
    });
    const res = await POST(req, context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('id and name are required');
  });

  it('returns 400 when name is missing', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-123/units', {
      method: 'POST',
      body: JSON.stringify({ id: 'UNIT_001' }),
    });
    const res = await POST(req, context);
    expect(res.status).toBe(400);
  });

  it('returns 201 with unit data on success', async () => {
    const mockUnit = { id: 'UNIT_001', name: 'Trap A', org_id: 'org-123', armed: true };
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUnit, error: null }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units', {
      method: 'POST',
      body: JSON.stringify({ id: 'UNIT_001', name: 'Trap A' }),
    });
    const res = await POST(req, context);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('UNIT_001');
    expect(body.org_id).toBe('org-123');
  });

  it('returns 500 on DB error', async () => {
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate key' } }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/orgs/org-123/units', {
      method: 'POST',
      body: JSON.stringify({ id: 'UNIT_001', name: 'Trap A' }),
    });
    const res = await POST(req, context);
    expect(res.status).toBe(500);
  });
});
