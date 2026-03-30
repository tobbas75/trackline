import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBaselineStore } from "@/stores/baseline-store";

vi.mock("@/lib/offline-store", () => ({
  cacheData: vi.fn(),
  getCachedData: vi.fn().mockResolvedValue(null),
}));

describe("useBaselineStore", () => {
  beforeEach(() => {
    useBaselineStore.setState({
      baselineEmissions: 45000,
      projectAreaHa: 786000,
      permanenceDiscount: 0.25,
      edsEndMonth: 7,
      isConfigured: false,
    });
  });

  it("has Tiwi Islands defaults", () => {
    const state = useBaselineStore.getState();
    expect(state.baselineEmissions).toBe(45000);
    expect(state.projectAreaHa).toBe(786000);
    expect(state.permanenceDiscount).toBe(0.25);
    expect(state.edsEndMonth).toBe(7);
    expect(state.isConfigured).toBe(false);
  });

  it("sets baseline emissions and marks as configured", () => {
    useBaselineStore.getState().setBaselineEmissions(50000);
    const state = useBaselineStore.getState();
    expect(state.baselineEmissions).toBe(50000);
    expect(state.isConfigured).toBe(true);
  });

  it("sets project area", () => {
    useBaselineStore.getState().setProjectAreaHa(500000);
    expect(useBaselineStore.getState().projectAreaHa).toBe(500000);
  });

  it("sets permanence discount", () => {
    useBaselineStore.getState().setPermanenceDiscount(0.20);
    expect(useBaselineStore.getState().permanenceDiscount).toBe(0.20);
  });

  it("sets EDS end month", () => {
    useBaselineStore.getState().setEdsEndMonth(6);
    expect(useBaselineStore.getState().edsEndMonth).toBe(6);
  });

  it("loads from IndexedDB", async () => {
    const { getCachedData } = await import("@/lib/offline-store");
    vi.mocked(getCachedData).mockResolvedValueOnce({
      baselineEmissions: 52000,
      projectAreaHa: 400000,
      permanenceDiscount: 0.20,
      edsEndMonth: 6,
    });

    await useBaselineStore.getState().loadFromIndexedDB();

    const state = useBaselineStore.getState();
    expect(state.baselineEmissions).toBe(52000);
    expect(state.projectAreaHa).toBe(400000);
    expect(state.isConfigured).toBe(true);
  });

  it("persists to IndexedDB", async () => {
    const { cacheData } = await import("@/lib/offline-store");
    useBaselineStore.getState().setBaselineEmissions(48000);
    await useBaselineStore.getState().persistToIndexedDB();

    expect(cacheData).toHaveBeenCalledWith("baseline-config", {
      baselineEmissions: 48000,
      projectAreaHa: 786000,
      permanenceDiscount: 0.25,
      edsEndMonth: 7,
    });
  });
});
