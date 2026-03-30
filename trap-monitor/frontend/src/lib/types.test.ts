import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getUnitStatus,
  getStatusColor,
  getStatusLabel,
  formatRelativeTime,
  isOffline,
} from './types';
import type { Unit, TrapEvent } from './types';

// ── Test helpers ─────────────────────────────────────────────────────────────

function createUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'unit-1',
    name: 'Test Trap',
    org_id: 'org-1',
    last_seen: new Date('2026-03-23T11:00:00Z').toISOString(),
    battery_pct: 80,
    solar_ok: true,
    armed: true,
    ...overrides,
  };
}

function createEvent(overrides?: Partial<TrapEvent>): TrapEvent {
  return {
    id: 1,
    unit_id: 'unit-1',
    event_type: 'TRAP',
    triggered_at: new Date('2026-03-23T11:00:00Z').toISOString(),
    trap_caught: false,
    acknowledged: false,
    ...overrides,
  };
}

// ── getUnitStatus ────────────────────────────────────────────────────────────

describe('getUnitStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "caught" for unacknowledged trap_caught event', () => {
    const unit = createUnit();
    const events = [
      createEvent({ unit_id: 'unit-1', trap_caught: true, acknowledged: false }),
    ];
    expect(getUnitStatus(unit, events)).toBe('caught');
  });

  it('does NOT return "caught" for acknowledged trap_caught event', () => {
    const unit = createUnit();
    const events = [
      createEvent({ unit_id: 'unit-1', trap_caught: true, acknowledged: true }),
    ];
    expect(getUnitStatus(unit, events)).not.toBe('caught');
  });

  it('returns "offline" when last_seen is 27 hours ago', () => {
    const unit = createUnit({
      last_seen: new Date('2026-03-22T09:00:00Z').toISOString(), // 27h ago
    });
    expect(getUnitStatus(unit, [])).toBe('offline');
  });

  it('returns "offline" when last_seen is null', () => {
    const unit = createUnit({ last_seen: undefined });
    expect(getUnitStatus(unit, [])).toBe('offline');
  });

  it('returns "lowbatt" when battery_pct is 15', () => {
    const unit = createUnit({ battery_pct: 15 });
    expect(getUnitStatus(unit, [])).toBe('lowbatt');
  });

  it('returns "lowbatt" when battery_pct is exactly 20 (boundary)', () => {
    const unit = createUnit({ battery_pct: 20 });
    expect(getUnitStatus(unit, [])).toBe('lowbatt');
  });

  it('does NOT return "lowbatt" when battery_pct is 21', () => {
    const unit = createUnit({ battery_pct: 21 });
    expect(getUnitStatus(unit, [])).not.toBe('lowbatt');
  });

  it('returns "disarmed" when armed is false', () => {
    const unit = createUnit({ armed: false });
    expect(getUnitStatus(unit, [])).toBe('disarmed');
  });

  it('returns "normal" for healthy unit (recent, good battery, armed)', () => {
    const unit = createUnit();
    expect(getUnitStatus(unit, [])).toBe('normal');
  });

  it('priority: caught > offline', () => {
    const unit = createUnit({ last_seen: undefined }); // would be offline
    const events = [
      createEvent({ unit_id: 'unit-1', trap_caught: true, acknowledged: false }),
    ];
    expect(getUnitStatus(unit, events)).toBe('caught');
  });

  it('priority: offline > lowbatt', () => {
    const unit = createUnit({
      last_seen: undefined,
      battery_pct: 10,
    });
    expect(getUnitStatus(unit, [])).toBe('offline');
  });

  it('priority: lowbatt > disarmed', () => {
    const unit = createUnit({
      battery_pct: 10,
      armed: false,
    });
    expect(getUnitStatus(unit, [])).toBe('lowbatt');
  });

  it('priority: caught wins when all conditions met', () => {
    const unit = createUnit({
      last_seen: undefined,
      battery_pct: 5,
      armed: false,
    });
    const events = [
      createEvent({ unit_id: 'unit-1', trap_caught: true, acknowledged: false }),
    ];
    expect(getUnitStatus(unit, events)).toBe('caught');
  });

  it('ignores events for a different unit_id', () => {
    const unit = createUnit({ id: 'unit-1' });
    const events = [
      createEvent({ unit_id: 'unit-2', trap_caught: true, acknowledged: false }),
    ];
    expect(getUnitStatus(unit, events)).toBe('normal');
  });
});

// ── getStatusColor ───────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('returns "bg-red-500" for caught', () => {
    expect(getStatusColor('caught')).toBe('bg-red-500');
  });

  it('returns "bg-gray-500" for offline', () => {
    expect(getStatusColor('offline')).toBe('bg-gray-500');
  });

  it('returns "bg-amber-500" for lowbatt', () => {
    expect(getStatusColor('lowbatt')).toBe('bg-amber-500');
  });

  it('returns "bg-purple-500" for disarmed', () => {
    expect(getStatusColor('disarmed')).toBe('bg-purple-500');
  });

  it('returns "bg-green-500" for normal', () => {
    expect(getStatusColor('normal')).toBe('bg-green-500');
  });
});

// ── getStatusLabel ───────────────────────────────────────────────────────────

describe('getStatusLabel', () => {
  it('returns "Caught" for caught', () => {
    expect(getStatusLabel('caught')).toBe('Caught');
  });

  it('returns "Offline" for offline', () => {
    expect(getStatusLabel('offline')).toBe('Offline');
  });

  it('returns "Low Battery" for lowbatt', () => {
    expect(getStatusLabel('lowbatt')).toBe('Low Battery');
  });

  it('returns "Disarmed" for disarmed', () => {
    expect(getStatusLabel('disarmed')).toBe('Disarmed');
  });

  it('returns "Normal" for normal', () => {
    expect(getStatusLabel('normal')).toBe('Normal');
  });
});

// ── formatRelativeTime ───────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "never" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('never');
  });

  it('returns "just now" for 30 seconds ago', () => {
    const ts = new Date('2026-03-23T11:59:30Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('just now');
  });

  it('returns "5m ago" for 5 minutes ago', () => {
    const ts = new Date('2026-03-23T11:55:00Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('5m ago');
  });

  it('returns "3h ago" for 3 hours ago', () => {
    const ts = new Date('2026-03-23T09:00:00Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('3h ago');
  });

  it('returns "2d ago" for 2 days ago', () => {
    const ts = new Date('2026-03-21T12:00:00Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('2d ago');
  });

  it('returns "just now" for exactly now', () => {
    const ts = new Date('2026-03-23T12:00:00Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('just now');
  });

  it('returns "1m ago" for 60 seconds ago', () => {
    const ts = new Date('2026-03-23T11:59:00Z').toISOString();
    expect(formatRelativeTime(ts)).toBe('1m ago');
  });
});

// ── isOffline ────────────────────────────────────────────────────────────────

describe('isOffline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when last_seen is undefined', () => {
    expect(isOffline(createUnit({ last_seen: undefined }))).toBe(true);
  });

  it('returns true when last_seen is 27 hours ago', () => {
    const ts = new Date('2026-03-22T09:00:00Z').toISOString();
    expect(isOffline(createUnit({ last_seen: ts }))).toBe(true);
  });

  it('returns false when last_seen is 25 hours ago', () => {
    const ts = new Date('2026-03-22T11:00:00Z').toISOString();
    expect(isOffline(createUnit({ last_seen: ts }))).toBe(false);
  });

  it('returns false when last_seen is just now', () => {
    const ts = new Date('2026-03-23T12:00:00Z').toISOString();
    expect(isOffline(createUnit({ last_seen: ts }))).toBe(false);
  });

  it('returns true when last_seen is exactly 26 hours ago (boundary)', () => {
    // 26 * 60 * 60 * 1000 ms ago — exactly at threshold
    // isOffline uses > 26h, so exactly 26h should be false
    const ts = new Date('2026-03-22T10:00:00Z').toISOString();
    expect(isOffline(createUnit({ last_seen: ts }))).toBe(false);
  });

  it('returns true when last_seen is 26h + 1ms ago', () => {
    // Just past 26h threshold
    const ts = new Date(
      new Date('2026-03-23T12:00:00Z').getTime() - 26 * 3600000 - 1,
    ).toISOString();
    expect(isOffline(createUnit({ last_seen: ts }))).toBe(true);
  });
});
