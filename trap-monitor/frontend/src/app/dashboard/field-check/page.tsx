"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkAppAccess } from "@/lib/check-access";
import { Unit, formatRelativeTime } from "@/lib/types";

const supabase = createClient();

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface CachedUnitsPayload {
  savedAt: string;
  units: Unit[];
}

export default function FieldCheckPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [usingCachedData, setUsingCachedData] = useState(false);

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

      const res = await fetch("/api/orgs");
      const payload = await res.json();
      const orgsData: Organization[] = Array.isArray(payload) ? payload : [];

      setOrgs(orgsData);
      if (orgsData.length > 0) {
        setCurrentOrg(orgsData[0]);
      }

      setAuthChecked(true);
    }

    verifyAccess();
  }, [router]);

  useEffect(() => {
    const refreshOnline = () => setIsOnline(window.navigator.onLine);
    const refreshQueue = () => {
      try {
        const raw = localStorage.getItem("fieldCheckQueue");
        if (!raw) {
          setPendingSyncCount(0);
          return;
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          console.warn("[FIELD-CHECK] fieldCheckQueue is not an array, resetting");
          localStorage.removeItem("fieldCheckQueue");
          setPendingSyncCount(0);
          return;
        }
        setPendingSyncCount(parsed.length);
      } catch {
        setPendingSyncCount(0);
      }
    };

    refreshOnline();
    refreshQueue();

    window.addEventListener("online", refreshOnline);
    window.addEventListener("offline", refreshOnline);
    window.addEventListener("storage", refreshQueue);

    const timerId = window.setInterval(refreshQueue, 5000);

    return () => {
      window.removeEventListener("online", refreshOnline);
      window.removeEventListener("offline", refreshOnline);
      window.removeEventListener("storage", refreshQueue);
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    const org = currentOrg;

    let alive = true;

    async function loadUnits(activeOrg: Organization) {
      setLoading(true);

      const cacheKey = `fieldCheckUnitsCache:${activeOrg.id}`;

      const applyCachedUnits = () => {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (!cachedRaw) return false;

          const parsed = JSON.parse(cachedRaw);
          if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.units) || typeof parsed.savedAt !== "string") {
            console.warn("[FIELD-CHECK] Corrupt units cache, removing");
            localStorage.removeItem(cacheKey);
            return false;
          }
          const cached = parsed as CachedUnitsPayload;

          if (!alive) return true;
          setUnits(cached.units);
          setUsingCachedData(true);
          return true;
        } catch {
          return false;
        }
      };

      if (!window.navigator.onLine) {
        if (!applyCachedUnits() && alive) {
          setUnits([]);
          setUsingCachedData(false);
        }

        if (alive) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("name");

      if (!alive) return;

      if (!error && data) {
        setUnits(data as Unit[]);
        setUsingCachedData(false);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            units: data,
          }),
        );
      } else if (!applyCachedUnits()) {
        setUnits([]);
        setUsingCachedData(false);
      }

      setLoading(false);
    }

    loadUnits(org);

    return () => {
      alive = false;
    };
  }, [currentOrg]);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return units;

    return units.filter(
      (unit) =>
        unit.id.toLowerCase().includes(q) ||
        (unit.name || "").toLowerCase().includes(q),
    );
  }, [units, searchQuery]);

  const startFieldCheck = (unit: Unit) => {
    const draft = {
      id: `${Date.now()}-${unit.id}`,
      orgId: currentOrg?.id,
      unitId: unit.id,
      unitName: unit.name || unit.id,
      startedAt: new Date().toISOString(),
      mode: isOnline ? "online" : "offline",
    };

    localStorage.setItem("fieldCheckDraft", JSON.stringify(draft));

    if (!isOnline) {
      try {
        const raw = localStorage.getItem("fieldCheckQueue");
        let nextQueue: unknown[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            nextQueue = parsed;
          } else {
            console.warn("[FIELD-CHECK] fieldCheckQueue is not an array, starting fresh");
          }
        }

        nextQueue.push({
          type: "field-check-start",
          idempotencyKey: draft.id,
          payload: draft,
          queuedAt: new Date().toISOString(),
        });

        localStorage.setItem("fieldCheckQueue", JSON.stringify(nextQueue));
        setPendingSyncCount(nextQueue.length);
      } catch {
        // Keep flow usable even if queue write fails.
      }
    }

    router.push(`/dashboard/units/${unit.id}`);
  };

  if (!authChecked || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--tm-bg)">
        <div className="text-center">
          <div className="text-5xl">✅</div>
          <p className="mt-3 font-heading text-lg text-(--tm-accent)">
            Preparing field check mode...
          </p>
        </div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--tm-bg) p-6">
        <div className="max-w-md rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-8 text-center shadow-xl">
          <h1 className="font-heading text-3xl text-(--tm-text)">
            No Organization Yet
          </h1>
          <p className="mt-2 text-(--tm-muted)">
            Create an organization before starting field checks.
          </p>
          <button
            onClick={() => router.push("/orgs/new")}
            className="mt-6 rounded-lg bg-(--tm-accent) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--tm-accent-strong)"
          >
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--tm-bg) px-4 py-5 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-4 shadow-md md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-heading text-3xl text-(--tm-text)">
                Field Check
              </h1>
              <p className="text-sm text-(--tm-muted)">
                Pick a unit and start a simple on-site check flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  isOnline
                    ? "border-(--tm-ok-border) bg-(--tm-ok-soft) text-(--tm-ok-text)"
                    : "border-(--tm-danger-border) bg-(--tm-danger-soft) text-(--tm-danger)"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>

              <span className="rounded-full border border-(--tm-border) bg-(--tm-panel-soft) px-2.5 py-1 text-xs font-semibold text-(--tm-muted)">
                Pending Sync {pendingSyncCount}
              </span>

              <Link
                href="/dashboard"
                className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-1.5 text-sm font-semibold text-(--tm-text) transition-colors hover:bg-(--tm-bg-subtle)"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {!isOnline && (
            <div className="mt-3 rounded-lg border border-(--tm-warning-border) bg-(--tm-warning-soft) p-3 text-sm font-medium text-(--tm-warning)">
              Offline mode enabled. You can continue checks with cached units
              and sync when back online.
            </div>
          )}

          {usingCachedData && (
            <div className="mt-3 rounded-lg border border-(--tm-info-border) bg-(--tm-info-soft) p-3 text-sm font-medium text-(--tm-info-text)">
              Using cached unit data for this organization.
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <section className="rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-4 shadow-sm md:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
              3 Step Flow
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-(--tm-text)">
              <li className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2">
                1. Select the trap unit.
              </li>
              <li className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2">
                2. Run STATUS and GPS checks on site.
              </li>
              <li className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2">
                3. Save results. Sync happens automatically once online.
              </li>
            </ol>
          </section>

          <section className="rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-4 shadow-sm md:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
              Organization
            </h2>

            <select
              value={currentOrg?.id}
              onChange={(e) => {
                const next = orgs.find((org) => org.id === e.target.value);
                if (next) setCurrentOrg(next);
              }}
              className="mt-2 w-full rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2 text-sm font-medium text-(--tm-text) outline-none transition-colors focus:border-(--tm-accent)"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unit by name or ID"
              className="mt-3 w-full rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) px-3 py-2 text-sm text-(--tm-text) outline-none transition-colors focus:border-(--tm-accent)"
            />
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-(--tm-border) bg-(--tm-panel) p-4 shadow-sm md:p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
            Units {filteredUnits.length}
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-lg border border-(--tm-border) bg-(--tm-panel-soft) p-4 text-sm text-(--tm-muted)">
              No units available for this organization and filter.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="rounded-xl border border-(--tm-border) bg-(--tm-panel-soft) p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-heading text-lg text-(--tm-text)">
                        {unit.name || unit.id}
                      </div>
                      <div className="font-mono text-xs text-(--tm-muted)">
                        {unit.id}
                      </div>
                    </div>
                    <div className="text-xs text-(--tm-muted)">
                      {formatRelativeTime(unit.last_seen)}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-(--tm-muted)">
                    <span>🔋 {unit.battery_pct ?? "?"}%</span>
                    <span>{unit.solar_ok ? "☀️ OK" : "☀️ Fault"}</span>
                  </div>

                  <button
                    onClick={() => startFieldCheck(unit)}
                    className="mt-3 w-full rounded-lg bg-(--tm-accent) px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--tm-accent-strong)"
                  >
                    Start Check
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
