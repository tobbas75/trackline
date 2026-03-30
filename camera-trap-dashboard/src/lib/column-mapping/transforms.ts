import { parse, isValid } from "date-fns";

export interface TransformConfig {
  type: "regex_extract" | "date_parse" | "boolean_coerce" | "number_parse";
  pattern?: string; // regex pattern for regex_extract
  dateFormat?: string; // e.g., "dd/MM/yyyy"
}

export function applyTransform(
  value: string,
  config: TransformConfig
): string | number | boolean | Date | null {
  if (!value || value.trim() === "") return null;

  switch (config.type) {
    case "regex_extract": {
      if (!config.pattern) return value;
      const match = value.match(new RegExp(config.pattern));
      return match ? (match[1] ?? match[0]) : value;
    }

    case "date_parse": {
      if (!config.dateFormat) {
        // Try common formats
        const formats = [
          "yyyy-MM-dd'T'HH:mm:ss",
          "yyyy-MM-dd HH:mm:ss",
          "dd/MM/yyyy HH:mm",
          "dd/MM/yyyy",
          "MM/dd/yyyy",
          "yyyy-MM-dd",
        ];
        for (const fmt of formats) {
          const d = parse(value, fmt, new Date());
          if (isValid(d)) return d;
        }
        // ISO fallback
        const isoDate = new Date(value);
        return isValid(isoDate) ? isoDate : null;
      }
      const d = parse(value, config.dateFormat, new Date());
      return isValid(d) ? d : null;
    }

    case "boolean_coerce": {
      const lower = value.toLowerCase().trim();
      if (["true", "1", "yes", "y"].includes(lower)) return true;
      if (["false", "0", "no", "n"].includes(lower)) return false;
      return null;
    }

    case "number_parse": {
      const num = parseFloat(value.replace(/[^0-9.\-]/g, ""));
      return isNaN(num) ? null : num;
    }

    default:
      return value;
  }
}
