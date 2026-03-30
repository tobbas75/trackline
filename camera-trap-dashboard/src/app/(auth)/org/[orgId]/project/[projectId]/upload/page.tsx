"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Papa from "papaparse";
import {
  autoDetectColumns,
  detectToolFormat,
  getFieldsForType,
  type ColumnMatch,
  type SystemField,
} from "@/lib/column-mapping";
import { applyTransform } from "@/lib/column-mapping";
import { createClient } from "@/lib/supabase/client";
import { canEdit } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/errors";
import type { OrgRole } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/help/help-tooltip";
import { uploadHelp } from "@/lib/help-content";

// ── Types ──────────────────────────────────────────────────────

type UploadType = "deployments" | "observations";
type ToolFormat = "timelapse" | "addaxai" | "generic";
type WizardStep = 1 | 2 | 3 | 4;

interface ColumnMapping extends ColumnMatch {
  storeAsExtra: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  autoCreatedSpecies?: number;
}

// ── Helpers ────────────────────────────────────────────────────

const TOOL_FORMAT_LABELS: Record<ToolFormat, string> = {
  timelapse: "TimeLapse",
  addaxai: "AddaxAI",
  generic: "Generic",
};

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Upload",
  2: "Map Columns",
  3: "Preview",
  4: "Import",
};

/** Return a confidence colour class for the mapping dot */
function confidenceColour(confidence: number): string {
  if (confidence >= 0.9) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

/** Validate a single cell value against its field type. Returns true if valid. */
function validateCell(
  value: string,
  field: SystemField | undefined
): boolean {
  if (!field) return true; // unmapped columns are always "valid"
  if (!value || value.trim() === "") {
    return !field.required; // blank is OK for optional fields
  }

  switch (field.type) {
    case "number": {
      const num = Number(value);
      return !Number.isNaN(num);
    }
    case "coordinate": {
      const coord = Number(value);
      if (Number.isNaN(coord)) return false;
      if (field.key === "latitude") return coord >= -90 && coord <= 90;
      if (field.key === "longitude") return coord >= -180 && coord <= 180;
      return true;
    }
    case "boolean": {
      const lower = value.toLowerCase().trim();
      return ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(
        lower
      );
    }
    case "date":
    case "datetime": {
      const parsed = applyTransform(value, { type: "date_parse" });
      return parsed !== null;
    }
    default:
      return true;
  }
}

// ── Component ──────────────────────────────────────────────────

export default function UploadPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  // Auth
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 state
  const [uploadType, setUploadType] = useState<UploadType>("deployments");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [toolFormat, setToolFormat] = useState<ToolFormat>("generic");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Step 4 state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Auth check ───────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .single();

        setUserRole(
          (membership as unknown as { role: OrgRole } | null)?.role ?? null
        );
      }

      setAuthLoading(false);
    }

    checkAuth();
  }, [orgId]);

  const editable = canEdit(userRole);

  // ── Derived data for Steps 2-3 ──────────────────────────────

  const systemFields = useMemo(
    () => getFieldsForType(uploadType),
    [uploadType]
  );

  /** Build a lookup from system field key to SystemField */
  const fieldsByKey = useMemo(() => {
    const map = new Map<string, SystemField>();
    for (const f of systemFields) {
      map.set(f.key, f);
    }
    return map;
  }, [systemFields]);

  // ── Step 1: File handling ────────────────────────────────────

  const parseFile = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);

      Papa.parse<Record<string, string>>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 100, // read enough rows for preview + validation
        complete(results) {
          const headers = results.meta.fields ?? [];
          setCsvHeaders(headers);
          setCsvRows(results.data);

          // Detect format
          const format = detectToolFormat(headers);
          setToolFormat(format);

          // Auto-detect column mappings
          const detected = autoDetectColumns(headers, uploadType);
          setMappings(
            detected.map((match) => ({
              ...match,
              storeAsExtra: false,
            }))
          );
        },
        error(err) {
          toast.error(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    [uploadType]
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) parseFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      parseFile(dropped);
    } else {
      toast.error("Only .csv files are accepted.");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  /** When upload type changes, re-run auto-detect if we already have headers */
  function handleUploadTypeChange(value: string) {
    const newType = value as UploadType;
    setUploadType(newType);

    if (csvHeaders.length > 0) {
      const detected = autoDetectColumns(csvHeaders, newType);
      setMappings(
        detected.map((match) => ({
          ...match,
          storeAsExtra: false,
        }))
      );
      setToolFormat(detectToolFormat(csvHeaders));
    }
  }

  // ── Step 2: Mapping changes ──────────────────────────────────

  function updateMapping(sourceColumn: string, systemField: string | null) {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.sourceColumn !== sourceColumn) return m;
        return {
          ...m,
          systemField,
          confidence: systemField ? 1.0 : 0,
          storeAsExtra: systemField ? false : m.storeAsExtra,
        };
      })
    );
  }

  function toggleStoreAsExtra(sourceColumn: string, checked: boolean) {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.sourceColumn !== sourceColumn) return m;
        return { ...m, storeAsExtra: checked };
      })
    );
  }

  // ── Step 3: Preview data ─────────────────────────────────────

  /** Mapped columns only (those with a systemField assigned) */
  const mappedColumns = useMemo(
    () => mappings.filter((m) => m.systemField !== null),
    [mappings]
  );

  const previewRows = useMemo(() => csvRows.slice(0, 20), [csvRows]);

  /** Summary stats for the preview */
  const summaryStats = useMemo(() => {
    if (csvRows.length === 0) return null;

    const total = csvRows.length;

    // Find the mapping for site_name
    const siteMapping = mappings.find((m) => m.systemField === "site_name");
    const uniqueSites = siteMapping
      ? new Set(
          csvRows
            .map((row) => row[siteMapping.sourceColumn]?.trim())
            .filter(Boolean)
        ).size
      : 0;

    // For observations: unique species
    const speciesMapping = mappings.find(
      (m) => m.systemField === "species_name"
    );
    const uniqueSpecies = speciesMapping
      ? new Set(
          csvRows
            .map((row) => row[speciesMapping.sourceColumn]?.trim())
            .filter(Boolean)
        ).size
      : 0;

    // Date range
    const dateMapping = mappings.find(
      (m) =>
        m.systemField === "date_deployed" || m.systemField === "observed_at"
    );
    let dateRange: { min: string; max: string } | null = null;
    if (dateMapping) {
      const dates = csvRows
        .map((row) => row[dateMapping.sourceColumn])
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        dateRange = { min: dates[0], max: dates[dates.length - 1] };
      }
    }

    return { total, uniqueSites, uniqueSpecies, dateRange };
  }, [csvRows, mappings]);

  // ── Step 3: Validation ───────────────────────────────────────

  /** Returns true if a specific cell in the preview fails validation */
  function isCellInvalid(
    row: Record<string, string>,
    mapping: ColumnMapping
  ): boolean {
    if (!mapping.systemField) return false;
    const field = fieldsByKey.get(mapping.systemField);
    const value = row[mapping.sourceColumn] ?? "";
    return !validateCell(value, field);
  }

  // ── Step 4: Import ──────────────────────────────────────────

  async function handleImport() {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const supabase = createClient();
    const result: ImportResult = { imported: 0, skipped: 0, errors: [], autoCreatedSpecies: 0 };

    // Parse the full file (not just preview rows)
    const fullParseResult = await new Promise<
      Papa.ParseResult<Record<string, string>>
    >((resolve, reject) => {
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });

    const allRows = fullParseResult.data;
    const totalRows = allRows.length;

    // Build mapping lookup: systemField -> sourceColumn
    const fieldToSource = new Map<string, string>();
    const extraColumns: string[] = [];
    for (const m of mappings) {
      if (m.systemField) {
        fieldToSource.set(m.systemField, m.sourceColumn);
      } else if (m.storeAsExtra) {
        extraColumns.push(m.sourceColumn);
      }
    }

    // Check required fields
    const missingRequired = systemFields
      .filter((f) => f.required && !fieldToSource.has(f.key))
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      toast.error(
        `Missing required fields: ${missingRequired.join(", ")}`
      );
      setImporting(false);
      return;
    }

    if (uploadType === "observations") {
      await handleObservationImport(
        supabase, allRows, totalRows, fieldToSource, extraColumns, result
      );
    } else {
      await handleDeploymentImport(
        supabase, allRows, totalRows, fieldToSource, extraColumns, result
      );
    }

    // Create audit record
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("csv_uploads").insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_name: file?.name ?? "unknown.csv",
        upload_type: uploadType,
        row_count: totalRows,
        rows_imported: result.imported,
        rows_skipped: result.skipped,
        error_log: result.errors.length > 0 ? { errors: result.errors } : null,
        column_mapping: mappings.map((m) => ({
          source: m.sourceColumn,
          target: m.systemField,
          extra: m.storeAsExtra,
        })),
      });
    }

    setImportResult(result);
    setImporting(false);
    setImportProgress(100);

    const entityLabel = uploadType === "observations" ? "observations" : "sites";
    if (result.errors.length === 0) {
      toast.success(`Imported ${result.imported} ${entityLabel} successfully.`);
    } else {
      toast.warning(
        `Imported ${result.imported} ${entityLabel} with ${result.errors.length} error(s).`
      );
    }
  }

  // ── Deployment import (existing logic, extracted) ────────────

  async function handleDeploymentImport(
    supabase: ReturnType<typeof createClient>,
    allRows: Record<string, string>[],
    totalRows: number,
    fieldToSource: Map<string, string>,
    extraColumns: string[],
    result: ImportResult
  ) {
    const BATCH_SIZE = 50;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const insertRows: Record<string, unknown>[] = [];

      for (const row of batch) {
        const siteName = row[fieldToSource.get("site_name") ?? ""]?.trim();
        if (!siteName) {
          result.skipped++;
          continue;
        }

        // Build covariates from extra columns
        const covariates: Record<string, string> = {};
        for (const col of extraColumns) {
          const val = row[col]?.trim();
          if (val) covariates[col] = val;
        }

        // Parse coordinate values
        const latStr = row[fieldToSource.get("latitude") ?? ""] ?? "";
        const lngStr = row[fieldToSource.get("longitude") ?? ""] ?? "";
        const lat = latStr ? Number(latStr) : null;
        const lng = lngStr ? Number(lngStr) : null;

        // Parse date values
        const deployedStr =
          row[fieldToSource.get("date_deployed") ?? ""] ?? "";
        const endStr = row[fieldToSource.get("date_end") ?? ""] ?? "";
        const commentsStr =
          row[fieldToSource.get("comments") ?? ""] ?? "";

        const deployedParsed = deployedStr
          ? applyTransform(deployedStr, { type: "date_parse" })
          : null;
        const endParsed = endStr
          ? applyTransform(endStr, { type: "date_parse" })
          : null;

        insertRows.push({
          project_id: projectId,
          site_name: siteName,
          latitude:
            lat !== null && !Number.isNaN(lat) ? lat : null,
          longitude:
            lng !== null && !Number.isNaN(lng) ? lng : null,
          date_deployed: deployedParsed
            ? (deployedParsed as Date).toISOString().split("T")[0]
            : null,
          date_end: endParsed
            ? (endParsed as Date).toISOString().split("T")[0]
            : null,
          comments: commentsStr.trim() || null,
          covariates:
            Object.keys(covariates).length > 0 ? covariates : {},
        });
      }

      if (insertRows.length > 0) {
        const { error } = await supabase
          .from("sites")
          .insert(insertRows);

        if (error) {
          result.errors.push(
            `Rows ${i + 1}-${i + batch.length}: ${friendlyError(error.code, error.message)}`
          );
          result.skipped += insertRows.length;
        } else {
          result.imported += insertRows.length;
        }
      }

      setImportProgress(Math.round(((i + batch.length) / totalRows) * 100));
    }
  }

  // ── Observation import (Phase 3) ─────────────────────────────

  async function handleObservationImport(
    supabase: ReturnType<typeof createClient>,
    allRows: Record<string, string>[],
    totalRows: number,
    fieldToSource: Map<string, string>,
    extraColumns: string[],
    result: ImportResult
  ) {
    // Pre-fetch all sites for the project as a lookup map
    const { data: sites } = await supabase
      .from("sites")
      .select("id, site_name")
      .eq("project_id", projectId);
    const siteMap = new Map(sites?.map((s) => [s.site_name, s.id]) ?? []);

    // Pre-fetch all species for the project as a lookup map.
    // We index by common_name, scientific_name, and local_name so CSV
    // values in any of those forms resolve to the correct species.
    const { data: existingSpecies } = await supabase
      .from("species")
      .select("id, common_name, scientific_name, local_name")
      .eq("project_id", projectId);
    const speciesMap = new Map<string, string>();
    for (const s of existingSpecies ?? []) {
      // Priority: common_name first, then scientific, then local.
      // Later entries won't overwrite earlier ones for the same string.
      if (s.common_name && !speciesMap.has(s.common_name)) {
        speciesMap.set(s.common_name, s.id);
      }
      if (s.scientific_name && !speciesMap.has(s.scientific_name)) {
        speciesMap.set(s.scientific_name, s.id);
      }
      if (s.local_name && !speciesMap.has(s.local_name)) {
        speciesMap.set(s.local_name, s.id);
      }
    }

    let autoCreatedSpecies = 0;

    // For TimeLapse format, detect the DeleteFlag and RelativePath columns
    const isTimelapse = toolFormat === "timelapse";
    const deleteFlagCol = fieldToSource.get("delete_flag") ?? "DeleteFlag";
    const relativePathCol = fieldToSource.get("file_path") ?? "RelativePath";

    const BATCH_SIZE = 100;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const insertRows: Record<string, unknown>[] = [];

      for (const [rowOffset, row] of batch.entries()) {
        const rowNum = i + rowOffset + 1;

        // TimeLapse: skip rows where DeleteFlag = "true"
        if (isTimelapse) {
          const deleteFlag = row[deleteFlagCol]?.trim().toLowerCase();
          if (deleteFlag === "true") {
            result.skipped++;
            continue;
          }
        }

        // Resolve site name
        let siteName = row[fieldToSource.get("site_name") ?? ""]?.trim() ?? "";

        // TimeLapse: extract site name from RelativePath (first path segment)
        if (isTimelapse && (!siteName || fieldToSource.get("site_name") === relativePathCol)) {
          const relPath = row[relativePathCol]?.trim() ?? "";
          const pathMatch = relPath.match(/^([^\\/]+)/);
          if (pathMatch) {
            siteName = pathMatch[1];
          }
        }

        if (!siteName) {
          result.skipped++;
          result.errors.push(`Row ${rowNum}: missing site name, skipped`);
          continue;
        }

        // Look up site ID
        const siteId = siteMap.get(siteName);
        if (!siteId) {
          result.skipped++;
          result.errors.push(
            `Row ${rowNum}: site "${siteName}" not found in project, skipped`
          );
          continue;
        }

        // Resolve species
        const speciesName =
          row[fieldToSource.get("species_name") ?? ""]?.trim() ?? "";
        let speciesId: string | null = null;

        if (speciesName) {
          speciesId = speciesMap.get(speciesName) ?? null;

          // Auto-create species if not found
          if (!speciesId) {
            const { data: newSpecies, error: speciesError } = await supabase
              .from("species")
              .insert({ project_id: projectId, common_name: speciesName })
              .select("id")
              .single();

            if (newSpecies) {
              speciesMap.set(speciesName, newSpecies.id);
              speciesId = newSpecies.id;
              autoCreatedSpecies++;
            } else if (speciesError) {
              result.errors.push(
                `Row ${rowNum}: failed to create species "${speciesName}": ${friendlyError(speciesError.code, speciesError.message)}`
              );
            }
          }
        }

        // Parse observed_at
        const observedAtStr =
          row[fieldToSource.get("observed_at") ?? ""]?.trim() ?? "";
        const observedAtParsed = observedAtStr
          ? applyTransform(observedAtStr, { type: "date_parse" })
          : null;

        if (!observedAtParsed) {
          result.skipped++;
          result.errors.push(
            `Row ${rowNum}: invalid or missing date/time "${observedAtStr}", skipped`
          );
          continue;
        }

        // Parse boolean fields
        const isAnimalStr =
          row[fieldToSource.get("is_animal") ?? ""]?.trim() ?? "";
        const isEmptyStr =
          row[fieldToSource.get("is_empty") ?? ""]?.trim() ?? "";
        const isAnimal = isAnimalStr
          ? applyTransform(isAnimalStr, { type: "boolean_coerce" })
          : null;
        const isEmpty = isEmptyStr
          ? applyTransform(isEmptyStr, { type: "boolean_coerce" })
          : null;

        // Parse numeric fields
        const countStr =
          row[fieldToSource.get("count") ?? ""]?.trim() ?? "";
        const tempStr =
          row[fieldToSource.get("temperature") ?? ""]?.trim() ?? "";
        const detConfStr =
          row[fieldToSource.get("detection_confidence") ?? ""]?.trim() ?? "";
        const classConfStr =
          row[fieldToSource.get("classification_confidence") ?? ""]?.trim() ?? "";

        const count = countStr
          ? applyTransform(countStr, { type: "number_parse" })
          : null;
        const temperature = tempStr
          ? applyTransform(tempStr, { type: "number_parse" })
          : null;
        const detectionConfidence = detConfStr
          ? applyTransform(detConfStr, { type: "number_parse" })
          : null;
        const classificationConfidence = classConfStr
          ? applyTransform(classConfStr, { type: "number_parse" })
          : null;

        // Text fields
        const individualId =
          row[fieldToSource.get("individual_id") ?? ""]?.trim() || null;
        const filePath =
          row[fieldToSource.get("file_path") ?? ""]?.trim() || null;
        const fileName =
          row[fieldToSource.get("file_name") ?? ""]?.trim() || null;

        // Build extras JSONB from unmapped "extra" columns
        const extras: Record<string, string> = {};
        for (const col of extraColumns) {
          const val = row[col]?.trim();
          if (val) extras[col] = val;
        }

        insertRows.push({
          project_id: projectId,
          site_id: siteId,
          species_id: speciesId,
          observed_at: (observedAtParsed as Date).toISOString(),
          is_animal: typeof isAnimal === "boolean" ? isAnimal : null,
          is_empty: typeof isEmpty === "boolean" ? isEmpty : null,
          count: typeof count === "number" ? count : null,
          individual_id: individualId,
          temperature: typeof temperature === "number" ? temperature : null,
          file_path: filePath,
          file_name: fileName,
          detection_confidence:
            typeof detectionConfidence === "number" ? detectionConfidence : null,
          classification_confidence:
            typeof classificationConfidence === "number"
              ? classificationConfidence
              : null,
          extras: Object.keys(extras).length > 0 ? extras : {},
        });
      }

      if (insertRows.length > 0) {
        const { error } = await supabase
          .from("observations")
          .insert(insertRows);

        if (error) {
          result.errors.push(
            `Rows ${i + 1}-${i + batch.length}: ${friendlyError(error.code, error.message)}`
          );
          result.skipped += insertRows.length;
        } else {
          result.imported += insertRows.length;
        }
      }

      setImportProgress(Math.round(((i + batch.length) / totalRows) * 100));
    }

    result.autoCreatedSpecies = autoCreatedSpecies;
  }

  // ── Navigation ──────────────────────────────────────────────

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return file !== null && csvHeaders.length > 0;
      case 2: {
        // All required fields must be mapped
        const mapped = new Set(
          mappings.filter((m) => m.systemField).map((m) => m.systemField)
        );
        return systemFields
          .filter((f) => f.required)
          .every((f) => mapped.has(f.key));
      }
      case 3:
        return true;
      case 4:
        return importResult !== null;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < 4) setStep((step + 1) as WizardStep);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as WizardStep);
  }

  function handleReset() {
    setStep(1);
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings([]);
    setImportResult(null);
    setImportProgress(0);
    setImporting(false);
    setToolFormat("generic");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render guards ───────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!editable) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <h2 className="mb-2 text-xl font-semibold">Upload Data</h2>
          <p className="text-center text-muted-foreground">
            You need at least Member access to upload data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Step indicator ──────────────────────────────────────────

  const stepIndicator = (
    <div className="mb-8 flex items-center justify-center gap-2">
      {([1, 2, 3, 4] as WizardStep[]).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </div>
          <span
            className={`hidden text-sm sm:inline ${
              s === step ? "font-medium" : "text-muted-foreground"
            }`}
          >
            {STEP_LABELS[s]}
          </span>
          {s < 4 && (
            <div className="mx-2 h-px w-8 bg-border" />
          )}
        </div>
      ))}
    </div>
  );

  // ── Step 1: Upload & Type Selection ─────────────────────────

  function renderStep1() {
    const previewData = csvRows.slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Upload type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload Type</label>
          <Select value={uploadType} onValueChange={handleUploadTypeChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deployments">
                Deployments (Sites)
              </SelectItem>
              <SelectItem value="observations">Observations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : file
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          {file ? (
            <>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {csvRows.length} rows, {csvHeaders.length} columns
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Click or drag to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                Drag and drop a CSV file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse
              </p>
            </>
          )}
        </div>

        {/* Format badge */}
        {file && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Detected format:
            </span>
            <Badge variant="secondary">
              {TOOL_FORMAT_LABELS[toolFormat]}
            </Badge>
          </div>
        )}

        {/* Preview table */}
        {previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Preview (first {previewData.length} rows)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {csvHeaders.map((h) => (
                        <TableCell
                          key={h}
                          className="max-w-[200px] truncate whitespace-nowrap"
                        >
                          {row[h] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Step 2: Column Mapping ──────────────────────────────────

  function renderStep2() {
    // Track which system fields are already mapped so we can disable them
    const usedSystemFields = new Set(
      mappings
        .filter((m) => m.systemField !== null)
        .map((m) => m.systemField as string)
    );

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Map each CSV column to a system field. Required fields are marked
          with an asterisk.
          <HelpTooltip text={uploadHelp.confidenceIndicator} side="bottom" className="ml-1 inline-flex align-middle" />
        </p>

        {mappings.map((mapping) => {
          const sampleValues = csvRows
            .slice(0, 3)
            .map((row) => row[mapping.sourceColumn] ?? "")
            .filter(Boolean);

          return (
            <Card key={mapping.sourceColumn}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: source column info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${confidenceColour(mapping.confidence)}`}
                      title={`Confidence: ${Math.round(mapping.confidence * 100)}%`}
                    />
                    <span className="font-medium">
                      {mapping.sourceColumn}
                    </span>
                  </div>
                  {sampleValues.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {sampleValues.join(" | ")}
                    </p>
                  )}
                </div>

                {/* Right: mapping dropdown or extra checkbox */}
                <div className="flex items-center gap-3">
                  <Select
                    value={mapping.systemField ?? "__none__"}
                    onValueChange={(v) =>
                      updateMapping(
                        mapping.sourceColumn,
                        v === "__none__" ? null : v
                      )
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Unmapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Unmapped --</SelectItem>
                      {systemFields.map((field) => (
                        <SelectItem
                          key={field.key}
                          value={field.key}
                          disabled={
                            usedSystemFields.has(field.key) &&
                            mapping.systemField !== field.key
                          }
                        >
                          {field.label}
                          {field.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!mapping.systemField && (
                    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
                      <Checkbox
                        checked={mapping.storeAsExtra}
                        onCheckedChange={(checked) =>
                          toggleStoreAsExtra(
                            mapping.sourceColumn,
                            checked === true
                          )
                        }
                      />
                      Store as extra
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Required fields status */}
        <Card>
          <CardContent className="py-4">
            <p className="mb-2 text-sm font-medium">Required fields:</p>
            <div className="flex flex-wrap gap-2">
              {systemFields
                .filter((f) => f.required)
                .map((field) => {
                  const isMapped = mappings.some(
                    (m) => m.systemField === field.key
                  );
                  return (
                    <Badge
                      key={field.key}
                      variant={isMapped ? "default" : "destructive"}
                    >
                      {field.label} {isMapped ? "(mapped)" : "(missing)"}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 3: Preview & Validate ──────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-6">
        {/* Summary stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{summaryStats.total}</p>
                <p className="text-xs text-muted-foreground">Total rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">
                  {summaryStats.uniqueSites}
                </p>
                <p className="text-xs text-muted-foreground">Unique sites</p>
              </CardContent>
            </Card>
            {uploadType === "observations" && (
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold">
                    {summaryStats.uniqueSpecies}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unique species
                  </p>
                </CardContent>
              </Card>
            )}
            {summaryStats.dateRange && (
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-sm font-medium">
                    {summaryStats.dateRange.min}
                  </p>
                  <p className="text-xs text-muted-foreground">to</p>
                  <p className="text-sm font-medium">
                    {summaryStats.dateRange.max}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Data table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preview (first {previewRows.length} of {csvRows.length} rows)
            </CardTitle>
            <CardDescription>
              Cells highlighted in red failed validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {mappedColumns.map((m) => {
                    const field = fieldsByKey.get(m.systemField as string);
                    return (
                      <TableHead key={m.sourceColumn} className="whitespace-nowrap">
                        {field?.label ?? m.sourceColumn}
                        {field?.required && (
                          <span className="text-destructive"> *</span>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    <TableCell className="text-muted-foreground">
                      {rowIdx + 1}
                    </TableCell>
                    {mappedColumns.map((m) => {
                      const invalid = isCellInvalid(row, m);
                      return (
                        <TableCell
                          key={m.sourceColumn}
                          className={`max-w-[200px] truncate whitespace-nowrap ${
                            invalid ? "bg-red-100 dark:bg-red-900/30" : ""
                          }`}
                        >
                          {row[m.sourceColumn] ?? ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 4: Import ──────────────────────────────────────────

  function renderStep4() {
    const isObs = uploadType === "observations";
    const entityLabel = isObs ? "observations" : "sites";
    const extraLabel = isObs ? "extras" : "covariates";

    return (
      <div className="space-y-6">
        {/* Progress */}
        {importing && (
          <Card>
            <CardContent className="space-y-4 py-6">
              <p className="text-sm font-medium">
                Importing {entityLabel}...
              </p>
              <Progress value={importProgress} />
              <p className="text-xs text-muted-foreground">
                {importProgress}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Not yet started */}
        {!importing && !importResult && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <h3 className="text-lg font-semibold">Ready to Import</h3>
              <p className="text-center text-muted-foreground">
                {csvRows.length} rows will be imported as {entityLabel} into
                this project. Unmapped columns marked as &quot;extra&quot; will
                be stored in {extraLabel}.
              </p>
              {isObs && (
                <p className="text-center text-sm text-muted-foreground">
                  Sites must already exist in the project. Species that are not
                  found will be auto-created.
                </p>
              )}
              <Button onClick={handleImport} disabled={importing}>
                Start Import
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`grid gap-4 ${
                  isObs && (importResult.autoCreatedSpecies ?? 0) > 0
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-3"
                }`}
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {importResult.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                {isObs && (importResult.autoCreatedSpecies ?? 0) > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {importResult.autoCreatedSpecies}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Species created
                    </p>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
                  <p className="mb-2 text-sm font-medium text-destructive">
                    Errors:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                    {importResult.errors.slice(0, 50).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {importResult.errors.length > 50 && (
                      <li>
                        ...and {importResult.errors.length - 50} more error(s)
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset}>
                  Upload another file
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground">
          Import CSV files with column mapping.
        </p>
      </div>

      {stepIndicator}

      <Card>
        <CardContent className="py-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 1 ? handleReset : handleBack}
          disabled={importing}
        >
          {step === 1 ? "Reset" : "Back"}
        </Button>

        {step < 4 && (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
