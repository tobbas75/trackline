"use client";

import { useHotspots } from "@/hooks/use-hotspots";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Flame, Satellite } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

export default function HotspotsPage() {
  const { data, isLoading, error, count, lastUpdated, refresh } =
    useHotspots();

  const features = data?.features ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Hotspots</h1>
          <p className="text-sm text-muted-foreground">
            DEA satellite fire detections — last 72 hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Hotspots"
          value={count}
          icon={<Flame className="h-4 w-4 text-red-500" />}
          tooltip="Total satellite fire detections within the project boundary in the last 72 hours."
        />
        <StatCard
          title="VIIRS Detections"
          value={features.filter((f) => f.properties?.satellite === "VIIRS").length}
          icon={<Satellite className="h-4 w-4 text-blue-500" />}
          tooltip="Visible Infrared Imaging Radiometer Suite — 375m resolution satellite sensor on Suomi NPP and NOAA-20."
        />
        <StatCard
          title="MODIS Detections"
          value={features.filter((f) => f.properties?.satellite === "MODIS").length}
          icon={<Satellite className="h-4 w-4 text-green-500" />}
          tooltip="Moderate Resolution Imaging Spectroradiometer — 1km resolution sensor on NASA Terra and Aqua satellites."
        />
        <StatCard
          title="High Confidence"
          value={
            features.filter(
              (f) => (f.properties?.confidence ?? 0) >= 80
            ).length
          }
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          tooltip="Detections with ≥80% confidence — most likely to be real fires rather than false positives."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Detections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && features.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading hotspot data from DEA...
            </p>
          ) : features.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hotspots detected in the last 72 hours
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Satellite</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      Confidence
                      <InfoTooltip text="Algorithm certainty that the detection is a real fire. ≥80% is high, 50–80% nominal, <50% low." />
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      FRP (MW)
                      <InfoTooltip text="Fire Radiative Power in megawatts — indicates fire intensity. Higher values mean more intense burning." />
                    </span>
                  </TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.slice(0, 100).map((feature, idx) => {
                  const props = feature.properties ?? {};
                  const coords =
                    feature.geometry.type === "Point"
                      ? feature.geometry.coordinates
                      : [0, 0];
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {props.acquisition_time
                          ? new Date(
                              props.acquisition_time as string
                            ).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(props.satellite as string) ?? "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ConfidenceBadge
                          value={props.confidence as number}
                        />
                      </TableCell>
                      <TableCell>
                        {props.frp != null
                          ? Number(props.frp).toFixed(1)
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {Number(coords[1]).toFixed(4)},{" "}
                        {Number(coords[0]).toFixed(4)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tooltip,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {title}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ value }: { value?: number }) {
  if (value == null) return <span>—</span>;
  const variant =
    value >= 80 ? "destructive" : value >= 50 ? "secondary" : "outline";
  return <Badge variant={variant}>{value}%</Badge>;
}
