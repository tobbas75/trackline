import { describe, it, expect, beforeEach, vi } from "vitest";
import { useVegetationStore, extractClasses } from "@/stores/vegetation-store";

vi.mock("@/lib/offline-store", () => ({
  cacheData: vi.fn(),
  getCachedData: vi.fn().mockResolvedValue(null),
}));

function makeVegCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { VEG_CODE: 1, VEG_NAME: "Open Forest" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
      { type: "Feature", properties: { VEG_CODE: 1, VEG_NAME: "Open Forest" }, geometry: { type: "Polygon", coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
      { type: "Feature", properties: { VEG_CODE: 2, VEG_NAME: "Woodland" }, geometry: { type: "Polygon", coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]] } },
      { type: "Feature", properties: { VEG_CODE: 4, VEG_NAME: "Monsoon Vine" }, geometry: { type: "Polygon", coordinates: [[[3, 0], [4, 0], [4, 1], [3, 1], [3, 0]]] } },
    ],
  };
}

describe("useVegetationStore", () => {
  beforeEach(() => {
    useVegetationStore.setState({
      layer: null,
      classes: [],
      classAttribute: "",
      isLoaded: false,
    });
  });

  it("starts with no vegetation layer", () => {
    const state = useVegetationStore.getState();
    expect(state.layer).toBeNull();
    expect(state.classes).toHaveLength(0);
    expect(state.isLoaded).toBe(false);
  });

  it("sets a vegetation layer and extracts classes", () => {
    const fc = makeVegCollection();
    useVegetationStore.getState().setLayer(fc, "VEG_CODE");

    const state = useVegetationStore.getState();
    expect(state.layer).toBe(fc);
    expect(state.classAttribute).toBe("VEG_CODE");
    expect(state.isLoaded).toBe(true);
    expect(state.classes).toHaveLength(3);
    expect(state.classes[0].code).toBe(1);
    expect(state.classes[0].featureCount).toBe(2);
    expect(state.classes[1].code).toBe(2);
    expect(state.classes[2].code).toBe(4);
  });

  it("clears the vegetation layer", () => {
    useVegetationStore.getState().setLayer(makeVegCollection(), "VEG_CODE");
    useVegetationStore.getState().clearLayer();

    const state = useVegetationStore.getState();
    expect(state.layer).toBeNull();
    expect(state.classes).toHaveLength(0);
    expect(state.isLoaded).toBe(false);
  });
});

describe("extractClasses", () => {
  it("extracts unique classes with feature counts", () => {
    const fc = makeVegCollection();
    const classes = extractClasses(fc, "VEG_CODE");

    expect(classes).toHaveLength(3);
    expect(classes[0]).toEqual(expect.objectContaining({ code: 1, featureCount: 2 }));
    expect(classes[1]).toEqual(expect.objectContaining({ code: 2, featureCount: 1 }));
    expect(classes[2]).toEqual(expect.objectContaining({ code: 4, featureCount: 1 }));
  });

  it("sorts numerically when codes are numbers", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { code: 9 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { code: 1 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { code: 3 }, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    const classes = extractClasses(fc, "code");
    expect(classes.map((c) => c.code)).toEqual([1, 3, 9]);
  });

  it("handles string class values", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { type: "woodland" }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { type: "forest" }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: { type: "woodland" }, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    const classes = extractClasses(fc, "type");
    expect(classes).toHaveLength(2);
    expect(classes[0].code).toBe("forest");
    expect(classes[1].code).toBe("woodland");
    expect(classes[1].featureCount).toBe(2);
  });

  it("skips features with missing attribute", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { code: 1 }, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
        { type: "Feature", properties: null, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    const classes = extractClasses(fc, "code");
    expect(classes).toHaveLength(1);
  });
});
