"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useDashboardData } from "@/hooks/useDashboardData";
import Navigation from "@/components/Navigation";
import ContrastToggle from "@/components/ContrastToggle";
import { OrgSelector } from "@/components/dashboard/OrgSelector";
import { ProductToggle } from "@/components/dashboard/ProductToggle";
import { UnitGrid } from "@/components/dashboard/UnitGrid";
import { CameraEventList } from "@/components/dashboard/CameraEventList";
import { CameraEventFilters } from "@/components/dashboard/CameraEventFilters";
import { UnifiedTimeline } from "@/components/dashboard/EventList";
import { getUnitStatus, formatRelativeTime } from "@/lib/types";

// Leaflet must be loaded client-side only (no SSR)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
});

export default function DashboardPage() {
  const router = useRouter();
  const {
    authChecked, loading,
    orgs, currentOrg, setCurrentOrg, orgLoadError,
    units, events,
    selected, setSelected,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    sortKey, setSortKey,
    availableProducts, activeProduct, setActiveProduct,
    isOnline, pendingSyncCount,
    offline, lowBatt, caught, filteredUnits, filteredEvents,
    // Camera
    filteredCameraEvents, availableSpecies, getImageUrl,
    selectedSpecies, setSelectedSpecies,
    confidenceThreshold, setConfidenceThreshold,
    cameraDateRange, setCameraDateRange,
    unifiedTimeline,
    acknowledge, sendCommand,
  } = useDashboardData();

  if (!authChecked || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--tm-bg)">
        <div className="text-center">
          <div className="text-5xl mb-4">🪤</div>
          <div className="font-heading text-lg text-(--tm-accent) animate-pulse">
            Loading trap network...
          </div>
        </div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex h-screen flex-col bg-(--tm-bg)">
        <Navigation orgName="No organization" />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-8 text-center shadow-xl">
            <div className="text-6xl mb-4">🪤</div>
            <h1 className="font-heading mb-3 text-3xl text-(--tm-text)">
              Welcome to Trap Monitor
            </h1>
            <p className="mb-6 text-lg text-(--tm-muted)">
              Create an organization to start monitoring your traps
            </p>
            {orgLoadError && (
              <p className="mb-4 rounded-lg border border-(--tm-danger-border) bg-(--tm-danger-soft) p-3 text-sm text-(--tm-danger)">
                {orgLoadError}
              </p>
            )}
            <button
              onClick={() => router.push("/orgs/new")}
              className="rounded-lg bg-(--tm-accent) px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-(--tm-accent-strong)"
            >
              Create Organization
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-(--tm-bg)">
      <div className="shrink-0 border-b border-(--tm-border) bg-(--tm-panel)">
        <div className="px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <h1 className="font-heading text-2xl text-(--tm-text)">
                Trap Monitor Field Console
              </h1>
              <OrgSelector orgs={orgs} currentOrg={currentOrg} onOrgChange={setCurrentOrg} />
              <ProductToggle
                availableProducts={availableProducts}
                activeProduct={activeProduct}
                onProductChange={setActiveProduct}
              />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/dashboard/field-check" className="rounded-lg bg-(--tm-accent) px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--tm-accent-strong)">Start Field Check</Link>
              <Link href="/dashboard/cards" className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-sm font-semibold text-(--tm-text) transition-colors hover:bg-(--tm-panel-soft)">Cards</Link>
              <Link href="/orgs" className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-sm font-semibold text-(--tm-text) transition-colors hover:bg-(--tm-panel-soft)">Organizations</Link>
              <ContrastToggle />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-2.5 py-1 font-semibold ${isOnline ? "border-(--tm-ok-border) bg-(--tm-ok-soft) text-(--tm-ok-text)" : "border-(--tm-danger-border) bg-(--tm-danger-soft) text-(--tm-danger)"}`}>{isOnline ? "Online" : "Offline"}</span>
            <span className="rounded-full border border-(--tm-border) bg-(--tm-panel) px-2.5 py-1 font-semibold text-(--tm-muted)">Pending Sync {pendingSyncCount}</span>
            {!isOnline && (<span className="rounded-full border border-(--tm-warning-border) bg-(--tm-warning-soft) px-2.5 py-1 font-semibold text-(--tm-warning)">Working in offline mode</span>)}
          </div>
          <StatsCards units={units} caught={caught} offline={offline} lowBatt={lowBatt} />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Trap monitor sidebar: UnitGrid with trap events */}
        {activeProduct !== 'camera_trap' && (
          <UnitGrid
            units={units} events={filteredEvents} filteredUnits={filteredUnits}
            selected={selected} onSelect={setSelected}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery} onSearchQueryChange={setSearchQuery}
            sortKey={sortKey} onSortKeyChange={setSortKey}
            onAcknowledge={acknowledge}
          />
        )}

        {/* Camera sidebar: filters + event grid when camera-only mode */}
        {activeProduct === 'camera_trap' && (
          <aside className="flex w-full max-h-[52vh] flex-col overflow-hidden border-b border-(--tm-border) bg-(--tm-bg-subtle) lg:max-h-none lg:w-92 lg:border-b-0 lg:border-r">
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                <CameraEventFilters
                  availableSpecies={availableSpecies}
                  selectedSpecies={selectedSpecies}
                  onSpeciesChange={setSelectedSpecies}
                  confidenceThreshold={confidenceThreshold}
                  onConfidenceChange={setConfidenceThreshold}
                  dateRange={cameraDateRange}
                  onDateRangeChange={setCameraDateRange}
                />
              </div>
              <div className="p-3 pt-0">
                <CameraEventList
                  events={filteredCameraEvents}
                  getImageUrl={getImageUrl}
                  maxEvents={24}
                />
              </div>
              <UnifiedTimeline
                items={unifiedTimeline}
                onAcknowledge={acknowledge}
                getImageUrl={getImageUrl}
              />
            </div>
          </aside>
        )}

        <main className="relative flex-1 bg-(--tm-bg-subtle) min-h-[46vh] lg:min-h-0 flex flex-col">
          <div className="relative flex-1">
          <MapView units={units} events={events} selectedUnit={selected} onUnitClick={setSelected} />
          {selected && (() => {
            const unit = units.find((u) => u.id === selected);
            if (!unit) return null;
            const status = getUnitStatus(unit, events);
            const statusLabel = status === "caught" ? "Caught" : status === "offline" ? "Offline" : status === "lowbatt" ? "Low Battery" : status === "disarmed" ? "Disarmed" : "Normal";
            const unackedEvent = events.find((e) => e.unit_id === unit.id && e.trap_caught && !e.acknowledged);
            const hasGps = !!unit.last_lat && !!unit.last_lng;
            const mapsUrl = hasGps ? `https://maps.google.com/?q=${unit.last_lat},${unit.last_lng}` : null;
            return (
              <div className="fixed bottom-0 left-0 right-0 z-1100 rounded-t-2xl border-t border-l border-r border-(--tm-border) bg-(--tm-panel) p-4 shadow-2xl backdrop-blur md:absolute md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-96 md:rounded-2xl md:border">
                <div className="mb-3 flex justify-center md:hidden"><div className="h-1 w-10 rounded-full bg-(--tm-border)" /></div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-xl text-(--tm-text)">{unit.name || unit.id}</h3>
                    <p className="font-mono text-xs text-(--tm-muted)">{unit.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status === "caught" ? "border-(--tm-danger-border) bg-(--tm-danger-soft) text-(--tm-danger)" : status === "offline" ? "border-(--tm-offline-border) bg-(--tm-offline-soft) text-(--tm-offline)" : status === "lowbatt" ? "border-(--tm-warning-border) bg-(--tm-warning-soft) text-(--tm-warning)" : "border-(--tm-border) bg-(--tm-panel) text-(--tm-muted)"}`}>{statusLabel}</span>
                    <button onClick={() => setSelected(null)} className="rounded-md border border-(--tm-border) bg-(--tm-panel) px-2 py-1 text-sm text-(--tm-muted) transition-colors hover:bg-(--tm-panel-soft)" aria-label="Close">✕</button>
                  </div>
                </div>
                {unackedEvent && (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-(--tm-danger-border) bg-(--tm-danger-soft) p-2">
                    <span className="text-sm font-semibold text-(--tm-danger)">🔴 Trap alert — {formatRelativeTime(unackedEvent.triggered_at)}</span>
                    <button onClick={() => acknowledge(unackedEvent.id)} aria-label="Acknowledge trap alert" className="shrink-0 rounded-md bg-(--tm-danger) px-3 py-1 text-xs font-bold text-white transition-colors hover:opacity-80">ACK</button>
                  </div>
                )}
                <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border border-(--tm-border) bg-(--tm-panel) p-2.5 text-xs">
                  <div><div className="mb-1 text-(--tm-muted)">Battery</div><div className={`text-lg font-semibold ${(unit.battery_pct ?? 100) <= 20 ? "text-(--tm-warning)" : "text-(--tm-accent)"}`}>{unit.battery_pct ?? "?"}%</div></div>
                  <div><div className="mb-1 text-(--tm-muted)">Solar</div><div className={`text-lg font-semibold ${unit.solar_ok ? "text-(--tm-accent)" : "text-(--tm-danger)"}`}>{unit.solar_ok ? "OK" : "FAULT"}</div></div>
                  <div><div className="mb-1 text-(--tm-muted)">Armed</div><div className={`text-lg font-semibold ${unit.armed ? "text-(--tm-accent)" : "text-(--tm-offline)"}`}>{unit.armed ? "Yes" : "No"}</div></div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/dashboard/units/${unit.id}`} className="block rounded-lg bg-(--tm-accent) px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-(--tm-accent-strong)">Open Details</Link>
                    {mapsUrl ? (<a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Navigate to unit location in Google Maps" className="block rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-center text-sm font-semibold text-(--tm-text) transition-colors hover:bg-(--tm-panel-soft)">🧭 Navigate</a>) : (<span aria-label="GPS location unavailable" className="flex items-center justify-center rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2 text-center text-sm text-(--tm-muted)">No GPS</span>)}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["STATUS", "GPS", unit.armed ? "DISARM" : "ARM"].map((cmd) => (
                      <button key={cmd} onClick={() => {
                        if (cmd === "ARM" || cmd === "DISARM") {
                          if (!window.confirm(`Are you sure you want to ${cmd.toLowerCase()} unit "${unit.name || unit.id}"?`)) return;
                        }
                        sendCommand(unit.id, cmd);
                      }} aria-label={`Send ${cmd} command to ${unit.name || unit.id}`} className="rounded-md border border-(--tm-border) bg-(--tm-panel) px-2 py-1.5 text-xs font-semibold text-(--tm-text) transition-colors hover:bg-(--tm-panel-soft)">{cmd}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          </div>

          {/* Camera events panel in main area for 'all' mode */}
          {activeProduct === 'all' && filteredCameraEvents.length > 0 && (
            <div className="shrink-0 border-t border-(--tm-border) bg-(--tm-panel) p-3 overflow-x-auto">
              <div className="mb-2 flex items-center gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
                  Camera Events
                </div>
                <CameraEventFilters
                  availableSpecies={availableSpecies}
                  selectedSpecies={selectedSpecies}
                  onSpeciesChange={setSelectedSpecies}
                  confidenceThreshold={confidenceThreshold}
                  onConfidenceChange={setConfidenceThreshold}
                  dateRange={cameraDateRange}
                  onDateRangeChange={setCameraDateRange}
                />
              </div>
              <CameraEventList
                events={filteredCameraEvents}
                getImageUrl={getImageUrl}
                maxEvents={12}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatsCards({ units, caught, offline, lowBatt }: { units: readonly unknown[]; caught: readonly unknown[]; offline: readonly unknown[]; lowBatt: readonly unknown[] }) {
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-(--tm-border) bg-(--tm-panel) px-4 py-3 shadow-sm">
          <div className="text-xs uppercase tracking-[0.14em] text-(--tm-muted)">Total Units</div>
          <div className="mt-1 text-3xl font-semibold text-(--tm-text)">{units.length}</div>
        </div>
        <div className="rounded-xl border border-(--tm-danger-border) bg-(--tm-danger-soft) px-4 py-3 shadow-sm">
          <div className="text-xs uppercase tracking-[0.14em] text-(--tm-danger)">Caught</div>
          <div className={`mt-1 text-3xl font-semibold text-(--tm-danger) ${caught.length > 0 ? "animate-pulse" : ""}`}>{caught.length}</div>
        </div>
        <div className="rounded-xl border border-(--tm-offline-border) bg-(--tm-offline-soft) px-4 py-3 shadow-sm">
          <div className="text-xs uppercase tracking-[0.14em] text-(--tm-offline)">Offline</div>
          <div className="mt-1 text-3xl font-semibold text-(--tm-offline)">{offline.length}</div>
        </div>
        <div className="rounded-xl border border-(--tm-warning-border) bg-(--tm-warning-soft) px-4 py-3 shadow-sm">
          <div className="text-xs uppercase tracking-[0.14em] text-(--tm-warning)">Low Battery</div>
          <div className="mt-1 text-3xl font-semibold text-(--tm-warning)">{lowBatt.length}</div>
        </div>
      </div>
      {caught.length === 0 && offline.length === 0 && lowBatt.length === 0 && units.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-(--tm-ok-border) bg-(--tm-ok-soft) px-4 py-2.5">
          <span className="text-lg">✅</span>
          <span className="text-sm font-semibold text-(--tm-ok-text)">
            All clear — {units.length} trap{units.length !== 1 ? "s" : ""} armed and reporting normally
          </span>
        </div>
      )}
    </>
  );
}
