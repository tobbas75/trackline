import { create } from "zustand";

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

/** Sentinel-2 product types — DEA OWS styles + CDSE custom evalscripts */
type SentinelProduct =
  | "ndvi" | "nbr" | "ndwi" | "true_colour" | "false_colour"  // DEA OWS
  | "mibr" | "mibr_bw" | "dmibr" | "dmibr_bw";                // CDSE custom

interface MapState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  layers: MapLayer[];
  isDrawing: boolean;
  selectedFeatureId: string | null;
  /** km radius to buffer around the project boundary for data queries (0 = full area) */
  dataBufferKm: number;
  /** Selected year for fire scar display */
  fireScarsYear: number;
  /** Active fire scar dataset ID — null means use NAFI hook data */
  fireScarsSource: string | null;
  /** Sentinel-2 date range [start, end] as YYYY-MM-DD strings */
  sentinelDateRange: [string, string];
  /** Selected Sentinel-2 product/index */
  sentinelProduct: SentinelProduct;
  /** Whether sentinel imagery is currently being fetched */
  sentinelLoading: boolean;
  /** Sentinel-2 imagery opacity (0–1) */
  sentinelOpacity: number;
  /** Max cloud cover % for CDSE imagery requests (0–100) */
  sentinelCloudCover: number;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  toggleLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setDrawing: (isDrawing: boolean) => void;
  setSelectedFeature: (id: string | null) => void;
  setDataBufferKm: (km: number) => void;
  setFireScarsYear: (year: number) => void;
  setFireScarsSource: (source: string | null) => void;
  setSentinelDateRange: (range: [string, string]) => void;
  setSentinelProduct: (product: SentinelProduct) => void;
  setSentinelLoading: (loading: boolean) => void;
  setSentinelOpacity: (opacity: number) => void;
  setSentinelCloudCover: (cloudCover: number) => void;
}

const defaultLayers: MapLayer[] = [
  { id: "basemap", name: "Basemap", visible: true, opacity: 1 },
  { id: "satellite", name: "Satellite", visible: false, opacity: 1 },
  { id: "boundary", name: "Project Boundary", visible: true, opacity: 0.8 },
  { id: "vegetation", name: "Vegetation / Fuel Types", visible: false, opacity: 0.6 },
  { id: "cultural", name: "Cultural Zones", visible: false, opacity: 0.5 },
  { id: "firescars", name: "Fire Scars", visible: true, opacity: 0.7 },
  { id: "nafi", name: "NAFI WMS", visible: false, opacity: 0.7 },
  { id: "hotspots", name: "DEA Hotspots", visible: true, opacity: 0.9 },
  { id: "burnplans", name: "Burn Plans", visible: true, opacity: 0.6 },
  { id: "operations", name: "Active Operations", visible: true, opacity: 1 },
  { id: "sentinel", name: "Sentinel-2 Imagery", visible: false, opacity: 0.7 },
  { id: "analysis", name: "Analysis Overlays", visible: false, opacity: 0.5 },
  { id: "reference", name: "Reference Layers", visible: true, opacity: 0.7 },
];

// Default center: Tiwi Islands
const DEFAULT_CENTER: [number, number] = [130.5, -11.6];
const DEFAULT_ZOOM = 8;

/** Default Sentinel-2 date range: last 7 days ending today */
function getDefaultSentinelDateRange(): [string, string] {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // 7-day inclusive window
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

export const useMapStore = create<MapState>((set) => ({
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  layers: defaultLayers,
  isDrawing: false,
  selectedFeatureId: null,
  dataBufferKm: 50,
  fireScarsYear: 2021,
  fireScarsSource: null,
  sentinelDateRange: getDefaultSentinelDateRange(),
  sentinelProduct: "ndvi" as SentinelProduct,
  sentinelLoading: false,
  sentinelOpacity: 1,
  sentinelCloudCover: 30,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  toggleLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    })),
  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      ),
    })),
  setDrawing: (isDrawing) => set({ isDrawing }),
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
  setDataBufferKm: (dataBufferKm) => set({ dataBufferKm }),
  setFireScarsYear: (fireScarsYear) => set({ fireScarsYear }),
  setFireScarsSource: (fireScarsSource) => set({ fireScarsSource }),
  setSentinelDateRange: (sentinelDateRange) => set({ sentinelDateRange }),
  setSentinelProduct: (sentinelProduct) => set({ sentinelProduct }),
  setSentinelLoading: (sentinelLoading) => set({ sentinelLoading }),
  setSentinelOpacity: (sentinelOpacity) => set({ sentinelOpacity }),
  setSentinelCloudCover: (sentinelCloudCover) => set({ sentinelCloudCover }),
}));
