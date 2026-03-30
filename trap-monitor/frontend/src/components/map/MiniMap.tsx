"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getUnitMapIcon } from "./map-icons";
import { Unit, TrapEvent } from "@/lib/types";

// Fix Leaflet default icon path in Next.js
const DefaultIcon = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown };
delete DefaultIcon._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MiniMapProps {
  unit: Unit;
  events: TrapEvent[];
}

export default function MiniMap({ unit, events }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!unit.last_lat || !unit.last_lng) return;

    mapRef.current = L.map(containerRef.current, {
      center: [unit.last_lat, unit.last_lng],
      zoom: 15,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Style overrides
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-container { background: #1a1a2e; }
    `;
    document.head.appendChild(style);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [unit.last_lat, unit.last_lng]);

  // ── Update marker ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !unit.last_lat || !unit.last_lng) return;

    const recentCaught = events.find(
      (e) => e.unit_id === unit.id && e.trap_caught && !e.acknowledged,
    );
    const icon = getUnitMapIcon(
      unit.armed,
      unit.battery_pct,
      unit.last_seen,
      !!recentCaught,
    );

    const latLng: L.LatLngTuple = [unit.last_lat, unit.last_lng];

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng).setIcon(icon);
    } else {
      const marker = L.marker(latLng, { icon }).addTo(mapRef.current);
      markerRef.current = marker;
    }

    // Pan to marker
    mapRef.current.panTo(latLng, { animate: false });
  }, [unit, events]);

  if (!unit.last_lat || !unit.last_lng) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-(--tm-panel) border border-(--tm-border) rounded text-(--tm-muted)">
        No GPS data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded border border-(--tm-border)"
    />
  );
}
