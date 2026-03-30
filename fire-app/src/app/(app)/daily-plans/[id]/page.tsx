"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/stores/project-store";
import {
  ArrowLeft,
  Printer,
  Flame,
  Wind,
  Thermometer,
  Droplets,
  Users,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Radio,
} from "lucide-react";
import Link from "next/link";

// Re-use the same mock data structure from the daily plans page
// In production this would fetch from Supabase by ID

interface CrewAssignment {
  id: string;
  crewName: string;
  role: "aerial" | "ground" | "support";
  members: string[];
  burnTarget: string;
  notes: string;
}

interface FlightAssignment {
  id: string;
  aircraft: string;
  pilot: string;
  bombardier: string;
  burnArea: string;
  daiSpheres: number;
  estimatedHours: number;
  departureTime: string;
}

interface DailyPlan {
  id: string;
  date: string;
  status: "draft" | "approved" | "active" | "completed";
  weatherSummary: string;
  windSpeed: number;
  windDir: string;
  temperature: number;
  humidity: number;
  fireDanger: string;
  crews: CrewAssignment[];
  flights: FlightAssignment[];
  objectives: string;
  safetyNotes: string;
  createdBy: string;
}

const MOCK_PLAN: DailyPlan = {
  id: "dp-1",
  date: "2026-03-02",
  status: "active",
  weatherSummary: "Fine, light SE winds. Good burning conditions.",
  windSpeed: 12,
  windDir: "SE",
  temperature: 33,
  humidity: 45,
  fireDanger: "High",
  objectives:
    "Complete EDS burn of Bathurst North Block 3. Begin aerial incendiary on Melville east coast strip.",
  safetyNotes:
    "Monsoonal build-up possible after 1400. All crews to return to base by 1500. Radio check-in every 30 min. Emergency frequency: 121.5 MHz.",
  createdBy: "Toby Barton",
  crews: [
    {
      id: "c1",
      crewName: "Alpha — Aerial",
      role: "aerial",
      members: ["Tommy Puruntatameri", "Daniel Tipiloura"],
      burnTarget: "Bathurst North Block 3",
      notes: "DAI spheres — 800 planned, 200m spacing grid pattern",
    },
    {
      id: "c2",
      crewName: "Bravo — Ground",
      role: "ground",
      members: ["Marcus Johnson", "Robert Munkara", "Peter Orsto"],
      burnTarget: "Bathurst South fire break",
      notes: "Drip torch along western boundary. 2km strip.",
    },
    {
      id: "c3",
      crewName: "Charlie — Support",
      role: "support",
      members: ["Lisa Kerinaiua"],
      burnTarget: "—",
      notes: "Base radio operator. Coordinate with Tiwi Land Council.",
    },
  ],
  flights: [
    {
      id: "f1",
      aircraft: "R44 Raven II — VH-HFR",
      pilot: "Jane Smith",
      bombardier: "Tommy Puruntatameri",
      burnArea: "Bathurst North Block 3",
      daiSpheres: 800,
      estimatedHours: 3.5,
      departureTime: "07:30",
    },
    {
      id: "f2",
      aircraft: "AS350 Squirrel — VH-HBS",
      pilot: "David Williams",
      bombardier: "Daniel Tipiloura",
      burnArea: "Melville East Coast Strip",
      daiSpheres: 600,
      estimatedHours: 2.5,
      departureTime: "08:00",
    },
  ],
};

export default function DailyPlanPrintPage() {
  const params = useParams();
  const router = useRouter();
  const activeProject = useProjectStore((s) => s.activeProject);
  const plan = MOCK_PLAN; // In production: fetch by params.id

  // Static map for print — captures canvas as image
  const printMapContainer = useRef<HTMLDivElement>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{
    nw: [number, number];
    ne: [number, number];
    sw: [number, number];
    se: [number, number];
    center: [number, number];
  } | null>(null);

  useEffect(() => {
    if (!printMapContainer.current) return;

    const boundary = activeProject?.boundary as unknown as GeoJSON.FeatureCollection | undefined;

    const m = new maplibregl.Map({
      container: printMapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [130.5, -11.6],
      zoom: 9,
      attributionControl: false,
      // preserveDrawingBuffer needed for canvas capture — cast to bypass strict types
      ...(({ preserveDrawingBuffer: true }) as Record<string, unknown>),
    } as maplibregl.MapOptions);

    m.on("load", () => {
      // Add project boundary
      if (boundary) {
        m.addSource("boundary", { type: "geojson", data: boundary });
        m.addLayer({
          id: "boundary-fill",
          type: "fill",
          source: "boundary",
          paint: { "fill-color": "#f97316", "fill-opacity": 0.08 },
        });
        m.addLayer({
          id: "boundary-line",
          type: "line",
          source: "boundary",
          paint: { "line-color": "#f97316", "line-width": 2.5, "line-dasharray": [3, 2] },
        });

        // Fit to boundary
        const bounds = new maplibregl.LngLatBounds();
        boundary.features.forEach((f) => {
          const geom = f.geometry;
          const addCoords = (coords: number[][]) =>
            coords.forEach((c) => bounds.extend(c as [number, number]));
          if (geom.type === "Polygon") geom.coordinates.forEach(addCoords);
          if (geom.type === "MultiPolygon")
            geom.coordinates.forEach((p) => p.forEach(addCoords));
        });
        if (!bounds.isEmpty()) {
          m.fitBounds(bounds, { padding: 40, maxZoom: 12 });
        }
      }

      // Wait for tiles to render, then capture
      setTimeout(() => {
        try {
          const canvas = m.getCanvas();
          setMapImage(canvas.toDataURL("image/png"));

          // Capture georef bounds
          const b = m.getBounds();
          const c = m.getCenter();
          setMapBounds({
            nw: [b.getNorthWest().lng, b.getNorthWest().lat],
            ne: [b.getNorthEast().lng, b.getNorthEast().lat],
            sw: [b.getSouthWest().lng, b.getSouthWest().lat],
            se: [b.getSouthEast().lng, b.getSouthEast().lat],
            center: [c.lng, c.lat],
          });
        } catch {
          // Canvas capture may fail in some contexts
        }
        m.remove();
      }, 2000);
    });

    return () => {
      try { m.remove(); } catch { /* already removed */ }
    };
  }, [activeProject]);

  const totalPersonnel = plan.crews.reduce(
    (sum, c) => sum + c.members.length,
    0
  );
  const totalDAI = plan.flights.reduce((sum, f) => sum + f.daiSpheres, 0);
  const totalHours = plan.flights.reduce(
    (sum, f) => sum + f.estimatedHours,
    0
  );

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="flex items-center gap-3 border-b px-6 py-3 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/daily-plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-semibold">
          Daily Plan — {plan.date}
        </h1>
        <Button variant="outline" asChild>
          <Link href={`/daily-plans/${params.id}/operations`}>
            <Radio className="mr-2 h-4 w-4" />
            Start Operations
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / PDF
        </Button>
      </div>

      {/* Printable content */}
      <div className="mx-auto max-w-4xl p-6 print:max-w-none print:p-4">
        {/* Header */}
        <div className="mb-4 border-b-2 border-black pb-3 print:mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold print:text-xl">
                Daily Burn Operations Plan
              </h1>
              <p className="text-lg font-semibold print:text-base">
                Tiwi Islands Fire Program
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold print:text-xl">{plan.date}</p>
              <Badge className="mt-1 uppercase">{plan.status}</Badge>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground print:text-xs">
            Prepared by: {plan.createdBy}
          </p>
        </div>

        {/* Weather & Fire Danger */}
        <div className="mb-4 grid grid-cols-5 gap-3 rounded-lg border p-3 print:mb-3 print:gap-2 print:p-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-500 print:h-3 print:w-3" />
            <div>
              <p className="text-lg font-bold print:text-sm">
                {plan.temperature}°C
              </p>
              <p className="text-xs text-muted-foreground">Temp</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-500 print:h-3 print:w-3" />
            <div>
              <p className="text-lg font-bold print:text-sm">
                {plan.windSpeed} km/h
              </p>
              <p className="text-xs text-muted-foreground">
                Wind {plan.windDir}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-500 print:h-3 print:w-3" />
            <div>
              <p className="text-lg font-bold print:text-sm">
                {plan.humidity}%
              </p>
              <p className="text-xs text-muted-foreground">Humidity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500 print:h-3 print:w-3" />
            <div>
              <p className="text-lg font-bold print:text-sm">
                {plan.fireDanger}
              </p>
              <p className="text-xs text-muted-foreground">Fire Danger</p>
            </div>
          </div>
          <div className="col-span-1">
            <p className="text-sm print:text-xs">{plan.weatherSummary}</p>
          </div>
        </div>

        {/* Objectives */}
        <div className="mb-4 rounded-lg border p-3 print:mb-3 print:p-2">
          <h2 className="mb-1 flex items-center gap-2 font-bold print:text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 print:h-3 print:w-3" />
            Objectives
          </h2>
          <p className="text-sm print:text-xs">{plan.objectives}</p>
        </div>

        {/* Safety */}
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 print:mb-3 print:bg-white print:p-2">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-amber-800 print:text-sm print:text-black">
            <AlertTriangle className="h-4 w-4 print:h-3 print:w-3" />
            Safety Notes
          </h2>
          <p className="text-sm print:text-xs">{plan.safetyNotes}</p>
        </div>

        {/* Georeferenced Map */}
        <div className="mb-4 print:mb-3">
          <h2 className="mb-2 flex items-center gap-2 font-bold print:text-sm">
            <MapPin className="h-4 w-4 print:h-3 print:w-3" />
            Operations Area
          </h2>

          {/* Hidden map for canvas capture */}
          <div
            ref={printMapContainer}
            className="h-80 w-full rounded-lg border"
            style={mapImage ? { display: "none" } : undefined}
          />

          {/* Static captured image for print */}
          {mapImage && (
            <div className="rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapImage}
                alt="Operations area map"
                className="w-full rounded-t-lg"
              />
              {/* Georef coordinates */}
              {mapBounds && (
                <div className="grid grid-cols-3 gap-2 border-t bg-muted/30 px-3 py-2 text-xs font-mono print:text-[9px]">
                  <div>
                    <span className="font-sans font-medium text-muted-foreground">
                      NW:{" "}
                    </span>
                    {mapBounds.nw[1].toFixed(4)}°,{" "}
                    {mapBounds.nw[0].toFixed(4)}°
                  </div>
                  <div className="text-center">
                    <span className="font-sans font-medium text-muted-foreground">
                      Centre:{" "}
                    </span>
                    {mapBounds.center[1].toFixed(4)}°,{" "}
                    {mapBounds.center[0].toFixed(4)}°
                  </div>
                  <div className="text-right">
                    <span className="font-sans font-medium text-muted-foreground">
                      NE:{" "}
                    </span>
                    {mapBounds.ne[1].toFixed(4)}°,{" "}
                    {mapBounds.ne[0].toFixed(4)}°
                  </div>
                  <div>
                    <span className="font-sans font-medium text-muted-foreground">
                      SW:{" "}
                    </span>
                    {mapBounds.sw[1].toFixed(4)}°,{" "}
                    {mapBounds.sw[0].toFixed(4)}°
                  </div>
                  <div className="text-center">
                    <span className="font-sans font-medium text-muted-foreground">
                      Datum:{" "}
                    </span>
                    WGS 84 (EPSG:4326)
                  </div>
                  <div className="text-right">
                    <span className="font-sans font-medium text-muted-foreground">
                      SE:{" "}
                    </span>
                    {mapBounds.se[1].toFixed(4)}°,{" "}
                    {mapBounds.se[0].toFixed(4)}°
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crew Assignments */}
        <div className="mb-4 print:mb-3">
          <h2 className="mb-2 flex items-center gap-2 font-bold print:text-sm">
            <Users className="h-4 w-4 print:h-3 print:w-3" />
            Crew Assignments ({plan.crews.length} crews, {totalPersonnel}{" "}
            personnel)
          </h2>
          <table className="w-full border-collapse text-sm print:text-xs">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="px-2 py-1 text-left">Crew</th>
                <th className="px-2 py-1 text-left">Role</th>
                <th className="px-2 py-1 text-left">Members</th>
                <th className="px-2 py-1 text-left">Burn Target</th>
                <th className="px-2 py-1 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {plan.crews.map((crew) => (
                <tr key={crew.id} className="border-b">
                  <td className="px-2 py-1.5 font-medium">{crew.crewName}</td>
                  <td className="px-2 py-1.5 uppercase">{crew.role}</td>
                  <td className="px-2 py-1.5">
                    {crew.members.join(", ")}
                  </td>
                  <td className="px-2 py-1.5">{crew.burnTarget}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {crew.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Flight Assignments */}
        {plan.flights.length > 0 && (
          <div className="mb-4 print:mb-3">
            <h2 className="mb-2 flex items-center gap-2 font-bold print:text-sm">
              <Plane className="h-4 w-4 print:h-3 print:w-3" />
              Flight Assignments ({plan.flights.length} flights, {totalHours}h
              total, {totalDAI} DAI spheres)
            </h2>
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="px-2 py-1 text-left">Aircraft</th>
                  <th className="px-2 py-1 text-left">Pilot</th>
                  <th className="px-2 py-1 text-left">Bombardier</th>
                  <th className="px-2 py-1 text-left">Burn Area</th>
                  <th className="px-2 py-1 text-left">DAI</th>
                  <th className="px-2 py-1 text-left">Hours</th>
                  <th className="px-2 py-1 text-left">Depart</th>
                </tr>
              </thead>
              <tbody>
                {plan.flights.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="px-2 py-1.5 font-medium">{f.aircraft}</td>
                    <td className="px-2 py-1.5">{f.pilot}</td>
                    <td className="px-2 py-1.5">{f.bombardier}</td>
                    <td className="px-2 py-1.5">{f.burnArea}</td>
                    <td className="px-2 py-1.5">{f.daiSpheres}</td>
                    <td className="px-2 py-1.5">{f.estimatedHours}h</td>
                    <td className="px-2 py-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {f.departureTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary box */}
        <div className="grid grid-cols-4 gap-3 rounded-lg border p-3 print:gap-2 print:p-2">
          <div className="text-center">
            <p className="text-2xl font-bold print:text-lg">
              {plan.crews.length}
            </p>
            <p className="text-xs text-muted-foreground">Crews</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold print:text-lg">
              {totalPersonnel}
            </p>
            <p className="text-xs text-muted-foreground">Personnel</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold print:text-lg">{totalDAI}</p>
            <p className="text-xs text-muted-foreground">DAI Spheres</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold print:text-lg">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Flight Hours</p>
          </div>
        </div>

        {/* Sign-off section */}
        <div className="mt-6 border-t-2 border-black pt-4 print:mt-4 print:pt-3">
          <h2 className="mb-3 font-bold print:text-sm">Sign-off</h2>
          <div className="grid grid-cols-2 gap-6 print:gap-4">
            <div>
              <p className="text-sm text-muted-foreground print:text-xs">
                Operations Manager
              </p>
              <div className="mt-8 border-b border-black print:mt-6" />
              <p className="mt-1 text-xs text-muted-foreground">
                Name / Signature / Date
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground print:text-xs">
                Safety Officer
              </p>
              <div className="mt-8 border-b border-black print:mt-6" />
              <p className="mt-1 text-xs text-muted-foreground">
                Name / Signature / Date
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground print:mt-4">
          <p>
            FireManager — Tiwi Islands Fire Program — Generated{" "}
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </>
  );
}
