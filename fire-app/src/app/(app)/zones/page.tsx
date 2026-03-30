"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShapefileUpload } from "@/components/shapefile-upload";
import { useZoneStore } from "@/stores/zone-store";
import { useProjectStore } from "@/stores/project-store";
import { getZonesForProject } from "@/lib/mock-data";
import {
  Plus,
  MapPin,
  Trash2,
  FileArchive,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import type { Database } from "@/lib/supabase/types";

type AnalysisZone = Database["public"]["Tables"]["analysis_zone"]["Row"];

const COLORS = [
  "#3b82f6",
  "#f97316",
  "#06b6d4",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#eab308",
  "#ec4899",
];

export default function ZonesPage() {
  const { activeProject } = useProjectStore();
  const { zones, setZones, addZone, removeZone } = useZoneStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingFeatures, setPendingFeatures] = useState<
    { name: string; geometry: GeoJSON.Geometry; area_ha: number | null }[]
  >([]);

  useEffect(() => {
    if (activeProject) {
      const projectZones = getZonesForProject(activeProject.id);
      setZones(projectZones);
    }
  }, [activeProject, setZones]);

  function handleShapefileFeatures(
    features: {
      name: string;
      geometry: GeoJSON.Geometry;
      area_ha: number | null;
    }[]
  ) {
    setPendingFeatures(features);
  }

  function importPendingFeatures() {
    for (let i = 0; i < pendingFeatures.length; i++) {
      const feature = pendingFeatures[i];
      const slug = feature.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const newZone: AnalysisZone = {
        id: `zone-imported-${Date.now()}-${i}`,
        project_id: activeProject?.id ?? "",
        name: feature.name,
        slug,
        description: null,
        boundary: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: feature.name },
              geometry: feature.geometry,
            },
          ],
        } as unknown as AnalysisZone["boundary"],
        area_ha: feature.area_ha,
        color: COLORS[zones.length + i] ?? COLORS[i % COLORS.length],
        sort_order: zones.length + i + 1,
        created_at: new Date().toISOString(),
      };

      addZone(newZone);
    }

    setPendingFeatures([]);
    setImportDialogOpen(false);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis Zones</h1>
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">
              Break your project into distinct areas for targeted analysis —
              e.g. individual islands, management blocks, or country groups
            </p>
            <InfoTooltip text="Analysis zones subdivide a project into geographic areas. All fire metrics, burn statistics, and reporting can be filtered by zone." />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileArchive className="mr-2 h-4 w-4" />
                Import Zones
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Zones from Shapefile / GeoJSON</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <ShapefileUpload onFeaturesLoaded={handleShapefileFeatures} />

                {pendingFeatures.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {pendingFeatures.length} zone
                      {pendingFeatures.length !== 1 ? "s" : ""} ready to
                      import:
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {pendingFeatures.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  COLORS[(zones.length + i) % COLORS.length],
                              }}
                            />
                            <Input
                              value={f.name}
                              onChange={(e) => {
                                const updated = [...pendingFeatures];
                                updated[i] = { ...f, name: e.target.value };
                                setPendingFeatures(updated);
                              }}
                              className="h-7 w-48"
                            />
                          </div>
                          {f.area_ha && (
                            <Badge variant="outline">
                              {f.area_ha.toLocaleString()} ha
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={importPendingFeatures}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Import {pendingFeatures.length} Zone
                      {pendingFeatures.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Draw Zone
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Layers className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{zones.length}</p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">Analysis Zones</p>
                <InfoTooltip text="Total number of defined zones in this project. Import shapefiles or draw on the map to create zones." />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <MapPin className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {zones
                  .reduce((sum, z) => sum + (z.area_ha ?? 0), 0)
                  .toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">
                  Total zoned area (ha)
                </p>
                <InfoTooltip text="Sum of all zone areas in hectares. Compare against total project area to check for gaps or overlaps." />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <ArrowUpDown className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">
                {activeProject?.area_ha
                  ? `${Math.round(
                      (zones.reduce((sum, z) => sum + (z.area_ha ?? 0), 0) /
                        activeProject.area_ha) *
                        100
                    )}%`
                  : "—"}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">
                  Project area covered
                </p>
                <InfoTooltip text="Percentage of the total project area covered by analysis zones. Ideally 100% for comprehensive analysis." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Zones</CardTitle>
          <CardDescription>
            Each zone can be selected in the dashboard and metrics pages to
            scope analysis to that area only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No analysis zones defined</p>
                <p className="text-sm text-muted-foreground">
                  Import a shapefile or draw zones on the map to break your
                  project into analysis areas.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Area (ha)
                      <InfoTooltip text="Zone area in hectares, calculated from the imported boundary geometry." />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Order
                      <InfoTooltip text="Display order for this zone in dropdowns and lists." />
                    </div>
                  </TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{
                            backgroundColor: zone.color ?? "#888",
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {zone.name}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {zone.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {zone.area_ha
                          ? zone.area_ha.toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{zone.sort_order}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeZone(zone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How Analysis Zones Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Analysis zones let you subdivide a project into distinct geographic
            areas. All fire metrics, burn statistics, and reporting can then
            be filtered by zone.
          </p>
          <div className="grid gap-3 pt-2 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <Label className="text-foreground">Import Shapefile</Label>
              <p className="mt-1 text-xs">
                Upload a .zip shapefile — each polygon becomes a zone.
                Names are read from NAME, Zone, or Label attributes.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <Label className="text-foreground">Draw on Map</Label>
              <p className="mt-1 text-xs">
                Use the map drawing tools to manually define zone
                boundaries for custom analysis areas.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <Label className="text-foreground">Filter Analysis</Label>
              <p className="mt-1 text-xs">
                Select a zone from the dropdown on any metrics page to
                scope fire statistics, hotspots, and burn data to that area.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
