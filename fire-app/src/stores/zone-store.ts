import { create } from "zustand";
import type { Database } from "@/lib/supabase/types";

type AnalysisZone = Database["public"]["Tables"]["analysis_zone"]["Row"];

interface ZoneState {
  zones: AnalysisZone[];
  activeZone: AnalysisZone | null; // null = "Entire Project"
  setZones: (zones: AnalysisZone[]) => void;
  setActiveZone: (zone: AnalysisZone | null) => void;
  addZone: (zone: AnalysisZone) => void;
  removeZone: (zoneId: string) => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  zones: [],
  activeZone: null,
  setZones: (zones) => set({ zones }),
  setActiveZone: (activeZone) => set({ activeZone }),
  addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
  removeZone: (zoneId) =>
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== zoneId),
      activeZone: state.activeZone?.id === zoneId ? null : state.activeZone,
    })),
}));
