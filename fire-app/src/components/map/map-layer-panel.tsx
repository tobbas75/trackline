"use client";

import { useMapStore } from "@/stores/map-store";
import { useReferenceLayerStore } from "@/stores/reference-layer-store";
import { useFireScars } from "@/hooks/use-fire-scars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff, Save, Cloud, FolderOpen, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";
import { InfoTooltip } from "@/components/info-tooltip";
import { SentinelDateRangePicker } from "@/components/map/sentinel-date-range-picker";
import { useSentinelLibrary, type SavedMap } from "@/hooks/use-sentinel-library";

const LAYER_TOOLTIPS: Record<string, string> = {
  "Project Boundary": "The outer boundary of the fire management project area.",
  "Fire Scars": "Satellite-detected burn areas — blue for EDS (early dry season), red for LDS (late dry season).",
  "Hotspots": "Near-real-time satellite fire detections. Colour indicates age: red (recent) to grey (>48h old).",
  "Burn Plans": "Planned burn areas colour-coded by status: yellow (draft), green (approved), orange (active), blue (completed).",
  "Cultural Zones": "Traditional Owner cultural restrictions — no-go zones, restricted areas, and sensitive sites.",
  "Analysis Zones": "Project sub-areas used for targeted fire metric analysis.",
  "Sentinel-2 Imagery": "Sentinel-2 imagery from Copernicus. Select a product and date range — imagery is cached locally after first fetch.",
};

const SENTINEL_PRODUCTS = [
  { value: "true_colour", label: "True Colour" },
  { value: "false_colour", label: "False Colour" },
  { value: "ndvi", label: "NDVI" },
  { value: "nbr", label: "NBR" },
  { value: "ndwi", label: "NDWI" },
  { value: "mibr", label: "MIBR (Colour)" },
  { value: "mibr_bw", label: "MIBR (B&W)" },
  { value: "dmibr", label: "dMIBR (Colour)" },
  { value: "dmibr_bw", label: "dMIBR (B&W)" },
] as const;

const PRODUCT_LABELS: Record<string, string> = Object.fromEntries(
  SENTINEL_PRODUCTS.map((p) => [p.value, p.label])
);

/** Format a date range compactly: "Jul 10–17" or "Jul 10 – Aug 3" */
function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sMonth = s.toLocaleString("default", { month: "short" });
  const eMonth = e.toLocaleString("default", { month: "short" });
  if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
    return `${sMonth} ${s.getDate()}–${e.getDate()}`;
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
}

export function MapLayerPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    layers,
    toggleLayer,
    fireScarsYear,
    setFireScarsYear,
    sentinelProduct,
    setSentinelProduct,
    sentinelOpacity,
    setSentinelOpacity,
  } = useMapStore();
  const { layers: refLayers, toggleLayerVisibility } = useReferenceLayerStore();
  const { availableYears, isLoading: fireScarsLoading } = useFireScars(fireScarsYear);
  const sentinelLoading = useMapStore((s) => s.sentinelLoading);
  const sentinelDateRange = useMapStore((s) => s.sentinelDateRange);
  const sentinelCloudCover = useMapStore((s) => s.sentinelCloudCover);
  const setSentinelCloudCover = useMapStore((s) => s.setSentinelCloudCover);
  const fireScarsVisible = layers.find((l) => l.id === "firescars")?.visible ?? false;
  const sentinelVisible = layers.find((l) => l.id === "sentinel")?.visible ?? false;
  const [downloading, setDownloading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const { maps: savedMaps, isLoading: libraryLoading, refresh: refreshLibrary } = useSentinelLibrary();
  const setSentinelDateRange = useMapStore((s) => s.setSentinelDateRange);

  const handleLoadSavedMap = useCallback((m: SavedMap) => {
    setSentinelProduct(m.product as typeof sentinelProduct);
    setSentinelDateRange([m.dateStart, m.dateEnd]);
  }, [setSentinelProduct, setSentinelDateRange]);

  const handleSave = useCallback(async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        product: sentinelProduct,
        dateStart: sentinelDateRange[0],
        dateEnd: sentinelDateRange[1],
        maxCloud: String(sentinelCloudCover),
      });
      const res = await fetch(`/api/sentinel/imagery?${params}`);
      if (res.status === 202) {
        // dMIBR still processing — will save automatically when done
        return;
      }
      if (!res.ok) throw new Error("Save failed");
      // Consume the response body so the request fully completes
      await res.blob();
      // Server persists to Supabase Storage in the background — refresh after a delay
      setTimeout(() => refreshLibrary(), 3000);
    } catch (err) {
      console.error("Sentinel save error:", err);
    } finally {
      setDownloading(false);
    }
  }, [sentinelProduct, sentinelDateRange, sentinelCloudCover, refreshLibrary]);

  return (
    <div className="absolute left-3 top-3 z-10">
      <Card className="w-56 shadow-lg">
        <CardHeader className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-0"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <CardTitle className="text-sm">Layers</CardTitle>
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isOpen && (
          <CardContent className="px-3 pb-3 pt-0">
            <div className="space-y-1">
              {layers.map((layer) => (
                <div key={layer.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleLayer(layer.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLayer(layer.id); } }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
                  >
                    {layer.visible ? (
                      <Eye className="h-3.5 w-3.5 text-foreground" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span
                      className={
                        layer.visible
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {layer.name}
                    </span>
                    {LAYER_TOOLTIPS[layer.name] && (
                      <InfoTooltip text={LAYER_TOOLTIPS[layer.name]} size="h-3 w-3" />
                    )}
                  </div>
                  {/* Year selector for Fire Scars layer */}
                  {layer.id === "firescars" && fireScarsVisible && availableYears.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 pb-1 pl-8">
                      <Select
                        value={String(fireScarsYear)}
                        onValueChange={(v) => setFireScarsYear(Number(v))}
                      >
                        <SelectTrigger className="h-6 w-22 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...availableYears].reverse().map((y) => (
                            <SelectItem key={y} value={String(y)} className="text-xs">
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fireScarsLoading && (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </div>
                  )}
                  {/* Sentinel-2 product and date range controls */}
                  {layer.id === "sentinel" && sentinelVisible && (
                    <div className="flex flex-col gap-1.5 px-2 pb-1.5 pl-8">
                      <Select
                        value={sentinelProduct}
                        onValueChange={(v) => setSentinelProduct(v as typeof sentinelProduct)}
                      >
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SENTINEL_PRODUCTS.map((p) => (
                            <SelectItem key={p.value} value={p.value} className="text-xs">
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <SentinelDateRangePicker />
                      <div className="flex items-center gap-1.5">
                        <Cloud className="h-3 w-3 text-muted-foreground shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={sentinelCloudCover}
                          onChange={(e) => setSentinelCloudCover(Number(e.target.value))}
                          className="h-1 w-full cursor-pointer accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground w-8 shrink-0 text-right">
                          {sentinelCloudCover}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground w-10 shrink-0">
                          {Math.round(sentinelOpacity * 100)}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(sentinelOpacity * 100)}
                          onChange={(e) => setSentinelOpacity(Number(e.target.value) / 100)}
                          className="h-1 w-full cursor-pointer accent-primary"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full justify-start gap-1.5 px-1 text-xs text-muted-foreground hover:text-foreground"
                        disabled={sentinelLoading || downloading}
                        onClick={handleSave}
                      >
                        <Save className="h-3 w-3" />
                        {downloading ? "Saving..." : "Save to Library"}
                      </Button>
                      {/* Saved Maps library */}
                      <div className="border-t pt-1.5">
                        <button
                          onClick={() => setLibraryOpen(!libraryOpen)}
                          className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            Saved Maps
                          </span>
                          {libraryOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {libraryOpen && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {savedMaps.length} image{savedMaps.length !== 1 ? "s" : ""}
                              </span>
                              <button
                                onClick={refreshLibrary}
                                disabled={libraryLoading}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                <RefreshCw className={`h-2.5 w-2.5 ${libraryLoading ? "animate-spin" : ""}`} />
                              </button>
                            </div>
                            {savedMaps.length === 0 && !libraryLoading && (
                              <p className="text-[10px] text-muted-foreground py-1">
                                No saved maps yet — fetch imagery to build your library.
                              </p>
                            )}
                            <div className="max-h-32 overflow-y-auto">
                              {savedMaps.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => handleLoadSavedMap(m)}
                                  className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left text-[10px] hover:bg-accent"
                                  title={`Load ${PRODUCT_LABELS[m.product] ?? m.product} ${m.dateStart} to ${m.dateEnd}`}
                                >
                                  <span className="truncate font-medium">
                                    {PRODUCT_LABELS[m.product] ?? m.product}
                                  </span>
                                  <span className="shrink-0 text-muted-foreground ml-1">
                                    {formatDateRange(m.dateStart, m.dateEnd)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {sentinelLoading && (
                        <span className="text-xs text-muted-foreground">
                          Loading imagery...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reference layers section */}
            {refLayers.length > 0 && (
              <>
                <div className="mt-2 border-t pt-2">
                  <p className="px-2 text-xs font-medium text-muted-foreground">
                    Uploaded Layers
                  </p>
                </div>
                <div className="mt-1 space-y-1">
                  {refLayers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayerVisibility(layer.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      {layer.visible ? (
                        <Eye className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span
                        className={`truncate ${
                          layer.visible
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {layer.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
