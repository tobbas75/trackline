"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MapPin,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/info-tooltip";
import type { BurnPlanStatus, BurnType } from "@/lib/supabase/types";

interface BurnPlanRow {
  id: string;
  name: string;
  targetSeason: "EDS" | "LDS";
  burnType: BurnType | null;
  status: BurnPlanStatus;
  area_ha: number;
  vegetation: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  assignedCrew: string | null;
}

const MOCK_BURN_PLANS: BurnPlanRow[] = [
  {
    id: "bp-001",
    name: "Northern Coastal Strip",
    targetSeason: "EDS",
    burnType: "aerial",
    status: "approved",
    area_ha: 12500,
    vegetation: "Open woodland",
    priority: "high",
    createdAt: "2026-02-15",
    assignedCrew: "Alpha Team",
  },
  {
    id: "bp-002",
    name: "Central Savanna Block A",
    targetSeason: "EDS",
    burnType: "aerial",
    status: "scheduled",
    area_ha: 8200,
    vegetation: "Tall open forest",
    priority: "high",
    createdAt: "2026-02-18",
    assignedCrew: "Bravo Team",
  },
  {
    id: "bp-003",
    name: "Southern Monsoon Vine",
    targetSeason: "EDS",
    burnType: "road",
    status: "draft",
    area_ha: 3400,
    vegetation: "Monsoon vine forest",
    priority: "medium",
    createdAt: "2026-02-20",
    assignedCrew: null,
  },
  {
    id: "bp-004",
    name: "Western Ridge Line",
    targetSeason: "EDS",
    burnType: "road",
    status: "reviewed",
    area_ha: 5600,
    vegetation: "Hummock grassland",
    priority: "medium",
    createdAt: "2026-02-22",
    assignedCrew: null,
  },
  {
    id: "bp-005",
    name: "Airport Perimeter Buffer",
    targetSeason: "EDS",
    burnType: "aerial",
    status: "completed",
    area_ha: 800,
    vegetation: "Open woodland",
    priority: "high",
    createdAt: "2026-01-10",
    assignedCrew: "Alpha Team",
  },
  {
    id: "bp-006",
    name: "Eastern Coastal Corridor",
    targetSeason: "LDS",
    burnType: null,
    status: "draft",
    area_ha: 15000,
    vegetation: "Open woodland",
    priority: "low",
    createdAt: "2026-02-25",
    assignedCrew: null,
  },
];

const STATUS_COLORS: Record<BurnPlanStatus, string> = {
  draft: "outline",
  reviewed: "secondary",
  approved: "default",
  scheduled: "default",
  active: "destructive",
  completed: "secondary",
  cancelled: "outline",
};

export default function BurnPlansPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = MOCK_BURN_PLANS.filter((plan) => {
    if (statusFilter !== "all" && plan.status !== statusFilter) return false;
    if (
      searchQuery &&
      !plan.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const counts = {
    total: MOCK_BURN_PLANS.length,
    draft: MOCK_BURN_PLANS.filter((p) => p.status === "draft").length,
    approved: MOCK_BURN_PLANS.filter(
      (p) => p.status === "approved" || p.status === "scheduled"
    ).length,
    completed: MOCK_BURN_PLANS.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Burn Plans</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage seasonal burn plans with map-drawn boundaries
          </p>
        </div>
        <Button asChild>
          <Link href="/burn-plans/new">
            <Plus className="mr-2 h-4 w-4" />
            New Burn Plan
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatusCard
          label="Total Plans"
          value={counts.total}
          icon={<MapPin className="h-4 w-4 text-blue-500" />}
        />
        <StatusCard
          label="Draft / In Review"
          value={counts.draft}
          icon={<Clock className="h-4 w-4 text-yellow-500" />}
        />
        <StatusCard
          label="Approved / Scheduled"
          value={counts.approved}
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        />
        <StatusCard
          label="Completed"
          value={counts.completed}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search burn plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Burn Plans — 2026 Season
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No burn plans match your filters
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Season <InfoTooltip text="Target season for the burn — EDS (Early Dry Season) or LDS (Late Dry Season)." /></TableHead>
                  <TableHead>Status <InfoTooltip text="Workflow stage: draft → reviewed → approved → scheduled → active → completed." /></TableHead>
                  <TableHead>Area (ha) <InfoTooltip text="Planned burn area in hectares (1 hectare = 10,000 m²)." /></TableHead>
                  <TableHead>Vegetation</TableHead>
                  <TableHead>Priority <InfoTooltip text="Operational priority — high priority burns are scheduled first and get resource preference." /></TableHead>
                  <TableHead>Crew</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {plan.burnType ? (
                        <Badge
                          variant="outline"
                          className={
                            plan.burnType === "aerial"
                              ? "border-sky-500 text-sky-600"
                              : "border-amber-500 text-amber-600"
                          }
                        >
                          {plan.burnType === "aerial" ? "Aerial" : "Road"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          plan.targetSeason === "EDS"
                            ? "border-blue-500 text-blue-600"
                            : "border-red-500 text-red-600"
                        }
                      >
                        {plan.targetSeason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_COLORS[plan.status] as
                            | "default"
                            | "secondary"
                            | "outline"
                            | "destructive"
                        }
                      >
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {plan.area_ha.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.vegetation}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={plan.priority} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {plan.assignedCrew ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
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
          )}
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(
              [
                "draft",
                "reviewed",
                "approved",
                "scheduled",
                "active",
                "completed",
              ] as BurnPlanStatus[]
            ).map((status, i) => (
              <div key={status} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize">
                  {status}
                </div>
                {i < 5 && (
                  <span className="text-muted-foreground">&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
