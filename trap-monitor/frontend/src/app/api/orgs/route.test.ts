import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ── Mock Supabase server client ──────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

function setupMockSupabase() {
  return {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(setupMockSupabase()),
}));

// ── Tests: GET /api/orgs ─────────────────────────────────────────────────────
describe('GET /api/orgs', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Default from() chain for org_members
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const mod = await import('./route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns sorted orgs for authenticated user', async () => {
    const orgData = [
      {
        org_id: 'org-b',
        role: 'member',
        organisations: { id: 'org-b', name: 'Bravo Org', description: null, created_at: '2025-01-01' },
      },
      {
        org_id: 'org-a',
        role: 'owner',
        organisations: { id: 'org-a', name: 'Alpha Org', description: 'First org', created_at: '2025-01-02' },
      },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: orgData, error: null }),
      }),
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should be sorted by name: Alpha before Bravo
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe('Alpha Org');
    expect(body[1].name).toBe('Bravo Org');
  });

  it('deduplicates orgs keeping highest role', async () => {
    const orgData = [
      {
        org_id: 'org-1',
        role: 'viewer',
        organisations: { id: 'org-1', name: 'Test Org', description: null, created_at: '2025-01-01' },
      },
      {
        org_id: 'org-1',
        role: 'owner',
        organisations: { id: 'org-1', name: 'Test Org', description: null, created_at: '2025-01-01' },
      },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: orgData, error: null }),
      }),
    }));

    const res = await GET();
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0].role).toBe('owner');
  });

  it('returns 500 on database error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });

  it('skips rows with null organisations', async () => {
    const orgData = [
      {
        org_id: 'org-1',
        role: 'owner',
        organisations: null,
      },
      {
        org_id: 'org-2',
        role: 'member',
        organisations: { id: 'org-2', name: 'Real Org', description: null, created_at: '2025-01-01' },
      },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: orgData, error: null }),
      }),
    }));

    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Real Org');
  });
});

// ── Tests: POST /api/orgs ────────────────────────────────────────────────────
describe('POST /api/orgs', () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mod = await import('./route');
    POST = mod.POST;
  });

  it('returns 400 when name is missing', async () => {
    const req = new Request('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('name is required');
  });

  it('returns 201 with org object on success', async () => {
    // Mock insert -> select -> single chain for organisations
    const insertChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-org-id', name: 'My Org' },
          error: null,
        }),
      }),
    };

    // Mock for org_members insert
    const memberInsert = {
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisations') return { insert: vi.fn().mockReturnValue(insertChain) };
      if (table === 'org_members') return { insert: vi.fn().mockResolvedValue(memberInsert) };
      return {};
    });

    const req = new Request('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Org', description: 'A test org' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('new-org-id');
    expect(body.name).toBe('My Org');
  });

  it('retries on slug collision (23505 error)', async () => {
    let callCount = 0;
    const insertFn = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: null,
              error: { message: 'duplicate key', code: '23505' },
            });
          }
          return Promise.resolve({
            data: { id: 'new-org-id', name: 'Duplicate Slug Org' },
            error: null,
          });
        }),
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisations') return { insert: insertFn };
      if (table === 'org_members') return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return {};
    });

    const req = new Request('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate Slug Org' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    // insert was called at least twice (first collision, then success)
    expect(insertFn).toHaveBeenCalledTimes(2);
  });

  it('returns 500 after non-slug-collision error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisations') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation', code: '42501' },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new Request('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Blocked Org' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('RLS policy violation');
  });
});
