"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trees, Upload, X, Check } from "lucide-react";
import { ShapefileUpload } from "@/components/shapefile-upload";
import { useVegetationStore } from "@/stores/vegetation-store";

interface ParsedFeature {
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  area_ha: number | null;
}

export function VegUploadPanel() {
  const vegLayer = useVegetationStore((s) => s.layer);
  const vegClasses = useVegetationStore((s) => s.classes);
  const classAttribute = useVegetationStore((s) => s.classAttribute);
  const setLayer = useVegetationStore((s) => s.setLayer);
  const clearLayer = useVegetationStore((s) => s.clearLayer);
  const persistToIndexedDB = useVegetationStore((s) => s.persistToIndexedDB);

  const [pendingFeatures, setPendingFeatures] = useState<ParsedFeature[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  // Get all numeric/string attributes from the first feature
  const availableAttributes = pendingFeatures.length > 0
    ? Object.entries(pendingFeatures[0].properties)
        .filter(([, v]) => typeof v === "number" || typeof v === "string")
        .map(([k]) => k)
    : [];

  const handleFeaturesLoaded = useCallback((parsed: ParsedFeature[]) => {
    setPendingFeatures(parsed);
    // Auto-detect common veg attribute names
    if (parsed.length > 0) {
      const props = parsed[0].properties;
      const candidates = [
        "VEG_CODE", "veg_code", "FUEL_TYPE", "fuel_type",
        "VEG_CLASS", "veg_class", "CLASS", "class",
        "CODE", "code", "TYPE", "type",
      ];
      const found = candidates.find((c) => c in props);
      if (found) setSelectedAttribute(found);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingFeatures.length === 0 || !selectedAttribute) return;

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pendingFeatures.map((f) => ({
        type: "Feature" as const,
        properties: f.properties,
        geometry: f.geometry,
      })),
    };

    setLayer(fc, selectedAttribute);
    persistToIndexedDB();
    setPendingFeatures([]);
    setShowUpload(false);
  }, [pendingFeatures, selectedAttribute, setLayer, persistToIndexedDB]);

  // Already loaded state
  if (vegLayer && !showUpload) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trees className="h-4 w-4" />
            Vegetation Layer
            <Badge variant="secondary" className="ml-auto">
              <Check className="mr-1 h-3 w-3" />
              Loaded
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Classification attribute: <strong>{classAttribute}</strong>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vegClasses.map((cls) => (
                <Badge key={String(cls.code)} variant="outline" className="text-xs">
                  <div
                    className="mr-1.5 h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: cls.color }}
                  />
                  {cls.name} ({cls.featureCount})
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearLayer();
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trees className="h-4 w-4" />
          Vegetation Classification Layer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingFeatures.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload your vegetation/fuel type classification shapefile.
              This is used to compute CFI Tables 3 & 9 (area by vegetation class and season).
            </p>
            <ShapefileUpload onFeaturesLoaded={handleFeaturesLoaded} />
          </div>
        ) : (
          <div className="space-y-4">
            <Badge variant="secondary">
              {pendingFeatures.length} polygon{pendingFeatures.length !== 1 ? "s" : ""} loaded
            </Badge>

            <div>
              <Label htmlFor="veg-attribute">Vegetation Class Attribute</Label>
              <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
                <SelectTrigger id="veg-attribute">
                  <SelectValue placeholder="Select attribute..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAttributes.map((attr) => (
                    <SelectItem key={attr} value={attr}>
                      {attr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Which attribute holds the vegetation class or CER fuel type code
              </p>
            </div>

            {selectedAttribute && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Detected classes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const values = new Map<string, number>();
                    for (const f of pendingFeatures) {
                      const v = String(f.properties[selectedAttribute] ?? "");
                      values.set(v, (values.get(v) ?? 0) + 1);
                    }
                    return Array.from(values.entries()).map(([v, count]) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {v} ({count})
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setPendingFeatures([]);
                setShowUpload(false);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedAttribute}
              >
                <Upload className="mr-2 h-4 w-4" />
                Set Vegetation Layer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
