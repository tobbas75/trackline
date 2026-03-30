import { describe, it, expect } from 'vitest';
import {
  validateNE301Payload,
  extractDeviceId,
  extractTopic,
  validateTrapPayload,
  isValidGPS,
} from './mqtt-validation';

// ── Helper: build a valid NE301 payload ──────────────────────────────────────

function makeValidNE301(overrides: Record<string, unknown> = {}) {
  return {
    metadata: { timestamp: 1700000000, width: 1920, height: 1080 },
    device_info: { battery_percent: 85, communication_type: '4G' },
    ai_result: {
      model_name: 'yolov5s',
      inference_time_ms: 120,
      ai_result: {
        type_name: 'detection',
        detection_count: 1,
        detections: [
          { class_name: 'possum', confidence: 0.92, x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        ],
      },
    },
    image_data: 'data:image/jpeg;base64,/9j/4AAQ',
    ...overrides,
  };
}

// ── validateNE301Payload ─────────────────────────────────────────────────────

describe('validateNE301Payload', () => {
  it('accepts a valid NE301 payload', () => {
    const result = validateNE301Payload(makeValidNE301());
    expect(result.valid).toBe(true);
  });

  it('rejects null payload', () => {
    const result = validateNE301Payload(null);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('non-null');
  });

  it('rejects missing metadata', () => {
    const { metadata: _, ...rest } = makeValidNE301();
    const result = validateNE301Payload(rest);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('metadata');
  });

  it('rejects non-numeric metadata.timestamp', () => {
    const payload = makeValidNE301();
    payload.metadata = { ...payload.metadata as Record<string, unknown>, timestamp: 'not-a-number' } as never;
    const result = validateNE301Payload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('timestamp');
  });

  it('rejects zero metadata.width', () => {
    const payload = makeValidNE301();
    payload.metadata = { ...payload.metadata as Record<string, unknown>, width: 0 } as never;
    const result = validateNE301Payload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('width');
  });

  it('rejects missing device_info', () => {
    const { device_info: _, ...rest } = makeValidNE301();
    const result = validateNE301Payload(rest);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('device_info');
  });

  it('rejects missing ai_result', () => {
    const { ai_result: _, ...rest } = makeValidNE301();
    const result = validateNE301Payload(rest);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('ai_result');
  });

  it('rejects missing inner ai_result', () => {
    const payload = makeValidNE301();
    payload.ai_result = {
      model_name: 'yolov5s',
      inference_time_ms: 120,
    } as never;
    const result = validateNE301Payload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('ai_result.ai_result');
  });

  it('rejects detection with confidence > 1', () => {
    const payload = makeValidNE301();
    (payload.ai_result as Record<string, unknown>).ai_result = {
      type_name: 'detection',
      detection_count: 1,
      detections: [
        { class_name: 'possum', confidence: 1.5, x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      ],
    };
    const result = validateNE301Payload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('confidence');
  });

  it('rejects detection with negative x coordinate', () => {
    const payload = makeValidNE301();
    (payload.ai_result as Record<string, unknown>).ai_result = {
      type_name: 'detection',
      detection_count: 1,
      detections: [
        { class_name: 'possum', confidence: 0.5, x: -0.1, y: 0.2, width: 0.3, height: 0.4 },
      ],
    };
    const result = validateNE301Payload(payload);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('x');
  });

  it('rejects missing image_data', () => {
    const { image_data: _, ...rest } = makeValidNE301();
    const result = validateNE301Payload(rest);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('image_data');
  });

  it('rejects image_data without base64 prefix', () => {
    const result = validateNE301Payload(makeValidNE301({ image_data: 'not-base64' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('data:image');
  });

  it('accepts PNG image data', () => {
    const result = validateNE301Payload(
      makeValidNE301({ image_data: 'data:image/png;base64,iVBOR' })
    );
    expect(result.valid).toBe(true);
  });
});

// ── extractDeviceId ──────────────────────────────────────────────────────────

describe('extractDeviceId', () => {
  it('extracts device_id from URL query param', () => {
    const url = new URL('http://x?device_id=DEV001');
    expect(extractDeviceId(url, {})).toBe('DEV001');
  });

  it('extracts device_id from body field', () => {
    const url = new URL('http://x');
    expect(extractDeviceId(url, { device_id: 'DEV002' })).toBe('DEV002');
  });

  it('extracts device_id from MQTT topic in URL', () => {
    const url = new URL('http://x?topic=ne301/DEV003/upload/report');
    expect(extractDeviceId(url, {})).toBe('DEV003');
  });

  it('extracts device_id from body topic field', () => {
    const url = new URL('http://x');
    expect(extractDeviceId(url, { topic: 'ne301/DEV004/upload/report' })).toBe('DEV004');
  });

  it('returns null when no device_id available', () => {
    const url = new URL('http://x');
    expect(extractDeviceId(url, {})).toBeNull();
  });

  it('prefers direct device_id over topic', () => {
    const url = new URL('http://x?device_id=DIRECT&topic=ne301/TOPIC/x');
    expect(extractDeviceId(url, {})).toBe('DIRECT');
  });
});

// ── extractTopic ─────────────────────────────────────────────────────────────

describe('extractTopic', () => {
  it('extracts topic from URL query', () => {
    const url = new URL('http://x?topic=ne301/x/upload/report');
    expect(extractTopic(url, {})).toBe('ne301/x/upload/report');
  });

  it('extracts topic from body', () => {
    const url = new URL('http://x');
    expect(extractTopic(url, { topic: 'ne301/y/upload/report' })).toBe('ne301/y/upload/report');
  });

  it('returns null when no topic', () => {
    const url = new URL('http://x');
    expect(extractTopic(url, {})).toBeNull();
  });
});

// ── validateTrapPayload ──────────────────────────────────────────────────────

describe('validateTrapPayload', () => {
  it('accepts valid trap payload', () => {
    const result = validateTrapPayload({ event_type: 'TRAP', triggered_at: '2024-01-01T00:00:00Z' });
    expect(result.valid).toBe(true);
  });

  it('accepts HEALTH event type', () => {
    const result = validateTrapPayload({ event_type: 'HEALTH', triggered_at: 1700000000 });
    expect(result.valid).toBe(true);
  });

  it('accepts ALERT event type', () => {
    const result = validateTrapPayload({ event_type: 'ALERT', triggered_at: '2024-01-01T00:00:00Z' });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown event type', () => {
    const result = validateTrapPayload({ event_type: 'UNKNOWN', triggered_at: '2024-01-01T00:00:00Z' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('event_type');
  });

  it('rejects missing triggered_at', () => {
    const result = validateTrapPayload({ event_type: 'TRAP' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('triggered_at');
  });

  it('rejects non-string/number triggered_at', () => {
    const result = validateTrapPayload({ event_type: 'TRAP', triggered_at: true });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('triggered_at');
  });

  it('rejects null body', () => {
    const result = validateTrapPayload(null);
    expect(result.valid).toBe(false);
  });
});

// ── isValidGPS ───────────────────────────────────────────────────────────────

describe('isValidGPS', () => {
  it('accepts valid coordinates', () => {
    expect(isValidGPS(-33.8, 151.2)).toBe(true);
  });

  it('rejects lat > 90', () => {
    expect(isValidGPS(91, 0)).toBe(false);
  });

  it('rejects lat < -90', () => {
    expect(isValidGPS(-91, 0)).toBe(false);
  });

  it('rejects lng > 180', () => {
    expect(isValidGPS(0, 181)).toBe(false);
  });

  it('rejects lng < -180', () => {
    expect(isValidGPS(0, -181)).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(isValidGPS(90, 180)).toBe(true);
    expect(isValidGPS(-90, -180)).toBe(true);
  });
});
