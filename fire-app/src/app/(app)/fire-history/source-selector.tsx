"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useFireScarStore } from "@/stores/fire-scar-store";
import { useMapStore } from "@/stores/map-store";

interface SourceSelectorProps {
  year: number;
}

const SOURCE_LABELS: Record<string, string> = {
  nafi_modis: "NAFI",
  nafi_sentinel: "Sentinel",
  field_mapped: "Field",
  combined: "Combined",
};

export function SourceSelector({ year }: SourceSelectorProps) {
  const allDatasets = useFireScarStore((s) => s.datasets);
  const datasets = useMemo(() => allDatasets.filter((d) => d.year === year), [allDatasets, year]);
  const selectedByYear = useFireScarStore((s) => s.selectedSourceByYear);
  const setSelectedSource = useFireScarStore((s) => s.setSelectedSource);
  const removeDataset = useFireScarStore((s) => s.removeDataset);
  const setFireScarsSource = useMapStore((s) => s.setFireScarsSource);

  const selectedId = selectedByYear[year];

  if (datasets.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Source:</span>
      {datasets.map((ds) => (
        <div key={ds.id} className="flex items-center gap-0.5">
          <Button
            variant={ds.id === selectedId ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedSource(year, ds.id);
              // Sync to map store — null means use NAFI, otherwise use custom dataset
              setFireScarsSource(ds.source === "nafi_modis" ? null : ds.id);
            }}
          >
            {ds.label}
            <Badge variant="secondary" className="ml-1.5 px-1 text-[10px]">
              {SOURCE_LABELS[ds.source] ?? ds.source}
            </Badge>
          </Button>
          {ds.source !== "nafi_modis" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => removeDataset(ds.id)}
              title="Remove dataset"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
