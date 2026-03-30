"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ICONS, getUnitMapIcon } from "./map-icons";
import { Unit, TrapEvent } from "@/lib/types";

// Fix Leaflet default icon path in Next.js
// Leaflet's Default icon prototype has an internal _getIconUrl property
// that conflicts with Next.js bundling. We need to remove it so mergeOptions
// takes effect. The property exists at runtime but isn't in the type definitions.
const DefaultIcon = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown };
delete DefaultIcon._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  units: Unit[];
  events: TrapEvent[];
  selectedUnit: string | null;
  onUnitClick: (id: string) => void;
}

export default function MapView({
  units,
  events,
  selectedUnit,
  onUnitClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [-25.0, 133.0], // Centre of Australia
      zoom: 5,
      zoomControl: true,
    });

    // OpenStreetMap tiles — free, no API key
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update markers when units change ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Collect valid positions for bounds calculation
    const validPositions: L.LatLngTuple[] = [];

    units.forEach((unit) => {
      if (!unit.last_lat || !unit.last_lng) return;

      const latLng: L.LatLngTuple = [unit.last_lat, unit.last_lng];
      validPositions.push(latLng);

      const recentCaught = events.find(
        (e) => e.unit_id === unit.id && e.trap_caught && !e.acknowledged,
      );
      const icon = getUnitMapIcon(
        unit.armed,
        unit.battery_pct,
        unit.last_seen,
        !!recentCaught,
      );

      const popupHTML = `
        <div style="font-family:monospace;font-size:12px;min-width:180px;">
          <strong>${unit.name || unit.id}</strong><br/>
          ${recentCaught ? '<span style="color:#ef4444;font-weight:bold;">🔴 CAUGHT — UNACKNOWLEDGED</span><br/>' : ""}
          🔋 ${unit.battery_pct ?? "?"}% &nbsp; ☀️ ${unit.solar_ok ? "OK" : "FAULT"}<br/>
          📡 Last seen: ${unit.last_seen ? new Date(unit.last_seen).toLocaleString("en-AU") : "never"}<br/>
          FW: ${unit.firmware_ver ?? "unknown"}<br/>
          GPS: ${unit.last_lat?.toFixed(5)}, ${unit.last_lng?.toFixed(5)}
        </div>
      `;

      if (markersRef.current.has(unit.id)) {
        const marker = markersRef.current.get(unit.id)!;
        marker.setLatLng(latLng).setIcon(icon).setPopupContent(popupHTML);
      } else {
        const marker = L.marker(latLng, { icon })
          .addTo(map)
          .bindPopup(popupHTML);
        marker.on("click", () => onUnitClick(unit.id));
        markersRef.current.set(unit.id, marker);
      }
    });

    // Auto-zoom to fit all units
    if (validPositions.length > 0) {
      const bounds = L.latLngBounds(validPositions);
      map.fitBounds(bounds, {
        padding: [50, 50], // 50px padding around edges
        maxZoom: 15, // Don't zoom in too far if units are close together
        animate: true,
      });
    }
  }, [units, events, onUnitClick]);

  // ── Pan to selected unit ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUnit || !mapRef.current) return;
    const marker = markersRef.current.get(selectedUnit);
    if (marker) {
      mapRef.current.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    }
  }, [selectedUnit]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-40">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="bg-(--tm-panel) hover:bg-(--tm-panel-soft) text-(--tm-text) p-2 rounded border border-(--tm-border) shadow-lg"
          title="Toggle legend"
        >
          📋
        </button>

        {showLegend && (
          <div className="absolute bottom-12 right-0 bg-(--tm-panel) border border-(--tm-border) rounded shadow-lg p-3 w-48 text-sm text-(--tm-text-secondary) space-y-2">
            <div className="font-bold text-(--tm-text) mb-2">Unit Status</div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-(--tm-danger) animate-pulse"></div>
              <span>Caught (unacknowledged)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-(--tm-accent)"></div>
              <span>Normal</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-(--tm-offline)"></div>
              <span>Offline (&gt;26h)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-(--tm-warning)"></div>
              <span>Low Battery (&lt;20%)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-(--tm-muted)"></div>
              <span>Disarmed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
