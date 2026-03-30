import { create } from "zustand";
import type {
  AnalysisResults,
  AnalysisProgress,
  AnalysisStatus,
} from "@/lib/analysis-types";
import { cacheData, getCachedData } from "@/lib/offline-store";

const IDB_KEY = "analysis-results";

interface AnalysisState {
  status: AnalysisStatus;
  progress: AnalysisProgress | null;
  results: AnalysisResults | null;
  error: string | null;
  /** When true, reports page uses computed results instead of demo data */
  useComputedData: boolean;

  setStatus: (status: AnalysisStatus) => void;
  setProgress: (progress: AnalysisProgress | null) => void;
  setResults: (results: AnalysisResults) => void;
  setError: (error: string) => void;
  setUseComputedData: (use: boolean) => void;
  clearResults: () => void;
  /** Load last analysis results from IndexedDB */
  loadFromIndexedDB: () => Promise<void>;
  /** Persist current results to IndexedDB */
  persistToIndexedDB: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  status: "idle",
  progress: null,
  results: null,
  error: null,
  useComputedData: false,

  setStatus: (status) => set({ status }),

  setProgress: (progress) => set({ progress }),

  setResults: (results) => {
    set({
      results,
      status: "complete",
      progress: null,
      error: null,
      useComputedData: true,
    });
  },

  setError: (error) => {
    set({ error, status: "error", progress: null });
  },

  setUseComputedData: (useComputedData) => set({ useComputedData }),

  clearResults: () => {
    set({
      results: null,
      status: "idle",
      progress: null,
      error: null,
      useComputedData: false,
    });
  },

  loadFromIndexedDB: async () => {
    try {
      const cached = await getCachedData<AnalysisResults>(IDB_KEY);
      if (cached) {
        set({
          results: cached,
          status: "complete",
          useComputedData: true,
        });
      }
    } catch {
      // IndexedDB may not be available
    }
  },

  persistToIndexedDB: async () => {
    const { results } = get();
    if (results) {
      await cacheData(IDB_KEY, results);
    }
  },
}));
