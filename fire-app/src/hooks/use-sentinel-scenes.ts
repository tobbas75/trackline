"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useMapStore } from "@/stores/map-store";
import { getBufferedBBoxString } from "@/lib/geo-utils";

export interface SentinelScene {
  sceneId: string;
  date: string;
  cloudCover: number | null;
  satellite: string;
  bbox: number[];
  thumbnailUrl: string | null;
}

interface SentinelScenesState {
  scenes: SentinelScene[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface UseSentinelScenesOptions {
  dateStart: string;
  dateEnd: string;
  maxCloudCover?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetches available Sentinel-2 scenes via the CDSE STAC search proxy.
 * Computes bbox from the active project boundary + configured buffer.
 */
export function useSentinelScenes(options: UseSentinelScenesOptions) {
  const {
    dateStart,
    dateEnd,
    maxCloudCover = 30,
    limit = 20,
    enabled = true,
  } = options;

  const [state, setState] = useState<SentinelScenesState>({
    scenes: [],
    total: 0,
    isLoading: false,
    error: null,
  });

  const activeProject = useProjectStore((s) => s.activeProject);
  const dataBufferKm = useMapStore((s) => s.dataBufferKm);

  // Compute bbox from project boundary + buffer
  const bbox = useMemo(() => {
    if (!activeProject?.boundary) return undefined;
    const geojson = activeProject.boundary as unknown as GeoJSON.GeoJSON;
    if (dataBufferKm <= 0) return undefined;
    return getBufferedBBoxString(geojson, dataBufferKm) ?? undefined;
  }, [activeProject, dataBufferKm]);

  const fetchScenes = useCallback(async () => {
    if (!bbox || !enabled) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({
        bbox,
        dateStart,
        dateEnd,
        maxCloud: String(maxCloudCover),
        limit: String(limit),
      });

      const response = await fetch(`/api/sentinel/scenes?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as {
        scenes: SentinelScene[];
        total: number;
      };

      setState({
        scenes: data.scenes,
        total: data.total,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch scenes",
      }));
    }
  }, [bbox, dateStart, dateEnd, maxCloudCover, limit, enabled]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  return { ...state, refresh: fetchScenes };
}
