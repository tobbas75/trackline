"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAnalysisStore } from "@/stores/analysis-store";
import { useFireScarStore } from "@/stores/fire-scar-store";
import { useVegetationStore } from "@/stores/vegetation-store";
import { useBaselineStore } from "@/stores/baseline-store";
import { createAnalysisWorker } from "@/workers/analysis-worker-loader";
import type { WorkerOutput, AnalysisParams } from "@/lib/analysis-types";

export function useAnalysis() {
  const workerRef = useRef<Worker | null>(null);

  const status = useAnalysisStore((s) => s.status);
  const progress = useAnalysisStore((s) => s.progress);
  const results = useAnalysisStore((s) => s.results);
  const error = useAnalysisStore((s) => s.error);
  const useComputedData = useAnalysisStore((s) => s.useComputedData);

  const setStatus = useAnalysisStore((s) => s.setStatus);
  const setProgress = useAnalysisStore((s) => s.setProgress);
  const setResults = useAnalysisStore((s) => s.setResults);
  const setError = useAnalysisStore((s) => s.setError);
  const persistToIndexedDB = useAnalysisStore((s) => s.persistToIndexedDB);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const runAnalysis = useCallback(
    (params: AnalysisParams) => {
      // Terminate any existing worker
      workerRef.current?.terminate();

      const worker = createAnalysisWorker();
      if (!worker) {
        setError("Web Workers not available in this environment");
        return;
      }

      workerRef.current = worker;
      setStatus("running");
      setProgress({ stage: "clipping", percent: 0, detail: "Starting analysis..." });

      worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
        const msg = event.data;

        switch (msg.type) {
          case "progress":
            if (msg.stage === "cancelled") {
              setStatus("idle");
              setProgress(null);
            } else {
              setProgress({ stage: msg.stage, percent: msg.percent, detail: msg.detail });
            }
            break;

          case "result":
            setResults(msg.data);
            persistToIndexedDB();
            worker.terminate();
            workerRef.current = null;
            break;

          case "error":
            setError(msg.message);
            worker.terminate();
            workerRef.current = null;
            break;
        }
      };

      worker.onerror = (event) => {
        setError(event.message || "Worker error");
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ type: "start", payload: params });
    },
    [setStatus, setProgress, setResults, setError, persistToIndexedDB]
  );

  const cancelAnalysis = useCallback(() => {
    workerRef.current?.postMessage({ type: "cancel" });
  }, []);

  /**
   * Run analysis with data from current stores.
   * Requires: project boundary, at least one fire scar dataset, and optionally a veg layer.
   */
  const runWithStoreData = useCallback(
    (projectBoundary: GeoJSON.FeatureCollection, analysisYears?: number[]) => {
      const fireScarState = useFireScarStore.getState();
      const vegState = useVegetationStore.getState();
      const baselineState = useBaselineStore.getState();

      // Gather fire scar data for all available years (or specified years)
      const years = analysisYears ??
        [...new Set(fireScarState.datasets.map((d) => d.year))].sort();

      const fireScars = years
        .map((year) => {
          const dataset = fireScarState.getSelectedDataset(year);
          if (!dataset) return null;
          return { year, geojson: dataset.featureCollection };
        })
        .filter(Boolean) as Array<{ year: number; geojson: GeoJSON.FeatureCollection }>;

      if (fireScars.length === 0) {
        setError("No fire scar data available. Upload or load fire scar datasets first.");
        return;
      }

      const params: AnalysisParams = {
        projectBoundary,
        projectAreaHa: baselineState.projectAreaHa,
        fireScars,
        vegetationLayer: vegState.layer,
        vegClassAttribute: vegState.classAttribute,
        edsEndMonth: baselineState.edsEndMonth,
        analysisYears: years,
      };

      runAnalysis(params);
    },
    [runAnalysis, setError]
  );

  return {
    status,
    progress,
    results,
    error,
    useComputedData,
    runAnalysis,
    runWithStoreData,
    cancelAnalysis,
  };
}
