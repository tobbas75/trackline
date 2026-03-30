"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeatherWidget } from "@/components/weather-widget";
import {
  Plus,
  Calendar,
  Users,
  Plane,
  Flame,
  Clock,
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Thermometer,
  Droplets,
  FileText,
  Printer,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/info-tooltip";

// ─── Types ─────────────────────────────────────────────────────

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

// ─── Mock Data ─────────────────────────────────────────────────

const CREW_MEMBERS = [
  "Toby Barton",
  "Jane Smith",
  "David Williams",
  "Marcus Johnson",
  "Sarah Brown",
  "Tommy Puruntatameri",
  "Daniel Tipiloura",
  "Robert Munkara",
  "Lisa Kerinaiua",
  "Peter Orsto",
];

const AIRCRAFT = [
  { id: "r44", name: "R44 Raven II — VH-HFR", type: "Helicopter" },
  { id: "as350", name: "AS350 Squirrel — VH-HBS", type: "Helicopter" },
];

const INITIAL_PLANS: DailyPlan[] = [
  {
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
      "Monsoonal build-up possible after 1400. All crews to return to base by 1500. Radio check-in every 30 min.",
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
  },
  {
    id: "dp-2",
    date: "2026-03-01",
    status: "completed",
    weatherSummary: "Clear skies, moderate NW breeze.",
    windSpeed: 18,
    windDir: "NW",
    temperature: 35,
    humidity: 38,
    fireDanger: "Very High",
    objectives:
      "Aerial burn of Bathurst central grasslands. Ground crew spot burning around cultural sites.",
    safetyNotes:
      "Very High FDR — monitor conditions hourly. Abort if wind exceeds 25 km/h.",
    createdBy: "Toby Barton",
    crews: [
      {
        id: "c4",
        crewName: "Alpha — Aerial",
        role: "aerial",
        members: ["Tommy Puruntatameri", "Daniel Tipiloura"],
        burnTarget: "Bathurst Central",
        notes: "Completed 750 DAI spheres",
      },
      {
        id: "c5",
        crewName: "Bravo — Ground",
        role: "ground",
        members: ["Marcus Johnson", "Robert Munkara"],
        burnTarget: "Cultural site perimeter",
        notes: "Drip torch burn completed — 1.5 km buffer",
      },
    ],
    flights: [
      {
        id: "f3",
        aircraft: "R44 Raven II — VH-HFR",
        pilot: "Jane Smith",
        bombardier: "Tommy Puruntatameri",
        burnArea: "Bathurst Central",
        daiSpheres: 750,
        estimatedHours: 3.0,
        departureTime: "07:00",
      },
    ],
  },
  {
    id: "dp-3",
    date: "2026-02-28",
    status: "completed",
    weatherSummary: "Partly cloudy, light winds.",
    windSpeed: 8,
    windDir: "E",
    temperature: 31,
    humidity: 55,
    fireDanger: "Moderate",
    objectives: "Low-intensity ground burn around southern wetlands perimeter.",
    safetyNotes: "Standard safety protocols apply.",
    createdBy: "Jane Smith",
    crews: [
      {
        id: "c6",
        crewName: "Bravo — Ground",
        role: "ground",
        members: [
          "Marcus Johnson",
          "Robert Munkara",
          "Peter Orsto",
          "Lisa Kerinaiua",
        ],
        burnTarget: "Southern Wetlands perimeter",
        notes: "Low-intensity drip torch — 3 km perimeter strip",
      },
    ],
    flights: [],
  },
];

// ─── Component ─────────────────────────────────────────────────

export default function DailyPlansPage() {
  const [plans, setPlans] = useState<DailyPlan[]>(INITIAL_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<DailyPlan | null>(
    INITIAL_PLANS[0]
  );
  const [createOpen, setCreateOpen] = useState(false);

  // New plan form state
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newObjectives, setNewObjectives] = useState("");
  const [newSafetyNotes, setNewSafetyNotes] = useState(
    "Radio check-in every 30 min. All crews carry EPIRB and first aid kit."
  );
  const [newFireDanger, setNewFireDanger] = useState("High");

  function createPlan() {
    const plan: DailyPlan = {
      id: `dp-${Date.now()}`,
      date: newDate,
      status: "draft",
      weatherSummary: "To be updated from BOM forecast",
      windSpeed: 0,
      windDir: "—",
      temperature: 0,
      humidity: 0,
      fireDanger: newFireDanger,
      objectives: newObjectives,
      safetyNotes: newSafetyNotes,
      createdBy: "Toby Barton",
      crews: [],
      flights: [],
    };
    setPlans([plan, ...plans]);
    setSelectedPlan(plan);
    setCreateOpen(false);
    setNewObjectives("");
  }

  function removePlan(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlan?.id === id) setSelectedPlan(null);
  }

  const statusColor: Record<DailyPlan["status"], string> = {
    draft: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    active: "bg-orange-100 text-orange-800",
    completed: "bg-blue-100 text-blue-800",
  };

  const fireDangerColor: Record<string, string> = {
    Low: "text-green-600",
    Moderate: "text-yellow-600",
    High: "text-orange-600",
    "Very High": "text-red-600",
    Severe: "text-red-800",
    Extreme: "text-purple-700",
    Catastrophic: "text-purple-900",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Plans</h1>
          <p className="text-sm text-muted-foreground">
            Create daily operational plans with weather, crew, and flight
            assignments
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Daily Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Daily Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Fire Danger Rating</Label>
                <Select value={newFireDanger} onValueChange={setNewFireDanger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Low",
                      "Moderate",
                      "High",
                      "Very High",
                      "Severe",
                      "Extreme",
                      "Catastrophic",
                    ].map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Burn Objectives</Label>
                <Textarea
                  value={newObjectives}
                  onChange={(e) => setNewObjectives(e.target.value)}
                  placeholder="What areas are being targeted today? What are the goals?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Safety Notes</Label>
                <Textarea
                  value={newSafetyNotes}
                  onChange={(e) => setNewSafetyNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button className="w-full" onClick={createPlan}>
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Weather + Plan list */}
        <div className="space-y-4 lg:col-span-1">
          <WeatherWidget />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Plans</CardTitle>
              <CardDescription>
                {plans.length} plan{plans.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                    selectedPlan?.id === plan.id
                      ? "border-primary bg-muted/30"
                      : ""
                  }`}
                >
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plan.date}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[plan.status]}`}
                      >
                        {plan.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {plan.crews.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Plane className="h-3 w-3" />
                        {plan.flights.length}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}

              {plans.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No daily plans yet. Create one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Selected plan detail */}
        <div className="space-y-4 lg:col-span-2">
          {selectedPlan ? (
            <PlanDetail
              plan={selectedPlan}
              fireDangerColor={fireDangerColor}
              statusColor={statusColor}
              onRemove={() => removePlan(selectedPlan.id)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No plan selected</p>
                  <p className="text-sm text-muted-foreground">
                    Select a plan from the list or create a new one
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan Detail Panel ─────────────────────────────────────────

function PlanDetail({
  plan,
  fireDangerColor,
  statusColor,
  onRemove,
}: {
  plan: DailyPlan;
  fireDangerColor: Record<string, string>;
  statusColor: Record<DailyPlan["status"], string>;
  onRemove: () => void;
}) {
  return (
    <>
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                {plan.date}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[plan.status]}`}
                >
                  {plan.status}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">
                Created by {plan.createdBy}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/daily-plans/${plan.id}/operations`}>
                  <Radio className="mr-1.5 h-3.5 w-3.5" />
                  Operations
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/daily-plans/${plan.id}`}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print
                </Link>
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onRemove}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weather + Fire Danger */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Thermometer className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{plan.temperature}°C</p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Wind className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {plan.windSpeed}{" "}
                <span className="text-sm font-normal">km/h {plan.windDir}</span>
              </p>
              <p className="text-xs text-muted-foreground">Wind</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Droplets className="h-5 w-5 text-cyan-500" />
            <div>
              <p className="text-2xl font-bold">{plan.humidity}%</p>
              <p className="text-xs text-muted-foreground">Humidity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Flame
              className={`h-5 w-5 ${fireDangerColor[plan.fireDanger] ?? "text-gray-500"}`}
            />
            <div>
              <p
                className={`text-lg font-bold ${fireDangerColor[plan.fireDanger] ?? ""}`}
              >
                {plan.fireDanger}
              </p>
              <p className="text-xs text-muted-foreground">Fire Danger <InfoTooltip text="Daily rating calculated from temperature, humidity, wind, and drought factor. Ratings above 'Very High' typically restrict aerial operations." /></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectives & Safety */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{plan.objectives}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Safety Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{plan.safetyNotes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weather summary */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Weather Summary:
            </span>{" "}
            {plan.weatherSummary}
          </p>
        </CardContent>
      </Card>

      {/* Crew assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Crew Assignments ({plan.crews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.crews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No crews assigned yet. Edit the plan to add crew assignments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crew</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Burn Target</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.crews.map((crew) => (
                  <TableRow key={crew.id}>
                    <TableCell className="font-medium">
                      {crew.crewName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          crew.role === "aerial"
                            ? "border-blue-300 text-blue-700"
                            : crew.role === "ground"
                              ? "border-green-300 text-green-700"
                              : "border-gray-300 text-gray-700"
                        }
                      >
                        {crew.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {crew.members.map((m) => (
                          <Badge key={m} variant="secondary" className="text-xs">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{crew.burnTarget}</TableCell>
                    <TableCell className="max-w-48 text-xs text-muted-foreground">
                      {crew.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Flight assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4" />
            Flight Assignments ({plan.flights.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.flights.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No flights scheduled. Edit the plan to add flight assignments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Bombardier <InfoTooltip text="Crew member who operates the DAI machine in the helicopter." /></TableHead>
                  <TableHead>Burn Area</TableHead>
                  <TableHead>DAI Spheres <InfoTooltip text="Number of Delayed Action Incendiary pellets to be dropped during this flight." /></TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Departure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.flights.map((flight) => (
                  <TableRow key={flight.id}>
                    <TableCell className="font-medium">
                      {flight.aircraft}
                    </TableCell>
                    <TableCell>{flight.pilot}</TableCell>
                    <TableCell>{flight.bombardier}</TableCell>
                    <TableCell className="text-sm">{flight.burnArea}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{flight.daiSpheres}</Badge>
                    </TableCell>
                    <TableCell>{flight.estimatedHours}h</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {flight.departureTime}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{plan.crews.length}</p>
            <p className="text-xs text-muted-foreground">Crews Deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">
              {plan.crews.reduce((sum, c) => sum + c.members.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Personnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">
              {plan.flights.reduce((sum, f) => sum + f.daiSpheres, 0)}
            </p>
            <p className="text-xs text-muted-foreground">DAI Spheres <InfoTooltip text="Delayed Action Incendiary pellets — aerial fire-starting spheres dropped from a helicopter. Ignite 20–30 seconds after injection with glycol." /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">
              {plan.flights.reduce((sum, f) => sum + f.estimatedHours, 0)}h
            </p>
            <p className="text-xs text-muted-foreground">Flight Hours</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
