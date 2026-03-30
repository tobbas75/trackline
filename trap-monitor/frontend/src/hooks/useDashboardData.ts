"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkAppAccess } from "@/lib/check-access";
import {
  Unit,
  TrapEvent,
  CameraEvent,
  DeviceType,
  UnitStatus,
  getUnitStatus,
  isOffline,
} from "@/lib/types";

const supabase = createClient();

export interface Organization {
  id: string;
  name: string;
  role: string;
}

export interface TimelineItem {
  id: string;
  type: 'trap' | 'camera';
  timestamp: string;
  trapEvent?: TrapEvent;
  cameraEvent?: CameraEvent;
}

export function useDashboardData() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [events, setEvents] = useState<TrapEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<UnitStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "status" | "last_seen" | "battery_pct" | "name"
  >("status");
  const [availableProducts, setAvailableProducts] = useState<DeviceType[]>([]);
  const [activeProduct, setActiveProduct] = useState<DeviceType | 'all'>('all');
  // ── Camera state ──────────────────────────────────────────────────────────
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string | 'all'>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0);
  const [cameraDateRange, setCameraDateRange] = useState<{ start: string; end: string } | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Track org unit IDs for realtime event filtering (ref avoids subscription recreation)
  const orgUnitIdsRef = useRef<Set<string>>(new Set());

  // Keep the ref in sync whenever units state changes
  useEffect(() => {
    orgUnitIdsRef.current = new Set(units.map((u) => u.id));
  }, [units]);

  // Surface connection and sync status in the header for field use.
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
          console.warn("[DASHBOARD] fieldCheckQueue is not an array, resetting");
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
        // No orgs - prompt to create one
        setLoading(false);
      }

      setAuthChecked(true);
    }

    verifyAccess();
  }, [router]);

  // ── Load initial data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!authChecked || !currentOrg) return;

    // Step 1: Fetch org-scoped units
    const { data: unitsData } = await supabase
      .from("units")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("name");

    const orgUnits = unitsData ?? [];
    setUnits(orgUnits);

    // Derive available product types from fetched units
    const deviceTypes = [...new Set(orgUnits.map(u => u.device_type || 'trap_monitor'))].sort() as DeviceType[];
    setAvailableProducts(deviceTypes);
    // Auto-select if only one product type
    if (deviceTypes.length === 1) {
      setActiveProduct(deviceTypes[0]);
    }

    // Step 2: Fetch events scoped directly by org_id (ISO-02)
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("triggered_at", { ascending: false })
      .limit(100);
    if (eventsData) setEvents(eventsData);
    else setEvents([]);

    // Step 3: Fetch camera events with detections for this org
    const { data: camEventsData } = await supabase
      .from('t_camera_events')
      .select('*, t_camera_detections(id, class_name, confidence, x, y, width, height)')
      .eq('org_id', currentOrg.id)
      .order('captured_at', { ascending: false })
      .limit(100);
    if (camEventsData) {
      setCameraEvents(camEventsData.map((e: Record<string, unknown>) => ({
        ...e,
        detections: e.t_camera_detections,
      })) as CameraEvent[]);
    } else {
      setCameraEvents([]);
    }

    setLoading(false);
  }, [authChecked, currentOrg]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentOrg) return;

    loadData();
    const channel = supabase
      .channel(`trap_realtime_${currentOrg.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const newEvent = payload.new as TrapEvent;
          setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
          // Update unit record
          setUnits((prev) =>
            prev.map((u) =>
              u.id === newEvent.unit_id
                ? { ...u, last_seen: newEvent.triggered_at }
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
          table: "t_camera_events",
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const newCamEvent = payload.new as CameraEvent;
          setCameraEvents((prev) => [newCamEvent, ...prev.slice(0, 99)]);
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

  // ── Acknowledge trap ──────────────────────────────────────────────────────
  const acknowledge = async (eventId: number) => {
    await supabase
      .from("events")
      .update({ acknowledged: true, ack_at: new Date().toISOString() })
      .eq("id", eventId);
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, acknowledged: true } : e)),
    );
  };

  // ── Send command ──────────────────────────────────────────────────────────
  const sendCommand = async (unitId: string, command: string) => {
    await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, command }),
    });
  };

  // ── Compute health stats ──────────────────────────────────────────────────
  const offline = units.filter((u) => isOffline(u));
  const lowBatt = units.filter((u) => (u.battery_pct ?? 100) <= 20);
  const caught = events.filter((e) => e.trap_caught && !e.acknowledged);

  // ── Compute filtered and sorted units ──────────────────────────────────────
  const filteredUnits = useMemo(() => {
    let result = units;

    // Filter by product/device type
    if (activeProduct !== 'all') {
      result = result.filter(u => (u.device_type || 'trap_monitor') === activeProduct);
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((u) => getUnitStatus(u, events) === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
      );
    }

    // Sort
    const statusPriority: Record<UnitStatus, number> = {
      caught: 0,
      offline: 1,
      lowbatt: 2,
      disarmed: 3,
      normal: 4,
    };
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "status": {
          const diff =
            statusPriority[getUnitStatus(a, events)] -
            statusPriority[getUnitStatus(b, events)];
          if (diff !== 0) return diff;
          return (a.name || a.id).localeCompare(b.name || b.id);
        }
        case "last_seen": {
          const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          return bTime - aTime;
        }
        case "battery_pct":
          return (a.battery_pct ?? 100) - (b.battery_pct ?? 100);
        case "name":
        default:
          return (a.name || a.id).localeCompare(b.name || b.id);
      }
    });

    return result;
  }, [units, events, statusFilter, searchQuery, sortKey, activeProduct]);

  const filteredEvents = useMemo(() => {
    if (activeProduct === 'all') return events;
    const productUnitIds = new Set(
      units.filter(u => (u.device_type || 'trap_monitor') === activeProduct).map(u => u.id)
    );
    return events.filter(e => productUnitIds.has(e.unit_id));
  }, [events, units, activeProduct]);

  // ── Camera: derived species list ──────────────────────────────────────────
  const availableSpecies = useMemo(() => {
    const speciesSet = new Set<string>();
    cameraEvents.forEach(event => {
      event.detections?.forEach(d => speciesSet.add(d.class_name));
    });
    return [...speciesSet].sort();
  }, [cameraEvents]);

  // ── Camera: filtered events ───────────────────────────────────────────────
  const filteredCameraEvents = useMemo(() => {
    // Hide camera events when product toggle is trap_monitor only
    if (activeProduct === 'trap_monitor') return [];

    let result = cameraEvents;

    // Species filter
    if (selectedSpecies !== 'all') {
      result = result.filter(e =>
        e.detections?.some(d => d.class_name === selectedSpecies)
      );
    }

    // Confidence threshold
    if (confidenceThreshold > 0) {
      const threshold = confidenceThreshold / 100;
      result = result.filter(e =>
        e.detections?.some(d => d.confidence >= threshold)
      );
    }

    // Date range
    if (cameraDateRange) {
      const startMs = cameraDateRange.start ? new Date(cameraDateRange.start).getTime() : 0;
      const endMs = cameraDateRange.end ? new Date(cameraDateRange.end + 'T23:59:59').getTime() : Infinity;
      result = result.filter(e => {
        const t = new Date(e.captured_at).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    return result;
  }, [cameraEvents, activeProduct, selectedSpecies, confidenceThreshold, cameraDateRange]);

  // ── Camera: image URL helper ──────────────────────────────────────────────
  const getImageUrl = useCallback((imagePath: string): string => {
    const { data } = supabase.storage.from('camera-images').getPublicUrl(imagePath);
    return data.publicUrl;
  }, []);

  // ── Unified timeline (VIEW-07) ────────────────────────────────────────────
  const unifiedTimeline = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Add trap events (filtered by product toggle already)
    if (activeProduct !== 'camera_trap') {
      filteredEvents.forEach(e => items.push({
        id: `trap-${e.id}`,
        type: 'trap',
        timestamp: e.triggered_at,
        trapEvent: e,
      }));
    }

    // Add camera events (already filtered)
    filteredCameraEvents.forEach(e => items.push({
      id: `cam-${e.id}`,
      type: 'camera',
      timestamp: e.captured_at,
      cameraEvent: e,
    }));

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [filteredEvents, filteredCameraEvents, activeProduct]);

  // ── Reset camera filters on org change ────────────────────────────────────
  useEffect(() => {
    setSelectedSpecies('all');
    setConfidenceThreshold(0);
    setCameraDateRange(null);
  }, [currentOrg?.id]);

  return {
    // Auth state
    authChecked,
    loading,
    // Org state
    orgs,
    currentOrg,
    setCurrentOrg,
    orgLoadError,
    // Data
    units,
    events,
    // Selection
    selected,
    setSelected,
    // Filters
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    // Connection
    isOnline,
    pendingSyncCount,
    // Product filter
    availableProducts,
    activeProduct,
    setActiveProduct,
    // Computed
    offline,
    lowBatt,
    caught,
    filteredUnits,
    filteredEvents,
    // Camera state
    cameraEvents,
    filteredCameraEvents,
    availableSpecies,
    getImageUrl,
    // Camera filters
    selectedSpecies,
    setSelectedSpecies,
    confidenceThreshold,
    setConfidenceThreshold,
    cameraDateRange,
    setCameraDateRange,
    // Unified timeline
    unifiedTimeline,
    // Actions
    acknowledge,
    sendCommand,
  };
}
