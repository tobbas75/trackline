"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DrawMap } from "@/components/map/draw-map";
import { useProjectStore } from "@/stores/project-store";
import { ArrowLeft, Save, Flame, MapPin, Plane, Route } from "lucide-react";
import Link from "next/link";
import type { BurnType } from "@/lib/supabase/types";

const VEGETATION_TYPES = [
  "Open woodland",
  "Tall open forest",
  "Monsoon vine forest",
  "Hummock grassland",
  "Tussock grassland",
  "Shrubland",
  "Mangrove",
  "Floodplain",
];

const PRIORITY_OPTIONS = ["high", "medium", "low"] as const;

export default function NewBurnPlanPage() {
  const router = useRouter();
  const activeProject = useProjectStore((s) => s.activeProject);

  const [name, setName] = useState("");
  const [targetSeason, setTargetSeason] = useState<"EDS" | "LDS">("EDS");
  const [burnType, setBurnType] = useState<BurnType | "">("");
  const [vegetation, setVegetation] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [drawnFeatures, setDrawnFeatures] = useState<GeoJSON.Feature[]>([]);
  const [drawnLineFeatures, setDrawnLineFeatures] = useState<GeoJSON.Feature[]>([]);

  // Calculate approximate area from drawn features (rough km² to ha)
  const approxAreaHa = drawnFeatures.reduce((sum, f) => {
    if (f.properties?.area_sq_m) {
      return sum + Number(f.properties.area_sq_m) / 10000;
    }
    return sum;
  }, 0);

  const projectBoundary = activeProject?.boundary
    ? (activeProject.boundary as unknown as GeoJSON.FeatureCollection)
    : undefined;

  function handleSave() {
    // In the future this will POST to Supabase
    // Convert line features into a MultiLineString for storage
    // const ignitionLines: GeoJSON.MultiLineString | null =
    //   drawnLineFeatures.length > 0
    //     ? {
    //         type: "MultiLineString",
    //         coordinates: drawnLineFeatures
    //           .filter((f) => f.geometry.type === "LineString")
    //           .map((f) => (f.geometry as GeoJSON.LineString).coordinates),
    //       }
    //     : null;
    router.push("/burn-plans");
  }

  const burnTypeLabel = burnType === "aerial" ? "Flight lines" : burnType === "road" ? "Road routes" : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/burn-plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">New Burn Plan</h1>
          <p className="text-sm text-muted-foreground">
            Draw the burn area on the map and fill in plan details
          </p>
        </div>
        <Button onClick={handleSave} disabled={!name || drawnFeatures.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          Save Plan
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Form */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Northern Coastal Strip"
                />
              </div>

              <div>
                <Label>Target Season</Label>
                <Select
                  value={targetSeason}
                  onValueChange={(v) => setTargetSeason(v as "EDS" | "LDS")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDS">
                      EDS — Early Dry Season
                    </SelectItem>
                    <SelectItem value="LDS">
                      LDS — Late Dry Season
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Burn Type</Label>
                <Select
                  value={burnType}
                  onValueChange={(v) => setBurnType(v as BurnType | "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select burn type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aerial">
                      Aerial (ACB) — Flight lines
                    </SelectItem>
                    <SelectItem value="road">
                      Road Burning — Ground ignition
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {burnType === "aerial"
                    ? "Draw flight lines on the map using the Line tool"
                    : burnType === "road"
                      ? "Draw road burn routes on the map using the Line tool"
                      : "Select how this burn will be executed"}
                </p>
              </div>

              <div>
                <Label>Vegetation Type</Label>
                <Select value={vegetation} onValueChange={setVegetation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vegetation" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEGETATION_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as "high" | "medium" | "low")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="capitalize">{p}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the burn area and rationale"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="objectives">Burn Objectives</Label>
                <Textarea
                  id="objectives"
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="What outcomes does this burn aim to achieve?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Drawn polygons
                </span>
                <Badge variant="secondary">
                  <MapPin className="mr-1 h-3 w-3" />
                  {drawnFeatures.length}
                </Badge>
              </div>
              {burnTypeLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {burnTypeLabel}
                  </span>
                  <Badge variant="secondary">
                    {burnType === "aerial" ? (
                      <Plane className="mr-1 h-3 w-3" />
                    ) : (
                      <Route className="mr-1 h-3 w-3" />
                    )}
                    {drawnLineFeatures.length}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Target season
                </span>
                <Badge
                  variant="outline"
                  className={
                    targetSeason === "EDS"
                      ? "border-blue-500 text-blue-600"
                      : "border-red-500 text-red-600"
                  }
                >
                  <Flame className="mr-1 h-3 w-3" />
                  {targetSeason}
                </Badge>
              </div>
              {burnType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Burn type</span>
                  <Badge variant="outline">
                    {burnType === "aerial" ? "Aerial (ACB)" : "Road"}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <span className="text-sm font-medium capitalize">
                  {priority}
                </span>
              </div>
              {vegetation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Vegetation
                  </span>
                  <span className="text-sm">{vegetation}</span>
                </div>
              )}
              {approxAreaHa > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Approx. area
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(approxAreaHa).toLocaleString()} ha
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline">Draft</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Draw Burn Area
                {burnType && " & Ignition Lines"}
              </CardTitle>
              <CardDescription>
                {burnType === "aerial"
                  ? "Draw the burn boundary, then use the Line tool to define flight lines for aerial ignition."
                  : burnType === "road"
                    ? "Draw the burn boundary, then use the Line tool to define road burn routes."
                    : "Use the drawing tools to define the burn boundary. The project boundary is shown as an orange dashed line for reference."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DrawMap
                onFeaturesChange={setDrawnFeatures}
                onLineFeaturesChange={setDrawnLineFeatures}
                enableLineDrawing={burnType !== ""}
                projectBoundary={projectBoundary}
                className="h-[500px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
