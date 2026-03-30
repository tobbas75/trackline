"use client";

import { Badge } from "@/components/ui/badge";
import { Flame, MapPin, Crosshair } from "lucide-react";

interface MapStatusBarProps {
  hotspotCount: number;
  hotspotsUpdated: Date | null;
  mouseCoords: [number, number] | null;
  activeZone: string | null;
}

const HOTSPOT_LEGEND = [
  { label: "<6h", color: "#ff0040" },
  { label: "6-12h", color: "#ff6600" },
  { label: "12-24h", color: "#ffcc00" },
  { label: "24-48h", color: "#00cc88" },
];

export function MapStatusBar({
  hotspotCount,
  hotspotsUpdated,
  mouseCoords,
  activeZone,
}: MapStatusBarProps) {
  const timeAgo = hotspotsUpdated
    ? formatTimeAgo(hotspotsUpdated)
    : "loading...";

  return (
    <div className="absolute bottom-10 left-3 z-20 flex flex-col gap-1.5">
      {/* Hotspot time legend */}
      {hotspotCount > 0 && (
        <div className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 shadow-sm">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Hotspots:
          </span>
          {HOTSPOT_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Status badges */}
      <div className="flex items-center gap-2">
        {activeZone && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1"
          >
            <MapPin className="h-3 w-3" />
            {activeZone}
          </Badge>
        )}
        <Badge
          variant={hotspotCount > 0 ? "destructive" : "secondary"}
          className="flex items-center gap-1.5 py-1"
        >
          <Flame className="h-3 w-3" />
          {hotspotCount} hotspot{hotspotCount !== 1 ? "s" : ""} (48h)
        </Badge>
        <Badge variant="outline" className="py-1 text-xs">
          Updated {timeAgo}
        </Badge>
        {mouseCoords && (
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 py-1 font-mono text-xs"
          >
            <Crosshair className="h-3 w-3" />
            {mouseCoords[1].toFixed(5)}, {mouseCoords[0].toFixed(5)}
          </Badge>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
