// Portable copy of validation logic from backend/supabase/functions/ingest-mqtt/index.ts
// Keep in sync with the edge function. Changes here should be mirrored there.

// ── Types ────────────────────────────────────────────────────────────────────

export interface NE301Payload {
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

export interface TrapMQTTPayload {
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

// ── NE301 payload validation ─────────────────────────────────────────────────

export function validateNE301Payload(
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

  // ai_result.ai_result (inner -- nested structure is intentional per NE301 format)
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

export function extractDeviceId(url: URL, body: Record<string, unknown>): string | null {
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

export function extractTopic(url: URL, body: Record<string, unknown>): string | null {
  return url.searchParams.get("topic") || (body.topic as string) || null;
}

// ── Trap monitor payload validation ──────────────────────────────────────────

export function validateTrapPayload(
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

// ── GPS validation ───────────────────────────────────────────────────────────

export function isValidGPS(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
