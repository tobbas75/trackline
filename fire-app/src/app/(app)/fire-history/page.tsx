"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useFireScars } from "@/hooks/use-fire-scars";
import { useMapStore } from "@/stores/map-store";
import { useFireScarStore } from "@/stores/fire-scar-store";
import { FireScarUploadDialog } from "./fire-scar-upload";
import { SourceSelector } from "./source-selector";

/** Approximate total project area (Tiwi Islands) in hectares */
const PROJECT_AREA_HA = 786_000;

export default function FireHistoryPage() {
  const currentYear = new Date().getFullYear();
  const fireScarsYear = useMapStore((s) => s.fireScarsYear);
  const setFireScarsYear = useMapStore((s) => s.setFireScarsYear);
  const { data, yearSummary, availableYears, isLoading } =
    useFireScars(fireScarsYear);

  // Check for custom uploaded datasets for this year
  const allDatasets = useFireScarStore((s) => s.datasets);
  const customDatasets = useMemo(() => allDatasets.filter((d) => d.year === fireScarsYear), [allDatasets, fireScarsYear]);
  const hasCustomData = customDatasets.length > 0;

  const [localViewMode, setLocalViewMode] = useState<"annual" | "monthly">("annual");

  const maxYear = availableYears.length > 0
    ? availableYears[availableYears.length - 1]
    : currentYear;
  const minYear = availableYears.length > 0 ? availableYears[0] : 2000;

  // Compute monthly breakdown from feature data
  const monthlyData = useMemo(() => {
    if (!data?.features) return Array.from({ length: 12 }, () => 0);
    const totals = Array.from({ length: 12 }, () => 0);
    for (const f of data.features) {
      const month = f.properties?.month;
      if (month >= 1 && month <= 12) {
        totals[month - 1] += f.properties?.area_ha ?? 0;
      }
    }
    return totals.map((v) => Math.round(v));
  }, [data]);

  const totalHa = yearSummary?.total_ha ?? 0;
  const edsHa = yearSummary?.eds_ha ?? 0;
  const ldsHa = yearSummary?.lds_ha ?? 0;
  const burntPct = totalHa > 0 ? ((totalHa / PROJECT_AREA_HA) * 100).toFixed(1) : "—";
  const unburntHa = totalHa > 0 ? Math.round(PROJECT_AREA_HA - totalHa) : 0;

  const hasData = yearSummary != null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fire Scar History</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            Browse NAFI fire scar data by year — EDS (blue) / LDS (red)
            <InfoTooltip text="NAFI (North Australia Fire Information) maps fire scars from MODIS 250m satellite imagery. Updated approximately every 2 weeks during fire season." />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <FireScarUploadDialog />
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Year navigation */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setFireScarsYear(Math.max(minYear, fireScarsYear - 1))}
          disabled={fireScarsYear <= minYear}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={fireScarsYear.toString()}
          onValueChange={(v) => setFireScarsYear(parseInt(v))}
        >
          <SelectTrigger className="w-30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(availableYears.length > 0
              ? [...availableYears].reverse()
              : Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i)
            ).map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setFireScarsYear(Math.min(maxYear, fireScarsYear + 1))}
          disabled={fireScarsYear >= maxYear}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="ml-4 flex gap-1">
          <Button
            variant={localViewMode === "annual" ? "default" : "outline"}
            size="sm"
            onClick={() => setLocalViewMode("annual")}
          >
            Annual
          </Button>
          <Button
            variant={localViewMode === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setLocalViewMode("monthly")}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Source selector (shown when multiple datasets exist for this year) */}
      {hasCustomData && (
        <div className="mb-4">
          <SourceSelector year={fireScarsYear} />
        </div>
      )}

      {/* Legend */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-blue-500" />
          <span className="text-sm">EDS (Early Dry Season)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="text-sm">LDS (Late Dry Season)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-gray-300" />
          <span className="text-sm">Unburnt</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <SummaryCard
          label="Total Burnt"
          value={hasData ? Math.round(totalHa).toLocaleString() : "—"}
          unit="ha"
        />
        <SummaryCard
          label="Burnt %"
          value={hasData ? burntPct : "—"}
          unit="%"
          tooltip="Percentage of the total project area (or selected zone) that has been burnt this year."
        />
        <SummaryCard
          label="EDS Area"
          value={hasData ? Math.round(edsHa).toLocaleString() : "—"}
          unit="ha"
          tooltip="Hectares burnt during the Early Dry Season (typically Apr–Jul)."
        >
          <Badge className="bg-blue-500">EDS</Badge>
        </SummaryCard>
        <SummaryCard
          label="LDS Area"
          value={hasData ? Math.round(ldsHa).toLocaleString() : "—"}
          unit="ha"
          tooltip="Hectares burnt during the Late Dry Season (typically Aug–Dec)."
        >
          <Badge className="bg-red-500">LDS</Badge>
        </SummaryCard>
        <SummaryCard
          label="Unburnt"
          value={hasData ? unburntHa.toLocaleString() : "—"}
          unit="ha"
        />
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle>Fire Scars — {fireScarsYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {data?.features?.length ?? 0} fire scar polygons detected across the
                project area in {fireScarsYear}.
              </p>
              <p>
                View these fire scars on the <strong>Live Map</strong> page — the
                Fire Scars layer is synced to the year selected here.
              </p>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {isLoading
                ? "Loading fire scar data..."
                : `No fire scar data available for ${fireScarsYear}.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monthly breakdown for "monthly" view */}
      {localViewMode === "monthly" && (
        <div className="mt-6 grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const ha = monthlyData[month - 1];
            const season =
              month >= 4 && month <= 7
                ? "EDS"
                : month >= 8
                  ? "LDS"
                  : "WET";
            const seasonColor =
              season === "EDS"
                ? "bg-blue-500"
                : season === "LDS"
                  ? "bg-red-500"
                  : "bg-gray-400";

            return (
              <Card key={month}>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm font-medium">
                    {new Date(2000, month - 1).toLocaleString("default", {
                      month: "short",
                    })}
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {hasData ? ha.toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">ha</p>
                  <Badge variant="outline" className="mt-1">
                    <div className={`mr-1 h-2 w-2 rounded-full ${seasonColor}`} />
                    {season}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  tooltip,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  tooltip?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          {children}
        </div>
        <p className="mt-1 text-xl font-bold">
          {value}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
