"use client";

import { useState } from "react";
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
import { useReferenceLayerStore } from "@/stores/reference-layer-store";
import { useProjectStore } from "@/stores/project-store";
import {
  Upload,
  Trash2,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Database, Json } from "@/lib/supabase/types";

type ReferenceLayer = Database["public"]["Tables"]["reference_layer"]["Row"];

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

interface ParsedFeature {
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  area_ha: number | null;
}

export default function ReferenceLayersPage() {
  const { activeProject } = useProjectStore();
  const { layers, addLayer, removeLayer, toggleLayerVisibility } = useReferenceLayerStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingFeatures, setPendingFeatures] = useState<ParsedFeature[]>([]);
  const [layerName, setLayerName] = useState("");
  const [layerColor, setLayerColor] = useState(COLORS[0]);

  function handleFeaturesLoaded(features: ParsedFeature[]) {
    setPendingFeatures(features);
  }

  function importLayer() {
    if (!layerName || pendingFeatures.length === 0) return;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pendingFeatures.map((f) => ({
        type: "Feature" as const,
        properties: f.properties,
        geometry: f.geometry,
      })),
    };

    // Detect dominant geometry type
    const types = new Set(pendingFeatures.map((f) => f.geometry.type));
    const geometryType = types.size === 1 ? [...types][0] : "Mixed";

    const newLayer: ReferenceLayer = {
      id: `ref-${Date.now()}`,
      project_id: activeProject?.id ?? "",
      name: layerName,
      description: null,
      geojson_data: geojsonData as unknown as Json,
      geometry_type: geometryType,
      feature_count: pendingFeatures.length,
      color: layerColor,
      visible: true,
      sort_order: layers.length,
      uploaded_by: null,
      created_at: new Date().toISOString(),
    };

    addLayer(newLayer);
    setPendingFeatures([]);
    setLayerName("");
    setLayerColor(COLORS[(layers.length + 1) % COLORS.length]);
    setImportDialogOpen(false);
  }

  const totalFeatures = layers.reduce((sum, l) => sum + l.feature_count, 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reference Layers</h1>
          <p className="text-sm text-muted-foreground">
            Upload shapefiles or GeoJSON as reference layers for burn planning —
            roads, tracks, vegetation, firebreaks, and more
          </p>
        </div>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Layer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Reference Layer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <ShapefileUpload onFeaturesLoaded={handleFeaturesLoaded} />

              {pendingFeatures.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    {pendingFeatures.length} feature
                    {pendingFeatures.length !== 1 ? "s" : ""} ready to import
                  </p>

                  <div>
                    <Label htmlFor="layer-name">Layer Name</Label>
                    <Input
                      id="layer-name"
                      value={layerName}
                      onChange={(e) => setLayerName(e.target.value)}
                      placeholder="e.g. Road Network, Firebreaks, Veg Types"
                    />
                  </div>

                  <div>
                    <Label>Layer Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setLayerColor(color)}
                          className={`h-7 w-7 rounded-full border-2 transition-transform ${
                            layerColor === color
                              ? "scale-110 border-foreground"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {[...new Set(pendingFeatures.map((f) => f.geometry.type))].map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    onClick={importLayer}
                    disabled={!layerName}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Import as &ldquo;{layerName || "..."}&rdquo;
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Layers className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{layers.length}</p>
              <p className="text-xs text-muted-foreground">Reference Layers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Layers className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalFeatures.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Features</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layers table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded Layers</CardTitle>
          <CardDescription>
            These layers appear on the Live Map and in burn plan map views for
            planning context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {layers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No reference layers uploaded</p>
                <p className="text-sm text-muted-foreground">
                  Upload a shapefile or GeoJSON to add planning context to your
                  maps — roads, tracks, vegetation boundaries, firebreaks, etc.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {layers.map((layer) => (
                  <TableRow key={layer.id}>
                    <TableCell>
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{layer.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{layer.geometry_type}</Badge>
                    </TableCell>
                    <TableCell>{layer.feature_count}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleLayerVisibility(layer.id)}
                      >
                        {layer.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeLayer(layer.id)}
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
    </div>
  );
}
