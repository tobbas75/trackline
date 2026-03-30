"use client";

import { useEffect, useRef, useState } from "react";

export interface FireScarsSummary {
  years: Record<
    string,
    {
      feature_count: number;
      eds_ha: number;
      lds_ha: number;
      wet_ha: number;
      total_ha: number;
    }
  >;
  available_years: number[];
}

interface FireScarsState {
  data: GeoJSON.FeatureCollection | null;
  isLoading: boolean;
  error: string | null;
}

// Shared across all hook instances so summary is fetched once
let sharedSummary: FireScarsSummary | null = null;
let summaryPromise: Promise<FireScarsSummary> | null = null;

// Shared cache so all instances benefit from previously loaded years
const yearCache = new Map<number, GeoJSON.FeatureCollection>();

function fetchSummary(): Promise<FireScarsSummary> {
  if (sharedSummary) return Promise.resolve(sharedSummary);
  if (summaryPromise) return summaryPromise;

  summaryPromise = fetch("/api/fire-scars?summary=true")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: FireScarsSummary) => {
      sharedSummary = data;
      return data;
    })
    .catch((err) => {
      summaryPromise = null; // Allow retry on failure
      throw err;
    });

  return summaryPromise;
}

/**
 * Loads fire scar GeoJSON for a given year from the API.
 * Uses shared caching across all instances.
 */
export function useFireScars(year: number) {
  const [state, setState] = useState<FireScarsState>({
    data: yearCache.get(year) ?? null,
    isLoading: !yearCache.has(year),
    error: null,
  });

  const [summary, setSummary] = useState<FireScarsSummary | null>(sharedSummary);
  const abortRef = useRef<AbortController | null>(null);

  // Load summary once (shared)
  useEffect(() => {
    if (sharedSummary) {
      setSummary(sharedSummary);
      return;
    }

    fetchSummary()
      .then((data) => setSummary(data))
      .catch(() => {/* not fatal */});
  }, []);

  // Load year data with proper cancellation
  useEffect(() => {
    // Check cache first
    const cached = yearCache.get(year);
    if (cached) {
      setState({ data: cached, isLoading: false, error: null });
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetch(`/api/fire-scars?year=${year}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
            setState({ data: empty, isLoading: false, error: null });
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((geojson: GeoJSON.FeatureCollection | undefined) => {
        if (!geojson) return;
        yearCache.set(year, geojson);
        setState({ data: geojson, isLoading: false, error: null });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load fire scars",
        }));
      });

    return () => {
      controller.abort();
    };
  }, [year]);

  const yearSummary = summary?.years[String(year)] ?? null;

  return {
    ...state,
    summary,
    yearSummary,
    availableYears: Array.isArray(summary?.available_years) ? summary.available_years : [],
  };
}
