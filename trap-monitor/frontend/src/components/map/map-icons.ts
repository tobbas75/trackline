/**
 * Shared unit status icon definitions for map and mini-map
 */

import L from "leaflet";

/**
 * Create a custom trap marker icon with optional pulse animation
 */
export const makeIcon = (color: string, pulse = false) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${
          pulse
            ? `<div style="position:absolute;width:28px;height:28px;border-radius:50%;
          background:${color};opacity:0.3;animation:ping 1.5s infinite;"></div>`
            : ""
        }
        <div style="position:absolute;top:4px;left:4px;width:20px;height:20px;
          border-radius:50%;background:${color};border:2px solid white;
          box-shadow:0 2px 4px rgba(0,0,0,0.5);display:flex;align-items:center;
          justify-content:center;font-size:10px;">🪤</div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

/**
 * Predefined icon set for unit statuses
 */
export const ICONS = {
  caught: makeIcon("#ef4444", true), // Red + pulse
  empty: makeIcon("#22c55e"), // Green
  offline: makeIcon("#6b7280"), // Gray
  lowbatt: makeIcon("#f59e0b"), // Amber
  disarmed: makeIcon("#8b5cf6"), // Purple
};

/**
 * Get the appropriate icon for a unit based on its status
 */
export function getUnitMapIcon(
  unitArmed: boolean | undefined,
  unitBattery: number | undefined,
  unitLastSeen: string | undefined,
  isUnacknowledgedCaught: boolean,
) {
  if (isUnacknowledgedCaught) return ICONS.caught;
  if (
    !unitLastSeen ||
    Date.now() - new Date(unitLastSeen).getTime() > 26 * 3600000
  )
    return ICONS.offline;
  if ((unitBattery ?? 100) <= 20) return ICONS.lowbatt;
  if (unitArmed === false) return ICONS.disarmed;
  return ICONS.empty;
}
