"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Calendar, Flame, TreePine } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

interface FireSeasonRow {
  id: string;
  year: number;
  edsStart: number;
  edsEnd: number;
  status: "planning" | "active" | "completed";
  burnPlans: number;
  edsBurnt: number;
  ldsBurnt: number;
}

const MOCK_SEASONS: FireSeasonRow[] = [
  { id: "1", year: 2026, edsStart: 4, edsEnd: 7, status: "planning", burnPlans: 0, edsBurnt: 0, ldsBurnt: 0 },
  { id: "2", year: 2025, edsStart: 4, edsEnd: 7, status: "completed", burnPlans: 12, edsBurnt: 36, ldsBurnt: 4 },
  { id: "3", year: 2024, edsStart: 4, edsEnd: 7, status: "completed", burnPlans: 10, edsBurnt: 40, ldsBurnt: 7 },
  { id: "4", year: 2023, edsStart: 4, edsEnd: 7, status: "completed", burnPlans: 8, edsBurnt: 42, ldsBurnt: 5 },
  { id: "5", year: 2022, edsStart: 4, edsEnd: 7, status: "completed", burnPlans: 11, edsBurnt: 38, ldsBurnt: 6 },
];

const monthName = (m: number) =>
  new Date(2000, m - 1).toLocaleString("en-AU", { month: "short" });

export default function SeasonsPage() {
  const [seasons] = useState(MOCK_SEASONS);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fire Seasons</h1>
          <p className="text-sm text-muted-foreground">
            Define EDS/LDS cutoff dates and track seasonal burn targets
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Season
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fire Season</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  defaultValue={new Date().getFullYear()}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>EDS Start</Label>
                  <Select defaultValue="4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {monthName(i + 1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>EDS End (LDS starts after)</Label>
                  <Select defaultValue="7">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {monthName(i + 1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">Create Season</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Season summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Current Season"
          value="2026"
          icon={<Calendar className="h-4 w-4 text-blue-500" />}
          detail="Planning"
        />
        <SummaryCard
          label="EDS Window"
          value="Apr – Jul"
          icon={<Flame className="h-4 w-4 text-blue-500" />}
          detail="Early dry season"
          tooltip="Early Dry Season — the cooler burning period. Strategic EDS burns reduce LDS wildfire risk and earn carbon credits."
        />
        <SummaryCard
          label="LDS Window"
          value="Aug – Nov"
          icon={<Flame className="h-4 w-4 text-red-500" />}
          detail="Late dry season"
          tooltip="Late Dry Season — hotter, drier conditions with more intense fires. Minimising LDS burning is a key management goal."
        />
        <SummaryCard
          label="Total Seasons"
          value={seasons.length.toString()}
          icon={<TreePine className="h-4 w-4 text-green-500" />}
          detail="In system"
        />
      </div>

      {/* Seasons table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Fire Seasons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>EDS Period</TableHead>
                <TableHead>LDS Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Burn Plans</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    EDS Burnt %
                    <InfoTooltip text="Percentage of project area burnt during the Early Dry Season." />
                  </span>
                </TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    LDS Burnt %
                    <InfoTooltip text="Percentage of project area burnt during the Late Dry Season. Lower is generally better." />
                  </span>
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell className="font-medium">{season.year}</TableCell>
                  <TableCell>
                    {monthName(season.edsStart)} – {monthName(season.edsEnd)}
                  </TableCell>
                  <TableCell>
                    {monthName(season.edsEnd + 1)} – Nov
                  </TableCell>
                  <TableCell>
                    <SeasonStatusBadge status={season.status} />
                  </TableCell>
                  <TableCell>{season.burnPlans}</TableCell>
                  <TableCell>
                    {season.edsBurnt > 0 ? (
                      <span className="font-medium text-blue-600">
                        {season.edsBurnt}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {season.ldsBurnt > 0 ? (
                      <span className="font-medium text-red-600">
                        {season.ldsBurnt}%
                      </span>
                    ) : (
                      "—"
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
        </CardContent>
      </Card>

      {/* Season timeline */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Season Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-1 text-center text-xs text-muted-foreground">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i}>{monthName(i + 1)}</div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const isEds = month >= 4 && month <= 7;
                const isLds = month >= 8 && month <= 11;
                return (
                  <div
                    key={i}
                    className={`h-8 rounded ${
                      isEds
                        ? "border border-blue-500/40 bg-blue-500/20"
                        : isLds
                          ? "border border-red-500/40 bg-red-500/20"
                          : "bg-muted"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border border-blue-500/40 bg-blue-500/30" />
                <span>EDS (Early Dry Season)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border border-red-500/40 bg-red-500/30" />
                <span>LDS (Late Dry Season)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-muted" />
                <span>Wet / Transition</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  detail,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail: string;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    planning: "outline",
    active: "default",
    completed: "secondary",
  };
  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>;
}
