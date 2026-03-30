/**
 * Next.js-compatible Web Worker loader for the analysis engine.
 *
 * Uses `new URL('./file', import.meta.url)` pattern which is handled
 * correctly by both webpack and turbopack — the worker file is bundled
 * as a separate chunk.
 */
export function createAnalysisWorker(): Worker | null {
  if (typeof window === "undefined") return null;

  return new Worker(
    new URL("./analysis.worker.ts", import.meta.url),
    { type: "module" }
  );
}
