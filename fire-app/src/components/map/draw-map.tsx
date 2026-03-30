"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawFreehandMode,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pentagon, RectangleHorizontal, Pencil, MousePointer2, Trash2, Route } from "lucide-react";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type DrawMode = "polygon" | "rectangle" | "freehand" | "linestring" | "select";

interface DrawMapProps {
  /** Initial GeoJSON features to display (for editing existing plans) */
  initialFeatures?: GeoJSON.Feature[];
  /** Called whenever polygon/area features change */
  onFeaturesChange?: (features: GeoJSON.Feature[]) => void;
  /** Called whenever line features change (for ignition lines) */
  onLineFeaturesChange?: (features: GeoJSON.Feature[]) => void;
  /** Enable LineString drawing mode for flight lines / road burn routes */
  enableLineDrawing?: boolean;
  /** Initial center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Project boundary GeoJSON to show as context */
  projectBoundary?: GeoJSON.FeatureCollection;
  /** Height CSS class */
  className?: string;
}

export function DrawMap({
  initialFeatures,
  onFeaturesChange,
  onLineFeaturesChange,
  enableLineDrawing = false,
  center = [130.5, -11.6],
  zoom = 9,
  projectBoundary,
  className = "h-96",
}: DrawMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>("polygon");
  const [featureCount, setFeatureCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);

  // Get polygon/area features (excluding internal helpers and lines)
  const getPolygonFeatures = useCallback((): GeoJSON.Feature[] => {
    if (!drawRef.current) return [];
    return (drawRef.current.getSnapshot() as GeoJSON.Feature[]).filter(
      (f) =>
        !f.properties?.midPoint &&
        !f.properties?.selectionPoint &&
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
    );
  }, []);

  // Get line features only
  const getLineFeatures = useCallback((): GeoJSON.Feature[] => {
    if (!drawRef.current) return [];
    return (drawRef.current.getSnapshot() as GeoJSON.Feature[]).filter(
      (f) =>
        !f.properties?.midPoint &&
        !f.properties?.selectionPoint &&
        f.geometry.type === "LineString"
    );
  }, []);

  // Switch drawing mode
  const switchMode = useCallback(
    (mode: DrawMode) => {
      if (!drawRef.current) return;
      drawRef.current.setMode(mode);
      setActiveMode(mode);
    },
    []
  );

  // Clear all drawn features
  const clearAll = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.clear();
    setFeatureCount(0);
    setLineCount(0);
    onFeaturesChange?.([]);
    onLineFeaturesChange?.([]);
  }, [onFeaturesChange, onLineFeaturesChange]);

  // Initialize map + TerraDraw
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
      // Add project boundary for context
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
    });

    m.on("style.load", () => {
      const selectFlags: Record<string, unknown> = {
        polygon: {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        },
        rectangle: {
          feature: {
            draggable: true,
            coordinates: {
              draggable: true,
              resizable: "opposite",
            },
          },
        },
        freehand: {
          feature: {
            draggable: true,
          },
        },
      };

      if (enableLineDrawing) {
        selectFlags.linestring = {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        };
      }

      const modes = [
        new TerraDrawPolygonMode(),
        new TerraDrawRectangleMode(),
        new TerraDrawFreehandMode(),
        ...(enableLineDrawing ? [new TerraDrawLineStringMode()] : []),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new TerraDrawSelectMode({ flags: selectFlags as any }),
      ];

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
        modes,
      });

      draw.start();
      draw.setMode("polygon");
      drawRef.current = draw;

      // Add initial features if provided
      if (initialFeatures?.length) {
        const polygonInitial = initialFeatures.filter(
          (f) =>
            f.geometry.type === "Polygon" ||
            f.geometry.type === "MultiPolygon"
        );
        const lineInitial = initialFeatures.filter(
          (f) => f.geometry.type === "LineString"
        );
        const allFeatures = [...polygonInitial, ...lineInitial];
        if (allFeatures.length) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            draw.addFeatures(allFeatures as any);
          } catch {
            // Ignore if features can't be added
          }
          setFeatureCount(polygonInitial.length);
          setLineCount(lineInitial.length);
        }
      }

      // Listen for changes — emit polygons and lines separately
      draw.on("change", () => {
        const polygons = getPolygonFeatures();
        const lines = getLineFeatures();
        setFeatureCount(polygons.length);
        setLineCount(lines.length);
        onFeaturesChange?.(polygons);
        onLineFeaturesChange?.(lines);
      });
    });

    return () => {
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeButtons: { mode: DrawMode; label: string; icon: React.ReactNode; lineOnly?: boolean }[] = [
    { mode: "polygon", label: "Polygon", icon: <Pentagon className="h-4 w-4" /> },
    {
      mode: "rectangle",
      label: "Rectangle",
      icon: <RectangleHorizontal className="h-4 w-4" />,
    },
    { mode: "freehand", label: "Freehand", icon: <Pencil className="h-4 w-4" /> },
    {
      mode: "linestring",
      label: "Line",
      icon: <Route className="h-4 w-4" />,
      lineOnly: true,
    },
    {
      mode: "select",
      label: "Select",
      icon: <MousePointer2 className="h-4 w-4" />,
    },
  ];

  const visibleModes = modeButtons.filter((m) => !m.lineOnly || enableLineDrawing);

  return (
    <div className="space-y-2">
      {/* Drawing toolbar */}
      <div className="flex items-center gap-2">
        {visibleModes.map(({ mode, label, icon }) => (
          <Button
            key={mode}
            variant={activeMode === mode ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode(mode)}
            title={label}
          >
            {icon}
            <span className="ml-1.5 text-xs">{label}</span>
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="secondary" className="text-xs">
          {featureCount} polygon{featureCount !== 1 ? "s" : ""}
        </Badge>
        {enableLineDrawing && (
          <Badge variant="secondary" className="text-xs">
            {lineCount} line{lineCount !== 1 ? "s" : ""}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={featureCount === 0 && lineCount === 0}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Map */}
      <div className={`rounded-lg border ${className}`}>
        <div ref={mapContainer} className="h-full w-full rounded-lg" />
      </div>

      <p className="text-xs text-muted-foreground">
        Click to place points. Double-click or press Enter to finish a shape.
        Use Select mode to edit vertices.
        {enableLineDrawing && " Use the Line tool to draw flight lines or road burn routes."}
      </p>
    </div>
  );
}
