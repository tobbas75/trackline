"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/stores/map-store";
import { useProjectStore } from "@/stores/project-store";
import { useZoneStore } from "@/stores/zone-store";
import { useReferenceLayerStore } from "@/stores/reference-layer-store";
import { useFireScarStore } from "@/stores/fire-scar-store";
import { useHotspots } from "@/hooks/use-hotspots";
import { useSentinelImagery } from "@/hooks/use-sentinel-imagery";
import { ensurePmtilesProtocol } from "@/lib/pmtiles-protocol";
import { TIWI_IMAGE_COORDS } from "@/lib/tiwi-grid";
import { MapLayerPanel } from "./map-layer-panel";
import { MapStatusBar } from "./map-status-bar";
import { MapBufferToggle } from "./map-buffer-toggle";
import { getZonesForProject } from "@/lib/mock-data";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export default function FireMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { center, zoom, setCenter, setZoom, layers } = useMapStore();
  const sentinelDateRange = useMapStore((s) => s.sentinelDateRange);
  const sentinelProduct = useMapStore((s) => s.sentinelProduct);
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeZone, zones, setZones } = useZoneStore();
  const {
    data: hotspotsData,
    count: hotspotCount,
    lastUpdated: hotspotsUpdated,
  } = useHotspots();
  const fireScarsYear = useMapStore((s) => s.fireScarsYear);
  const fireScarsSource = useMapStore((s) => s.fireScarsSource);
  // useFireScars hook removed — fire scar rendering now uses PMTiles vector tiles
  // Check if a custom dataset is selected for the current year
  const customDataset = useFireScarStore((s) => {
    if (!fireScarsSource) return null;
    return s.datasets.find((d) => d.id === fireScarsSource) ?? null;
  });
  const sentinelVisible = layers.find((l) => l.id === "sentinel")?.visible ?? false;
  const sentinelCloudCover = useMapStore((s) => s.sentinelCloudCover);
  const setSentinelLoading = useMapStore((s) => s.setSentinelLoading);
  const {
    imageUrl: sentinelImageUrl,
    isLoading: sentinelLoading,
    error: sentinelError,
    progress: sentinelProgress,
  } = useSentinelImagery(sentinelProduct, sentinelDateRange, sentinelVisible, sentinelCloudCover);
  const referenceLayers = useReferenceLayerStore((s) => s.layers);
  const prevRefLayerIdsRef = useRef<Set<string>>(new Set());
  const [mouseCoords, setMouseCoords] = useState<[number, number] | null>(
    null
  );

  const fitToGeoJSON = useCallback(
    (geojson: GeoJSON.FeatureCollection) => {
      const m = map.current;
      if (!m) return;
      try {
        const bounds = new maplibregl.LngLatBounds();
        const addCoords = (coords: number[][]) => {
          coords.forEach((c) => bounds.extend(c as [number, number]));
        };

        geojson.features.forEach((f) => {
          const geom = f.geometry;
          if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach((poly) => poly.forEach(addCoords));
          } else if (geom.type === "Polygon") {
            geom.coordinates.forEach(addCoords);
          }
        });

        if (!bounds.isEmpty()) {
          m.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      } catch {
        // Ignore bounds errors
      }
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    ensurePmtilesProtocol();

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center: center,
      zoom: zoom,
      attributionControl: false,
    });

    const m = map.current;

    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );
    m.addControl(new maplibregl.ScaleControl(), "bottom-left");

    m.on("moveend", () => {
      const c = m.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(m.getZoom());
    });

    // Track mouse coords
    m.on("mousemove", (e) => {
      setMouseCoords([e.lngLat.lng, e.lngLat.lat]);
    });
    m.on("mouseout", () => {
      setMouseCoords(null);
    });

    m.on("load", () => {
      setMapReady(true);

      // --- Satellite imagery raster layer (hidden by default) ---
      m.addSource("satellite-imagery", {
        type: "raster",
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        attribution: "Esri World Imagery",
      });
      m.addLayer(
        {
          id: "satellite-layer",
          type: "raster",
          source: "satellite-imagery",
          layout: { visibility: "none" },
          paint: { "raster-opacity": 1 },
        },
        // Insert below all vector layers by putting it first
        undefined
      );

      // --- Sentinel-2 imagery (single cached image via CDSE Processing API) ---
      // 1x1 transparent PNG as placeholder until real imagery loads
      const TRANSPARENT_PNG =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==";
      m.addSource("sentinel-imagery", {
        type: "image",
        url: TRANSPARENT_PNG,
        coordinates: TIWI_IMAGE_COORDS,
      });
      m.addLayer({
        id: "sentinel-raster",
        type: "raster",
        source: "sentinel-imagery",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 1 },
      });

      // --- Project boundary ---
      m.addSource("project-boundary", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
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
          "line-width": 2.5,
          "line-dasharray": [3, 2],
        },
      });

      // --- Analysis zones ---
      m.addSource("analysis-zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "analysis-zones-fill",
        type: "fill",
        source: "analysis-zones",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.1,
        },
      });
      m.addLayer({
        id: "analysis-zones-line",
        type: "line",
        source: "analysis-zones",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
        },
      });
      m.addLayer({
        id: "analysis-zones-label",
        type: "symbol",
        source: "analysis-zones",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // --- Fire scars source/layers created dynamically by the year-switching useEffect ---

      // --- Hotspots (time-graduated colours) ---
      // Wide colour spread so each age band is instantly distinguishable
      const hotspotColorExpr: maplibregl.ExpressionSpecification = [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "hours_ago"], 48],
        0,
        "#ff0040",  // hot pink-red — just detected
        6,
        "#ff6600",  // bright orange — 6h
        12,
        "#ffcc00",  // vivid yellow — 12h
        24,
        "#00cc88",  // teal-green — 24h
        48,
        "#8088aa",  // muted blue-grey — 48h (oldest)
      ];

      m.addSource("hotspots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "hotspots-glow",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            8,
            10,
            14,
            15,
            20,
          ],
          "circle-color": hotspotColorExpr,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        },
      });
      m.addLayer({
        id: "hotspots-circle",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            3,
            10,
            6,
            15,
            10,
          ],
          "circle-color": hotspotColorExpr,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "hours_ago"], 48],
            0,
            0.95,
            48,
            0.5,
          ],
        },
      });

      // Hotspot click popup
      m.on("click", "hotspots-circle", (e) => {
        const feature = e.features?.[0];
        if (
          !feature ||
          !feature.geometry ||
          feature.geometry.type !== "Point"
        )
          return;
        const coords = feature.geometry.coordinates.slice() as [
          number,
          number,
        ];
        const props = feature.properties;
        const hoursAgo = props?.hours_ago != null ? Number(props.hours_ago) : null;
        const ageLabel =
          hoursAgo != null
            ? hoursAgo < 6
              ? `${hoursAgo.toFixed(1)}h ago (recent)`
              : hoursAgo < 12
                ? `${hoursAgo.toFixed(1)}h ago`
                : hoursAgo < 24
                  ? `${Math.round(hoursAgo)}h ago`
                  : `${Math.round(hoursAgo)}h ago (old)`
            : "—";

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(
            `<div class="text-sm">
              <p class="font-semibold">Fire Hotspot</p>
              <p>Satellite: ${props?.satellite ?? "Unknown"}</p>
              <p>Confidence: ${props?.confidence ?? "—"}</p>
              <p>FRP: ${props?.frp ?? "—"} MW</p>
              <p>Detected: ${ageLabel}</p>
              <p class="text-xs" style="color:#888">${props?.acquisition_time ?? ""}</p>
            </div>`
          )
          .addTo(m);
      });

      // Fire scar click popup
      m.on("click", "fire-scars-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties;
        const month = props?.month ? Number(props.month) : null;
        const monthName = month
          ? new Date(2000, month - 1).toLocaleString("default", {
              month: "long",
            })
          : "—";
        const seasonColor =
          props?.burn_season === "EDS"
            ? "#3b82f6"
            : props?.burn_season === "LDS"
              ? "#ef4444"
              : "#9ca3af";

        new maplibregl.Popup({ offset: 5 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-sm">
              <p class="font-semibold">Fire Scar</p>
              <p>Month: ${monthName}</p>
              <p>Season: <span style="color:${seasonColor};font-weight:600">${props?.burn_season ?? "—"}</span></p>
              <p>Area: ${props?.area_ha ? Number(props.area_ha).toLocaleString() + " ha" : "—"}</p>
            </div>`
          )
          .addTo(m);
      });


      // Zone click popup
      m.on("click", "analysis-zones-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties;
        new maplibregl.Popup({ offset: 5 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-sm">
              <p class="font-semibold">${props?.name ?? "Zone"}</p>
              ${props?.area_ha ? `<p>Area: ${Number(props.area_ha).toLocaleString()} ha</p>` : ""}
              ${props?.description ? `<p style="color:#888">${props.description}</p>` : ""}
            </div>`
          )
          .addTo(m);
      });

      m.on("mouseenter", "fire-scars-fill", () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "fire-scars-fill", () => {
        m.getCanvas().style.cursor = "";
      });
      m.on("mouseenter", "hotspots-circle", () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "hotspots-circle", () => {
        m.getCanvas().style.cursor = "";
      });
      m.on("mouseenter", "analysis-zones-fill", () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "analysis-zones-fill", () => {
        m.getCanvas().style.cursor = "";
      });

      // --- Burn plans ---
      m.addSource("burn-plans", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "burn-plans-fill",
        type: "fill",
        source: "burn-plans",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "draft",
            "#eab308",
            "approved",
            "#22c55e",
            "active",
            "#f97316",
            "completed",
            "#3b82f6",
            "#9ca3af",
          ],
          "fill-opacity": 0.25,
        },
      });
      m.addLayer({
        id: "burn-plans-line",
        type: "line",
        source: "burn-plans",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "draft",
            "#ca8a04",
            "approved",
            "#16a34a",
            "active",
            "#ea580c",
            "completed",
            "#2563eb",
            "#6b7280",
          ],
          "line-width": 2,
        },
      });

      // --- Burn plan ignition lines (flight lines / road burn routes) ---
      m.addSource("burn-plan-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "burn-plan-lines-line",
        type: "line",
        source: "burn-plan-lines",
        paint: {
          "line-color": [
            "match",
            ["get", "burn_type"],
            "aerial",
            "#0ea5e9", // sky blue for flight lines
            "road",
            "#a16207", // amber for road routes
            "#6b7280",
          ],
          "line-width": 2.5,
          "line-dasharray": [5, 3],
        },
      });

      // --- Cultural zones ---
      m.addSource("cultural-zones", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "cultural-zones-fill",
        type: "fill",
        source: "cultural-zones",
        paint: { "fill-color": "#a855f7", "fill-opacity": 0.15 },
      });
      m.addLayer({
        id: "cultural-zones-line",
        type: "line",
        source: "cultural-zones",
        paint: {
          "line-color": "#7c3aed",
          "line-width": 2,
          "line-dasharray": [4, 3],
        },
      });
    });

    return () => {
      m.remove();
      map.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update project boundary + load zones when active project changes or map becomes ready
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const source = m.getSource(
      "project-boundary"
    ) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (activeProject?.boundary) {
      const geojson =
        activeProject.boundary as unknown as GeoJSON.FeatureCollection;
      source.setData(geojson);
      fitToGeoJSON(geojson);

      // Load zones for this project
      const projectZones = getZonesForProject(activeProject.id);
      setZones(projectZones);
      updateZoneSource(m, projectZones);
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [activeProject, mapReady, fitToGeoJSON, setZones]);

  // Update zone layer when zones change
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    updateZoneSource(m, zones);
  }, [zones, mapReady]);

  // Zoom to zone when activeZone changes
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (activeZone?.boundary) {
      const geojson =
        activeZone.boundary as unknown as GeoJSON.FeatureCollection;
      fitToGeoJSON(geojson);

      // Highlight active zone
      m.setPaintProperty("analysis-zones-fill", "fill-opacity", [
        "case",
        ["==", ["get", "id"], activeZone.id],
        0.25,
        0.05,
      ]);
      m.setPaintProperty("analysis-zones-line", "line-width", [
        "case",
        ["==", ["get", "id"], activeZone.id],
        3.5,
        1.5,
      ]);
    } else if (activeProject?.boundary) {
      // Reset to full project
      const geojson =
        activeProject.boundary as unknown as GeoJSON.FeatureCollection;
      fitToGeoJSON(geojson);

      m.setPaintProperty("analysis-zones-fill", "fill-opacity", 0.1);
      m.setPaintProperty("analysis-zones-line", "line-width", 2);
    }
  }, [activeZone, activeProject, mapReady, fitToGeoJSON]);

  // Update hotspots when data changes
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !hotspotsData) return;

    const source = m.getSource(
      "hotspots"
    ) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(hotspotsData);
  }, [hotspotsData, mapReady]);

  // Update fire scars when year or custom source changes
  // Uses PMTiles vector source for NAFI data, GeoJSON fallback for custom uploads
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Remove existing fire scar layers + source
    for (const id of ["fire-scars-fill", "fire-scars-line"]) {
      if (m.getLayer(id)) m.removeLayer(id);
    }
    if (m.getSource("fire-scars")) m.removeSource("fire-scars");

    if (customDataset?.featureCollection) {
      // Custom upload — GeoJSON source fallback (can't pre-tile user data)
      m.addSource("fire-scars", {
        type: "geojson",
        data: customDataset.featureCollection,
      });
      addFireScarLayers(m);
    } else {
      // NAFI baseline — PMTiles vector source
      m.addSource("fire-scars", {
        type: "vector",
        url: `pmtiles://${window.location.origin}/data/fire-scars/${fireScarsYear}.pmtiles`,
      });
      addFireScarLayers(m, "fire_scars");
    }

    // Re-apply visibility from store
    const visible = layers.find((l) => l.id === "firescars")?.visible ?? true;
    const vis = visible ? "visible" : "none";
    for (const id of ["fire-scars-fill", "fire-scars-line"]) {
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", vis);
    }
  }, [fireScarsYear, customDataset, mapReady, layers]);

  // Sync sentinel loading state to store so layer panel can read it
  useEffect(() => {
    setSentinelLoading(sentinelLoading);
  }, [sentinelLoading, setSentinelLoading]);

  // Update Sentinel-2 image source when cached imagery changes
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const source = m.getSource("sentinel-imagery") as maplibregl.ImageSource | undefined;
    if (!source) return;

    if (sentinelImageUrl) {
      source.updateImage({
        url: sentinelImageUrl,
        coordinates: TIWI_IMAGE_COORDS,
      });
    }
  }, [sentinelImageUrl, mapReady]);

  // Sync sentinel opacity to MapLibre
  const sentinelOpacity = useMapStore((s) => s.sentinelOpacity);
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    try {
      if (m.getLayer("sentinel-raster")) {
        m.setPaintProperty("sentinel-raster", "raster-opacity", sentinelOpacity);
      }
    } catch {
      // Layer may not exist yet
    }
  }, [sentinelOpacity, mapReady]);

  // Sync reference layers from store to MapLibre
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const currentIds = new Set<string>();

    for (const refLayer of referenceLayers) {
      const sourceId = `ref-${refLayer.id}`;
      currentIds.add(refLayer.id);

      const geojson = refLayer.geojson_data as unknown as GeoJSON.FeatureCollection;
      const color = refLayer.color ?? "#6b7280";
      const geoType = refLayer.geometry_type;

      if (m.getSource(sourceId)) {
        // Update existing source data
        (m.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        // Add new source + layers
        m.addSource(sourceId, { type: "geojson", data: geojson });

        if (geoType === "Polygon" || geoType === "MultiPolygon" || geoType === "Mixed") {
          m.addLayer({
            id: `ref-${refLayer.id}-fill`,
            type: "fill",
            source: sourceId,
            filter: ["in", "$type", "Polygon"],
            paint: { "fill-color": color, "fill-opacity": 0.15 },
          });
          m.addLayer({
            id: `ref-${refLayer.id}-line`,
            type: "line",
            source: sourceId,
            filter: ["in", "$type", "Polygon"],
            paint: { "line-color": color, "line-width": 1.5 },
          });
        }
        if (geoType === "LineString" || geoType === "MultiLineString" || geoType === "Mixed") {
          m.addLayer({
            id: `ref-${refLayer.id}-stroke`,
            type: "line",
            source: sourceId,
            filter: ["==", "$type", "LineString"],
            paint: { "line-color": color, "line-width": 2 },
          });
        }
        if (geoType === "Point" || geoType === "MultiPoint" || geoType === "Mixed") {
          m.addLayer({
            id: `ref-${refLayer.id}-circle`,
            type: "circle",
            source: sourceId,
            filter: ["==", "$type", "Point"],
            paint: {
              "circle-radius": 5,
              "circle-color": color,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1,
            },
          });
        }
      }

      // Sync visibility
      const visibility = refLayer.visible ? "visible" : "none";
      const suffixes = ["-fill", "-line", "-stroke", "-circle"];
      for (const suffix of suffixes) {
        const layerId = `ref-${refLayer.id}${suffix}`;
        if (m.getLayer(layerId)) {
          m.setLayoutProperty(layerId, "visibility", visibility);
        }
      }
    }

    // Remove layers that were deleted from the store
    for (const prevId of prevRefLayerIdsRef.current) {
      if (!currentIds.has(prevId)) {
        const suffixes = ["-fill", "-line", "-stroke", "-circle"];
        for (const suffix of suffixes) {
          const layerId = `ref-${prevId}${suffix}`;
          if (m.getLayer(layerId)) {
            m.removeLayer(layerId);
          }
        }
        if (m.getSource(`ref-${prevId}`)) {
          m.removeSource(`ref-${prevId}`);
        }
      }
    }

    prevRefLayerIdsRef.current = currentIds;
  }, [referenceLayers, mapReady]);

  // Sync layer visibility from the store to MapLibre layers
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Map store layer IDs to MapLibre layer IDs
    const layerMapping: Record<string, string[]> = {
      satellite: ["satellite-layer"],
      sentinel: ["sentinel-raster"],
      boundary: ["project-boundary-fill", "project-boundary-line"],
      firescars: [
        "fire-scars-fill",
        "fire-scars-line",
      ],
      hotspots: ["hotspots-glow", "hotspots-circle"],
      burnplans: ["burn-plans-fill", "burn-plans-line", "burn-plan-lines-line"],
      cultural: ["cultural-zones-fill", "cultural-zones-line"],
      analysis: [
        "analysis-zones-fill",
        "analysis-zones-line",
        "analysis-zones-label",
      ],
    };

    for (const layer of layers) {
      const mapLayerIds = layerMapping[layer.id];
      if (!mapLayerIds) continue;

      const visibility = layer.visible ? "visible" : "none";
      for (const mlId of mapLayerIds) {
        try {
          if (m.getLayer(mlId)) {
            m.setLayoutProperty(mlId, "visibility", visibility);
          }
        } catch {
          // Layer may not exist yet
        }
      }
    }

    // Handle reference layers master toggle
    const refMasterLayer = layers.find((l) => l.id === "reference");
    if (refMasterLayer && !refMasterLayer.visible) {
      // Hide all reference layers when master toggle is off
      for (const refId of prevRefLayerIdsRef.current) {
        const suffixes = ["-fill", "-line", "-stroke", "-circle"];
        for (const suffix of suffixes) {
          const layerId = `ref-${refId}${suffix}`;
          try {
            if (m.getLayer(layerId)) {
              m.setLayoutProperty(layerId, "visibility", "none");
            }
          } catch {
            // Layer may not exist
          }
        }
      }
    }

    // Handle basemap visibility — hide when satellite is on OR basemap is toggled off
    const satLayer = layers.find((l) => l.id === "satellite");
    const baseLayer = layers.find((l) => l.id === "basemap");
    const hideBasemap = satLayer?.visible || !baseLayer?.visible;

    const style = m.getStyle();
    if (style?.layers) {
      for (const styleLayer of style.layers) {
        // Skip our custom layers
        if (
          styleLayer.id.startsWith("project-") ||
          styleLayer.id.startsWith("analysis-") ||
          styleLayer.id.startsWith("fire-") ||
          styleLayer.id.startsWith("hotspots") ||
          styleLayer.id.startsWith("burn-") ||
          styleLayer.id.startsWith("cultural-") ||
          styleLayer.id.startsWith("ref-") ||
          styleLayer.id.startsWith("sentinel-") ||
          styleLayer.id === "satellite-layer"
        ) {
          continue;
        }
        try {
          m.setLayoutProperty(
            styleLayer.id,
            "visibility",
            hideBasemap ? "none" : "visible"
          );
        } catch {
          // Some layers may not support visibility toggle
        }
      }
    }
  }, [layers, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      {sentinelVisible && sentinelLoading && (
        <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
          {sentinelProgress ?? "Loading Sentinel-2 imagery..."}
        </div>
      )}
      {sentinelVisible && sentinelError && (
        <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded bg-destructive/90 px-3 py-1.5 text-xs text-destructive-foreground shadow">
          Sentinel error: {sentinelError}
        </div>
      )}
      <MapLayerPanel />
      <MapBufferToggle />
      <MapStatusBar
        hotspotCount={hotspotCount}
        hotspotsUpdated={hotspotsUpdated}
        mouseCoords={mouseCoords}
        activeZone={activeZone?.name ?? null}
      />
    </div>
  );
}

// ─── Sentinel-2 helpers removed ──────────────────────────────────
// All sentinel imagery is now served via CDSE Processing API
// through /api/sentinel/imagery with on-demand caching.
// See: src/lib/sentinel-evalscripts.ts, src/lib/tiwi-grid.ts,
//      src/lib/cdse-process.ts, src/lib/sentinel-compositor.ts

/** Build a single FeatureCollection from all analysis zones for MapLibre. */
function updateZoneSource(
  m: maplibregl.Map,
  zones: {
    id: string;
    name: string;
    boundary: unknown;
    area_ha: number | null;
    color: string | null;
    description: string | null;
  }[]
) {
  const source = m.getSource(
    "analysis-zones"
  ) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;

  const features: GeoJSON.Feature[] = [];

  for (const zone of zones) {
    const fc = zone.boundary as unknown as GeoJSON.FeatureCollection;
    if (!fc?.features) continue;

    for (const feature of fc.features) {
      features.push({
        ...feature,
        properties: {
          ...feature.properties,
          id: zone.id,
          name: zone.name,
          color: zone.color ?? "#3b82f6",
          area_ha: zone.area_ha,
          description: zone.description,
        },
      });
    }
  }

  source.setData({ type: "FeatureCollection", features });
}

/** Add fire scar fill + line layers to the "fire-scars" source. */
function addFireScarLayers(m: maplibregl.Map, sourceLayer?: string) {
  const sl = sourceLayer ? { "source-layer": sourceLayer } : {};
  m.addLayer({
    id: "fire-scars-fill",
    type: "fill",
    source: "fire-scars",
    ...sl,
    paint: {
      "fill-color": [
        "match",
        ["get", "burn_season"],
        "EDS",
        "#3b82f6",
        "LDS",
        "#ef4444",
        "#9ca3af",
      ],
      "fill-opacity": 0.4,
    },
  });
  m.addLayer({
    id: "fire-scars-line",
    type: "line",
    source: "fire-scars",
    ...sl,
    paint: {
      "line-color": [
        "match",
        ["get", "burn_season"],
        "EDS",
        "#2563eb",
        "LDS",
        "#dc2626",
        "#6b7280",
      ],
      "line-width": 1,
    },
  });
}
