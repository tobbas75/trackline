"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkAppAccess } from "@/lib/check-access";
import {
  Unit,
  TrapEvent,
  UnitStatus,
  getUnitStatus,
  formatRelativeTime,
} from "@/lib/types";

const STATUS_PRIORITY: Record<UnitStatus, number> = {
  caught: 0,
  offline: 1,
  lowbatt: 2,
  disarmed: 3,
  normal: 4,
};

const supabase = createClient();

interface Organization {
  id: string;
  name: string;
  role: string;
}

export default function CardsViewPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [events, setEvents] = useState<TrapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);

  // Check authentication and app access
  useEffect(() => {
    async function verifyAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { hasAccess } = await checkAppAccess(supabase, "trap_monitor");
      if (!hasAccess) {
        router.push("/no-access");
        return;
      }

      // Load user's organizations
      const res = await fetch("/api/orgs");
      const payload = await res.json();
      const orgsData: Organization[] = Array.isArray(payload) ? payload : [];

      if (!res.ok) {
        setOrgs([]);
        setOrgLoadError(
          typeof payload?.error === "string"
            ? payload.error
            : "Failed to load organizations.",
        );
      } else {
        setOrgs(orgsData);
        setOrgLoadError(null);
      }

      if (orgsData.length > 0) {
        setCurrentOrg(orgsData[0]);
      } else {
        setLoading(false);
      }

      setAuthChecked(true);
    }

    verifyAccess();
  }, [router]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!authChecked || !currentOrg) return;

    const [{ data: unitsData }, { data: eventsData }] = await Promise.all([
      supabase
        .from("units")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("name"),
      supabase
        .from("events")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("triggered_at", { ascending: false })
        .limit(100),
    ]);
    if (unitsData) setUnits(unitsData);
    if (eventsData) setEvents(eventsData);
    setLoading(false);
  }, [authChecked, currentOrg]);

  // Realtime subscription
  useEffect(() => {
    if (!currentOrg) return;

    loadData();
    const channel = supabase
      .channel(`trap_realtime_cards_${currentOrg.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as TrapEvent, ...prev.slice(0, 99)]);
          setUnits((prev) =>
            prev.map((u) =>
              u.id === (payload.new as TrapEvent).unit_id
                ? { ...u, last_seen: (payload.new as TrapEvent).triggered_at }
                : u,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "units",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const newUnit = payload.new as Unit;
          setUnits((prev) =>
            prev.some((u) => u.id === newUnit.id)
              ? prev
              : [...prev, newUnit],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "units",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          setUnits((prev) =>
            prev.map((u) =>
              u.id === (payload.new as Unit).id ? (payload.new as Unit) : u,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Acknowledge trap
  const acknowledge = async (eventId: number) => {
    await supabase
      .from("events")
      .update({ acknowledged: true, ack_at: new Date().toISOString() })
      .eq("id", eventId);
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, acknowledged: true } : e)),
    );
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-(--tm-bg)">
        <div className="text-center">
          <div className="text-5xl mb-4">🪤</div>
          <div className="text-(--tm-accent) text-lg animate-pulse">
            Loading trap network...
          </div>
        </div>
      </div>
    );
  }

  // No organizations yet
  if (orgs.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-(--tm-bg)">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🪤</div>
            <h1 className="text-3xl font-bold text-(--tm-text) mb-3">
              Welcome to Trap Monitor
            </h1>
            <p className="text-(--tm-muted) mb-6 text-lg">
              Create an organization to start monitoring your traps
            </p>
            {orgLoadError && (
              <p className="text-sm text-(--tm-danger) mb-4 bg-(--tm-danger-soft) border border-(--tm-danger-border) p-3 rounded">
                {orgLoadError}
              </p>
            )}
            <button
              onClick={() => router.push("/orgs/new")}
              className="px-8 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-bold text-lg transition-colors"
            >
              Create Organization
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--tm-bg)">
      {/* Top Bar */}
      <div className="bg-(--tm-panel) border-b border-(--tm-border) px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-(--tm-text)">
              🪤 Trap Monitor
            </h1>
            {orgs.length > 1 && (
              <select
                value={currentOrg?.id}
                onChange={(e) => {
                  const org = orgs.find((o) => o.id === e.target.value);
                  if (org) setCurrentOrg(org);
                }}
                className="px-3 py-1.5 bg-(--tm-input-bg) border border-(--tm-input-border) rounded text-sm text-(--tm-text) font-medium focus:outline-none focus:border-(--tm-input-focus)"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            {orgs.length === 1 && (
              <span className="text-(--tm-muted) font-medium">
                {currentOrg?.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-(--tm-muted) hover:text-(--tm-accent) transition-colors"
            >
              ← Map View
            </Link>
            <Link
              href="/orgs"
              className="text-sm text-(--tm-muted) hover:text-(--tm-accent) transition-colors"
            >
              Manage Organizations →
            </Link>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...units]
            .sort((a, b) => {
              const diff =
                STATUS_PRIORITY[getUnitStatus(a, events)] -
                STATUS_PRIORITY[getUnitStatus(b, events)];
              if (diff !== 0) return diff;
              return (a.name || a.id).localeCompare(b.name || b.id);
            })
            .map((unit) => (
            <TrapCard
              key={unit.id}
              unit={unit}
              events={events}
              onAck={(eventId) => acknowledge(eventId)}
            />
          ))}
        </div>

        {units.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🪤</div>
            <h2 className="text-2xl font-bold text-(--tm-text) mb-2">
              No Units Yet
            </h2>
            <p className="text-(--tm-muted) mb-6">
              Add your first trap unit to start monitoring
            </p>
            <Link
              href={`/orgs/${currentOrg?.id}/units`}
              className="inline-block px-6 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-medium transition-colors"
            >
              Add Unit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Trap Card Component
function TrapCard({
  unit,
  events,
  onAck,
}: {
  unit: Unit;
  events: TrapEvent[];
  onAck: (eventId: number) => void;
}) {
  const status = getUnitStatus(unit, events);
  const recentEvent = events.find(
    (e) => e.unit_id === unit.id && e.trap_caught && !e.acknowledged,
  );

  const statusStyle =
    status === "caught"
      ? "bg-(--tm-danger) text-white"
      : status === "offline"
        ? "bg-(--tm-offline) text-white"
        : status === "lowbatt"
          ? "bg-(--tm-warning) text-white"
          : status === "disarmed"
            ? "bg-(--tm-panel-soft) text-(--tm-text) border border-(--tm-border)"
            : "bg-(--tm-accent) text-white";

  return (
    <div
      className={`${statusStyle} rounded-lg p-4 aspect-square flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
        status === "caught" ? "animate-pulse" : ""
      }`}
      style={{ boxShadow: "var(--tm-shadow)" }}
    >
      {/* Status indicator dot */}
      <div className="absolute top-2 right-2">
        <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
      </div>

      {/* Unit name */}
      <div>
        <h3 className="font-bold text-lg mb-1 truncate">
          {unit.name || unit.id}
        </h3>
        {status === "caught" && (
          <div className="text-xs font-bold bg-white/20 rounded px-2 py-1 inline-block">
            🔴 CAUGHT
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span>🔋</span>
          <span className="font-semibold">{unit.battery_pct ?? "?"}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{unit.solar_ok ? "☀️" : "☀️❌"}</span>
          <span className="text-xs opacity-80">
            {unit.armed ? "Armed" : "Disarmed"}
          </span>
        </div>
        <div className="text-xs opacity-75">
          {formatRelativeTime(unit.last_seen)}
        </div>
      </div>

      {/* Acknowledge button for caught traps */}
      {recentEvent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAck(recentEvent.id);
          }}
          className="mt-2 w-full bg-white text-(--tm-danger) py-1.5 rounded font-bold text-sm hover:opacity-90 transition-colors"
        >
          Acknowledge
        </button>
      )}
    </div>
  );
}
