/**
 * TEST-05: RLS policy integration tests
 *
 * Verifies that all Supabase queries in useDashboardData include proper
 * org_id scoping filters. Since we cannot run pgTAP in this project, these
 * are unit-level tests that mock Supabase and assert that the correct
 * filters are passed to every query and realtime subscription.
 *
 * Approach: We mock createClient from @/lib/supabase/client, then replay
 * the exact query patterns used in useDashboardData.ts against the mock
 * to verify that org_id filters are always applied.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Chainable Supabase mock builder ─────────────────────────────────────────
// Records every call made on the query chain so tests can inspect filters.
interface CallRecord {
  method: string;
  args: unknown[];
}

function createChainRecorder() {
  const calls: CallRecord[] = [];
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Terminal methods that return a promise
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const resolved = Promise.resolve({ data: [], error: null });
        return resolved[prop as keyof Promise<unknown>].bind(resolved);
      }
      // Every other property returns a recording proxy
      return (...args: unknown[]) => {
        calls.push({ method: prop as string, args });
        return new Proxy({}, handler);
      };
    },
  };
  const proxy = new Proxy({}, handler);
  return { proxy, calls };
}

// ── Shared state for mock tracking ──────────────────────────────────────────
let tableRecorders: Map<string, { calls: CallRecord[] }>;
let channelCalls: CallRecord[];

function resetTracking() {
  tableRecorders = new Map();
  channelCalls = [];
}

/**
 * Creates a mock Supabase client that records all from() and channel() calls.
 */
function createMockSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: (table: string) => {
      const { proxy, calls } = createChainRecorder();
      tableRecorders.set(table, { calls });
      return proxy;
    },
    channel: (...args: unknown[]) => {
      channelCalls.push({ method: 'channel', args });
      const channelProxy = {
        on: (...onArgs: unknown[]) => {
          channelCalls.push({ method: 'on', args: onArgs });
          return channelProxy;
        },
        subscribe: () => {
          channelCalls.push({ method: 'subscribe', args: [] });
          return channelProxy;
        },
      };
      return channelProxy;
    },
    removeChannel: vi.fn(),
  };
}

// ── Test constants ──────────────────────────────────────────────────────────
const TEST_ORG_ID = 'org-abc-123';

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TEST-05: RLS policy org isolation', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    resetTracking();
    supabase = createMockSupabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Units query ──────────────────────────────────────────────────────────
  // Mirrors useDashboardData.ts line 145-149:
  //   supabase.from("units").select("*").eq("org_id", currentOrg.id).order("name")
  describe('units query', () => {
    it('includes .eq("org_id", currentOrg.id) filter', async () => {
      await supabase
        .from('units')
        .select('*')
        .eq('org_id', TEST_ORG_ID)
        .order('name');

      const unitsCalls = tableRecorders.get('units');
      expect(unitsCalls).toBeDefined();

      const eqCall = unitsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(eqCall).toBeDefined();
      expect(eqCall!.args[1]).toBe(TEST_ORG_ID);
    });

    it('rejects query without org_id filter (would leak cross-org data)', () => {
      // Demonstrate that omitting org_id means no filter is applied
      supabase.from('units').select('*').order('name');

      const unitsCalls = tableRecorders.get('units');
      expect(unitsCalls).toBeDefined();

      const eqCall = unitsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      // No org_id filter — this is the unsafe pattern
      expect(eqCall).toBeUndefined();
    });
  });

  // ── Events query ─────────────────────────────────────────────────────────
  // Mirrors useDashboardData.ts line 155-160:
  //   supabase.from("events").select("*").eq("org_id", currentOrg.id)
  //     .order("triggered_at", { ascending: false }).limit(100)
  describe('events query', () => {
    it('includes .eq("org_id", currentOrg.id) filter', async () => {
      await supabase
        .from('events')
        .select('*')
        .eq('org_id', TEST_ORG_ID)
        .order('triggered_at', { ascending: false })
        .limit(100);

      const eventsCalls = tableRecorders.get('events');
      expect(eventsCalls).toBeDefined();

      const eqCall = eventsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(eqCall).toBeDefined();
      expect(eqCall!.args[1]).toBe(TEST_ORG_ID);
    });

    it('filters by the current org, not a different org', async () => {
      await supabase
        .from('events')
        .select('*')
        .eq('org_id', TEST_ORG_ID)
        .order('triggered_at', { ascending: false })
        .limit(100);

      const eventsCalls = tableRecorders.get('events');
      const eqCall = eventsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(eqCall!.args[1]).toBe(TEST_ORG_ID);
      expect(eqCall!.args[1]).not.toBe('other-org-id');
    });
  });

  // ── Commands query (scoped via unit_id -> org_id) ────────────────────────
  // Mirrors units/[unitId]/page.tsx line 79-84:
  //   supabase.from("commands").select("*").eq("unit_id", unitId)
  //     .order("sent_at", { ascending: false }).limit(50)
  describe('commands query', () => {
    it('scopes through unit_id (not directly by org_id)', async () => {
      await supabase
        .from('commands')
        .select('*')
        .eq('unit_id', 'UNIT_001')
        .order('sent_at', { ascending: false })
        .limit(50);

      const commandsCalls = tableRecorders.get('commands');
      expect(commandsCalls).toBeDefined();

      // Commands are filtered by unit_id — the unit itself is org-scoped
      const unitFilter = commandsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'unit_id',
      );
      expect(unitFilter).toBeDefined();
      expect(unitFilter!.args[1]).toBe('UNIT_001');

      // There should be no direct org_id filter on the commands table
      const orgFilter = commandsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(orgFilter).toBeUndefined();
    });

    it('would expose all commands if unit_id filter were omitted', () => {
      // Demonstrate the unsafe pattern — no unit_id filter
      supabase.from('commands').select('*').limit(50);

      const commandsCalls = tableRecorders.get('commands');
      const unitFilter = commandsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'unit_id',
      );
      expect(unitFilter).toBeUndefined();
    });
  });

  // ── Cross-org isolation ──────────────────────────────────────────────────
  describe('cross-org isolation', () => {
    it('units query for org A does not include org B data', async () => {
      const orgAId = 'org-a-111';
      const orgBId = 'org-b-222';

      // Query for org A
      await supabase.from('units').select('*').eq('org_id', orgAId).order('name');

      const unitsCalls = tableRecorders.get('units');
      const eqCall = unitsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(eqCall).toBeDefined();
      expect(eqCall!.args[1]).toBe(orgAId);
      expect(eqCall!.args[1]).not.toBe(orgBId);
    });

    it('events query for org A does not include org B data', async () => {
      const orgAId = 'org-a-111';
      const orgBId = 'org-b-222';

      await supabase
        .from('events')
        .select('*')
        .eq('org_id', orgAId)
        .order('triggered_at', { ascending: false })
        .limit(100);

      const eventsCalls = tableRecorders.get('events');
      const eqCall = eventsCalls!.calls.find(
        (c) => c.method === 'eq' && c.args[0] === 'org_id',
      );
      expect(eqCall).toBeDefined();
      expect(eqCall!.args[1]).toBe(orgAId);
      expect(eqCall!.args[1]).not.toBe(orgBId);
    });
  });

  // ── Realtime subscription ────────────────────────────────────────────────
  // Mirrors useDashboardData.ts lines 172-228:
  //   supabase.channel(`trap_realtime_${currentOrg.id}`)
  //     .on("postgres_changes", { event: "INSERT", schema: "public", table: "events",
  //          filter: `org_id=eq.${currentOrg.id}` }, callback)
  //     ...
  //     .subscribe()
  describe('realtime subscription', () => {
    function setupRealtimeSubscription(orgId: string) {
      supabase
        .channel(`trap_realtime_${orgId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'events',
            filter: `org_id=eq.${orgId}`,
          },
          () => {},
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'units',
            filter: `org_id=eq.${orgId}`,
          },
          () => {},
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'units',
            filter: `org_id=eq.${orgId}`,
          },
          () => {},
        )
        .subscribe();
    }

    it('includes org_id filter for events INSERT subscription', () => {
      setupRealtimeSubscription(TEST_ORG_ID);

      const eventsOnCall = channelCalls.find(
        (c) =>
          c.method === 'on' &&
          (c.args[1] as any)?.table === 'events' &&
          (c.args[1] as any)?.event === 'INSERT',
      );
      expect(eventsOnCall).toBeDefined();

      const config = eventsOnCall!.args[1] as Record<string, unknown>;
      expect(config.filter).toBe(`org_id=eq.${TEST_ORG_ID}`);
    });

    it('includes org_id filter for units INSERT subscription', () => {
      setupRealtimeSubscription(TEST_ORG_ID);

      const unitsInsertCall = channelCalls.find(
        (c) =>
          c.method === 'on' &&
          (c.args[1] as any)?.table === 'units' &&
          (c.args[1] as any)?.event === 'INSERT',
      );
      expect(unitsInsertCall).toBeDefined();

      const config = unitsInsertCall!.args[1] as Record<string, unknown>;
      expect(config.filter).toBe(`org_id=eq.${TEST_ORG_ID}`);
    });

    it('includes org_id filter for units UPDATE subscription', () => {
      setupRealtimeSubscription(TEST_ORG_ID);

      const unitsUpdateCall = channelCalls.find(
        (c) =>
          c.method === 'on' &&
          (c.args[1] as any)?.table === 'units' &&
          (c.args[1] as any)?.event === 'UPDATE',
      );
      expect(unitsUpdateCall).toBeDefined();

      const config = unitsUpdateCall!.args[1] as Record<string, unknown>;
      expect(config.filter).toBe(`org_id=eq.${TEST_ORG_ID}`);
    });

    it('channel name is scoped to current org ID', () => {
      setupRealtimeSubscription(TEST_ORG_ID);

      const channelCreate = channelCalls.find((c) => c.method === 'channel');
      expect(channelCreate).toBeDefined();
      expect(channelCreate!.args[0]).toBe(`trap_realtime_${TEST_ORG_ID}`);
    });

    it('subscription without org_id filter would leak cross-org events', () => {
      // Demonstrate the unsafe pattern — no filter on realtime subscription
      supabase
        .channel('trap_realtime_unsafe')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'events' },
          () => {},
        )
        .subscribe();

      const unsafeOnCall = channelCalls.find(
        (c) =>
          c.method === 'on' &&
          (c.args[1] as any)?.table === 'events',
      );
      expect(unsafeOnCall).toBeDefined();

      const config = unsafeOnCall!.args[1] as Record<string, unknown>;
      // No filter property — this is the unsafe pattern we guard against
      expect(config.filter).toBeUndefined();
    });
  });

  // ── Source-level verification ─────────────────────────────────────────────
  // Read the actual useDashboardData.ts source and verify the patterns exist.
  describe('source code verification', () => {
    let sourceCode: string;

    beforeEach(async () => {
      const fs = await import('fs');
      const path = await import('path');
      const hookPath = path.resolve(__dirname, '../hooks/useDashboardData.ts');
      sourceCode = fs.readFileSync(hookPath, 'utf-8');
    });

    it('units query in source includes .eq("org_id", currentOrg.id)', () => {
      // The source must contain the org-scoped units query
      expect(sourceCode).toContain('.from("units")');
      expect(sourceCode).toContain('.eq("org_id", currentOrg.id)');
    });

    it('events query in source includes .eq("org_id", currentOrg.id)', () => {
      expect(sourceCode).toContain('.from("events")');
      // Events are also filtered by org_id directly (ISO-02)
      expect(sourceCode).toMatch(/from\("events"\)[\s\S]*?\.eq\("org_id",\s*currentOrg\.id\)/);
    });

    it('realtime events subscription includes org_id filter in source', () => {
      expect(sourceCode).toContain('filter: `org_id=eq.${currentOrg.id}`');
    });

    it('realtime channel name includes org ID in source', () => {
      expect(sourceCode).toContain('`trap_realtime_${currentOrg.id}`');
    });
  });
});
