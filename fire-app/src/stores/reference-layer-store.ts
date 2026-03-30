import { create } from "zustand";
import type { Database } from "@/lib/supabase/types";

type ReferenceLayer = Database["public"]["Tables"]["reference_layer"]["Row"];

interface ReferenceLayerState {
  layers: ReferenceLayer[];
  setLayers: (layers: ReferenceLayer[]) => void;
  addLayer: (layer: ReferenceLayer) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerColor: (layerId: string, color: string) => void;
}

export const useReferenceLayerStore = create<ReferenceLayerState>((set) => ({
  layers: [],
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  removeLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
    })),
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    })),
  setLayerColor: (layerId, color) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, color } : l
      ),
    })),
}));
