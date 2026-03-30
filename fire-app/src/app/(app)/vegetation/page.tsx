"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Satellite, MapPin, Eye, Cloud, Download } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useMapStore } from "@/stores/map-store";
import {
  useSentinelScenes,
  type SentinelScene,
} from "@/hooks/use-sentinel-scenes";

const INDEX_OPTIONS = [
  { value: "ndvi", label: "NDVI", description: "Normalized Difference Vegetation Index — green = healthy vegetation" },
  { value: "nbr", label: "NBR", description: "Normalized Burn Ratio — highlights burn severity" },
  { value: "mibr", label: "MIBR (Colour)", description: "Mid-Infrared Burn Ratio (10×SWIR2 - 9.8×SWIR1 + 2) — colour ramp. Requires CDSE." },
  { value: "mibr_bw", label: "MIBR (B&W)", description: "Mid-Infrared Burn Ratio — greyscale. Dark = burnt, light = unburnt. Requires CDSE." },
  { value: "dmibr", label: "dMIBR (Colour)", description: "Delta MIBR change detection between earliest and latest scene — blue = new burn. Requires CDSE." },
  { value: "dmibr_bw", label: "dMIBR (B&W)", description: "Delta MIBR change detection — greyscale. Dark = new burn, light = recovery. Requires CDSE." },
  { value: "fmc", label: "Fuel Moisture", description: "DEA Fuel Moisture Content — weekly updated fire risk indicator" },
  { value: "true_colour", label: "True Colour", description: "Natural colour satellite imagery (RGB)" },
  { value: "false_colour", label: "False Colour", description: "Near-infrared false colour — vegetation appears red" },
] as const;

export default function VegetationPage() {
  const {
    sentinelProduct,
    setSentinelProduct,
    sentinelDateRange,
    setSentinelDateRange,
    sentinelCloudCover,
    setSentinelCloudCover,
  } = useMapStore();
  const sentinelLoading = useMapStore((s) => s.sentinelLoading);
  const [downloading, setDownloading] = useState(false);

  // Scene discovery dates — pass YYYY-MM-DD directly
  const dateStart = sentinelDateRange[0];
  const dateEnd = sentinelDateRange[1];

  const { scenes, total, isLoading, error, refresh } = useSentinelScenes({
    dateStart,
    dateEnd,
    maxCloudCover: sentinelCloudCover,
  });

  const selectedIndex = INDEX_OPTIONS.find((o) => o.value === sentinelProduct);

  // Group scenes by month
  const scenesByMonth = useMemo(() => {
    const groups = new Map<string, SentinelScene[]>();
    for (const scene of scenes) {
      const date = new Date(scene.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const list = groups.get(key) ?? [];
      list.push(scene);
      groups.set(key, list);
    }
    return groups;
  }, [scenes]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vegetation Analysis</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            Sentinel-2 satellite imagery — NDVI, NBR, and vegetation indices
            <InfoTooltip text="Sentinel-2 provides 10m multispectral imagery every 5 days. Data served via Digital Earth Australia (DEA) and CDSE Sentinel Hub." />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            <Satellite className="mr-2 h-4 w-4" />
            Refresh Scenes
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {/* Index selector */}
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Product / Index
            </p>
            <Select
              value={sentinelProduct}
              onValueChange={(v) => setSentinelProduct(v as typeof sentinelProduct)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDEX_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedIndex && (
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedIndex.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Date range */}
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Date Range
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={sentinelDateRange[0]}
                onChange={(e) =>
                  setSentinelDateRange([e.target.value, sentinelDateRange[1]])
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={sentinelDateRange[1]}
                onChange={(e) =>
                  setSentinelDateRange([sentinelDateRange[0], e.target.value])
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cloud cover filter */}
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Max Cloud Cover
              <InfoTooltip text="Filter scenes by maximum cloud cover percentage. Lower values give clearer imagery but fewer results." />
            </p>
            <Select
              value={String(sentinelCloudCover)}
              onValueChange={(v) => setSentinelCloudCover(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50, 75, 100].map((pct) => (
                  <SelectItem key={pct} value={String(pct)}>
                    {pct}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardContent className="flex flex-col gap-2 pt-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Quick Actions
            </p>
            <Button
              size="sm"
              onClick={() => {
                const { toggleLayer, layers } = useMapStore.getState();
                const sentinelLayer = layers.find((l) => l.id === "sentinel");
                if (sentinelLayer && !sentinelLayer.visible) {
                  toggleLayer("sentinel");
                }
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Show on Map
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={sentinelLoading || downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  const params = new URLSearchParams({
                    product: sentinelProduct,
                    dateStart: sentinelDateRange[0],
                    dateEnd: sentinelDateRange[1],
                  });
                  const res = await fetch(`/api/sentinel/imagery?${params}`);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  // 202 means still processing — can't download yet
                  if (res.status === 202) {
                    alert("Image is still processing. Please wait for it to finish loading on the map first.");
                    return;
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `sentinel_${sentinelProduct}_${sentinelDateRange[0]}_${sentinelDateRange[1]}.webp`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("Download failed:", err);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Downloading..." : "Download Image"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Scene results */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-4 text-sm text-destructive">
            Failed to load scenes: {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Available Scenes
            </CardTitle>
            <Badge variant="outline">
              {total} scene{total !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && scenes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Searching CDSE catalog...
              </span>
            </div>
          ) : scenes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No scenes found for the selected date range and cloud cover.
              Try expanding the date range or increasing the cloud cover
              threshold.
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(scenesByMonth.entries()).map(([month, monthScenes]) => (
                <div key={month}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {formatMonth(month)}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {monthScenes.map((scene) => (
                      <SceneCard key={scene.sceneId} scene={scene} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">About Sentinel-2 Imagery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Sentinel-2</strong> is a constellation of two satellites
            (2A and 2B) operated by ESA as part of the EU Copernicus programme.
            Each satellite carries a multispectral imager with 13 bands from
            visible to short-wave infrared (SWIR) at 10m, 20m, and 60m
            resolution.
          </p>
          <p>
            <strong>DEA (Digital Earth Australia)</strong> provides
            analysis-ready surface reflectance data for Australian coverage,
            including pre-computed NDVI and Fuel Moisture Content products.
          </p>
          <p>
            <strong>CDSE (Copernicus Data Space Ecosystem)</strong> provides
            global coverage with custom processing via evalscripts — enabling
            on-the-fly computation of vegetation and fire indices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SceneCard({ scene }: { scene: SentinelScene }) {
  const date = new Date(scene.date);
  const formattedDate = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden">
      {/* Thumbnail */}
      {scene.thumbnailUrl ? (
        <div className="relative h-32 w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={scene.thumbnailUrl}
            alt={`Sentinel-2 scene ${formattedDate}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center bg-muted">
          <Satellite className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{formattedDate}</p>
          <Badge variant="outline" className="text-xs">
            {scene.satellite}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {scene.cloudCover != null && (
            <span className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              {scene.cloudCover.toFixed(0)}%
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {scene.sceneId.slice(0, 20)}...
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}
