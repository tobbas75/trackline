"use client";

import {
  Unit,
  TrapEvent,
  UnitStatus,
  getUnitStatus,
  formatRelativeTime,
} from "@/lib/types";
import { EventList } from "@/components/dashboard/EventList";

export interface UnitGridProps {
  units: Unit[];
  events: TrapEvent[];
  filteredUnits: Unit[];
  selected: string | null;
  onSelect: (unitId: string) => void;
  // Filters
  statusFilter: UnitStatus | "all";
  onStatusFilterChange: (filter: UnitStatus | "all") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortKey: "status" | "last_seen" | "battery_pct" | "name";
  onSortKeyChange: (key: "status" | "last_seen" | "battery_pct" | "name") => void;
  // Events
  onAcknowledge: (eventId: number) => void;
}

export function UnitGrid({
  units,
  events,
  filteredUnits,
  selected,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortKey,
  onSortKeyChange,
  onAcknowledge,
}: UnitGridProps) {
  return (
    <aside className="flex w-full max-h-[52vh] flex-col overflow-hidden border-b border-(--tm-border) bg-(--tm-bg-subtle) lg:max-h-none lg:w-92 lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-(--tm-border) p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-(--tm-muted)">
          Filter Units
        </h3>

        <input
          type="text"
          placeholder="Search by name or unit ID"
          aria-label="Search units by name or ID"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-sm text-(--tm-text) placeholder:text-(--tm-muted) outline-none transition-colors focus:border-(--tm-accent)"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              "all",
              "caught",
              "offline",
              "lowbatt",
              "disarmed",
              "normal",
            ] as const
          ).map((status) => {
            const count =
              status === "all"
                ? units.length
                : units.filter((u) => getUnitStatus(u, events) === status)
                    .length;

            return (
              <button
                key={status}
                onClick={() => onStatusFilterChange(status)}
                aria-label={status === "all" ? "Show all units" : `Filter by ${status} status`}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? "border-(--tm-accent) bg-(--tm-accent) text-white"
                    : "border-(--tm-border) bg-(--tm-panel) text-(--tm-muted) hover:bg-(--tm-panel-soft)"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status.charAt(0).toUpperCase() + status.slice(1)}{" "}
                {count}
              </button>
            );
          })}
        </div>

        {/* Fleet battery distribution bar */}
        {units.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-(--tm-muted)">
              <span>Fleet Battery</span>
              <span>{units.length} units</span>
            </div>
            <FleetBatteryBar units={units} />
          </div>
        )}

        <select
          value={sortKey}
          onChange={(e) =>
            onSortKeyChange(
              e.target.value as
                | "status"
                | "last_seen"
                | "battery_pct"
                | "name",
            )
          }
          aria-label="Sort units"
          className="mt-3 w-full rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-sm text-(--tm-text) outline-none transition-colors focus:border-(--tm-accent)"
        >
          <option value="status">Sort: Critical First</option>
          <option value="name">Sort: Name</option>
          <option value="last_seen">Sort: Last Seen</option>
          <option value="battery_pct">Sort: Battery</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="sticky top-0 z-10 rounded-md border border-(--tm-border) bg-(--tm-panel) px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
            Units {filteredUnits.length}
          </div>
          <div className="mt-2">
            {filteredUnits.map((unit) => (
              <CompactUnitCard
                key={unit.id}
                unit={unit}
                events={events}
                selected={selected === unit.id}
                onSelect={() => onSelect(unit.id)}
              />
            ))}
          </div>
        </div>

        <EventList events={events} onAcknowledge={onAcknowledge} />
      </div>
    </aside>
  );
}

// ── Compact Unit Card for Sidebar ─────────────────────────────────────────────
function CompactUnitCard({
  unit,
  events,
  selected,
  onSelect,
}: {
  unit: Unit;
  events: TrapEvent[];
  selected: boolean;
  onSelect: () => void;
}) {
  const status = getUnitStatus(unit, events);
  const statusColor =
    status === "caught"
      ? "bg-(--tm-danger)"
      : status === "offline"
        ? "bg-(--tm-offline)"
        : status === "lowbatt"
          ? "bg-(--tm-warning)"
          : status === "disarmed"
            ? "bg-(--tm-muted)"
            : "bg-(--tm-accent)";

  const statusLabel =
    status === "caught"
      ? "Caught"
      : status === "offline"
        ? "Offline"
        : status === "lowbatt"
          ? "Low Batt"
          : status === "disarmed"
            ? "Disarmed"
            : "Normal";

  // Stale data warning: >12h without contact (amber), >26h = offline (already shown)
  const lastSeenMs = unit.last_seen
    ? Date.now() - new Date(unit.last_seen).getTime()
    : Infinity;
  const isVeryStale = lastSeenMs > 12 * 3600000 && status !== "offline";
  const lastSeenColor =
    status === "offline" || lastSeenMs > 26 * 3600000
      ? "text-(--tm-offline)"
      : isVeryStale
        ? "text-(--tm-warning) font-semibold"
        : "text-(--tm-muted)";

  const batteryColor =
    (unit.battery_pct ?? 100) <= 10
      ? "text-(--tm-danger) font-semibold"
      : (unit.battery_pct ?? 100) <= 20
        ? "text-(--tm-warning) font-semibold"
        : "text-(--tm-muted)";

  return (
    <div
      onClick={onSelect}
      className={`mb-1 cursor-pointer rounded-xl border p-3 transition-all ${
        selected
          ? "border-(--tm-accent) bg-(--tm-accent-soft)"
          : isVeryStale && status !== "caught"
            ? "border-(--tm-warning-border) bg-(--tm-warning-soft) hover:bg-(--tm-warning-soft)"
            : "border-(--tm-border) bg-(--tm-panel) hover:bg-(--tm-panel-soft)"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${statusColor} shrink-0`}
          />
          <span className="truncate text-sm font-semibold text-(--tm-text)">
            {unit.name || unit.id}
          </span>
        </div>
        <span className={`ml-2 shrink-0 text-xs ${lastSeenColor}`}>
          {formatRelativeTime(unit.last_seen)}
          {isVeryStale && " ⚠️"}
        </span>
      </div>

      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-(--tm-muted)">
        {statusLabel}
      </div>

      <div className="flex gap-3 text-xs">
        <span className={batteryColor}>🔋 {unit.battery_pct ?? "?"}%</span>
        <span className="text-(--tm-muted)">{unit.solar_ok ? "☀️ OK" : "☀️ Fault"}</span>
        {unit.firmware_ver && (
          <span className="font-mono truncate text-(--tm-muted)">v{unit.firmware_ver}</span>
        )}
      </div>
    </div>
  );
}

// ── Fleet Battery Distribution Bar ────────────────────────────────────────────
function FleetBatteryBar({ units }: { units: Unit[] }) {
  const total = units.length;
  if (total === 0) return null;

  const critical = units.filter((u) => (u.battery_pct ?? 100) < 10).length;
  const low = units.filter(
    (u) => (u.battery_pct ?? 100) >= 10 && (u.battery_pct ?? 100) < 20,
  ).length;
  const ok = units.filter(
    (u) => (u.battery_pct ?? 100) >= 20 && (u.battery_pct ?? 100) < 50,
  ).length;
  const good = units.filter((u) => (u.battery_pct ?? 100) >= 50).length;

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {critical > 0 && (
          <div
            className="bg-(--tm-danger)"
            style={{ width: pct(critical) }}
            title={`Critical (<10%): ${critical}`}
          />
        )}
        {low > 0 && (
          <div
            className="bg-(--tm-warning)"
            style={{ width: pct(low) }}
            title={`Low (10–20%): ${low}`}
          />
        )}
        {ok > 0 && (
          <div
            className="bg-(--tm-accent)"
            style={{ width: pct(ok) }}
            title={`OK (20–50%): ${ok}`}
          />
        )}
        {good > 0 && (
          <div
            className="bg-(--tm-accent-strong)"
            style={{ width: pct(good) }}
            title={`Good (>50%): ${good}`}
          />
        )}
      </div>
      <div className="flex gap-3 text-[10px] text-(--tm-muted)">
        {critical > 0 && <span className="text-(--tm-danger)">🔴 {critical} critical</span>}
        {low > 0 && <span className="text-(--tm-warning)">🟡 {low} low</span>}
        {good + ok > 0 && <span className="text-(--tm-ok-text)">🟢 {good + ok} ok</span>}
      </div>
    </div>
  );
}
