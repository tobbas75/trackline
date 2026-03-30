"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSentinelEventsStore } from "@/stores/sentinel-events-store";

const POLL_INTERVAL_MS = 3000;

interface SentinelImageryState {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  /** Progress message from server during dMIBR background processing */
  progress: string | null;
}

interface JobStatusResponse {
  jobId: string;
  status: "processing" | "complete" | "error" | "not_found";
  progress: string;
  step: number;
  totalSteps: number;
  error?: string;
}

/**
 * Fetches pre-processed Sentinel-2 imagery from the server cache.
 * Caches blob URLs in memory so switching between previously viewed
 * product+date combos is instant.
 *
 * For dMIBR products: the server returns 202 and processes in the
 * background. This hook polls /api/sentinel/imagery/status for
 * progress, then fetches the cached image once complete.
 */
/** Custom event dispatched when new imagery is loaded (for library auto-refresh) */
export const SENTINEL_IMAGE_LOADED_EVENT = "sentinel-image-loaded";

export function useSentinelImagery(
  product: string,
  dateRange: [string, string],
  enabled: boolean,
  maxCloudCover?: number
) {
  const triggerImageLoaded = useSentinelEventsStore((s) => s.triggerImageLoaded);

  const [state, setState] = useState<SentinelImageryState>({
    imageUrl: null,
    isLoading: false,
    error: null,
    progress: null,
  });

  // In-memory cache: "product|dateStart|dateEnd" → blob URL
  const cacheRef = useRef<Map<string, string>>(new Map());
  // Track the current request to avoid stale updates
  const abortRef = useRef<AbortController | null>(null);
  // Track polling interval so we can clear it
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /** Fetch the final image from cache (after job completes or for non-dMIBR) */
  const fetchCachedImage = useCallback(
    async (
      params: URLSearchParams,
      cacheKey: string,
      controller: AbortController
    ) => {
      const res = await fetch(`/api/sentinel/imagery?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(cacheKey, url);

      if (!controller.signal.aborted) {
        setState({ imageUrl: url, isLoading: false, error: null, progress: null });
        triggerImageLoaded();
      }
    },
    [triggerImageLoaded]
  );

  /** Poll job status until complete or error */
  const pollJobStatus = useCallback(
    (jobId: string, params: URLSearchParams, cacheKey: string, controller: AbortController) => {
      clearPolling();

      pollRef.current = setInterval(async () => {
        if (controller.signal.aborted) {
          clearPolling();
          return;
        }

        try {
          const statusRes = await fetch(
            `/api/sentinel/imagery/status?jobId=${encodeURIComponent(jobId)}`,
            { signal: controller.signal }
          );

          if (!statusRes.ok && statusRes.status !== 500) {
            // Unexpected error — stop polling
            clearPolling();
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: `Status check failed: HTTP ${statusRes.status}`,
              progress: null,
            }));
            return;
          }

          const data: JobStatusResponse = await statusRes.json();

          if (data.status === "complete") {
            clearPolling();
            // Image is now cached — fetch it
            setState((prev) => ({ ...prev, progress: "Loading image..." }));
            await fetchCachedImage(params, cacheKey, controller);
            return;
          }

          if (data.status === "error") {
            clearPolling();
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: data.error ?? "Processing failed",
              progress: null,
            }));
            return;
          }

          if (data.status === "not_found") {
            clearPolling();
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: "Processing job expired — please retry",
              progress: null,
            }));
            return;
          }

          // Still processing — update progress
          if (!controller.signal.aborted) {
            setState((prev) => ({ ...prev, progress: data.progress }));
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            clearPolling();
            return;
          }
          // Transient polling failure — keep polling, don't crash
          console.warn("[sentinel] Poll error (will retry):", err);
        }
      }, POLL_INTERVAL_MS);
    },
    [clearPolling, fetchCachedImage]
  );

  const fetchImagery = useCallback(
    async (prod: string, dateStart: string, dateEnd: string, cloudCover?: number) => {
      const cacheKey = `${prod}|${dateStart}|${dateEnd}|${cloudCover ?? 30}|v2`;

      // Check client-side cache first
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setState({ imageUrl: cached, isLoading: false, error: null, progress: null });
        return;
      }

      // Abort any in-flight request and stop polling
      abortRef.current?.abort();
      clearPolling();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, isLoading: true, error: null, progress: null }));

      try {
        const params = new URLSearchParams({
          product: prod,
          dateStart,
          dateEnd,
          ...(cloudCover != null ? { maxCloud: String(cloudCover) } : {}),
          _v: "2", // cache-bust: forces browser to bypass stale HTTP cache
        });

        const res = await fetch(`/api/sentinel/imagery?${params}`, {
          signal: controller.signal,
        });

        // 202 = dMIBR background processing started — enter polling mode
        if (res.status === 202) {
          const data: JobStatusResponse = await res.json();
          setState((prev) => ({ ...prev, progress: data.progress }));
          pollJobStatus(data.jobId, params, cacheKey, controller);
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(
            (body as { error?: string }).error ?? `HTTP ${res.status}`
          );
        }

        // 200 = image ready (standard product or cache hit)
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        cacheRef.current.set(cacheKey, url);

        if (!controller.signal.aborted) {
          setState({ imageUrl: url, isLoading: false, error: null, progress: null });
          triggerImageLoaded();
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to load sentinel imagery",
          progress: null,
        }));
      }
    },
    [clearPolling, pollJobStatus]
  );

  useEffect(() => {
    if (!enabled) {
      setState({ imageUrl: null, isLoading: false, error: null, progress: null });
      return;
    }

    fetchImagery(product, dateRange[0], dateRange[1], maxCloudCover);

    return () => {
      abortRef.current?.abort();
      clearPolling();
    };
  }, [product, dateRange, enabled, maxCloudCover, fetchImagery, clearPolling]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      cacheRef.current.clear();
    };
  }, []);

  return state;
}
