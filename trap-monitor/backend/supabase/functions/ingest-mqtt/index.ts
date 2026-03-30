/**
 * Supabase Edge Function: ingest-mqtt
 *
 * Receives camera trap MQTT payloads (NE301 format) via HTTP webhook from
 * an MQTT broker bridge. Validates the payload, looks up the unit, creates
 * camera_event + camera_detections rows, decodes the base64 JPEG image and
 * stores it in Supabase Storage.
 *
 * Deploy: npx supabase functions deploy ingest-mqtt
 * Webhook URL: https://[project].supabase.co/functions/v1/ingest-mqtt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── NE301 payload validation ─────────────────────────────────────────────────

function validateNE301Payload(
  body: unknown
): { valid: true; payload: NE301Payload } | { valid: false; reason: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, reason: "Payload must be a non-null JSON object" };
  }

  const obj = body as Record<string, unknown>;

  // metadata
  if (!obj.metadata || typeof obj.metadata !== "object") {
    return { valid: false, reason: "Missing or invalid 'metadata' object" };
  }
  const meta = obj.metadata as Record<string, unknown>;
  if (typeof meta.timestamp !== "number") {
    return { valid: false, reason: "metadata.timestamp must be a number (unix epoch)" };
  }
  if (typeof meta.width !== "number" || meta.width <= 0) {
    return { valid: false, reason: "metadata.width must be a positive number" };
  }
  if (typeof meta.height !== "number" || meta.height <= 0) {
    return { valid: false, reason: "metadata.height must be a positive number" };
  }

  // device_info
  if (!obj.device_info || typeof obj.device_info !== "object") {
    return { valid: false, reason: "Missing or invalid 'device_info' object" };
  }
  const devInfo = obj.device_info as Record<string, unknown>;
  if (typeof devInfo.battery_percent !== "number") {
    return { valid: false, reason: "device_info.battery_percent must be a number" };
  }
  if (typeof devInfo.communication_type !== "string") {
    return { valid: false, reason: "device_info.communication_type must be a string" };
  }

  // ai_result (outer)
  if (!obj.ai_result || typeof obj.ai_result !== "object") {
    return { valid: false, reason: "Missing or invalid 'ai_result' object" };
  }
  const aiOuter = obj.ai_result as Record<string, unknown>;
  if (typeof aiOuter.model_name !== "string") {
    return { valid: false, reason: "ai_result.model_name must be a string" };
  }
  if (typeof aiOuter.inference_time_ms !== "number") {
    return { valid: false, reason: "ai_result.inference_time_ms must be a number" };
  }

  // ai_result.ai_result (inner — nested structure is intentional per NE301 format)
  if (!aiOuter.ai_result || typeof aiOuter.ai_result !== "object") {
    return { valid: false, reason: "Missing or invalid 'ai_result.ai_result' inner object" };
  }
  const aiInner = aiOuter.ai_result as Record<string, unknown>;
  if (typeof aiInner.detection_count !== "number") {
    return { valid: false, reason: "ai_result.ai_result.detection_count must be a number" };
  }
  if (!Array.isArray(aiInner.detections)) {
    return { valid: false, reason: "ai_result.ai_result.detections must be an array" };
  }

  // Validate each detection
  for (let i = 0; i < aiInner.detections.length; i++) {
    const det = aiInner.detections[i] as Record<string, unknown>;
    if (typeof det.class_name !== "string") {
      return { valid: false, reason: `detections[${i}].class_name must be a string` };
    }
    if (typeof det.confidence !== "number" || det.confidence < 0 || det.confidence > 1) {
      return { valid: false, reason: `detections[${i}].confidence must be a number between 0 and 1` };
    }
    for (const coord of ["x", "y", "width", "height"] as const) {
      if (typeof det[coord] !== "number" || (det[coord] as number) < 0 || (det[coord] as number) > 1) {
        return { valid: false, reason: `detections[${i}].${coord} must be a number between 0 and 1` };
      }
    }
  }

  // image_data
  if (typeof obj.image_data !== "string") {
    return { valid: false, reason: "Missing or invalid 'image_data' string" };
  }
  const imageData = obj.image_data as string;
  if (
    !imageData.startsWith("data:image/jpeg;base64,") &&
    !imageData.startsWith("data:image/png;base64,")
  ) {
    return {
      valid: false,
      reason: "image_data must start with 'data:image/jpeg;base64,' or 'data:image/png;base64,'",
    };
  }

  return { valid: true, payload: body as NE301Payload };
}

// ── Device ID extraction ─────────────────────────────────────────────────────

function extractDeviceId(url: URL, body: Record<string, unknown>): string | null {
  // Direct device_id param or body field
  const directId = url.searchParams.get("device_id") || (body.device_id as string);
  if (directId) return directId;

  // Extract from MQTT topic: ne301/{device_id}/upload/report
  const topic = url.searchParams.get("topic") || (body.topic as string);
  if (topic) {
    const parts = topic.split("/");
    if (parts.length >= 2) return parts[1];
  }

  return null;
}

// ── Extract MQTT topic ───────────────────────────────────────────────────────

function extractTopic(url: URL, body: Record<string, unknown>): string | null {
  return url.searchParams.get("topic") || (body.topic as string) || null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, reason: "invalid_payload", details: "Request body is not valid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);

  // Extract device ID from query params, body, or MQTT topic
  const deviceId = extractDeviceId(url, body);
  if (!deviceId) {
    console.error(JSON.stringify({
      alert: "MQTT_MISSING_DEVICE_ID",
      severity: "warning",
      timestamp: new Date().toISOString(),
      message: "No device_id or topic found in request",
    }));
    return new Response(
      JSON.stringify({ ok: false, reason: "missing_device_id", details: "Provide device_id param, topic param, or device_id/topic in body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const topic = extractTopic(url, body);

  console.log(`[INGEST-MQTT] Received: device=${deviceId} topic=${topic || "none"}`);

  // Validate NE301 payload structure
  const validation = validateNE301Payload(body);
  if (!validation.valid) {
    console.error(JSON.stringify({
      alert: "MQTT_VALIDATION_FAILURE",
      severity: "warning",
      device_id: deviceId,
      reason: validation.reason,
      timestamp: new Date().toISOString(),
      message: "NE301 payload failed validation",
    }));
    return new Response(
      JSON.stringify({ ok: false, reason: "invalid_payload", details: validation.reason }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = validation.payload;

  // Look up unit — get org_id and device_type
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, org_id, device_type, connectivity_method")
    .eq("id", deviceId)
    .single();

  if (unitError || !unit) {
    console.error(JSON.stringify({
      alert: "MQTT_UNKNOWN_DEVICE",
      severity: "warning",
      device_id: deviceId,
      error: unitError?.message || "Unit not found",
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({ ok: false, reason: "unknown_device", device_id: deviceId }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!unit.org_id) {
    console.error(JSON.stringify({
      alert: "MQTT_NO_ORG",
      severity: "warning",
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      message: "Unit exists but has no org_id assigned",
    }));
    return new Response(
      JSON.stringify({ ok: false, reason: "no_org_assigned", device_id: deviceId }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[INGEST-MQTT] Device: ${deviceId} | type: ${unit.device_type} | connectivity: ${unit.connectivity_method}`);

  // ── Device type routing ─────────────────────────────────────────────────
  if (unit.device_type === "trap_monitor") {
    return await handleTrapMonitor(body, unit, deviceId);
  }

  // ── Camera trap flow ─────────────────────────────────────────────────────
  // Insert camera_event row
  const eventRow: CameraEventInsertRow = {
    unit_id: deviceId,
    org_id: unit.org_id,
    captured_at: new Date(payload.metadata.timestamp * 1000).toISOString(),
    image_width: payload.metadata.width,
    image_height: payload.metadata.height,
    model_name: payload.ai_result.model_name,
    inference_time_ms: payload.ai_result.inference_time_ms,
    battery_percent: payload.device_info.battery_percent,
    communication_type: payload.device_info.communication_type,
    detection_count: payload.ai_result.ai_result.detection_count,
    mqtt_topic: topic,
    image_path: null, // Updated after storage upload
  };

  const { data: cameraEvent, error: eventError } = await supabase
    .from("t_camera_events")
    .insert(eventRow)
    .select("id")
    .single();

  if (eventError || !cameraEvent) {
    console.error("[INGEST-MQTT] camera_events insert error:", eventError);
    return new Response(
      JSON.stringify({ ok: false, error: eventError?.message || "Failed to insert camera event" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Image storage ────────────────────────────────────────────────────────
  // Strip data URI prefix to get raw base64
  const commaIndex = payload.image_data.indexOf(",");
  const base64Data = commaIndex >= 0
    ? payload.image_data.slice(commaIndex + 1)
    : payload.image_data;

  // Determine content type from data URI prefix
  const contentType = payload.image_data.startsWith("data:image/png;base64,")
    ? "image/png"
    : "image/jpeg";

  const fileExtension = contentType === "image/png" ? "png" : "jpg";

  // Decode base64 to Uint8Array
  let bytes: Uint8Array;
  try {
    const binaryStr = atob(base64Data);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } catch (decodeErr) {
    console.error("[INGEST-MQTT] Base64 decode error:", decodeErr);
    // Non-fatal — event is stored, image decode failure logged
    bytes = new Uint8Array(0);
  }

  let imageStored = false;
  const storagePath = `${unit.org_id}/${deviceId}/${cameraEvent.id}.${fileExtension}`;

  if (bytes.length > 0) {
    const { error: uploadError } = await supabase.storage
      .from("camera-images")
      .upload(storagePath, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[INGEST-MQTT] Storage upload error:", uploadError);
      // Non-fatal — event is stored, image upload failure is logged
    } else {
      // Update camera_event with image_path
      await supabase
        .from("t_camera_events")
        .update({ image_path: storagePath })
        .eq("id", cameraEvent.id);
      imageStored = true;
    }
  }

  // ── Detection inserts ────────────────────────────────────────────────────
  const detections = payload.ai_result.ai_result.detections;
  let detectionsStored = 0;

  if (detections.length > 0) {
    // Batch lookup species by class_name
    const classNames = [...new Set(detections.map((d) => d.class_name.toLowerCase()))];
    const { data: speciesRows } = await supabase
      .from("trap_species")
      .select("id, name")
      .in("name", classNames);

    const speciesMap = new Map(
      (speciesRows || []).map((s: { id: string; name: string }) => [s.name, s.id])
    );

    const detectionRows: CameraDetectionInsertRow[] = detections.map((d) => ({
      camera_event_id: cameraEvent.id,
      species_id: speciesMap.get(d.class_name.toLowerCase()) || null,
      class_name: d.class_name,
      confidence: d.confidence,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
    }));

    const { error: detError } = await supabase
      .from("t_camera_detections")
      .insert(detectionRows);

    if (detError) {
      console.error("[INGEST-MQTT] Detection insert error:", detError);
    } else {
      detectionsStored = detectionRows.length;
    }
  }

  // ── Update unit last_seen ────────────────────────────────────────────────
  await supabase
    .from("units")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", deviceId);

  console.log(
    `[INGEST-MQTT] Event stored: ${cameraEvent.id} | ${deviceId} | ${detectionsStored} detections | image=${imageStored}`
  );

  return new Response(
    JSON.stringify({
      ok: true,
      event_id: cameraEvent.id,
      device_type: "camera_trap",
      detections_stored: detectionsStored,
      image_stored: imageStored,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// ── Trap monitor handler ────────────────────────────────────────────────────

function isValidGPS(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

interface TrapMQTTPayload {
  event_type: string;
  triggered_at: string | number;
  trap_caught?: boolean;
  battery_pct?: number;
  solar_ok?: boolean;
  lat?: number;
  lng?: number;
  gps_stale?: boolean;
  fw_version?: string;
}

function validateTrapPayload(
  body: unknown
): { valid: true; payload: TrapMQTTPayload } | { valid: false; reason: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, reason: "Payload must be a non-null JSON object" };
  }
  const obj = body as Record<string, unknown>;

  if (typeof obj.event_type !== "string") {
    return { valid: false, reason: "Missing event_type field" };
  }
  const eventType = obj.event_type.toString().toUpperCase();
  if (!["TRAP", "HEALTH", "ALERT"].includes(eventType)) {
    return { valid: false, reason: `event_type must be TRAP, HEALTH, or ALERT (got ${obj.event_type})` };
  }

  if (obj.triggered_at === undefined || obj.triggered_at === null) {
    return { valid: false, reason: "Missing triggered_at field" };
  }
  if (typeof obj.triggered_at !== "string" && typeof obj.triggered_at !== "number") {
    return { valid: false, reason: "triggered_at must be a string (ISO) or number (unix epoch)" };
  }

  return { valid: true, payload: body as TrapMQTTPayload };
}

async function handleTrapMonitor(
  body: Record<string, unknown>,
  unit: { id: string; org_id: string },
  deviceId: string
): Promise<Response> {
  const validation = validateTrapPayload(body);
  if (!validation.valid) {
    console.error(JSON.stringify({
      alert: "MQTT_TRAP_VALIDATION_FAILURE",
      severity: "warning",
      device_id: deviceId,
      reason: validation.reason,
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({ ok: false, reason: "invalid_trap_payload", details: validation.reason }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = validation.payload;

  const triggeredAt = typeof payload.triggered_at === "number"
    ? new Date(payload.triggered_at * 1000).toISOString()
    : payload.triggered_at;

  let lat: number | null = payload.lat ?? null;
  let lng: number | null = payload.lng ?? null;
  if (lat !== null && lng !== null && !isValidGPS(lat, lng)) {
    console.warn(`[INGEST-MQTT] Invalid GPS rejected: lat=${lat}, lng=${lng}`);
    lat = null;
    lng = null;
  }

  const eventRow = {
    unit_id: deviceId,
    event_type: payload.event_type.toUpperCase(),
    triggered_at: triggeredAt,
    raw_sms: `MQTT:${JSON.stringify(body)}`,
    trap_caught: payload.trap_caught ?? false,
    battery_pct: payload.battery_pct ?? null,
    solar_ok: payload.solar_ok ?? true,
    fw_version: payload.fw_version ?? null,
    lat,
    lng,
    gps_stale: payload.gps_stale ?? false,
    org_id: unit.org_id,
  };

  const { data: event, error } = await supabase
    .from("events")
    .insert(eventRow)
    .select("id")
    .single();

  if (error) {
    console.error("[INGEST-MQTT] Trap event DB error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const unitUpdate: Record<string, unknown> = { last_seen: new Date().toISOString() };
  if (payload.battery_pct !== undefined) unitUpdate.battery_pct = payload.battery_pct;
  if (payload.solar_ok !== undefined) unitUpdate.solar_ok = payload.solar_ok;
  if (payload.fw_version) unitUpdate.firmware_ver = payload.fw_version;
  if (lat !== null && lng !== null) {
    unitUpdate.last_lat = lat;
    unitUpdate.last_lng = lng;
  }

  await supabase.from("units").update(unitUpdate).eq("id", deviceId);

  console.log(`[INGEST-MQTT] Trap event stored: ${event.id} | ${payload.event_type} | ${deviceId}`);

  return new Response(
    JSON.stringify({ ok: true, event_id: event.id, device_type: "trap_monitor" }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface NE301Payload {
  metadata: {
    timestamp: number;
    width: number;
    height: number;
  };
  device_info: {
    battery_percent: number;
    communication_type: string;
  };
  ai_result: {
    model_name: string;
    inference_time_ms: number;
    ai_result: {
      type_name: string;
      detection_count: number;
      detections: Array<{
        class_name: string;
        confidence: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };
  };
  image_data: string;
  device_id?: string;
  topic?: string;
}

interface CameraEventInsertRow {
  unit_id: string;
  org_id: string;
  captured_at: string;
  image_width: number;
  image_height: number;
  model_name: string;
  inference_time_ms: number;
  battery_percent: number;
  communication_type: string;
  detection_count: number;
  mqtt_topic: string | null;
  image_path: string | null;
}

interface CameraDetectionInsertRow {
  camera_event_id: string;
  species_id: string | null;
  class_name: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
