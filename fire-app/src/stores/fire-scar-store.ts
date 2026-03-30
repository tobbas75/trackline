import { create } from "zustand";
import type { FireScarDataset, FireScarSource } from "@/lib/analysis-types";
import { cacheData, getCachedData } from "@/lib/offline-store";
import area from "@turf/area";

const IDB_DATASETS_INDEX = "fire-scar-datasets-index";
const IDB_DATASET_PREFIX = "fire-scar-dataset:";

interface FireScarState {
  datasets: FireScarDataset[];
  /** Which dataset id to use per year for analysis */
  selectedSourceByYear: Record<number, string>;
  isLoading: boolean;

  addDataset: (dataset: FireScarDataset) => void;
  removeDataset: (id: string) => void;
  setSelectedSource: (year: number, datasetId: string) => void;
  getDatasetsForYear: (year: number) => FireScarDataset[];
  getSelectedDataset: (year: number) => FireScarDataset | undefined;
  /** Load a NAFI year from /public/data/fire-scars/{year}.json */
  loadNafiYear: (year: number, edsEndMonth?: number) => Promise<void>;
  /** Hydrate from IndexedDB on app load */
  loadFromIndexedDB: () => Promise<void>;
  /** Persist a dataset to IndexedDB */
  persistDataset: (datasetId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

/** Summarise a fire scar FeatureCollection into EDS/LDS/total hectares */
function summariseFireScars(
  fc: GeoJSON.FeatureCollection,
  edsEndMonth: number = 7
): { totalHa: number; edsHa: number; ldsHa: number } {
  let edsHa = 0;
  let ldsHa = 0;

  for (const f of fc.features) {
    const props = f.properties ?? {};
    const month = props.month as number | undefined;
    const areaHa =
      (props.area_ha as number | undefined) ??
      (f.geometry ? area(f) / 10000 : 0);

    if (month !== undefined && month <= edsEndMonth) {
      edsHa += areaHa;
    } else {
      ldsHa += areaHa;
    }
  }

  return { totalHa: edsHa + ldsHa, edsHa, ldsHa };
}

export const useFireScarStore = create<FireScarState>((set, get) => ({
  datasets: [],
  selectedSourceByYear: {},
  isLoading: false,

  addDataset: (dataset) => {
    set((state) => ({
      datasets: [...state.datasets, dataset],
      // Auto-select if first for this year
      selectedSourceByYear: state.selectedSourceByYear[dataset.year]
        ? state.selectedSourceByYear
        : { ...state.selectedSourceByYear, [dataset.year]: dataset.id },
    }));
  },

  removeDataset: (id) => {
    set((state) => {
      const filtered = state.datasets.filter((d) => d.id !== id);
      const newSelected = { ...state.selectedSourceByYear };
      // Clear selection if removed dataset was selected
      for (const [year, selectedId] of Object.entries(newSelected)) {
        if (selectedId === id) {
          const remaining = filtered.filter((d) => d.year === Number(year));
          if (remaining.length > 0) {
            newSelected[Number(year)] = remaining[0].id;
          } else {
            delete newSelected[Number(year)];
          }
        }
      }
      return { datasets: filtered, selectedSourceByYear: newSelected };
    });
  },

  setSelectedSource: (year, datasetId) => {
    set((state) => ({
      selectedSourceByYear: { ...state.selectedSourceByYear, [year]: datasetId },
    }));
  },

  getDatasetsForYear: (year) => {
    return get().datasets.filter((d) => d.year === year);
  },

  getSelectedDataset: (year) => {
    const { datasets, selectedSourceByYear } = get();
    const selectedId = selectedSourceByYear[year];
    if (selectedId) {
      return datasets.find((d) => d.id === selectedId);
    }
    // Fall back to first available for year
    return datasets.find((d) => d.year === year);
  },

  loadNafiYear: async (year, edsEndMonth = 7) => {
    const state = get();
    const nafiId = `nafi-${year}`;

    // Already loaded
    if (state.datasets.some((d) => d.id === nafiId)) return;

    set({ isLoading: true });
    try {
      const response = await fetch(`/data/fire-scars/${year}.json`);
      if (!response.ok) {
        if (response.status === 404) return; // Year not available
        throw new Error(`Failed to load fire scars for ${year}: ${response.status}`);
      }

      const fc = (await response.json()) as GeoJSON.FeatureCollection;
      const stats = summariseFireScars(fc, edsEndMonth);

      const dataset: FireScarDataset = {
        id: nafiId,
        source: "nafi_modis",
        year,
        label: `NAFI ${year}`,
        featureCollection: fc,
        featureCount: fc.features.length,
        totalHa: stats.totalHa,
        edsHa: stats.edsHa,
        ldsHa: stats.ldsHa,
        uploadedAt: new Date().toISOString(),
        persisted: false,
      };

      get().addDataset(dataset);
    } finally {
      set({ isLoading: false });
    }
  },

  loadFromIndexedDB: async () => {
    try {
      const index = await getCachedData<Array<{ id: string; year: number }>>(IDB_DATASETS_INDEX);
      if (!index || index.length === 0) return;

      const loaded: FireScarDataset[] = [];
      for (const entry of index) {
        const dataset = await getCachedData<FireScarDataset>(IDB_DATASET_PREFIX + entry.id);
        if (dataset) {
          loaded.push({ ...dataset, persisted: true });
        }
      }

      if (loaded.length > 0) {
        set((state) => {
          // Merge with any already-loaded datasets (avoid duplicates)
          const existingIds = new Set(state.datasets.map((d) => d.id));
          const newDatasets = loaded.filter((d) => !existingIds.has(d.id));
          return { datasets: [...state.datasets, ...newDatasets] };
        });
      }
    } catch (error) {
      // IndexedDB may not be available (SSR, private browsing)
      console.warn("[fire-scar-store] Failed to load persisted datasets from IndexedDB", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  persistDataset: async (datasetId) => {
    const dataset = get().datasets.find((d) => d.id === datasetId);
    if (!dataset) return;

    await cacheData(IDB_DATASET_PREFIX + dataset.id, dataset);

    // Update index
    const index = (await getCachedData<Array<{ id: string; year: number }>>(IDB_DATASETS_INDEX)) ?? [];
    if (!index.some((e) => e.id === dataset.id)) {
      index.push({ id: dataset.id, year: dataset.year });
      await cacheData(IDB_DATASETS_INDEX, index);
    }

    // Mark as persisted in state
    set((state) => ({
      datasets: state.datasets.map((d) =>
        d.id === datasetId ? { ...d, persisted: true } : d
      ),
    }));
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export { summariseFireScars };
