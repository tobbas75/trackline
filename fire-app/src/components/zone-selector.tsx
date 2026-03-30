"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useZoneStore } from "@/stores/zone-store";
import { useProjectStore } from "@/stores/project-store";
import { getZonesForProject } from "@/lib/mock-data";
import { MapPin } from "lucide-react";

export function ZoneSelector() {
  const { activeProject } = useProjectStore();
  const { zones, activeZone, setZones, setActiveZone } = useZoneStore();

  useEffect(() => {
    if (activeProject) {
      const projectZones = getZonesForProject(activeProject.id);
      setZones(projectZones);
    } else {
      setZones([]);
      setActiveZone(null);
    }
  }, [activeProject, setZones, setActiveZone]);

  if (zones.length === 0) return null;

  return (
    <Select
      value={activeZone?.id ?? "__all__"}
      onValueChange={(value) => {
        if (value === "__all__") {
          setActiveZone(null);
        } else {
          const zone = zones.find((z) => z.id === value) ?? null;
          setActiveZone(zone);
        }
      }}
    >
      <SelectTrigger className="w-48">
        <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Entire Project</SelectItem>
        {zones.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            <div className="flex items-center gap-2">
              {zone.color && (
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
              )}
              {zone.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
