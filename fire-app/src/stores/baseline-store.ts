import { create } from "zustand";
import { cacheData, getCachedData } from "@/lib/offline-store";

const IDB_KEY = "baseline-config";

interface BaselineState {
  /** CER-provided baseline emissions in tCO2-e per year */
  baselineEmissions: number;
  /** Project area in hectares (overridable, default from project-store) */
  projectAreaHa: number;
  /** Permanence discount rate (e.g. 0.25 for 25-year obligation) */
  permanenceDiscount: number;
  /** Last month of the Early Dry Season (1-12, default 7 = July) */
  edsEndMonth: number;
  /** Whether baseline has been configured by the user */
  isConfigured: boolean;

  setBaselineEmissions: (value: number) => void;
  setProjectAreaHa: (value: number) => void;
  setPermanenceDiscount: (value: number) => void;
  setEdsEndMonth: (month: number) => void;
  loadFromIndexedDB: () => Promise<void>;
  persistToIndexedDB: () => Promise<void>;
}

export const useBaselineStore = create<BaselineState>((set, get) => ({
  // Defaults based on Tiwi Islands project
  baselineEmissions: 45000,
  projectAreaHa: 786000,
  permanenceDiscount: 0.25,
  edsEndMonth: 7,
  isConfigured: false,

  setBaselineEmissions: (baselineEmissions) =>
    set({ baselineEmissions, isConfigured: true }),

  setProjectAreaHa: (projectAreaHa) => set({ projectAreaHa }),

  setPermanenceDiscount: (permanenceDiscount) => set({ permanenceDiscount }),

  setEdsEndMonth: (edsEndMonth) => set({ edsEndMonth }),

  loadFromIndexedDB: async () => {
    try {
      const cached = await getCachedData<{
        baselineEmissions: number;
        projectAreaHa: number;
        permanenceDiscount: number;
        edsEndMonth: number;
      }>(IDB_KEY);
      if (cached) {
        set({
          baselineEmissions: cached.baselineEmissions,
          projectAreaHa: cached.projectAreaHa,
          permanenceDiscount: cached.permanenceDiscount,
          edsEndMonth: cached.edsEndMonth,
          isConfigured: true,
        });
      }
    } catch {
      // IndexedDB may not be available
    }
  },

  persistToIndexedDB: async () => {
    const { baselineEmissions, projectAreaHa, permanenceDiscount, edsEndMonth } = get();
    await cacheData(IDB_KEY, {
      baselineEmissions,
      projectAreaHa,
      permanenceDiscount,
      edsEndMonth,
    });
  },
}));
