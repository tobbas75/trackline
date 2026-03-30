"use client";

import { useMapStore } from "@/stores/map-store";
import { Button } from "@/components/ui/button";
import { Radar, Globe } from "lucide-react";

/**
 * Toggle between 50km buffer around project area and full/unclipped data.
 * When buffer is active (default), hotspots and other data are queried
 * within 50km of the project boundary. Toggle to see the full area.
 */
export function MapBufferToggle() {
  const { dataBufferKm, setDataBufferKm } = useMapStore();
  const isBuffered = dataBufferKm > 0;

  return (
    <div className="absolute right-3 top-32 z-10">
      <Button
        variant="secondary"
        size="sm"
        className="flex items-center gap-1.5 shadow-md"
        onClick={() => setDataBufferKm(isBuffered ? 0 : 50)}
        title={
          isBuffered
            ? "Showing data within 50km of project — click for full area"
            : "Showing all data — click to clip to 50km"
        }
      >
        {isBuffered ? (
          <>
            <Radar className="h-3.5 w-3.5" />
            <span className="text-xs">50km</span>
          </>
        ) : (
          <>
            <Globe className="h-3.5 w-3.5" />
            <span className="text-xs">Full</span>
          </>
        )}
      </Button>
    </div>
  );
}
