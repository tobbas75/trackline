"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ObservationRow {
  id: string;
  observed_at: string | null;
  is_animal: boolean | null;
  is_empty: boolean | null;
  count: number | null;
  detection_confidence: number | null;
  file_name: string | null;
  sites: { site_name: string } | null;
  species: { common_name: string } | null;
}

interface SiteOption {
  id: string;
  site_name: string;
}

interface SpeciesOption {
  id: string;
  common_name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

/** Sentinel value used to represent "all" in select filters */
const ALL = "__all__";

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportToCsv(rows: ObservationRow[]) {
  const headers = [
    "Date/Time",
    "Site",
    "Species",
    "Count",
    "Animal",
    "Empty",
    "Confidence",
    "File",
  ];
  const csvRows = rows.map((r) => [
    r.observed_at ?? "",
    r.sites?.site_name ?? "",
    r.species?.common_name ?? "",
    String(r.count ?? ""),
    String(r.is_animal ?? ""),
    String(r.is_empty ?? ""),
    String(r.detection_confidence ?? ""),
    r.file_name ?? "",
  ]);
  const csv = [headers, ...csvRows]
    .map((row) => row.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "observations.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ObservationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Data
  const [rows, setRows] = useState<ObservationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);

  // Filter options (loaded once)
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);

  // Active filters
  const [filterSpecies, setFilterSpecies] = useState<string>(ALL);
  const [filterSite, setFilterSite] = useState<string>(ALL);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // -----------------------------------------------------------------------
  // Load filter options (sites + species for this project)
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function loadFilterOptions() {
      const supabase = createClient();

      const [sitesRes, speciesRes] = await Promise.all([
        supabase
          .from("sites")
          .select("id, site_name")
          .eq("project_id", projectId)
          .order("site_name", { ascending: true }),
        supabase
          .from("species")
          .select("id, common_name")
          .eq("project_id", projectId)
          .order("common_name", { ascending: true }),
      ]);

      if (sitesRes.error) {
        toast.error(friendlyError(sitesRes.error.code, sitesRes.error.message));
      } else {
        setSiteOptions((sitesRes.data as SiteOption[]) ?? []);
      }

      if (speciesRes.error) {
        toast.error(
          friendlyError(speciesRes.error.code, speciesRes.error.message)
        );
      } else {
        setSpeciesOptions((speciesRes.data as SpeciesOption[]) ?? []);
      }
    }

    loadFilterOptions();
  }, [projectId]);

  // -----------------------------------------------------------------------
  // Fetch observations with pagination and filters
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchObservations() {
      setLoading(true);
      const supabase = createClient();
      const offset = page * PAGE_SIZE;

      let query = supabase
        .from("observations")
        .select("*, sites(site_name), species(common_name)", { count: "exact" })
        .eq("project_id", projectId)
        .order("observed_at", { ascending: false });

      // Apply filters
      if (filterSpecies !== ALL) {
        query = query.eq("species_id", filterSpecies);
      }
      if (filterSite !== ALL) {
        query = query.eq("site_id", filterSite);
      }
      if (filterDateFrom) {
        query = query.gte("observed_at", filterDateFrom);
      }
      if (filterDateTo) {
        // Include the entire end date by comparing to the start of the next day
        query = query.lte("observed_at", `${filterDateTo}T23:59:59.999Z`);
      }

      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (cancelled) return;

      if (error) {
        toast.error(friendlyError(error.code, error.message));
        setRows([]);
        setTotalCount(0);
      } else {
        setRows((data as unknown as ObservationRow[]) ?? []);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    }

    fetchObservations();

    return () => { cancelled = true; };
  }, [projectId, page, filterSpecies, filterSite, filterDateFrom, filterDateTo]);

  // -----------------------------------------------------------------------
  // Filter change handlers — reset to page 0 when filters change
  // -----------------------------------------------------------------------

  function handleSpeciesChange(value: string) {
    setFilterSpecies(value);
    setPage(0);
  }

  function handleSiteChange(value: string) {
    setFilterSite(value);
    setPage(0);
  }

  function handleDateFromChange(value: string) {
    setFilterDateFrom(value);
    setPage(0);
  }

  function handleDateToChange(value: string) {
    setFilterDateTo(value);
    setPage(0);
  }

  function clearFilters() {
    setFilterSpecies(ALL);
    setFilterSite(ALL);
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(0);
  }

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters =
    filterSpecies !== ALL ||
    filterSite !== ALL ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function formatDateTime(value: string | null): string {
    if (!value) return "\u2014";
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatConfidence(value: number | null): string {
    if (value === null) return "\u2014";
    return `${(value * 100).toFixed(1)}%`;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Observations</h1>
          <p className="text-muted-foreground">
            {totalCount.toLocaleString()} observation
            {totalCount !== 1 ? "s" : ""} in this project.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportToCsv(rows)}
          disabled={rows.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Species filter */}
            <div className="grid gap-1.5">
              <label
                htmlFor="filter-species"
                className="text-sm font-medium leading-none"
              >
                Species
              </label>
              <Select value={filterSpecies} onValueChange={handleSpeciesChange}>
                <SelectTrigger id="filter-species" className="w-[200px]">
                  <SelectValue placeholder="All species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All species</SelectItem>
                  {speciesOptions.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.common_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site filter */}
            <div className="grid gap-1.5">
              <label
                htmlFor="filter-site"
                className="text-sm font-medium leading-none"
              >
                Site
              </label>
              <Select value={filterSite} onValueChange={handleSiteChange}>
                <SelectTrigger id="filter-site" className="w-[200px]">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All sites</SelectItem>
                  {siteOptions.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="grid gap-1.5">
              <label
                htmlFor="filter-date-from"
                className="text-sm font-medium leading-none"
              >
                From
              </label>
              <Input
                id="filter-date-from"
                type="date"
                className="w-[160px]"
                value={filterDateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="grid gap-1.5">
              <label
                htmlFor="filter-date-to"
                className="text-sm font-medium leading-none"
              >
                To
              </label>
              <Input
                id="filter-date-to"
                type="date"
                className="w-[160px]"
                value={filterDateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">Loading observations...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground">
                {hasFilters
                  ? "No observations match the current filters."
                  : "No observations in this project yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>Animal?</TableHead>
                  <TableHead>Empty?</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(row.observed_at)}
                    </TableCell>
                    <TableCell>{row.sites?.site_name ?? "\u2014"}</TableCell>
                    <TableCell>{row.species?.common_name ?? "\u2014"}</TableCell>
                    <TableCell className="text-right">
                      {row.count ?? "\u2014"}
                    </TableCell>
                    <TableCell>
                      {row.is_animal === null ? (
                        "\u2014"
                      ) : row.is_animal ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.is_empty === null ? (
                        "\u2014"
                      ) : row.is_empty ? (
                        <Badge variant="outline">Empty</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatConfidence(row.detection_confidence)}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-muted-foreground"
                      title={row.file_name ?? undefined}
                    >
                      {row.file_name ?? "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}
            {"\u2013"}
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
            {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
