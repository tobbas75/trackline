"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { ShapefileUpload } from "@/components/shapefile-upload";
import { useFireScarStore, summariseFireScars } from "@/stores/fire-scar-store";
import { useBaselineStore } from "@/stores/baseline-store";
import { useProjectStore } from "@/stores/project-store";
import type { FireScarSource } from "@/lib/analysis-types";

interface ParsedFeature {
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  area_ha: number | null;
}

export function FireScarUploadDialog() {
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [label, setLabel] = useState("");
  const [source, setSource] = useState<FireScarSource>("field_mapped");
  const [monthAttribute, setMonthAttribute] = useState("month");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addDataset = useFireScarStore((s) => s.addDataset);
  const persistDataset = useFireScarStore((s) => s.persistDataset);
  const edsEndMonth = useBaselineStore((s) => s.edsEndMonth);
  const activeProject = useProjectStore((s) => s.activeProject);

  // Detect available month-like attributes from the first feature
  const availableAttributes = features.length > 0
    ? Object.keys(features[0].properties).filter((k) => {
        const val = features[0].properties[k];
        return typeof val === "number" || k.toLowerCase().includes("month") || k.toLowerCase().includes("date");
      })
    : [];

  const handleFeaturesLoaded = useCallback((parsed: ParsedFeature[]) => {
    setFeatures(parsed);
    setUploadError(null);
    // Auto-detect month attribute
    if (parsed.length > 0) {
      const props = parsed[0].properties;
      const candidates = ["month", "Month", "MONTH", "burn_month", "BURN_MONTH"];
      const found = candidates.find((c) => c in props);
      if (found) setMonthAttribute(found);
    }
  }, []);

  const handleImport = useCallback(async () => {
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || features.length === 0) return;

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: features.map((f) => ({
        type: "Feature" as const,
        properties: {
          ...f.properties,
          month: f.properties[monthAttribute] as number | undefined,
          area_ha: f.area_ha ?? f.properties.area_ha,
        },
        geometry: f.geometry,
      })),
    };

    const stats = summariseFireScars(fc, edsEndMonth);
    const displayLabel =
      label || `${source === "field_mapped" ? "Field mapped" : "Custom"} ${yearNum}`;

    // Upload to server if we have a project context
    if (activeProject?.id) {
      setUploading(true);
      setUploadError(null);

      try {
        const res = await fetch("/api/fire-scars/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: activeProject.id,
            year: yearNum,
            label: displayLabel,
            source,
            feature_count: fc.features.length,
            total_ha: stats.totalHa,
            eds_ha: stats.edsHa,
            lds_ha: stats.ldsHa,
            geojson: fc,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
        return;
      }

      setUploading(false);
    }

    // Also add to local store for immediate display
    const id = `${source}-${yearNum}-${Date.now()}`;
    const dataset = {
      id,
      source,
      year: yearNum,
      label: displayLabel,
      featureCollection: fc,
      featureCount: fc.features.length,
      totalHa: stats.totalHa,
      edsHa: stats.edsHa,
      ldsHa: stats.ldsHa,
      uploadedAt: new Date().toISOString(),
      persisted: true,
    };

    addDataset(dataset);
    persistDataset(id);

    // Reset and close
    setFeatures([]);
    setLabel("");
    setUploadError(null);
    setOpen(false);
  }, [features, year, label, source, monthAttribute, edsEndMonth, addDataset, persistDataset, activeProject]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Fire Scars
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Fire Scar Data</DialogTitle>
        </DialogHeader>

        {features.length === 0 ? (
          <ShapefileUpload onFeaturesLoaded={handleFeaturesLoaded} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <Badge variant="secondary">
                {features.length} fire scar{features.length !== 1 ? "s" : ""} loaded
              </Badge>
              {activeProject && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Uploading to project: {activeProject.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fire-scar-year">Year</Label>
                <Input
                  id="fire-scar-year"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fire-scar-source">Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as FireScarSource)}>
                  <SelectTrigger id="fire-scar-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="field_mapped">Field Mapped</SelectItem>
                    <SelectItem value="nafi_modis">NAFI (MODIS)</SelectItem>
                    <SelectItem value="nafi_sentinel">NAFI (Sentinel)</SelectItem>
                    <SelectItem value="combined">Combined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="fire-scar-label">Label</Label>
              <Input
                id="fire-scar-label"
                placeholder={`e.g. "2024 Bathurst Island field mapping"`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {availableAttributes.length > 0 && (
              <div>
                <Label htmlFor="month-attr">Month Attribute</Label>
                <Select value={monthAttribute} onValueChange={setMonthAttribute}>
                  <SelectTrigger id="month-attr">
                    <SelectValue />
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
                  Which attribute contains the burn month (1-12)
                </p>
              </div>
            )}

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeatures([])} disabled={uploading}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Import ${features.length} Fire Scars`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
