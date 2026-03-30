"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useMapStore } from "@/stores/map-store";
import { getBufferedBBoxString } from "@/lib/geo-utils";

interface HotspotsState {
  data: GeoJSON.FeatureCollection | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  count: number;
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_HOURS = 48;

/**
 * Fetches DEA hotspots via our API proxy.
 * Automatically computes a bounding box from the active project boundary
 * + the configured buffer distance (default 50km).
 * Auto-refreshes every 10 minutes.
 */
export function useHotspots() {
  const [state, setState] = useState<HotspotsState>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    count: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeProject = useProjectStore((s) => s.activeProject);
  const dataBufferKm = useMapStore((s) => s.dataBufferKm);

  // Compute bbox from project boundary + buffer
  const bbox = useMemo(() => {
    if (!activeProject?.boundary) return undefined;
    const geojson = activeProject.boundary as unknown as GeoJSON.GeoJSON;
    if (dataBufferKm <= 0) return undefined; // 0 = no bbox filter (full area)
    return getBufferedBBoxString(geojson, dataBufferKm) ?? undefined;
  }, [activeProject, dataBufferKm]);

  const fetchHotspots = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (bbox) params.set("bbox", bbox);
      params.set("hours", String(DEFAULT_HOURS));

      const response = await fetch(`/api/hotspots?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const geojson = (await response.json()) as GeoJSON.FeatureCollection;

      setState({
        data: geojson,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        count: geojson.features.length,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch hotspots",
      }));
    }
  }, [bbox]);

  useEffect(() => {
    fetchHotspots();
    intervalRef.current = setInterval(fetchHotspots, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHotspots]);

  return { ...state, refresh: fetchHotspots };
}
