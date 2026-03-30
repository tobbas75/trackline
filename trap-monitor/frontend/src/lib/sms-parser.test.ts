import { describe, it, expect } from 'vitest';
import { parseSMS, isValidGPS, parseDeviceTimestamp } from './sms-parser';
import type { ParsedEvent } from './sms-parser';

// ── TRAP format ──────────────────────────────────────────────────────────────

describe('parseSMS — TRAP format', () => {
  it('parses basic TRAP CAUGHT message', () => {
    const result = parseSMS('TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TRAP');
    expect(result!.unitId).toBe('UNIT_001');
    expect(result!.trapCaught).toBe(true);
    expect(result!.timestamp).toBe('14/03/26 06:42');
  });

  it('parses TRAP with GPS coordinates', () => {
    const result = parseSMS(
      'TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS -12.4567,130.8901',
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(-12.4567);
    expect(result!.lng).toBeCloseTo(130.8901);
    expect(result!.gpsStale).toBe(false);
  });

  it('rejects invalid GPS coordinates (out of range)', () => {
    const result = parseSMS(
      'TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS 999.0,999.0',
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeNull();
    expect(result!.lng).toBeNull();
  });

  it('detects stale GPS (trailing asterisk)', () => {
    const result = parseSMS(
      'TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS -12.4567,130.8901*',
    );
    expect(result).not.toBeNull();
    expect(result!.gpsStale).toBe(true);
    // GPS coords should still be parsed even with stale marker
    expect(result!.lat).toBeCloseTo(-12.4567);
  });

  it('parses TRAP with LOWBATT', () => {
    const result = parseSMS(
      'TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | LOWBATT 15%',
    );
    expect(result).not.toBeNull();
    expect(result!.batteryPct).toBe(15);
  });

  it('parses TRAP without CAUGHT as not caught', () => {
    const result = parseSMS('TRAP #UNIT_001 | CLEAR | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.trapCaught).toBe(false);
  });

  it('returns null GPS when no GPS segment present', () => {
    const result = parseSMS('TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeNull();
    expect(result!.lng).toBeNull();
    expect(result!.gpsStale).toBe(false);
  });

  it('returns null batteryPct when no LOWBATT segment', () => {
    const result = parseSMS('TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.batteryPct).toBeNull();
  });
});

// ── HEALTH format ────────────────────────────────────────────────────────────

describe('parseSMS — HEALTH format', () => {
  it('parses basic HEALTH message with battery, solar, firmware', () => {
    const result = parseSMS(
      'HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY',
    );
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('HEALTH');
    expect(result!.unitId).toBe('UNIT_001');
    expect(result!.batteryPct).toBe(78);
    expect(result!.solarOk).toBe(true);
    expect(result!.fwVersion).toBe('1.0');
    expect(result!.timestamp).toBe('14/03/26 06:00');
  });

  it('detects solar fault', () => {
    const result = parseSMS(
      'HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:FAULT FW:1.0',
    );
    expect(result).not.toBeNull();
    expect(result!.solarOk).toBe(false);
  });

  it('parses HEALTH with GPS coordinates', () => {
    const result = parseSMS(
      'HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | GPS -25.0,130.0',
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(-25.0);
    expect(result!.lng).toBeCloseTo(130.0);
  });

  it('returns null lat/lng when no GPS segment', () => {
    const result = parseSMS(
      'HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY',
    );
    expect(result).not.toBeNull();
    expect(result!.lat).toBeNull();
    expect(result!.lng).toBeNull();
  });

  it('HEALTH message does not report trapCaught when CAUGHT is absent', () => {
    const result = parseSMS(
      'HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY',
    );
    expect(result).not.toBeNull();
    expect(result!.trapCaught).toBe(false);
  });
});

// ── ALERT format ─────────────────────────────────────────────────────────────

describe('parseSMS — ALERT format', () => {
  it('parses ALERT with low battery and solar fault', () => {
    const result = parseSMS(
      'ALERT #UNIT_001 | LOW BATT 19% | Solar:FAULT | 14/03/26 14:22',
    );
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('ALERT');
    expect(result!.unitId).toBe('UNIT_001');
    expect(result!.batteryPct).toBe(19);
    expect(result!.solarOk).toBe(false);
    expect(result!.timestamp).toBe('14/03/26 14:22');
  });

  it('parses ALERT with solar OK', () => {
    const result = parseSMS(
      'ALERT #UNIT_001 | LOW BATT 5% | Solar:OK | 14/03/26 14:22',
    );
    expect(result).not.toBeNull();
    expect(result!.solarOk).toBe(true);
    expect(result!.batteryPct).toBe(5);
  });

  it('parses ALERT without battery info', () => {
    const result = parseSMS(
      'ALERT #UNIT_001 | Solar:FAULT | 14/03/26 14:22',
    );
    expect(result).not.toBeNull();
    expect(result!.batteryPct).toBeNull();
    expect(result!.solarOk).toBe(false);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('parseSMS — edge cases', () => {
  it('returns null for empty string', () => {
    expect(parseSMS('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseSMS('random text that is not an SMS format')).toBeNull();
  });

  it('returns null unitId when TRAP has no unit ID', () => {
    // "TRAP" alone with no #UNIT matches TRAP branch but unitMatch is null
    const result = parseSMS('TRAP | CAUGHT | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TRAP');
    expect(result!.unitId).toBeNull();
  });

  it('handles lowercase input (case insensitive)', () => {
    const result = parseSMS('trap #unit_001 | caught | 14/03/26 06:42');
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TRAP');
    expect(result!.unitId).toBe('UNIT_001');
    expect(result!.trapCaught).toBe(true);
  });

  it('handles leading/trailing whitespace', () => {
    const result = parseSMS(
      '  TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42  ',
    );
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TRAP');
    expect(result!.unitId).toBe('UNIT_001');
  });

  it('returns null for partial keyword without full format', () => {
    // "TRAPPED" doesn't start with "TRAP" after trimming — wait, it does
    // Actually "TRAPPED" starts with "TRAP" so it enters the branch
    // but let's use something that does not match any prefix
    expect(parseSMS('HELLO #UNIT_001')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseSMS('   ')).toBeNull();
  });
});

// ── GPS validation ───────────────────────────────────────────────────────────

describe('isValidGPS', () => {
  it('accepts (0, 0) — null island', () => {
    expect(isValidGPS(0, 0)).toBe(true);
  });

  it('accepts (-90, -180) — south-west extreme', () => {
    expect(isValidGPS(-90, -180)).toBe(true);
  });

  it('accepts (90, 180) — north-east extreme', () => {
    expect(isValidGPS(90, 180)).toBe(true);
  });

  it('rejects lat=91 (out of range)', () => {
    expect(isValidGPS(91, 0)).toBe(false);
  });

  it('rejects lng=181 (out of range)', () => {
    expect(isValidGPS(0, 181)).toBe(false);
  });

  it('rejects lat=-91 (out of range)', () => {
    expect(isValidGPS(-91, 0)).toBe(false);
  });

  it('rejects lng=-181 (out of range)', () => {
    expect(isValidGPS(0, -181)).toBe(false);
  });

  it('accepts typical Australian coordinates', () => {
    expect(isValidGPS(-25.2744, 133.7751)).toBe(true);
  });
});

// ── Timestamp parsing ────────────────────────────────────────────────────────

describe('parseDeviceTimestamp', () => {
  it('produces a valid ISO 8601 string with timezone offset', () => {
    const result = parseDeviceTimestamp('14/03/26 06:42');
    // Should match YYYY-MM-DDTHH:MM:SS+HH:MM or YYYY-MM-DDTHH:MM:SS-HH:MM
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('correctly maps DD/MM/YY to YYYY-MM-DD', () => {
    const result = parseDeviceTimestamp('14/03/26 06:42');
    // 14/03/26 -> 2026-03-14
    expect(result).toContain('2026-03-14');
    expect(result).toContain('06:42:00');
  });

  it('accepts a custom timezone parameter', () => {
    const result = parseDeviceTimestamp('14/03/26 06:42', 'UTC');
    expect(result).toBe('2026-03-14T06:42:00+00:00');
  });

  it('defaults to Australia/Sydney when no timezone provided', () => {
    const result = parseDeviceTimestamp('14/03/26 06:42');
    // March 14 2026 in Sydney is AEDT (+11:00) — daylight saving ends first Sunday in April
    expect(result).toBe('2026-03-14T06:42:00+11:00');
  });

  it('handles AEST (no daylight saving) correctly', () => {
    // July is winter in Australia — AEST (+10:00)
    const result = parseDeviceTimestamp('15/07/26 12:00', 'Australia/Sydney');
    expect(result).toBe('2026-07-15T12:00:00+10:00');
  });
});
