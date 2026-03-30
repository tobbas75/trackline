import { create } from "zustand";

interface SentinelEventsState {
  /** Timestamp set when a sentinel image finishes loading (triggers library refresh) */
  lastImageLoadTimestamp: number | null;

  /** Signal that a new sentinel image has been loaded */
  triggerImageLoaded: () => void;
}

export const useSentinelEventsStore = create<SentinelEventsState>((set) => ({
  lastImageLoadTimestamp: null,
  triggerImageLoaded: () => set({ lastImageLoadTimestamp: Date.now() }),
}));
