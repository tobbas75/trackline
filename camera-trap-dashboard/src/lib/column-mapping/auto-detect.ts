import { getFieldsForType } from "./field-registry";

export interface ColumnMatch {
  sourceColumn: string;
  systemField: string | null;
  confidence: number; // 1.0 = exact, 0.95 = alias, 0.7 = substring
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoDetectColumns(
  sourceColumns: string[],
  uploadType: string
): ColumnMatch[] {
  const fields = getFieldsForType(uploadType);
  const usedFields = new Set<string>();

  const matches: ColumnMatch[] = sourceColumns.map((col) => {
    let bestMatch: { field: string; confidence: number } | null = null;
    const normalizedCol = normalize(col);

    for (const field of fields) {
      if (usedFields.has(field.key)) continue;

      // Exact key match
      if (normalizedCol === normalize(field.key)) {
        bestMatch = { field: field.key, confidence: 1.0 };
        break;
      }

      // Alias match
      for (const alias of field.aliases) {
        if (normalize(alias) === normalizedCol) {
          if (!bestMatch || bestMatch.confidence < 0.95) {
            bestMatch = { field: field.key, confidence: 0.95 };
          }
          break;
        }
      }

      // Substring match (lower priority)
      if (!bestMatch) {
        for (const alias of field.aliases) {
          if (
            normalizedCol.includes(normalize(alias)) ||
            normalize(alias).includes(normalizedCol)
          ) {
            if (normalizedCol.length > 2 && normalize(alias).length > 2) {
              bestMatch = { field: field.key, confidence: 0.7 };
              break;
            }
          }
        }
      }
    }

    if (bestMatch) {
      usedFields.add(bestMatch.field);
    }

    return {
      sourceColumn: col,
      systemField: bestMatch?.field ?? null,
      confidence: bestMatch?.confidence ?? 0,
    };
  });

  return matches;
}

export function detectToolFormat(
  columns: string[]
): "timelapse" | "addaxai" | "generic" {
  const colSet = new Set(columns.map((c) => c.toLowerCase()));

  // TimeLapse: RelativePath + File + (DateTime or Date+Time) + DeleteFlag
  if (
    colSet.has("relativepath") &&
    colSet.has("file") &&
    colSet.has("deleteflag")
  ) {
    return "timelapse";
  }

  // AddaxAI/MegaDetector: conf + category columns
  if (
    (colSet.has("conf") || colSet.has("confidence")) &&
    (colSet.has("category") || colSet.has("classification"))
  ) {
    return "addaxai";
  }

  return "generic";
}
