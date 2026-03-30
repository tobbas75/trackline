import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAnalysisStore } from "@/stores/analysis-store";
import type { AnalysisResults } from "@/lib/analysis-types";

vi.mock("@/lib/offline-store", () => ({
  cacheData: vi.fn(),
  getCachedData: vi.fn().mockResolvedValue(null),
}));

function makeResults(overrides: Partial<AnalysisResults> = {}): AnalysisResults {
  return {
    computedAt: "2026-03-02T00:00:00Z",
    years: [2022],
    annualBurnData: [],
    shapeIndexData: [],
    threeYearRolling: [],
    twoYearRolling: [],
    unburntPatchData: [],
    burnCountDistribution: [],
    patchAgeData: [],
    patchAgeLateOnly: [],
    distToUnburntData: [],
    perimeterImpactData: [],
    cfiTable3Data: [],
    cfiTable9Data: [],
    seasonBreakdown: [],
    fireTargets: [],
    ...overrides,
  };
}

describe("useAnalysisStore", () => {
  beforeEach(() => {
    useAnalysisStore.setState({
      status: "idle",
      progress: null,
      results: null,
      error: null,
      useComputedData: false,
    });
  });

  it("starts idle with no results", () => {
    const state = useAnalysisStore.getState();
    expect(state.status).toBe("idle");
    expect(state.results).toBeNull();
    expect(state.useComputedData).toBe(false);
  });

  it("sets status", () => {
    useAnalysisStore.getState().setStatus("running");
    expect(useAnalysisStore.getState().status).toBe("running");
  });

  it("sets progress", () => {
    useAnalysisStore.getState().setProgress({
      stage: "clipping",
      percent: 20,
      detail: "Clipping 2022 fire scars",
    });

    const state = useAnalysisStore.getState();
    expect(state.progress?.stage).toBe("clipping");
    expect(state.progress?.percent).toBe(20);
  });

  it("sets results and auto-enables computed data", () => {
    const results = makeResults({ years: [2020, 2021, 2022] });
    useAnalysisStore.getState().setResults(results);

    const state = useAnalysisStore.getState();
    expect(state.results).toBe(results);
    expect(state.status).toBe("complete");
    expect(state.useComputedData).toBe(true);
    expect(state.progress).toBeNull();
    expect(state.error).toBeNull();
  });

  it("sets error clears progress", () => {
    useAnalysisStore.getState().setProgress({
      stage: "classifying",
      percent: 30,
      detail: "Processing",
    });
    useAnalysisStore.getState().setError("Invalid geometry in year 2019");

    const state = useAnalysisStore.getState();
    expect(state.error).toBe("Invalid geometry in year 2019");
    expect(state.status).toBe("error");
    expect(state.progress).toBeNull();
  });

  it("toggles useComputedData", () => {
    useAnalysisStore.getState().setUseComputedData(true);
    expect(useAnalysisStore.getState().useComputedData).toBe(true);
    useAnalysisStore.getState().setUseComputedData(false);
    expect(useAnalysisStore.getState().useComputedData).toBe(false);
  });

  it("clears results and resets to idle", () => {
    useAnalysisStore.getState().setResults(makeResults());
    useAnalysisStore.getState().clearResults();

    const state = useAnalysisStore.getState();
    expect(state.results).toBeNull();
    expect(state.status).toBe("idle");
    expect(state.useComputedData).toBe(false);
  });

  it("loads results from IndexedDB", async () => {
    const { getCachedData } = await import("@/lib/offline-store");
    const cached = makeResults({ years: [2021] });
    vi.mocked(getCachedData).mockResolvedValueOnce(cached);

    await useAnalysisStore.getState().loadFromIndexedDB();

    const state = useAnalysisStore.getState();
    expect(state.results?.years).toEqual([2021]);
    expect(state.status).toBe("complete");
    expect(state.useComputedData).toBe(true);
  });

  it("persists results to IndexedDB", async () => {
    const { cacheData } = await import("@/lib/offline-store");
    const results = makeResults();
    useAnalysisStore.getState().setResults(results);
    await useAnalysisStore.getState().persistToIndexedDB();

    expect(cacheData).toHaveBeenCalledWith("analysis-results", results);
  });
});
