"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileArchive, Check, AlertCircle, Loader2 } from "lucide-react";
import shp from "shpjs";

type SupportedFormat = "shapefile" | "geojson";

interface ParsedFeature {
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  area_ha: number | null;
}

interface ShapefileUploadProps {
  onFeaturesLoaded: (features: ParsedFeature[]) => void;
}

export function ShapefileUpload({ onFeaturesLoaded }: ShapefileUploadProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("loading");
      setFileName(file.name);
      setErrorMessage(null);

      try {
        // Detect format from extension
        const ext = file.name.toLowerCase().split(".").pop();
        const format: SupportedFormat =
          ext === "geojson" || ext === "json" ? "geojson" : "shapefile";

        let collections: GeoJSON.FeatureCollection[];

        if (format === "geojson") {
          const text = await file.text();
          const parsed = JSON.parse(text) as GeoJSON.GeoJSON;

          if (parsed.type === "FeatureCollection") {
            collections = [parsed as GeoJSON.FeatureCollection];
          } else if (parsed.type === "Feature") {
            collections = [
              {
                type: "FeatureCollection",
                features: [parsed as GeoJSON.Feature],
              },
            ];
          } else {
            // Bare geometry
            collections = [
              {
                type: "FeatureCollection",
                features: [
                  { type: "Feature", properties: {}, geometry: parsed as GeoJSON.Geometry },
                ],
              },
            ];
          }
        } else {
          const arrayBuffer = await file.arrayBuffer();
          const result = await shp(arrayBuffer);
          collections = Array.isArray(result) ? result : [result];
        }

        const parsed: ParsedFeature[] = [];

        for (const collection of collections) {
          for (const feature of collection.features) {
            // Try to extract a name from common attribute fields
            const props = feature.properties ?? {};
            const name =
              (props.NAME as string) ??
              (props.Name as string) ??
              (props.name as string) ??
              (props.ZONE as string) ??
              (props.Zone as string) ??
              (props.LABEL as string) ??
              (props.Label as string) ??
              (props.ID as string) ??
              `Zone ${parsed.length + 1}`;

            // Try to extract area from common fields
            const areaRaw =
              (props.AREA_HA as number) ??
              (props.Area_Ha as number) ??
              (props.area_ha as number) ??
              (props.AREA as number) ??
              (props.Shape_Area as number) ??
              null;

            // Convert Shape_Area (likely m²) to ha if > 10000
            const area_ha =
              areaRaw !== null && areaRaw > 10000
                ? Math.round(areaRaw / 10000)
                : areaRaw;

            parsed.push({
              name: String(name),
              geometry: feature.geometry,
              properties: props,
              area_ha,
            });
          }
        }

        setFeatureCount(parsed.length);
        setStatus("success");
        onFeaturesLoaded(parsed);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to parse file"
        );
      }
    },
    [onFeaturesLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <Card>
      <CardContent className="pt-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          {status === "idle" && (
            <>
              <FileArchive className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Drop a shapefile (.zip) or GeoJSON here
                </p>
                <p className="text-sm text-muted-foreground">
                  ZIP shapefile (.shp, .dbf, .shx, .prj) or .geojson / .json
                </p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".zip,.shp,.geojson,.json"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </span>
                </Button>
              </label>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Parsing {fileName}...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <Check className="h-10 w-10 text-green-500" />
              <div>
                <p className="font-medium">{fileName}</p>
                <Badge variant="secondary" className="mt-1">
                  {featureCount} zone{featureCount !== 1 ? "s" : ""} found
                </Badge>
              </div>
              <label>
                <input
                  type="file"
                  accept=".zip,.shp,.geojson,.json"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Upload Different File</span>
                </Button>
              </label>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Failed to parse file
                </p>
                {errorMessage && (
                  <p className="text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                )}
              </div>
              <label>
                <input
                  type="file"
                  accept=".zip,.shp,.geojson,.json"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Try Again</span>
                </Button>
              </label>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
