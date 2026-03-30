/**
 * SMS parser — Node-compatible copy of the parsing logic from
 * backend/supabase/functions/ingest-sms/index.ts
 *
 * This module extracts the pure parsing functions so they can be
 * tested with Vitest without Deno dependencies.
 *
 * IMPORTANT: The regex patterns and logic here must stay identical
 * to the Deno original.  Changes should be made in both places.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedEvent {
  eventType: string;
  unitId: string | null;
  timestamp: string | null;
  trapCaught?: boolean;
  lat?: number | null;
  lng?: number | null;
  gpsStale?: boolean;
  batteryPct?: number | null;
  solarOk?: boolean;
  fwVersion?: string | null;
}

// ── GPS validation ───────────────────────────────────────────────────────────

export function isValidGPS(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ── SMS parser ────────────────────────────────────────────────────────────────

export function parseSMS(raw: string): ParsedEvent | null {
  const text = raw.trim().toUpperCase();

  // TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42
  // TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS -12.4567,130.8901
  if (text.startsWith("TRAP")) {
    const unitMatch = text.match(/TRAP #?([A-Z0-9_]+)/);
    const tsMatch = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const gpsMatch = text.match(/GPS ([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const battMatch = text.match(/LOWBATT (\d+)%/);
    const staleGPS = text.includes("GPS") && text.includes("*");

    let trapLat: number | null = gpsMatch ? parseFloat(gpsMatch[1]) : null;
    let trapLng: number | null = gpsMatch ? parseFloat(gpsMatch[2]) : null;
    if (trapLat !== null && trapLng !== null && !isValidGPS(trapLat, trapLng)) {
      trapLat = null;
      trapLng = null;
    }

    return {
      eventType: "TRAP",
      unitId: unitMatch?.[1] ?? null,
      timestamp: tsMatch?.[1] ?? null,
      trapCaught: text.includes("CAUGHT"),
      lat: trapLat,
      lng: trapLng,
      gpsStale: staleGPS,
      batteryPct: battMatch ? parseInt(battMatch[1]) : null,
    };
  }

  // HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY
  if (text.startsWith("HEALTH")) {
    const unitMatch = text.match(/HEALTH #?([A-Z0-9_]+)/);
    const tsMatch = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const battMatch = text.match(/BT:(\d+)%/);
    const solarOk = !text.includes("SOL:FAULT");
    const fwMatch = text.match(/FW:([\d.]+)/);
    const gpsMatch = text.match(/GPS ([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);

    let healthLat: number | null = gpsMatch ? parseFloat(gpsMatch[1]) : null;
    let healthLng: number | null = gpsMatch ? parseFloat(gpsMatch[2]) : null;
    if (healthLat !== null && healthLng !== null && !isValidGPS(healthLat, healthLng)) {
      healthLat = null;
      healthLng = null;
    }

    return {
      eventType: "HEALTH",
      unitId: unitMatch?.[1] ?? null,
      timestamp: tsMatch?.[1] ?? null,
      trapCaught: text.includes("CAUGHT"),
      batteryPct: battMatch ? parseInt(battMatch[1]) : null,
      solarOk,
      fwVersion: fwMatch?.[1] ?? null,
      lat: healthLat,
      lng: healthLng,
    };
  }

  // ALERT #UNIT_001 | LOW BATT 19% | Solar:FAULT | 14/03/26 14:22
  if (text.startsWith("ALERT")) {
    const unitMatch = text.match(/ALERT #?([A-Z0-9_]+)/);
    const tsMatch = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const battMatch = text.match(/BATT (\d+)%/);
    const solarOk = !text.includes("SOLAR:FAULT");

    return {
      eventType: "ALERT",
      unitId: unitMatch?.[1] ?? null,
      timestamp: tsMatch?.[1] ?? null,
      batteryPct: battMatch ? parseInt(battMatch[1]) : null,
      solarOk,
    };
  }

  return null;
}

// ── Parse device timestamp DD/MM/YY HH:MM -> ISO with correct UTC offset ────
// Automatically handles AEST/AEDT (or any configured timezone) including DST

export function parseDeviceTimestamp(
  ts: string,
  timezone: string = "Australia/Sydney",
): string {
  const [datePart, timePart] = ts.split(" ");
  const [dd, mm, yy] = datePart.split("/");
  const naive = `20${yy}-${mm}-${dd}T${timePart}:00`;

  // Determine the UTC offset for the device timezone at this date
  const refUtc = new Date(naive + "Z");
  const utcStr = refUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = refUtc.toLocaleString("en-US", { timeZone: timezone });
  const offsetMs = new Date(localStr).getTime() - new Date(utcStr).getTime();
  const offsetMin = offsetMs / 60000;

  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const mi = String(absMin % 60).padStart(2, "0");

  return `${naive}${sign}${hh}:${mi}`;
}
