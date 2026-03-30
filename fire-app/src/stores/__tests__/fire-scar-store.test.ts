import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFireScarStore, summariseFireScars } from "@/stores/fire-scar-store";
import type { FireScarDataset } from "@/lib/analysis-types";

// Mock offline-store to avoid IndexedDB in tests
vi.mock("@/lib/offline-store", () => ({
  cacheData: vi.fn(),
  getCachedData: vi.fn().mockResolvedValue(null),
}));

function makeDataset(overrides: Partial<FireScarDataset> = {}): FireScarDataset {
  return {
    id: "test-2022",
    source: "field_mapped",
    year: 2022,
    label: "Test 2022",
    featureCollection: { type: "FeatureCollection", features: [] },
    featureCount: 0,
    totalHa: 1000,
    edsHa: 700,
    ldsHa: 300,
    uploadedAt: "2026-01-01T00:00:00Z",
    persisted: false,
    ...overrides,
  };
}

describe("useFireScarStore", () => {
  beforeEach(() => {
    useFireScarStore.setState({
      datasets: [],
      selectedSourceByYear: {},
      isLoading: false,
    });
  });

  it("starts with empty datasets", () => {
    const state = useFireScarStore.getState();
    expect(state.datasets).toHaveLength(0);
    expect(state.selectedSourceByYear).toEqual({});
  });

  it("adds a dataset and auto-selects it for the year", () => {
    const dataset = makeDataset();
    useFireScarStore.getState().addDataset(dataset);

    const state = useFireScarStore.getState();
    expect(state.datasets).toHaveLength(1);
    expect(state.datasets[0].id).toBe("test-2022");
    expect(state.selectedSourceByYear[2022]).toBe("test-2022");
  });

  it("does not override existing selection when adding a second dataset for same year", () => {
    const ds1 = makeDataset({ id: "nafi-2022", label: "NAFI 2022" });
    const ds2 = makeDataset({ id: "custom-2022", label: "Custom 2022" });

    useFireScarStore.getState().addDataset(ds1);
    useFireScarStore.getState().addDataset(ds2);

    const state = useFireScarStore.getState();
    expect(state.datasets).toHaveLength(2);
    // First added dataset remains selected
    expect(state.selectedSourceByYear[2022]).toBe("nafi-2022");
  });

  it("removes a dataset and re-selects if it was active", () => {
    const ds1 = makeDataset({ id: "nafi-2022" });
    const ds2 = makeDataset({ id: "custom-2022" });

    useFireScarStore.getState().addDataset(ds1);
    useFireScarStore.getState().addDataset(ds2);
    useFireScarStore.getState().removeDataset("nafi-2022");

    const state = useFireScarStore.getState();
    expect(state.datasets).toHaveLength(1);
    expect(state.selectedSourceByYear[2022]).toBe("custom-2022");
  });

  it("clears selection when last dataset for a year is removed", () => {
    useFireScarStore.getState().addDataset(makeDataset());
    useFireScarStore.getState().removeDataset("test-2022");

    const state = useFireScarStore.getState();
    expect(state.datasets).toHaveLength(0);
    expect(state.selectedSourceByYear[2022]).toBeUndefined();
  });

  it("setSelectedSource changes the active dataset for a year", () => {
    const ds1 = makeDataset({ id: "nafi-2022" });
    const ds2 = makeDataset({ id: "custom-2022" });

    useFireScarStore.getState().addDataset(ds1);
    useFireScarStore.getState().addDataset(ds2);
    useFireScarStore.getState().setSelectedSource(2022, "custom-2022");

    expect(useFireScarStore.getState().selectedSourceByYear[2022]).toBe("custom-2022");
  });

  it("getDatasetsForYear filters by year", () => {
    useFireScarStore.getState().addDataset(makeDataset({ id: "a", year: 2021 }));
    useFireScarStore.getState().addDataset(makeDataset({ id: "b", year: 2022 }));
    useFireScarStore.getState().addDataset(makeDataset({ id: "c", year: 2022 }));

    const year2022 = useFireScarStore.getState().getDatasetsForYear(2022);
    expect(year2022).toHaveLength(2);
    expect(year2022.map((d) => d.id)).toEqual(["b", "c"]);
  });

  it("getSelectedDataset returns the selected dataset", () => {
    const ds = makeDataset({ id: "nafi-2022" });
    useFireScarStore.getState().addDataset(ds);

    const selected = useFireScarStore.getState().getSelectedDataset(2022);
    expect(selected?.id).toBe("nafi-2022");
  });

  it("getSelectedDataset falls back to first available when no selection", () => {
    const ds = makeDataset({ id: "nafi-2022" });
    useFireScarStore.setState({
      datasets: [ds],
      selectedSourceByYear: {},
    });

    const selected = useFireScarStore.getState().getSelectedDataset(2022);
    expect(selected?.id).toBe("nafi-2022");
  });

  it("getSelectedDataset returns undefined for missing year", () => {
    expect(useFireScarStore.getState().getSelectedDataset(2099)).toBeUndefined();
  });
});

describe("summariseFireScars", () => {
  it("classifies features by month using edsEndMonth", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { month: 4, area_ha: 100 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { month: 7, area_ha: 200 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { month: 8, area_ha: 50 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { month: 11, area_ha: 30 }, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    const result = summariseFireScars(fc, 7);
    expect(result.edsHa).toBe(300);
    expect(result.ldsHa).toBe(80);
    expect(result.totalHa).toBe(380);
  });

  it("handles custom edsEndMonth", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { month: 6, area_ha: 100 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { month: 7, area_ha: 50 }, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    // With edsEndMonth=6, month 7 becomes LDS
    const result = summariseFireScars(fc, 6);
    expect(result.edsHa).toBe(100);
    expect(result.ldsHa).toBe(50);
  });

  it("returns zeros for empty collection", () => {
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
    const result = summariseFireScars(fc);
    expect(result.totalHa).toBe(0);
    expect(result.edsHa).toBe(0);
    expect(result.ldsHa).toBe(0);
  });
});
