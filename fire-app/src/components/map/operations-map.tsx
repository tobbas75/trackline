"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Circle,
  Square,
  MapPin,
  Trash2,
  Play,
  Pause,
  Save,
  Crosshair,
} from "lucide-react";
import type { GpsPoint } from "@/hooks/use-gps-tracker";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface IncendiaryDrop {
  id: string;
  location: [number, number]; // [lng, lat]
  type: "dai_sphere" | "drip_torch" | "hand_lit";
  quantity: number;
  timestamp: string;
  notes: string;
}

interface OperationsMapProps {
  /** Project boundary for context */
  projectBoundary?: GeoJSON.FeatureCollection;
  /** Initial center */
  center?: [number, number];
  /** Initial zoom */
  zoom?: number;
  /** Live GPS track points */
  gpsTrack?: GpsPoint[];
  /** Current GPS position */
  currentPosition?: GpsPoint | null;
  /** Whether GPS tracking is active */
  isTracking?: boolean;
  /** Incendiary drops */
  drops?: IncendiaryDrop[];
  /** Called when map is clicked to add a drop */
  onMapClick?: (lngLat: [number, number]) => void;
  /** Whether drop mode is active (clicking adds drops) */
  dropMode?: boolean;
  /** Burn plan polygons to show as context */
  burnPlans?: GeoJSON.FeatureCollection;
  /** Height class */
  className?: string;
}

export function OperationsMap({
  projectBoundary,
  center = [130.5, -11.6],
  zoom = 10,
  gpsTrack = [],
  currentPosition,
  isTracking = false,
  drops = [],
  onMapClick,
  dropMode = false,
  burnPlans,
  className = "h-[500px]",
}: OperationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center,
      zoom,
      attributionControl: false,
    });
    mapRef.current = m;
    m.addControl(new maplibregl.NavigationControl(), "top-right");

    m.on("load", () => {
      // Project boundary
      m.addSource("project-boundary", {
        type: "geojson",
        data: projectBoundary ?? { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "project-boundary-fill",
        type: "fill",
        source: "project-boundary",
        paint: { "fill-color": "#f97316", "fill-opacity": 0.05 },
      });
      m.addLayer({
        id: "project-boundary-line",
        type: "line",
        source: "project-boundary",
        paint: {
          "line-color": "#f97316",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });

      // Burn plan polygons
      m.addSource("burn-plans", {
        type: "geojson",
        data: burnPlans ?? { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "burn-plans-fill",
        type: "fill",
        source: "burn-plans",
        paint: { "fill-color": "#8b5cf6", "fill-opacity": 0.1 },
      });
      m.addLayer({
        id: "burn-plans-line",
        type: "line",
        source: "burn-plans",
        paint: {
          "line-color": "#8b5cf6",
          "line-width": 2,
          "line-dasharray": [4, 2],
        },
      });

      // GPS track line
      m.addSource("gps-track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "gps-track-line",
        type: "line",
        source: "gps-track",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      });

      // GPS current position
      m.addSource("gps-position", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "gps-position-glow",
        type: "circle",
        source: "gps-position",
        paint: {
          "circle-radius": 16,
          "circle-color": "#3b82f6",
          "circle-opacity": 0.2,
        },
      });
      m.addLayer({
        id: "gps-position-dot",
        type: "circle",
        source: "gps-position",
        paint: {
          "circle-radius": 7,
          "circle-color": "#3b82f6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Incendiary drops
      m.addSource("drops", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "drops-glow",
        type: "circle",
        source: "drops",
        paint: {
          "circle-radius": 12,
          "circle-color": "#ef4444",
          "circle-opacity": 0.3,
        },
      });
      m.addLayer({
        id: "drops-circle",
        type: "circle",
        source: "drops",
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match",
            ["get", "type"],
            "dai_sphere",
            "#ef4444",
            "drip_torch",
            "#f97316",
            "hand_lit",
            "#eab308",
            "#ef4444",
          ] as maplibregl.ExpressionSpecification,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      setMapReady(true);
    });

    m.on("mousemove", (e) => {
      setMouseCoords([e.lngLat.lng, e.lngLat.lat]);
    });

    m.on("click", (e) => {
      if (dropMode && onMapClick) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Drop popup on click
    m.on("click", "drops-circle", (e) => {
      if (dropMode) return;
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const props = feature.properties;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="text-xs">
            <p class="font-bold">${props?.type ?? "Drop"}</p>
            <p>Qty: ${props?.quantity ?? "?"}</p>
            <p>${props?.timestamp ? new Date(props.timestamp).toLocaleTimeString() : ""}</p>
            ${props?.notes ? `<p>${props.notes}</p>` : ""}
          </div>`
        )
        .addTo(m);
    });

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GPS track
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const source = mapRef.current.getSource("gps-track") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (gpsTrack.length >= 2) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: gpsTrack.map((p) => [p.lng, p.lat]),
        },
      });
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [gpsTrack, mapReady]);

  // Update current GPS position
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const source = mapRef.current.getSource("gps-position") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (currentPosition) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [currentPosition.lng, currentPosition.lat],
        },
      });
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [currentPosition, mapReady]);

  // Update drops
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const source = mapRef.current.getSource("drops") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: drops.map((d) => ({
        type: "Feature" as const,
        properties: {
          id: d.id,
          type: d.type,
          quantity: d.quantity,
          timestamp: d.timestamp,
          notes: d.notes,
        },
        geometry: {
          type: "Point" as const,
          coordinates: d.location,
        },
      })),
    });
  }, [drops, mapReady]);

  // Change cursor in drop mode
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.getCanvas().style.cursor = dropMode ? "crosshair" : "";
  }, [dropMode, mapReady]);

  return (
    <div className="relative">
      <div className={`rounded-lg border ${className}`}>
        <div ref={mapContainer} className="h-full w-full rounded-lg" />
      </div>

      {/* Status indicators */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        {isTracking && (
          <Badge className="flex items-center gap-1.5 bg-blue-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            GPS Recording
          </Badge>
        )}
        {dropMode && (
          <Badge className="flex items-center gap-1.5 bg-red-600">
            <Crosshair className="h-3 w-3" />
            Click to Drop
          </Badge>
        )}
        {drops.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {drops.length} drop{drops.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {mouseCoords && (
          <Badge variant="outline" className="bg-background/90 font-mono text-xs">
            {mouseCoords[1].toFixed(5)}, {mouseCoords[0].toFixed(5)}
          </Badge>
        )}
      </div>
    </div>
  );
}
