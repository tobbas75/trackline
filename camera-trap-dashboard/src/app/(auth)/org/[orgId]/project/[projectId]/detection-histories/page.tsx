"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/org-store";
import { friendlyError } from "@/lib/errors";
import type {
  DetectionHistory,
  DetectionHistoryRow,
  Species,
} from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDays,
  Download,
  Grid3X3,
  Plus,
  Trash2,
} from "lucide-react";
import { HelpTooltip } from "@/components/help/help-tooltip";
import { detectionHistoryHelp } from "@/lib/help-content";

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DetectionHistoriesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const userCanEdit = useOrgStore((s) => s.canEdit());
  const userCanAdmin = useOrgStore((s) => s.canAdmin());

  const [histories, setHistories] = useState<DetectionHistory[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSpeciesId, setGenSpeciesId] = useState("");
  const [genStartDate, setGenStartDate] = useState("");
  const [genEndDate, setGenEndDate] = useState("");
  const [genOccasionDays, setGenOccasionDays] = useState(7);

  // Matrix view dialog state
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixHistory, setMatrixHistory] = useState<DetectionHistory | null>(
    null
  );
  const [matrixRows, setMatrixRows] = useState<DetectionHistoryRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadHistories = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("detection_histories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      setHistories((data as unknown as DetectionHistory[]) ?? []);
    }
    setLoading(false);
  }, [projectId]);

  const loadSpecies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("species")
      .select("*")
      .eq("project_id", projectId)
      .order("common_name", { ascending: true });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      setSpecies((data as unknown as Species[]) ?? []);
    }
  }, [projectId]);

  useEffect(() => {
    loadHistories();
    loadSpecies();
  }, [loadHistories, loadSpecies]);

  // -----------------------------------------------------------------------
  // Calculated number of occasions for the generate form
  // -----------------------------------------------------------------------

  const calculatedOccasions = useMemo(() => {
    if (!genStartDate || !genEndDate || genOccasionDays < 1) return null;

    const start = new Date(genStartDate);
    const end = new Date(genEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.ceil(totalDays / genOccasionDays);
  }, [genStartDate, genEndDate, genOccasionDays]);

  // -----------------------------------------------------------------------
  // Generate handler
  // -----------------------------------------------------------------------

  async function handleGenerate() {
    if (!genSpeciesId) {
      toast.error("Please select a species.");
      return;
    }
    if (!genStartDate || !genEndDate) {
      toast.error("Please select a start and end date.");
      return;
    }
    if (genOccasionDays < 1) {
      toast.error("Occasion length must be at least 1 day.");
      return;
    }

    const selectedSpecies = species.find((s) => s.id === genSpeciesId);
    if (!selectedSpecies) {
      toast.error("Selected species not found.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/detection-histories/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speciesId: genSpeciesId,
            speciesName: selectedSpecies.common_name,
            startDate: genStartDate,
            endDate: genEndDate,
            occasionLengthDays: genOccasionDays,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate detection history");
      }

      toast.success(
        `Detection history generated for ${selectedSpecies.common_name}`
      );
      setGenerateOpen(false);
      resetGenerateForm();
      loadHistories();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  function resetGenerateForm() {
    setGenSpeciesId("");
    setGenStartDate("");
    setGenEndDate("");
    setGenOccasionDays(7);
  }

  // -----------------------------------------------------------------------
  // Matrix view handler
  // -----------------------------------------------------------------------

  async function openMatrixView(history: DetectionHistory) {
    setMatrixHistory(history);
    setMatrixRows([]);
    setMatrixOpen(true);
    setMatrixLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("detection_history_rows")
      .select("*")
      .eq("detection_history_id", history.id)
      .order("site_name", { ascending: true });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      setMatrixRows((data as unknown as DetectionHistoryRow[]) ?? []);
    }
    setMatrixLoading(false);
  }

  // -----------------------------------------------------------------------
  // Export CSV handler
  // -----------------------------------------------------------------------

  async function handleExport(history: DetectionHistory) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/detection-histories/${history.id}/export`
      );

      if (!res.ok) {
        throw new Error("Failed to export detection history");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `detection_history_${history.species_name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  }

  // -----------------------------------------------------------------------
  // Delete handler
  // -----------------------------------------------------------------------

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("detection_histories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success("Detection history deleted");
      loadHistories();
    }
    setDeletingId(null);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Build occasion date range headers for the matrix view */
  function getOccasionHeaders(history: DetectionHistory): string[] {
    const headers: string[] = [];
    const start = new Date(history.occasion_start);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    for (let i = 0; i < history.num_occasions; i++) {
      const occStart = new Date(
        start.getTime() +
          i * history.occasion_length_days * 24 * 60 * 60 * 1000
      );
      const occEnd = new Date(
        occStart.getTime() +
          (history.occasion_length_days - 1) * 24 * 60 * 60 * 1000
      );

      headers.push(
        `${months[occStart.getMonth()]} ${occStart.getDate()}-${occEnd.getDate()}`
      );
    }
    return headers;
  }

  function formatDateRange(start: string, end: string): string {
    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading detection histories...</p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detection Histories</h1>
          <p className="text-muted-foreground">
            Generate and export occupancy-format detection matrices (sites x
            occasions).
          </p>
        </div>
        {userCanEdit && (
          <Button
            onClick={() => {
              resetGenerateForm();
              setGenerateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Generate
          </Button>
        )}
      </div>

      {/* Empty state */}
      {histories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Grid3X3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">
              No detection histories yet
            </h2>
            <p className="mb-4 max-w-md text-center text-muted-foreground">
              {userCanEdit
                ? "Generate your first detection history by selecting a species and date range. The matrix can then be exported as CSV for occupancy modelling."
                : "No detection histories have been generated for this project yet."}
            </p>
            {userCanEdit && (
              <Button
                onClick={() => {
                  resetGenerateForm();
                  setGenerateOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate detection history
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* History cards */}
      {histories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {histories.map((h) => (
            <Card key={h.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{h.species_name}</CardTitle>
                <CardDescription>
                  {formatDateRange(h.occasion_start, h.occasion_end)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {h.occasion_length_days}-day occasions
                  </Badge>
                  <Badge variant="outline">
                    {h.num_occasions} occasions
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMatrixView(h)}
                  >
                    <Grid3X3 className="mr-1 h-3 w-3" />
                    View Matrix
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(h)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export CSV
                  </Button>
                  {userCanAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={deletingId === h.id}
                      onClick={() => handleDelete(h.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {deletingId === h.id ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Detection History</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Species select */}
            <div className="space-y-2">
              <Label htmlFor="gen-species">Species</Label>
              {species.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No species registered. Add species to this project first.
                </p>
              ) : (
                <Select value={genSpeciesId} onValueChange={setGenSpeciesId}>
                  <SelectTrigger id="gen-species" className="w-full">
                    <SelectValue placeholder="Select a species" />
                  </SelectTrigger>
                  <SelectContent>
                    {species.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.common_name}
                        {s.scientific_name ? ` (${s.scientific_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <Label htmlFor="gen-start">Start date</Label>
              <Input
                id="gen-start"
                type="date"
                value={genStartDate}
                onChange={(e) => setGenStartDate(e.target.value)}
              />
            </div>

            {/* End date */}
            <div className="space-y-2">
              <Label htmlFor="gen-end">End date</Label>
              <Input
                id="gen-end"
                type="date"
                value={genEndDate}
                onChange={(e) => setGenEndDate(e.target.value)}
              />
            </div>

            {/* Occasion length */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="gen-occasion">Occasion length (days)</Label>
                <HelpTooltip text={detectionHistoryHelp.occasionLength} side="right" />
              </div>
              <Input
                id="gen-occasion"
                type="number"
                min={1}
                value={genOccasionDays}
                onChange={(e) =>
                  setGenOccasionDays(parseInt(e.target.value, 10) || 1)
                }
              />
            </div>

            {/* Calculated occasions preview */}
            {calculatedOccasions !== null && (
              <p className="text-sm text-muted-foreground">
                This will produce{" "}
                <span className="font-semibold text-foreground">
                  {calculatedOccasions}
                </span>{" "}
                occasion{calculatedOccasions !== 1 ? "s" : ""}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                generating || species.length === 0 || !genSpeciesId
              }
            >
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Matrix view dialog */}
      <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {matrixHistory
                ? `Detection Matrix: ${matrixHistory.species_name}`
                : "Detection Matrix"}
            </DialogTitle>
          </DialogHeader>

          {matrixLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading matrix...</p>
            </div>
          ) : matrixHistory && matrixRows.length > 0 ? (
            <div className="overflow-auto rounded-md border" style={{ maxHeight: "60vh" }}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="whitespace-nowrap border-r px-3 py-2 text-left font-medium">
                      Site
                    </th>
                    {getOccasionHeaders(matrixHistory).map((header, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-2 py-2 text-center font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="whitespace-nowrap border-r px-3 py-1.5 font-medium">
                        {row.site_name}
                      </td>
                      {row.detections.map((val, i) => (
                        <td
                          key={i}
                          className={`px-2 py-1.5 text-center ${
                            val === 1
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-gray-50 text-gray-400 dark:bg-gray-800/30 dark:text-gray-500"
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No rows found for this detection history.
            </p>
          )}

          {/* Summary stats below the matrix */}
          {matrixHistory && matrixRows.length > 0 && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">
                  {matrixRows.length}
                </span>{" "}
                sites
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {matrixHistory.num_occasions}
                </span>{" "}
                occasions
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {matrixRows.reduce(
                    (acc, row) =>
                      acc + row.detections.filter((d) => d === 1).length,
                    0
                  )}
                </span>{" "}
                detections
              </span>
              <span className="inline-flex items-center gap-1">
                Naive occupancy:
                <HelpTooltip text={detectionHistoryHelp.naiveOccupancy} side="top" />
                <span className="font-medium text-foreground">
                  {(
                    matrixRows.filter((row) =>
                      row.detections.some((d) => d === 1)
                    ).length / matrixRows.length
                  ).toFixed(3)}
                </span>
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
