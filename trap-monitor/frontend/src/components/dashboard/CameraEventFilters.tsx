"use client";

export interface CameraEventFiltersProps {
  availableSpecies: string[];
  selectedSpecies: string | "all";
  onSpeciesChange: (species: string | "all") => void;
  confidenceThreshold: number;
  onConfidenceChange: (threshold: number) => void;
  dateRange: { start: string; end: string } | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
}

export function CameraEventFilters({
  availableSpecies,
  selectedSpecies,
  onSpeciesChange,
  confidenceThreshold,
  onConfidenceChange,
  dateRange,
  onDateRangeChange,
}: CameraEventFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Species filter */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-(--tm-muted)">
          Species
        </label>
        <select
          value={selectedSpecies}
          onChange={(e) => onSpeciesChange(e.target.value === "all" ? "all" : e.target.value)}
          className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-1.5 text-sm text-(--tm-text)"
        >
          <option value="all">All Species</option>
          {availableSpecies.map((species) => (
            <option key={species} value={species}>
              {species}
            </option>
          ))}
        </select>
      </div>

      {/* Confidence threshold */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-(--tm-muted)">
          Min Confidence
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={confidenceThreshold}
            onChange={(e) => onConfidenceChange(Number(e.target.value))}
            className="w-28 accent-(--tm-accent)"
          />
          <span className="text-sm text-(--tm-text) tabular-nums w-10">
            {confidenceThreshold}%
          </span>
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-(--tm-muted)">
          From
        </label>
        <input
          type="date"
          value={dateRange?.start ?? ""}
          onChange={(e) => {
            const start = e.target.value;
            if (!start) {
              onDateRangeChange(null);
              return;
            }
            onDateRangeChange({ start, end: dateRange?.end ?? "" });
          }}
          className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-1.5 text-sm text-(--tm-text)"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-(--tm-muted)">
          To
        </label>
        <input
          type="date"
          value={dateRange?.end ?? ""}
          onChange={(e) => {
            const end = e.target.value;
            if (!end) {
              onDateRangeChange(dateRange?.start ? { start: dateRange.start, end: "" } : null);
              return;
            }
            onDateRangeChange({ start: dateRange?.start ?? "", end });
          }}
          className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-1.5 text-sm text-(--tm-text)"
        />
      </div>

      {dateRange && (
        <button
          onClick={() => onDateRangeChange(null)}
          className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-1.5 text-sm text-(--tm-muted) hover:text-(--tm-text) transition-colors"
        >
          Clear dates
        </button>
      )}
    </div>
  );
}
