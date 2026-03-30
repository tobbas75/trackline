/**
 * Supabase Edge Function: ingest-sms
 * 
 * Receives incoming SMS webhooks from Telstra Messaging API or Twilio.
 * Parses the minimal SMS format and stores event to database.
 * 
 * Deploy: npx supabase functions deploy ingest-sms
 * Webhook URL: https://[project].supabase.co/functions/v1/ingest-sms
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type InboundPayload = Record<string, unknown>;

// ── GPS validation ───────────────────────────────────────────────────────────
function isValidGPS(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ── SMS parser ────────────────────────────────────────────────────────────────
function parseSMS(raw: string): ParsedEvent | null {
  const text = raw.trim().toUpperCase();

  // TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42
  // TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS -12.4567,130.8901
  if (text.startsWith("TRAP")) {
    const unitMatch  = text.match(/TRAP #?([A-Z0-9_]+)/);
    const tsMatch    = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const gpsMatch   = text.match(/GPS ([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
    const battMatch  = text.match(/LOWBATT (\d+)%/);
    const staleGPS   = text.includes("GPS") && text.includes("*");

    let trapLat: number | null = gpsMatch ? parseFloat(gpsMatch[1]) : null;
    let trapLng: number | null = gpsMatch ? parseFloat(gpsMatch[2]) : null;
    if (trapLat !== null && trapLng !== null && !isValidGPS(trapLat, trapLng)) {
      console.warn(`[INGEST] Invalid GPS coordinates rejected: lat=${trapLat}, lng=${trapLng}`);
      trapLat = null;
      trapLng = null;
    }

    return {
      eventType:   "TRAP",
      unitId:      unitMatch?.[1]  ?? null,
      timestamp:   tsMatch?.[1]    ?? null,
      trapCaught:  text.includes("CAUGHT"),
      lat:         trapLat,
      lng:         trapLng,
      gpsStale:    staleGPS,
      batteryPct:  battMatch ? parseInt(battMatch[1]) : null,
    };
  }

  // HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY
  if (text.startsWith("HEALTH")) {
    const unitMatch = text.match(/HEALTH #?([A-Z0-9_]+)/);
    const tsMatch   = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const battMatch = text.match(/BT:(\d+)%/);
    const solarOk   = !text.includes("SOL:FAULT");
    const fwMatch   = text.match(/FW:([\d.]+)/);
    const gpsMatch  = text.match(/GPS ([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);

    let healthLat: number | null = gpsMatch ? parseFloat(gpsMatch[1]) : null;
    let healthLng: number | null = gpsMatch ? parseFloat(gpsMatch[2]) : null;
    if (healthLat !== null && healthLng !== null && !isValidGPS(healthLat, healthLng)) {
      console.warn(`[INGEST] Invalid GPS coordinates rejected: lat=${healthLat}, lng=${healthLng}`);
      healthLat = null;
      healthLng = null;
    }

    return {
      eventType:   "HEALTH",
      unitId:      unitMatch?.[1] ?? null,
      timestamp:   tsMatch?.[1]   ?? null,
      trapCaught:  text.includes("CAUGHT"),
      batteryPct:  battMatch ? parseInt(battMatch[1]) : null,
      solarOk,
      fwVersion:   fwMatch?.[1]   ?? null,
      lat:         healthLat,
      lng:         healthLng,
    };
  }

  // ALERT #UNIT_001 | LOW BATT 19% | Solar:FAULT | 14/03/26 14:22
  if (text.startsWith("ALERT")) {
    const unitMatch = text.match(/ALERT #?([A-Z0-9_]+)/);
    const tsMatch   = text.match(/(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const battMatch = text.match(/BATT (\d+)%/);
    const solarOk   = !text.includes("SOLAR:FAULT");

    return {
      eventType:  "ALERT",
      unitId:     unitMatch?.[1] ?? null,
      timestamp:  tsMatch?.[1]   ?? null,
      batteryPct: battMatch ? parseInt(battMatch[1]) : null,
      solarOk,
    };
  }

  return null;
}

// ── Parse device timestamp DD/MM/YY HH:MM → ISO with correct UTC offset ──────
// Automatically handles AEST/AEDT (or any configured timezone) including DST

// Validate DEVICE_TIMEZONE against IANA timezone database
function getValidatedTimezone(): string {
  const tz = Deno.env.get("DEVICE_TIMEZONE");

  if (!tz) {
    console.error(
      "[CONFIG] DEVICE_TIMEZONE env var is not set. " +
      "Defaulting to 'Australia/Sydney'. " +
      "Set DEVICE_TIMEZONE to a valid IANA timezone (e.g., 'Australia/Brisbane', 'Pacific/Auckland')."
    );
    return "Australia/Sydney";
  }

  // Validate against the IANA timezone database using Intl API (available in Deno)
  const validTimezones = Intl.supportedValuesOf("timeZone");
  if (!validTimezones.includes(tz)) {
    console.error(
      `[CONFIG] DEVICE_TIMEZONE='${tz}' is not a valid IANA timezone. ` +
      `Defaulting to 'Australia/Sydney'. ` +
      `Valid examples: 'Australia/Sydney', 'Australia/Brisbane', 'Pacific/Auckland', 'UTC'. ` +
      `Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`
    );
    return "Australia/Sydney";
  }

  console.log(`[CONFIG] DEVICE_TIMEZONE validated: ${tz}`);
  return tz;
}

const DEVICE_TIMEZONE = getValidatedTimezone();

function parseDeviceTimestamp(ts: string): string {
  const [datePart, timePart] = ts.split(" ");
  const [dd, mm, yy] = datePart.split("/");
  const naive = `20${yy}-${mm}-${dd}T${timePart}:00`;

  // Determine the UTC offset for the device timezone at this date
  const refUtc = new Date(naive + "Z");
  const utcStr = refUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = refUtc.toLocaleString("en-US", { timeZone: DEVICE_TIMEZONE });
  const offsetMs = new Date(localStr).getTime() - new Date(utcStr).getTime();
  const offsetMin = offsetMs / 60000;

  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const mi = String(absMin % 60).padStart(2, "0");

  return `${naive}${sign}${hh}:${mi}`;
}

async function parseInboundPayload(req: Request): Promise<InboundPayload | null> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  try {
    if (contentType.includes("application/json")) {
      return await req.json();
    }

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      const body: InboundPayload = {};
      for (const [key, value] of form.entries()) {
        body[key] = typeof value === "string" ? value : String(value);
      }
      return body;
    }

    // Last-chance fallback for providers that mislabel content type.
    const rawText = await req.text();
    if (!rawText) {
      return {};
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await parseInboundPayload(req);
  if (body === null) {
    return new Response("Invalid request payload", { status: 400 });
  }

  // Extract SMS text — handle Telstra API and Twilio formats
  const rawSMS: string = String(body.text || body.Body || body.message || "");
  const fromNumber: string = String(body.from || body.From || "");

  if (!rawSMS) {
    return new Response("No SMS body", { status: 400 });
  }

  console.log(`[INGEST] From: ${fromNumber} | SMS: ${rawSMS}`);

  const parsed = parseSMS(rawSMS);
  if (!parsed || !parsed.unitId) {
    console.error(JSON.stringify({
      alert: "UNKNOWN_SMS_FORMAT",
      severity: "warning",
      from: fromNumber,
      raw_sms: rawSMS,
      timestamp: new Date().toISOString(),
      message: "Received SMS that does not match TRAP, HEALTH, or ALERT format"
    }));

    const { error: rawEventError } = await supabase.from("events").insert({
      unit_id: null,
      event_type: "UNKNOWN",
      triggered_at: new Date().toISOString(),
      raw_sms: rawSMS,
      trap_caught: false,
      gps_stale: false,
      solar_ok: true,
    });

    if (rawEventError) {
      console.error("[INGEST] Failed to store raw SMS:", rawEventError);
      return new Response(JSON.stringify({ ok: false, reason: "unrecognised_format", stored: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, reason: "unrecognised_format", stored: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Upsert unit record (create if not exists)
  const unitUpdate: UnitUpsertPayload = { id: parsed.unitId!, last_seen: new Date().toISOString() };
  if (parsed.batteryPct !== null && parsed.batteryPct !== undefined) unitUpdate.battery_pct = parsed.batteryPct;
  if (parsed.solarOk !== undefined) unitUpdate.solar_ok = parsed.solarOk;
  if (parsed.fwVersion) unitUpdate.firmware_ver = parsed.fwVersion;
  if (parsed.lat !== null && parsed.lat !== undefined &&
      parsed.lng !== null && parsed.lng !== undefined &&
      isValidGPS(parsed.lat, parsed.lng)) {
    unitUpdate.last_lat = parsed.lat;
    unitUpdate.last_lng = parsed.lng;
  }

  await supabase.from("units")
    .upsert(unitUpdate, { onConflict: "id" });

  // Look up org_id from the unit record for direct event scoping (ISO-01/02)
  let orgId: string | null = null;
  const { data: unitRecord } = await supabase
    .from("units")
    .select("org_id")
    .eq("id", parsed.unitId!)
    .single();
  if (unitRecord?.org_id) {
    orgId = unitRecord.org_id;
  }

  // Insert event
  const eventRow: EventInsertRow = {
    unit_id:      parsed.unitId,
    event_type:   parsed.eventType,
    triggered_at: parsed.timestamp ? parseDeviceTimestamp(parsed.timestamp) : new Date().toISOString(),
    raw_sms:      rawSMS,
    trap_caught:  parsed.trapCaught ?? false,
    battery_pct:  parsed.batteryPct ?? null,
    solar_ok:     parsed.solarOk ?? true,
    fw_version:   parsed.fwVersion ?? null,
    lat:          parsed.lat ?? null,
    lng:          parsed.lng ?? null,
    gps_stale:    parsed.gpsStale ?? false,
    org_id:       orgId,
  };

  const { data: event, error } = await supabase.from("events")
    .insert(eventRow)
    .select()
    .single();

  if (error) {
    console.error("[INGEST] DB error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  console.log(`[INGEST] Event stored: ${event.id} | ${parsed.eventType} | ${parsed.unitId}`);

  return new Response(JSON.stringify({ ok: true, eventId: event.id }), {
    headers: { "Content-Type": "application/json" }
  });
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedEvent {
  eventType:   string;
  unitId:      string | null;
  timestamp:   string | null;
  trapCaught?: boolean;
  lat?:        number | null;
  lng?:        number | null;
  gpsStale?:   boolean;
  batteryPct?: number | null;
  solarOk?:    boolean;
  fwVersion?:  string | null;
}

interface UnitUpsertPayload {
  id: string;
  last_seen: string;
  battery_pct?: number;
  solar_ok?: boolean;
  firmware_ver?: string;
  last_lat?: number;
  last_lng?: number;
}

interface EventInsertRow {
  unit_id: string;
  event_type: string;
  triggered_at: string;
  raw_sms: string;
  trap_caught: boolean;
  battery_pct: number | null;
  solar_ok: boolean;
  fw_version: string | null;
  lat: number | null;
  lng: number | null;
  gps_stale: boolean;
  org_id: string | null;
}
