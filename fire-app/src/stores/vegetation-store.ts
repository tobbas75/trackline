import { create } from "zustand";
import type { VegetationClass } from "@/lib/analysis-types";
import { cacheData, getCachedData } from "@/lib/offline-store";

const IDB_KEY = "vegetation-layer";

/** Default CER fuel type colours */
const VEG_COLORS: Record<number, string> = {
  1: "#228b22", // Open Forest
  2: "#90ee90", // Open Woodland
  3: "#6b8e23", // Woodland (mixed)
  4: "#006400", // Monsoon Vine Forest
  5: "#daa520", // Grassland / Sedgeland
  6: "#2e8b57", // Mangrove / Coastal
  7: "#8fbc8f", // Shrubland
  8: "#cd853f", // Bare / Rock
  9: "#a9a9a9", // Cleared / Developed
};

interface VegetationState {
  layer: GeoJSON.FeatureCollection | null;
  classes: VegetationClass[];
  /** Which property in the shapefile holds the vegetation class/code */
  classAttribute: string;
  isLoaded: boolean;

  setLayer: (fc: GeoJSON.FeatureCollection, classAttribute: string) => void;
  clearLayer: () => void;
  loadFromIndexedDB: () => Promise<void>;
  persistToIndexedDB: () => Promise<void>;
}

/** Extract unique vegetation classes from feature properties */
function extractClasses(
  fc: GeoJSON.FeatureCollection,
  attribute: string
): VegetationClass[] {
  const classMap = new Map<string | number, number>();

  for (const f of fc.features) {
    const value = f.properties?.[attribute];
    if (value !== undefined && value !== null) {
      classMap.set(value, (classMap.get(value) ?? 0) + 1);
    }
  }

  return Array.from(classMap.entries())
    .sort((a, b) => {
      // Sort numerically if possible, otherwise alphabetically
      const aNum = Number(a[0]);
      const bNum = Number(b[0]);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map(([code, count]) => ({
      code,
      name: String(code),
      color: VEG_COLORS[Number(code)] ?? "#888888",
      featureCount: count,
    }));
}

export const useVegetationStore = create<VegetationState>((set, get) => ({
  layer: null,
  classes: [],
  classAttribute: "",
  isLoaded: false,

  setLayer: (fc, classAttribute) => {
    const classes = extractClasses(fc, classAttribute);
    set({ layer: fc, classes, classAttribute, isLoaded: true });
  },

  clearLayer: () => {
    set({ layer: null, classes: [], classAttribute: "", isLoaded: false });
  },

  loadFromIndexedDB: async () => {
    try {
      const cached = await getCachedData<{
        layer: GeoJSON.FeatureCollection;
        classAttribute: string;
      }>(IDB_KEY);
      if (cached?.layer && cached?.classAttribute) {
        const classes = extractClasses(cached.layer, cached.classAttribute);
        set({
          layer: cached.layer,
          classes,
          classAttribute: cached.classAttribute,
          isLoaded: true,
        });
      }
    } catch {
      // IndexedDB may not be available
    }
  },

  persistToIndexedDB: async () => {
    const { layer, classAttribute } = get();
    if (layer) {
      await cacheData(IDB_KEY, { layer, classAttribute });
    }
  },
}));

export { extractClasses };
