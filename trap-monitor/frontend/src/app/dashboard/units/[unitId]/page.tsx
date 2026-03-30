"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Unit, TrapEvent, CameraEvent, formatRelativeTime } from "@/lib/types";
import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
});
const BatteryChart = dynamic(() => import("@/components/charts/BatteryChart"), {
  ssr: false,
});

const supabase = createClient();

interface CommandRecord {
  id: number;
  unit_id: string;
  command: string;
  sent_at: string;
  response: string | null;
  response_at: string | null;
  sent_by: string | null;
}

const EVENTS_PER_PAGE = 20;

export default function UnitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [events, setEvents] = useState<TrapEvent[]>([]);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [cameraEventsLoading, setCameraEventsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventPage, setEventPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  // Load unit and initial data
  useEffect(() => {
    async function load() {
      if (!unitId) return;

      try {
        // Fetch unit
        const { data: unitData } = await supabase
          .from("units")
          .select("*")
          .eq("id", unitId)
          .single();

        if (!unitData) {
          router.push("/dashboard");
          return;
        }
        setUnit(unitData);

        // Fetch camera events for camera_trap units (per UNIT-04)
        if (unitData.device_type === 'camera_trap') {
          setCameraEventsLoading(true);
          const { data: camEvents } = await supabase
            .from('t_camera_events')
            .select('*, t_camera_detections(id, class_name, confidence)')
            .eq('unit_id', unitId)
            .order('captured_at', { ascending: false })
            .limit(12);
          if (camEvents) setCameraEvents(camEvents as CameraEvent[]);
          setCameraEventsLoading(false);
        }

        // Fetch events count
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("unit_id", unitId);
        setTotalEvents(count || 0);

        // Fetch first page of events
        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("unit_id", unitId)
          .order("triggered_at", { ascending: false })
          .range(0, EVENTS_PER_PAGE - 1);
        if (eventsData) setEvents(eventsData);

        // Fetch commands
        const { data: commandsData } = await supabase
          .from("commands")
          .select("*")
          .eq("unit_id", unitId)
          .order("sent_at", { ascending: false })
          .limit(50);
        if (commandsData) setCommands(commandsData);
      } catch (err) {
        console.error("Failed to load unit details:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [unitId, router]);

  // Load more events
  const loadMoreEvents = async () => {
    if (!unitId) return;
    const nextPage = eventPage + 1;
    const start = eventPage * EVENTS_PER_PAGE;
    const end = start + EVENTS_PER_PAGE - 1;

    const { data: moreEvents } = await supabase
      .from("events")
      .select("*")
      .eq("unit_id", unitId)
      .order("triggered_at", { ascending: false })
      .range(start, end);

    if (moreEvents) {
      setEvents((prev) => [...prev, ...moreEvents]);
      setEventPage(nextPage);
    }
  };

  if (loading || !unit) {
    return (
      <div className="flex items-center justify-center h-screen bg-(--tm-bg)">
        <div className="text-(--tm-accent) text-lg animate-pulse">
          Loading unit...
        </div>
      </div>
    );
  }

  const hasMoreEvents = events.length < totalEvents;

  const lastSeenMs = unit.last_seen
    ? Date.now() - new Date(unit.last_seen).getTime()
    : Infinity;
  const isStale = lastSeenMs > 12 * 3600000;
  const hasGps = !!unit.last_lat && !!unit.last_lng;
  const mapsUrl = hasGps
    ? `https://maps.google.com/?q=${unit.last_lat},${unit.last_lng}`
    : null;

  function getThumbnailUrl(imagePath: string | undefined): string | null {
    if (!imagePath) return null;
    const { data } = supabase.storage.from('camera-images').getPublicUrl(imagePath);
    return data?.publicUrl || null;
  }

  return (
    <div className="flex flex-col h-screen bg-(--tm-bg) text-(--tm-text)">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 py-4 bg-(--tm-panel) border-b border-(--tm-border)">
        <button
          onClick={() => router.back()}
          className="px-3 py-1 rounded border border-(--tm-border) text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text) transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold flex-1">{unit.name || unit.id}</h1>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={
              (unit.battery_pct ?? 100) <= 20 ? "text-(--tm-warning) font-semibold" : ""
            }
          >
            🔋 {unit.battery_pct ?? "?"}%
          </span>
          <span>{unit.solar_ok ? "☀️ OK" : "☀️ FAULT"}</span>
          <span
            className={isStale ? "text-(--tm-warning) font-semibold" : ""}
          >
            📡 {formatRelativeTime(unit.last_seen)}
          </span>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded border border-(--tm-border) text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text) transition-colors text-xs"
            >
              🧭 Navigate
            </a>
          )}
        </div>
      </header>

      {/* ── Stale data warning ──────────────────────────────────────────────── */}
      {isStale && (
        <div className="flex items-center gap-2 bg-(--tm-warning-soft) border-b border-(--tm-warning-border) px-6 py-2 text-sm text-(--tm-warning)">
          <span>⚠️</span>
          <span>
            Data may be stale — last contact{" "}
            <strong>{formatRelativeTime(unit.last_seen)}</strong>. Device may be
            offline or out of range.
          </span>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* ── Map & Chart Row ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mini Map */}
            <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider text-(--tm-muted)">
                Location
              </h2>
              <div className="h-64 lg:h-80">
                <MiniMap unit={unit} events={events} />
              </div>
            </div>

            {/* Battery Chart */}
            <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider text-(--tm-muted)">
                Battery Trend
              </h2>
              <div className="h-64 lg:h-80 flex items-center justify-center">
                <BatteryChart unitId={unit.id} events={events} />
              </div>
            </div>
          </div>

          {/* ── Stats Row ──────────────────────────────────────────────────── */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${unit.device_type === 'camera_trap' ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-4`}>
            <StatCard label="Battery" value={`${unit.battery_pct ?? "?"}%`} />
            <StatCard label="Solar" value={unit.solar_ok ? "OK" : "FAULT"} />
            <StatCard label="Firmware" value={unit.firmware_ver || "unknown"} />
            <StatCard
              label="Armed"
              value={unit.armed === false ? "No" : "Yes"}
            />
            <StatCard
              label="Last Seen"
              value={
                unit.last_seen
                  ? new Date(unit.last_seen).toLocaleString("en-AU")
                  : "never"
              }
            />
            {unit.device_type === 'camera_trap' && (
              <>
                <StatCard label="Camera Events" value={String(cameraEvents.length)} />
                <StatCard label="Total Detections" value={String(cameraEvents.reduce((sum, e) => sum + e.detection_count, 0))} />
              </>
            )}
          </div>

          {/* ── Camera Events (camera_trap only) ─────────────────────────── */}
          {unit.device_type === 'camera_trap' && (
            <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-(--tm-muted)">
                Recent Camera Events ({cameraEvents.length})
              </h2>
              {cameraEventsLoading ? (
                <div className="text-(--tm-muted) text-sm animate-pulse">Loading camera events...</div>
              ) : cameraEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-(--tm-muted)">No camera events recorded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cameraEvents.map((event) => {
                    const thumbUrl = getThumbnailUrl(event.image_path);
                    const detections = (event as unknown as Record<string, unknown>).t_camera_detections as Array<{id: string; class_name: string; confidence: number}> | undefined;
                    const topSpecies = detections && detections.length > 0
                      ? detections.reduce((a, b) => a.confidence > b.confidence ? a : b).class_name
                      : null;

                    return (
                      <div
                        key={event.id}
                        className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) overflow-hidden hover:border-(--tm-accent) transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-4/3 bg-(--tm-bg-subtle) relative">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={`Camera event at ${new Date(event.captured_at).toLocaleString('en-AU')}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-(--tm-muted)">
                              <span className="text-3xl">No image</span>
                            </div>
                          )}
                          {/* Detection count badge */}
                          {event.detection_count > 0 && (
                            <span className="absolute top-1.5 right-1.5 rounded-full bg-(--tm-accent) px-2 py-0.5 text-xs font-bold text-white">
                              {event.detection_count} detection{event.detection_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2.5">
                          <div className="text-xs text-(--tm-muted)">
                            {new Date(event.captured_at).toLocaleString('en-AU')}
                          </div>
                          {topSpecies && (
                            <div className="mt-1 text-sm font-semibold text-(--tm-text) truncate">
                              {topSpecies}
                            </div>
                          )}
                          {event.battery_percent !== undefined && (
                            <div className="mt-1 text-xs text-(--tm-muted)">
                              Battery: {event.battery_percent}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Event History (trap_monitor only) ─────────────────────────── */}
          {(unit.device_type || 'trap_monitor') === 'trap_monitor' && (
          <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-(--tm-muted)">
              Event History ({totalEvents} total)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-(--tm-border)">
                    <th className="text-left px-4 py-2 text-(--tm-muted)">Time</th>
                    <th className="text-left px-4 py-2 text-(--tm-muted)">Type</th>
                    <th className="hidden sm:table-cell text-left px-4 py-2 text-(--tm-muted)">
                      Battery
                    </th>
                    <th className="hidden lg:table-cell text-left px-4 py-2 text-(--tm-muted)">
                      Solar
                    </th>
                    <th className="hidden lg:table-cell text-left px-4 py-2 text-(--tm-muted)">
                      GPS
                    </th>
                    <th className="text-left px-4 py-2 text-(--tm-muted)">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-(--tm-border) hover:bg-(--tm-panel-soft)"
                    >
                      <td className="px-4 py-2 text-xs sm:text-sm">
                        {new Date(event.triggered_at).toLocaleString("en-AU")}
                      </td>
                      <td className="px-4 py-2 text-xs sm:text-sm">
                        {event.event_type === "TRAP" && event.trap_caught ? (
                          <span className="text-(--tm-danger) font-semibold">
                            TRAP
                          </span>
                        ) : (
                          <span className="text-(--tm-muted)">
                            {event.event_type}
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-2 text-xs">
                        {event.battery_pct ?? "?"}%
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2 text-xs">
                        {event.solar_ok ? "OK" : "FAULT"}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2 text-xs">
                        {event.lat && event.lng ? (
                          <span className="text-(--tm-muted)">
                            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-(--tm-muted)">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {event.trap_caught && !event.acknowledged ? (
                          <span className="bg-(--tm-danger) text-white px-2 py-0.5 rounded text-xs">
                            Unack
                          </span>
                        ) : (
                          <span className="text-(--tm-muted) text-xs">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMoreEvents && (
              <button
                onClick={loadMoreEvents}
                className="mt-4 px-4 py-2 bg-(--tm-panel-soft) hover:bg-(--tm-bg-subtle) rounded text-sm text-(--tm-muted) hover:text-(--tm-text) transition-colors min-h-10"
              >
                Load more events ({events.length} / {totalEvents})
              </button>
            )}
          </div>
          )}

          {/* ── Command History (trap_monitor only) ───────────────────────── */}
          {(unit.device_type || 'trap_monitor') === 'trap_monitor' && (
          <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider text-(--tm-muted)">
              Command History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-(--tm-border)">
                    <th className="text-left px-4 py-2 text-(--tm-muted)">Time</th>
                    <th className="text-left px-4 py-2 text-(--tm-muted)">
                      Command
                    </th>
                    <th className="hidden sm:table-cell text-left px-4 py-2 text-(--tm-muted)">
                      Response
                    </th>
                    <th className="hidden lg:table-cell text-left px-4 py-2 text-(--tm-muted)">
                      Sent By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commands.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-center text-(--tm-muted)"
                      >
                        No commands sent
                      </td>
                    </tr>
                  ) : (
                    commands.map((cmd) => (
                      <tr
                        key={cmd.id}
                        className="border-b border-(--tm-border) hover:bg-(--tm-panel-soft)"
                      >
                        <td className="px-4 py-2 text-xs sm:text-sm">
                          {new Date(cmd.sent_at).toLocaleString("en-AU")}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs sm:text-sm">
                          {cmd.command}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-xs">
                          {cmd.response_at ? (
                            <span className="text-(--tm-accent)">
                              {cmd.response || "OK"}
                            </span>
                          ) : (
                            <span className="text-(--tm-muted)">Pending...</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-2 text-xs">
                          {cmd.sent_by || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-4 text-center">
      <div className="text-xs text-(--tm-muted) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-(--tm-text)">{value}</div>
    </div>
  );
}
