import { describe, it, expect, beforeEach } from "vitest";
import { useMapStore } from "@/stores/map-store";

describe("map-store", () => {
  beforeEach(() => {
    useMapStore.setState({
      center: [130.5, -11.6],
      zoom: 8,
      layers: [
        { id: "basemap", name: "Basemap", visible: true, opacity: 1 },
        { id: "satellite", name: "Satellite", visible: false, opacity: 1 },
        { id: "hotspots", name: "DEA Hotspots", visible: true, opacity: 0.9 },
      ],
      isDrawing: false,
      selectedFeatureId: null,
      dataBufferKm: 50,
      fireScarsYear: 2021,
    });
  });

  it("initializes with Tiwi Islands center", () => {
    const { center, zoom } = useMapStore.getState();
    expect(center).toEqual([130.5, -11.6]);
    expect(zoom).toBe(8);
  });

  it("sets center", () => {
    useMapStore.getState().setCenter([131, -12]);
    expect(useMapStore.getState().center).toEqual([131, -12]);
  });

  it("sets zoom", () => {
    useMapStore.getState().setZoom(12);
    expect(useMapStore.getState().zoom).toBe(12);
  });

  it("toggles layer visibility", () => {
    useMapStore.getState().toggleLayer("satellite");
    const satellite = useMapStore.getState().layers.find((l) => l.id === "satellite");
    expect(satellite?.visible).toBe(true);

    useMapStore.getState().toggleLayer("satellite");
    const after = useMapStore.getState().layers.find((l) => l.id === "satellite");
    expect(after?.visible).toBe(false);
  });

  it("does not affect other layers when toggling", () => {
    useMapStore.getState().toggleLayer("satellite");
    const basemap = useMapStore.getState().layers.find((l) => l.id === "basemap");
    expect(basemap?.visible).toBe(true);
  });

  it("sets layer opacity", () => {
    useMapStore.getState().setLayerOpacity("hotspots", 0.5);
    const hotspots = useMapStore.getState().layers.find((l) => l.id === "hotspots");
    expect(hotspots?.opacity).toBe(0.5);
  });

  it("sets drawing mode", () => {
    useMapStore.getState().setDrawing(true);
    expect(useMapStore.getState().isDrawing).toBe(true);
    useMapStore.getState().setDrawing(false);
    expect(useMapStore.getState().isDrawing).toBe(false);
  });

  it("sets selected feature", () => {
    useMapStore.getState().setSelectedFeature("feature-1");
    expect(useMapStore.getState().selectedFeatureId).toBe("feature-1");
    useMapStore.getState().setSelectedFeature(null);
    expect(useMapStore.getState().selectedFeatureId).toBeNull();
  });

  it("sets data buffer km", () => {
    useMapStore.getState().setDataBufferKm(100);
    expect(useMapStore.getState().dataBufferKm).toBe(100);
  });

  it("sets fire scars year", () => {
    useMapStore.getState().setFireScarsYear(2025);
    expect(useMapStore.getState().fireScarsYear).toBe(2025);
  });
});
