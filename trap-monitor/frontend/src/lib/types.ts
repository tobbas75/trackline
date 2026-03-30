/**
 * Shared types for Trap Monitor dashboard
 */

export interface Unit {
  id: string;
  name?: string;
  org_id?: string;
  phone_id?: string;
  last_lat?: number;
  last_lng?: number;
  last_seen?: string;
  firmware_ver?: string;
  battery_pct?: number;
  solar_ok?: boolean;
  armed?: boolean;
  created_at?: string;
  device_type?: 'trap_monitor' | 'camera_trap';
  connectivity_method?: 'sms' | 'mqtt';
}

export interface TrapEvent {
  id: number;
  unit_id: string;
  org_id?: string;
  event_type: string; // 'TRAP', 'HEALTH', 'ALERT'
  triggered_at: string;
  trap_caught: boolean;
  lat?: number;
  lng?: number;
  gps_stale?: boolean;
  battery_pct?: number;
  solar_ok?: boolean;
  signal_rssi?: number;
  fw_version?: string;
  acknowledged: boolean;
  ack_at?: string;
  raw_sms?: string;
  created_at?: string;
}

export type UnitStatus =
  | "caught"
  | "offline"
  | "lowbatt"
  | "disarmed"
  | "normal";

/**
 * Determine the status of a unit based on its current state and recent events
 */
export function getUnitStatus(unit: Unit, events: TrapEvent[]): UnitStatus {
  // Check for unacknowledged trap event
  const recentCaught = events.find(
    (e) => e.unit_id === unit.id && e.trap_caught && !e.acknowledged,
  );
  if (recentCaught) return "caught";

  // Check if offline (no communication for 26+ hours)
  if (
    !unit.last_seen ||
    Date.now() - new Date(unit.last_seen).getTime() > 26 * 3600000
  ) {
    return "offline";
  }

  // Check low battery
  if ((unit.battery_pct ?? 100) <= 20) return "lowbatt";

  // Check if disarmed
  if (unit.armed === false) return "disarmed";

  // Default: healthy
  return "normal";
}

/**
 * Get color for unit status indicator
 */
export function getStatusColor(status: UnitStatus): string {
  switch (status) {
    case "caught":
      return "bg-red-500";
    case "offline":
      return "bg-gray-500";
    case "lowbatt":
      return "bg-amber-500";
    case "disarmed":
      return "bg-purple-500";
    default:
      return "bg-green-500";
  }
}

/**
 * Get readable label for unit status
 */
export function getStatusLabel(status: UnitStatus): string {
  const labels: Record<UnitStatus, string> = {
    caught: "Caught",
    offline: "Offline",
    lowbatt: "Low Battery",
    disarmed: "Disarmed",
    normal: "Normal",
  };
  return labels[status];
}

/**
 * Format relative time (e.g. "5m ago")
 */
export function formatRelativeTime(ts?: string): string {
  if (!ts) return "never";
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

/**
 * Check if a unit is offline
 */
export function isOffline(unit: Unit): boolean {
  if (!unit.last_seen) return true;
  const ms = Date.now() - new Date(unit.last_seen).getTime();
  return ms > 26 * 60 * 60 * 1000; // 26 hours
}

// ---------------------------------------------------------------------------
// Camera Pipeline Types
// ---------------------------------------------------------------------------

export type DeviceType = 'trap_monitor' | 'camera_trap';
export type ConnectivityMethod = 'sms' | 'mqtt';
export type SpeciesCategory = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'insect' | 'other';

export interface Species {
  id: string;
  name: string;
  common_name: string;
  scientific_name?: string;
  category: SpeciesCategory;
  created_at?: string;
}

export interface CameraEvent {
  id: string;
  unit_id: string;
  org_id: string;
  captured_at: string;
  image_path?: string;
  image_width?: number;
  image_height?: number;
  model_name?: string;
  inference_time_ms?: number;
  battery_percent?: number;
  communication_type?: string;
  detection_count: number;
  mqtt_topic?: string;
  created_at?: string;
  // Joined data (populated by queries with joins)
  detections?: CameraDetection[];
  unit?: Unit;
}

export interface CameraDetection {
  id: string;
  camera_event_id: string;
  species_id?: string;
  class_name: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at?: string;
  // Joined data
  species?: Species;
}

/**
 * Bounding box coordinates (normalised 0-1) for drawing overlays on images
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}
