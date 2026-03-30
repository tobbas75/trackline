"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { useAnalysisStore } from "@/stores/analysis-store";

const STAGE_LABELS: Record<string, string> = {
  clipping: "Clipping fire scars to project boundary",
  classifying: "Classifying by season and computing areas",
  shape_index: "Computing patch shape complexity",
  veg_intersection: "Intersecting with vegetation layer",
  burn_history: "Analysing multi-year burn history",
  unburnt_analysis: "Identifying unburnt patches",
  distance_metrics: "Computing distance to unburnt areas",
  rolling_averages: "Calculating rolling burn averages",
  targets: "Evaluating Healthy Country Plan targets",
  cancelled: "Cancelled",
};

interface AnalysisProgressProps {
  onCancel?: () => void;
}

export function AnalysisProgress({ onCancel }: AnalysisProgressProps) {
  const status = useAnalysisStore((s) => s.status);
  const progress = useAnalysisStore((s) => s.progress);
  const error = useAnalysisStore((s) => s.error);

  if (status === "idle" || status === "complete") return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardContent className="pt-4">
        {status === "running" && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium">
                  Running Analysis
                </span>
                <Badge variant="secondary" className="text-xs">
                  {progress.percent}%
                </Badge>
              </div>
              {onCancel && (
                <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {STAGE_LABELS[progress.stage] ?? progress.stage}
              {progress.detail && ` — ${progress.detail}`}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <X className="h-4 w-4" />
            <span>Analysis failed: {error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
