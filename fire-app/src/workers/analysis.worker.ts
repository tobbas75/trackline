/**
 * Web Worker for fire scar analysis.
 * Runs the analysis engine off the main thread to avoid UI blocking.
 */

import { runFullAnalysis } from "@/lib/analysis-engine";
import type { WorkerInput, WorkerOutput, AnalysisStage } from "@/lib/analysis-types";

let cancelled = false;

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const msg = event.data;

  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }

  if (msg.type === "start") {
    cancelled = false;

    try {
      const results = runFullAnalysis(msg.payload, (stage, percent, detail) => {
        if (cancelled) {
          throw new Error("CANCELLED");
        }

        const output: WorkerOutput = { type: "progress", stage: stage as AnalysisStage, percent, detail };
        self.postMessage(output);
      });

      if (!cancelled) {
        const output: WorkerOutput = { type: "result", data: results };
        self.postMessage(output);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "CANCELLED") {
        const output: WorkerOutput = {
          type: "progress",
          stage: "cancelled",
          percent: 0,
          detail: "",
        };
        self.postMessage(output);
      } else {
        const output: WorkerOutput = {
          type: "error",
          message: err instanceof Error ? err.message : "Analysis failed",
        };
        self.postMessage(output);
      }
    }
  }
};
