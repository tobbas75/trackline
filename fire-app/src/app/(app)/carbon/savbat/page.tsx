"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  MapPin,
  Layers,
  Info,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

/** SavBAT raster requirements per CER methodology */
const RASTER_REQUIREMENTS = [
  {
    id: "fire_scar",
    name: "Fire Scar Raster",
    description: "Classified fire scar raster (EDS=1, LDS=2, Unburnt=0)",
    format: "GeoTIFF, 8-bit unsigned",
    projection: "GDA94 Albers (EPSG:3577)",
    resolution: "250m",
    required: true,
  },
  {
    id: "veg_fuel",
    name: "Vegetation Fuel Type",
    description: "9-class fuel type raster matching CER vegetation codes (1-9)",
    format: "GeoTIFF, 8-bit unsigned",
    projection: "GDA94 Albers (EPSG:3577)",
    resolution: "250m",
    required: true,
  },
  {
    id: "project_boundary",
    name: "Project Boundary",
    description: "Project area boundary polygon (inside=1, outside=0)",
    format: "GeoTIFF, 8-bit or Shapefile",
    projection: "GDA94 Albers (EPSG:3577)",
    resolution: "250m",
    required: true,
  },
  {
    id: "rainfall",
    name: "Rainfall Zone",
    description: "High rainfall (>1000mm) = 1, Low rainfall (600-1000mm) = 2",
    format: "GeoTIFF, 8-bit unsigned",
    projection: "GDA94 Albers (EPSG:3577)",
    resolution: "250m",
    required: true,
  },
  {
    id: "baseline_fire",
    name: "Baseline Fire History",
    description: "Annual fire scar rasters for each baseline year (10 or 15 years)",
    format: "GeoTIFF, 8-bit unsigned per year",
    projection: "GDA94 Albers (EPSG:3577)",
    resolution: "250m",
    required: true,
  },
];

/** Mock preparation runs */
interface PrepRun {
  id: string;
  period: string;
  created: string;
  status: "ready" | "processing" | "completed" | "failed";
  files_generated: number;
  total_files: number;
  savbat_ref: string | null;
  notes: string;
}

const prepRuns: PrepRun[] = [
  {
    id: "pr-1",
    period: "2022-23",
    created: "2023-08-15",
    status: "completed",
    files_generated: 5,
    total_files: 5,
    savbat_ref: "SB-2023-001",
    notes: "All rasters validated. Uploaded to SavBAT on 2023-09-01.",
  },
  {
    id: "pr-2",
    period: "2023-24",
    created: "2024-09-10",
    status: "completed",
    files_generated: 5,
    total_files: 5,
    savbat_ref: "SB-2024-001",
    notes: "Validated against NAFI v2 fire scars. Minor edge corrections applied.",
  },
  {
    id: "pr-3",
    period: "2024-25",
    created: "2025-11-20",
    status: "completed",
    files_generated: 5,
    total_files: 5,
    savbat_ref: "SB-2025-001",
    notes: "Ready for upload. Pending CER review.",
  },
  {
    id: "pr-4",
    period: "2025-26",
    created: "2026-02-28",
    status: "processing",
    files_generated: 3,
    total_files: 5,
    savbat_ref: null,
    notes: "Fire scar and vegetation rasters complete. Awaiting end-of-season data.",
  },
];

export default function SavBATPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("2025-26");

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/carbon">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Carbon
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold">SavBAT Data Preparation</h1>
          <p className="text-sm text-muted-foreground">
            Generate raster files for the Savanna Burning Abatement Tool
            (SavBAT v3)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-26">2025-26</SelectItem>
              <SelectItem value="2024-25">2024-25</SelectItem>
              <SelectItem value="2023-24">2023-24</SelectItem>
              <SelectItem value="2022-23">2022-23</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm">
            <Calculator className="mr-1.5 h-3.5 w-3.5" />
            Generate Rasters
          </Button>
        </div>
      </div>

      {/* SavBAT info */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 pt-4 text-sm">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span>
              SavBAT v3 is the CER&apos;s official calculator for savanna
              burning abatement. This tool generates the required input rasters
              from your fire scar data.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Projection: GDA94 Albers (EPSG:3577)</Badge>
            <Badge variant="outline">Resolution: 250m</Badge>
            <Badge variant="outline">Format: GeoTIFF 8-bit</Badge>
            <Badge variant="outline">NoData: 255</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Raster requirements */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Required Input Rasters
            <InfoTooltip text="SavBAT requires these raster files in GDA94 Albers projection at 250m resolution. Each file must be 8-bit unsigned GeoTIFF with NoData=255." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Raster Layer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RASTER_REQUIREMENTS.map((req, i) => {
                const currentRun = prepRuns.find(
                  (r) => r.period === selectedPeriod
                );
                const isGenerated =
                  currentRun && i < currentRun.files_generated;
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{req.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.description}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <p>{req.format}</p>
                        <p className="text-muted-foreground">
                          {req.projection} @ {req.resolution}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isGenerated ? (
                        <Badge className="gap-1 bg-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </Badge>
                      ) : currentRun?.status === "processing" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500 text-amber-600"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Not Started
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data source configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Data Source Configuration — {selectedPeriod}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Fire Scar Source</Label>
              <Select defaultValue="nafi">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nafi">
                    NAFI (MODIS 250m)
                  </SelectItem>
                  <SelectItem value="sentinel">
                    Sentinel-2 (10m, resampled)
                  </SelectItem>
                  <SelectItem value="field">
                    Field-mapped (GPS polygons)
                  </SelectItem>
                  <SelectItem value="combined">
                    Combined (NAFI + field)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>EDS/LDS Cutoff Date</Label>
              <Input type="date" defaultValue="2025-07-31" />
              <p className="text-xs text-muted-foreground">
                Burns before this date = EDS, after = LDS
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Vegetation Map Version</Label>
              <Select defaultValue="v2024">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2024">
                    Tiwi Veg Map v2024
                  </SelectItem>
                  <SelectItem value="v2020">
                    Tiwi Veg Map v2020
                  </SelectItem>
                  <SelectItem value="nvis">
                    NVIS Major Veg Groups
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project Boundary</Label>
              <Select defaultValue="registered">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">
                    CER Registered Boundary
                  </SelectItem>
                  <SelectItem value="current">
                    Current Project Boundary
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rainfall Zone</Label>
              <Select defaultValue="high">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    High Rainfall (&gt;1000mm)
                  </SelectItem>
                  <SelectItem value="low">
                    Low Rainfall (600-1000mm)
                  </SelectItem>
                  <SelectItem value="mixed">Mixed (use raster)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Output CRS</Label>
              <Select defaultValue="3577">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3577">
                    GDA94 Albers (EPSG:3577)
                  </SelectItem>
                  <SelectItem value="7845">
                    GDA2020 Albers (EPSG:7845)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preparation history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Preparation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Files</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>SavBAT Ref</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prepRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{run.period}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(run.created).toLocaleDateString("en-AU")}
                  </TableCell>
                  <TableCell className="text-center">
                    {run.files_generated} / {run.total_files}
                  </TableCell>
                  <TableCell className="text-center">
                    <PrepStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {run.savbat_ref ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                    {run.notes}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.status === "completed" && (
                      <Button variant="outline" size="sm">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Validation checklist */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Pre-Upload Validation Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                check: "All rasters in GDA94 Albers (EPSG:3577)",
                passed: true,
              },
              { check: "Resolution is 250m × 250m", passed: true },
              { check: "Data type is 8-bit unsigned integer", passed: true },
              { check: "NoData value set to 255", passed: true },
              {
                check: "Fire scar values: EDS=1, LDS=2, Unburnt=0",
                passed: true,
              },
              {
                check: "Vegetation codes match CER fuel type table (1-9)",
                passed: true,
              },
              {
                check: "Project boundary aligns with CER registration",
                passed: true,
              },
              {
                check: "All rasters have identical extent and cell alignment",
                passed: true,
              },
              {
                check: "Baseline fire history covers required years",
                passed: true,
              },
              {
                check: "EDS/LDS cutoff date matches project methodology",
                passed: true,
              },
            ].map((item) => (
              <div
                key={item.check}
                className="flex items-center gap-2 text-sm"
              >
                {item.passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span>{item.check}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrepStatusBadge({
  status,
}: {
  status: PrepRun["status"];
}) {
  switch (status) {
    case "completed":
      return (
        <Badge className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-blue-500 text-blue-600"
        >
          <Calculator className="h-3 w-3" />
          Processing
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-red-500 text-red-600"
        >
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Ready
        </Badge>
      );
  }
}
