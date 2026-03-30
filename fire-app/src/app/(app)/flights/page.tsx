"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Plane, MapPin, Clock, Fuel } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

interface FlightPlan {
  id: string;
  date: string;
  aircraft: string;
  pilot: string;
  bombardier: string;
  burnPlan: string;
  status: "planned" | "in_flight" | "completed" | "cancelled";
  daiSpheres: number;
  flightHours: number;
  dropsCompleted: number;
}

const MOCK_FLIGHTS: FlightPlan[] = [
  {
    id: "fp-001",
    date: "2026-05-15",
    aircraft: "R44 — VH-FBX",
    pilot: "John Mitchell",
    bombardier: "David Williams",
    burnPlan: "Northern Coastal Strip",
    status: "completed",
    daiSpheres: 2400,
    flightHours: 3.5,
    dropsCompleted: 2400,
  },
  {
    id: "fp-002",
    date: "2026-05-16",
    aircraft: "R44 — VH-FBX",
    pilot: "John Mitchell",
    bombardier: "Mary Johnson",
    burnPlan: "Central Savanna Block A",
    status: "completed",
    daiSpheres: 1800,
    flightHours: 2.8,
    dropsCompleted: 1800,
  },
  {
    id: "fp-003",
    date: "2026-05-20",
    aircraft: "AS350 — VH-HBZ",
    pilot: "Sarah Lee",
    bombardier: "David Williams",
    burnPlan: "Western Ridge Line",
    status: "planned",
    daiSpheres: 3000,
    flightHours: 0,
    dropsCompleted: 0,
  },
  {
    id: "fp-004",
    date: "2026-05-22",
    aircraft: "R44 — VH-FBX",
    pilot: "John Mitchell",
    bombardier: "Tom Brown",
    burnPlan: "Airport Perimeter Buffer",
    status: "planned",
    daiSpheres: 600,
    flightHours: 0,
    dropsCompleted: 0,
  },
];

export default function FlightsPage() {
  const totalFlightHours = MOCK_FLIGHTS.reduce(
    (sum, f) => sum + f.flightHours,
    0
  );
  const totalSpheres = MOCK_FLIGHTS.reduce(
    (sum, f) => sum + f.dropsCompleted,
    0
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flight Plans</h1>
          <p className="text-sm text-muted-foreground">
            Aerial incendiary flight planning, crew assignment, and drop logging
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Flight Plan
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Flights"
          value={MOCK_FLIGHTS.length.toString()}
          icon={<Plane className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          label="Flight Hours"
          value={totalFlightHours.toFixed(1)}
          icon={<Clock className="h-4 w-4 text-purple-500" />}
        />
        <StatCard
          label="DAI Spheres Dropped"
          value={totalSpheres.toLocaleString()}
          icon={<MapPin className="h-4 w-4 text-orange-500" />}
          tooltip="Total Delayed Action Incendiary pellets dropped from aircraft. Each sphere ignites 20–30 seconds after glycol injection."
        />
        <StatCard
          label="Fuel Used (est.)"
          value={`${(totalFlightHours * 95).toFixed(0)}L`}
          icon={<Fuel className="h-4 w-4 text-green-500" />}
          tooltip="Estimated fuel consumption based on flight hours. Update with actuals after each flight."
        />
      </div>

      {/* Flights table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flight Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Pilot</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    Bombardier
                    <InfoTooltip text="Crew member who operates the DAI machine in the helicopter." />
                  </span>
                </TableHead>
                <TableHead>Burn Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    DAI Spheres
                    <InfoTooltip text="Number of fire-starting pellets dropped (or planned) for this flight." />
                  </span>
                </TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_FLIGHTS.map((flight) => (
                <TableRow key={flight.id}>
                  <TableCell className="font-medium">{flight.date}</TableCell>
                  <TableCell className="text-sm">{flight.aircraft}</TableCell>
                  <TableCell className="text-sm">{flight.pilot}</TableCell>
                  <TableCell className="text-sm">{flight.bombardier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {flight.burnPlan}
                  </TableCell>
                  <TableCell>
                    <FlightStatusBadge status={flight.status} />
                  </TableCell>
                  <TableCell>
                    {flight.status === "completed"
                      ? flight.dropsCompleted.toLocaleString()
                      : flight.daiSpheres.toLocaleString()}
                    {flight.status === "planned" && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        (planned)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {flight.flightHours > 0
                      ? flight.flightHours.toFixed(1)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aircraft info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Aircraft Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Plane className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">R44 — VH-FBX</p>
                <p className="text-sm text-muted-foreground">
                  Robinson R44 Raven II — Primary incendiary platform
                </p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">DAI Machine: Yes</Badge>
                  <Badge variant="secondary">Available</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Plane className="h-8 w-8 text-purple-500" />
              <div>
                <p className="font-medium">AS350 — VH-HBZ</p>
                <p className="text-sm text-muted-foreground">
                  Airbus AS350 B3 Squirrel — Heavy lift / survey
                </p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">DAI Machine: Yes</Badge>
                  <Badge variant="secondary">Available</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FlightStatusBadge({
  status,
}: {
  status: "planned" | "in_flight" | "completed" | "cancelled";
}) {
  const config: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    planned: { variant: "outline", label: "Planned" },
    in_flight: { variant: "default", label: "In Flight" },
    completed: { variant: "secondary", label: "Completed" },
    cancelled: { variant: "destructive", label: "Cancelled" },
  };
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
