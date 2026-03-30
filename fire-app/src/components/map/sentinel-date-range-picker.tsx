"use client";

import { useState, useCallback } from "react";
import { useMapStore } from "@/stores/map-store";
import { useProjectStore } from "@/stores/project-store";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  CloudSun,
  Loader2,
} from "lucide-react";
import { getBufferedBBoxString } from "@/lib/geo-utils";

const WINDOW_DAYS = 7;
/** How many days to search either side of the current date when looking for clear imagery */
const SEARCH_WINDOW_DAYS = 60;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** YYYY-MM-DD → Date (local midnight) */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → YYYY-MM-DD */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today as YYYY-MM-DD */
function today(): string {
  return toISO(new Date());
}

/** Shift a YYYY-MM-DD by N days */
function shiftDate(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Build 7-day window ending on endDate, clamped to today */
function rangeEndingOn(endDate: string): [string, string] {
  const todayStr = today();
  const clamped = endDate > todayStr ? todayStr : endDate;
  const end = toDate(clamped);
  const start = new Date(end);
  start.setDate(start.getDate() - (WINDOW_DAYS - 1));
  return [toISO(start), clamped];
}

/** Format range as compact label, e.g. "1–7 Dec 2025" */
function formatRange(range: [string, string]): string {
  const [sy, sm, sd] = range[0].split("-").map(Number);
  const [ey, em, ed] = range[1].split("-").map(Number);

  if (sy === ey && sm === em) {
    return `${sd}–${ed} ${MONTHS_SHORT[em - 1]} ${ey}`;
  }
  if (sy === ey) {
    return `${sd} ${MONTHS_SHORT[sm - 1]} – ${ed} ${MONTHS_SHORT[em - 1]} ${ey}`;
  }
  return `${sd} ${MONTHS_SHORT[sm - 1]} ${sy} – ${ed} ${MONTHS_SHORT[em - 1]} ${ey}`;
}

interface SceneResult {
  date: string;
  cloudCover: number | null;
}

export function SentinelDateRangePicker() {
  const sentinelDateRange = useMapStore((s) => s.sentinelDateRange);
  const setSentinelDateRange = useMapStore((s) => s.setSentinelDateRange);
  const sentinelCloudCover = useMapStore((s) => s.sentinelCloudCover);
  const dataBufferKm = useMapStore((s) => s.dataBufferKm);
  const activeProject = useProjectStore((s) => s.activeProject);

  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const endDate = toDate(sentinelDateRange[1]);
  const startDate = toDate(sentinelDateRange[0]);
  const todayDate = new Date();

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    setSentinelDateRange(rangeEndingOn(toISO(day)));
    setOpen(false);
  }

  /**
   * Search ±60 days for the nearest Sentinel-2 scene below the
   * current cloud-cover threshold, then jump the date range to it.
   */
  const findClear = useCallback(async () => {
    if (!activeProject?.boundary) return;

    const bbox = getBufferedBBoxString(
      activeProject.boundary as unknown as GeoJSON.GeoJSON,
      dataBufferKm
    );
    if (!bbox) return;

    setSearching(true);
    try {
      const currentEnd = sentinelDateRange[1];
      const todayStr = today();
      const searchStart = shiftDate(currentEnd, -SEARCH_WINDOW_DAYS);
      const searchEnd = shiftDate(currentEnd, SEARCH_WINDOW_DAYS);
      const clampedEnd = searchEnd > todayStr ? todayStr : searchEnd;

      const params = new URLSearchParams({
        bbox,
        dateStart: searchStart,
        dateEnd: clampedEnd,
        maxCloud: String(sentinelCloudCover),
        limit: "50",
      });

      const res = await fetch(`/api/sentinel/scenes?${params}`);
      if (!res.ok) return;

      const data = (await res.json()) as { scenes: SceneResult[] };
      if (!data.scenes.length) return;

      // Find the scene closest to the current end date
      const currentMs = toDate(currentEnd).getTime();
      let bestScene: SceneResult | null = null;
      let bestDist = Infinity;

      for (const scene of data.scenes) {
        // Scene date is ISO datetime — extract the date part
        const sceneDate = scene.date.slice(0, 10);
        // Skip if it's the same as our current selection
        if (sceneDate === currentEnd) continue;

        const dist = Math.abs(toDate(sceneDate).getTime() - currentMs);
        if (dist < bestDist) {
          bestDist = dist;
          bestScene = { ...scene, date: sceneDate };
        }
      }

      if (bestScene) {
        setSentinelDateRange(rangeEndingOn(bestScene.date));
      }
    } finally {
      setSearching(false);
    }
  }, [
    activeProject,
    dataBufferKm,
    sentinelDateRange,
    sentinelCloudCover,
    setSentinelDateRange,
  ]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="min-w-0 flex-1 justify-start gap-1.5 font-normal"
            >
              <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs">
                {formatRange(sentinelDateRange)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleSelect}
              defaultMonth={endDate}
              disabled={{ after: todayDate }}
              modifiers={{ range: { from: startDate, to: endDate } }}
              modifiersClassNames={{
                range: "bg-accent text-accent-foreground rounded-none",
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={findClear}
          disabled={searching || !activeProject?.boundary}
          title="Find nearest clear image"
          className="shrink-0"
        >
          {searching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CloudSun className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
