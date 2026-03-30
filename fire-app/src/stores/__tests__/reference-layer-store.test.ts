import { describe, it, expect, beforeEach } from "vitest";
import { useReferenceLayerStore } from "@/stores/reference-layer-store";

const mockLayer = (id: string, name: string, visible = true) => ({
  id,
  project_id: "p-1",
  name,
  description: null,
  geojson_data: null,
  geometry_type: "Polygon",
  feature_count: 1,
  color: "#ff0000",
  visible,
  sort_order: 0,
  uploaded_by: null,
  created_at: "2024-01-01T00:00:00Z",
});

describe("reference-layer-store", () => {
  beforeEach(() => {
    useReferenceLayerStore.setState({ layers: [] });
  });

  it("starts empty", () => {
    expect(useReferenceLayerStore.getState().layers).toHaveLength(0);
  });

  it("adds a layer", () => {
    useReferenceLayerStore.getState().addLayer(mockLayer("l-1", "Roads"));
    expect(useReferenceLayerStore.getState().layers).toHaveLength(1);
  });

  it("removes a layer", () => {
    useReferenceLayerStore.getState().setLayers([
      mockLayer("l-1", "Roads"),
      mockLayer("l-2", "Rivers"),
    ]);
    useReferenceLayerStore.getState().removeLayer("l-1");
    expect(useReferenceLayerStore.getState().layers).toHaveLength(1);
    expect(useReferenceLayerStore.getState().layers[0].id).toBe("l-2");
  });

  it("toggles layer visibility", () => {
    useReferenceLayerStore.getState().setLayers([mockLayer("l-1", "Roads", true)]);
    useReferenceLayerStore.getState().toggleLayerVisibility("l-1");
    expect(useReferenceLayerStore.getState().layers[0].visible).toBe(false);

    useReferenceLayerStore.getState().toggleLayerVisibility("l-1");
    expect(useReferenceLayerStore.getState().layers[0].visible).toBe(true);
  });

  it("sets layer color", () => {
    useReferenceLayerStore.getState().setLayers([mockLayer("l-1", "Roads")]);
    useReferenceLayerStore.getState().setLayerColor("l-1", "#00ff00");
    expect(useReferenceLayerStore.getState().layers[0].color).toBe("#00ff00");
  });

  it("does not affect other layers when toggling", () => {
    useReferenceLayerStore.getState().setLayers([
      mockLayer("l-1", "Roads", true),
      mockLayer("l-2", "Rivers", true),
    ]);
    useReferenceLayerStore.getState().toggleLayerVisibility("l-1");
    expect(useReferenceLayerStore.getState().layers[1].visible).toBe(true);
  });
});
