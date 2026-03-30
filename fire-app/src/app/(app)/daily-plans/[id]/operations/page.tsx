"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Play,
  Square,
  Save,
  Crosshair,
  Flame,
  Clock,
  Trash2,
  Download,
  Route,
} from "lucide-react";
import Link from "next/link";
import { useGpsTracker, type GpsPoint } from "@/hooks/use-gps-tracker";
import { useProjectStore } from "@/stores/project-store";
import { getTiwiBoundaryGeoJSON } from "@/lib/mock-data";
import {
  OperationsMap,
  type IncendiaryDrop,
} from "@/components/map/operations-map";

type DropType = "dai_sphere" | "drip_torch" | "hand_lit";

export default function OperationsPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const { activeProject } = useProjectStore();
  const boundary = activeProject
    ? (activeProject.boundary as unknown as GeoJSON.FeatureCollection)
    : getTiwiBoundaryGeoJSON();

  // GPS tracking
  const gps = useGpsTracker({ minDistanceM: 15, highAccuracy: true });

  // Incendiary drops
  const [drops, setDrops] = useState<IncendiaryDrop[]>([]);
  const [dropMode, setDropMode] = useState(false);
  const [pendingDropLngLat, setPendingDropLngLat] = useState<
    [number, number] | null
  >(null);
  const [dropType, setDropType] = useState<DropType>("dai_sphere");
  const [dropQuantity, setDropQuantity] = useState("50");
  const [dropNotes, setDropNotes] = useState("");

  // Burn execution notes
  const [execNotes, setExecNotes] = useState("");
  const [effectiveness, setEffectiveness] = useState("good");

  // Track save dialog
  const [saveTrackOpen, setSaveTrackOpen] = useState(false);
  const [trackName, setTrackName] = useState("");

  const handleMapClick = useCallback(
    (lngLat: [number, number]) => {
      if (!dropMode) return;
      setPendingDropLngLat(lngLat);
    },
    [dropMode]
  );

  const confirmDrop = useCallback(() => {
    if (!pendingDropLngLat) return;
    const newDrop: IncendiaryDrop = {
      id: `drop-${Date.now()}`,
      location: pendingDropLngLat,
      type: dropType,
      quantity: parseInt(dropQuantity) || 1,
      timestamp: new Date().toISOString(),
      notes: dropNotes,
    };
    setDrops((prev) => [...prev, newDrop]);
    setPendingDropLngLat(null);
    setDropNotes("");
  }, [pendingDropLngLat, dropType, dropQuantity, dropNotes]);

  const removeDrop = useCallback((id: string) => {
    setDrops((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleSaveTrack = useCallback(() => {
    gps.saveTrack(trackName || `Track — ${new Date().toLocaleString()}`);
    setSaveTrackOpen(false);
    setTrackName("");
  }, [gps, trackName]);

  const totalSpheres = drops
    .filter((d) => d.type === "dai_sphere")
    .reduce((sum, d) => sum + d.quantity, 0);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/daily-plans">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Field Operations</h1>
          <p className="text-sm text-muted-foreground">
            GPS tracking, incendiary drop logging, and burn execution recording
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Plan: {planId}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Map — takes 2/3 width */}
        <div className="xl:col-span-2">
          <OperationsMap
            projectBoundary={boundary}
            gpsTrack={gps.track}
            currentPosition={gps.currentPosition}
            isTracking={gps.isTracking}
            drops={drops}
            onMapClick={handleMapClick}
            dropMode={dropMode}
            className="h-[600px]"
          />
        </div>

        {/* Controls panel — 1/3 width */}
        <div className="space-y-4">
          {/* GPS Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-blue-500" />
                GPS Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {!gps.isTracking ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={gps.startTracking}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={gps.stopTracking}
                    >
                      <Square className="mr-1.5 h-3.5 w-3.5" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSaveTrackOpen(true)}
                      disabled={gps.track.length < 2}
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Save
                    </Button>
                  </>
                )}
              </div>

              {gps.error && (
                <p className="text-xs text-red-500">{gps.error}</p>
              )}

              {/* Track stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-lg font-bold">{gps.track.length}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-lg font-bold">
                    {gps.trackDistanceKm.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">km</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-lg font-bold">
                    {gps.isTracking
                      ? formatDuration(
                          Date.now() -
                            (gps.track[0]?.timestamp ?? Date.now())
                        )
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>

              {gps.currentPosition && (
                <div className="rounded-md bg-blue-50 p-2 text-xs dark:bg-blue-950">
                  <p className="font-mono">
                    {gps.currentPosition.lat.toFixed(6)},{" "}
                    {gps.currentPosition.lng.toFixed(6)}
                  </p>
                  <p className="text-muted-foreground">
                    Accuracy: ±{gps.currentPosition.accuracy.toFixed(0)}m
                    {gps.currentPosition.altitude !== null &&
                      ` | Alt: ${gps.currentPosition.altitude.toFixed(0)}m`}
                  </p>
                </div>
              )}

              {/* Saved tracks */}
              {gps.savedTracks.length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Saved Tracks
                  </p>
                  {gps.savedTracks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs"
                    >
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-muted-foreground">
                          {t.distanceKm.toFixed(1)} km, {t.points.length} pts
                        </p>
                      </div>
                      <Route className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incendiary Drop Logging */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-red-500" />
                Incendiary Drop Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={dropMode ? "destructive" : "outline"}
                  className="flex-1"
                  onClick={() => setDropMode(!dropMode)}
                >
                  <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                  {dropMode ? "Exit Drop Mode" : "Enter Drop Mode"}
                </Button>
              </div>

              {/* Drop type + quantity config */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={dropType}
                    onValueChange={(v) => setDropType(v as DropType)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dai_sphere">DAI Sphere</SelectItem>
                      <SelectItem value="drip_torch">Drip Torch</SelectItem>
                      <SelectItem value="hand_lit">Hand Lit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    value={dropQuantity}
                    onChange={(e) => setDropQuantity(e.target.value)}
                    className="h-8 text-xs"
                    min={1}
                  />
                </div>
              </div>

              {/* Drop summary */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-lg font-bold">{drops.length}</p>
                  <p className="text-xs text-muted-foreground">Drops</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-lg font-bold">
                    {totalSpheres.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">DAI Spheres</p>
                </div>
              </div>

              {/* Recent drops */}
              {drops.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto border-t pt-2">
                  {drops
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium">
                            {d.type === "dai_sphere"
                              ? "DAI"
                              : d.type === "drip_torch"
                                ? "Drip Torch"
                                : "Hand"}{" "}
                            x{d.quantity}
                          </p>
                          <p className="font-mono text-muted-foreground">
                            {d.location[1].toFixed(5)},{" "}
                            {d.location[0].toFixed(5)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeDrop(d.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Burn Execution Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                Burn Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Effectiveness</Label>
                <Select value={effectiveness} onValueChange={setEffectiveness}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent — exceeded targets</SelectItem>
                    <SelectItem value="good">Good — met targets</SelectItem>
                    <SelectItem value="moderate">Moderate — partial success</SelectItem>
                    <SelectItem value="poor">Poor — below targets</SelectItem>
                    <SelectItem value="aborted">Aborted — conditions changed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Field Notes</Label>
                <Textarea
                  value={execNotes}
                  onChange={(e) => setExecNotes(e.target.value)}
                  placeholder="Burn behaviour, wind shifts, issues encountered..."
                  rows={3}
                  className="text-xs"
                />
              </div>
              <Button size="sm" className="w-full">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Execution Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drop confirmation dialog */}
      <Dialog
        open={!!pendingDropLngLat}
        onOpenChange={(open) => {
          if (!open) setPendingDropLngLat(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Drop</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {pendingDropLngLat && (
              <p className="font-mono text-xs text-muted-foreground">
                Location: {pendingDropLngLat[1].toFixed(6)},{" "}
                {pendingDropLngLat[0].toFixed(6)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={dropType}
                  onValueChange={(v) => setDropType(v as DropType)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dai_sphere">DAI Sphere</SelectItem>
                    <SelectItem value="drip_torch">Drip Torch</SelectItem>
                    <SelectItem value="hand_lit">Hand Lit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={dropQuantity}
                  onChange={(e) => setDropQuantity(e.target.value)}
                  className="text-xs"
                  min={1}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={dropNotes}
                onChange={(e) => setDropNotes(e.target.value)}
                className="text-xs"
                placeholder="e.g., Heavy fuel load area"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingDropLngLat(null)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={confirmDrop}>
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                Confirm Drop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save track dialog */}
      <Dialog open={saveTrackOpen} onOpenChange={setSaveTrackOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save GPS Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Track Name</Label>
              <Input
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder={`Track — ${new Date().toLocaleString()}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {gps.track.length} points, {gps.trackDistanceKm.toFixed(1)} km
            </p>
            <Button className="w-full" onClick={handleSaveTrack}>
              <Save className="mr-1.5 h-4 w-4" />
              Save Track
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
