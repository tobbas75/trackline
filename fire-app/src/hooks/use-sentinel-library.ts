"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSentinelEventsStore } from "@/stores/sentinel-events-store";

export interface SavedMap {
  id: string;
  product: string;
  dateStart: string;
  dateEnd: string;
  baselineStart: string | null;
  baselineEnd: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

interface SentinelLibraryState {
  maps: SavedMap[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the list of cached Sentinel imagery from the library API.
 * Returns the list of saved maps and a refresh function.
 */
export function useSentinelLibrary() {
  const [state, setState] = useState<SentinelLibraryState>({
    maps: [],
    isLoading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchLibrary = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch("/api/sentinel/imagery/library?limit=30");
      if (!res.ok) {
        throw new Error(`Library fetch failed: ${res.status}`);
      }
      const json = await res.json();
      if (mountedRef.current) {
        setState({ maps: json.maps ?? [], isLoading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load library",
        }));
      }
    }
  }, []);

  const lastImageLoadTimestamp = useSentinelEventsStore((s) => s.lastImageLoadTimestamp);

  useEffect(() => {
    mountedRef.current = true;
    fetchLibrary();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchLibrary]);

  // Auto-refresh when new imagery is loaded (small delay for Supabase Storage to persist)
  useEffect(() => {
    if (!lastImageLoadTimestamp) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) fetchLibrary();
    }, 2000);
    return () => clearTimeout(timer);
  }, [lastImageLoadTimestamp, fetchLibrary]);

  return {
    maps: state.maps,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchLibrary,
  };
}
