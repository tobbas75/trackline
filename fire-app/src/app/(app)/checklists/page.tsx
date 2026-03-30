"use client";

import { useState, useCallback } from "react";
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
  CheckCircle2,
  Circle,
  ClipboardList,
  Plus,
  Plane,
  Users,
  Shield,
  FileText,
  Clock,
  User,
  Trash2,
  Download,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import type { ChecklistType } from "@/lib/supabase/types";

// ─── Types ─────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  required: boolean;
  checkedAt: string | null;
  checkedBy: string | null;
}

interface Checklist {
  id: string;
  type: ChecklistType;
  title: string;
  date: string;
  dailyPlanId: string | null;
  completedBy: string | null;
  completedAt: string | null;
  status: "incomplete" | "complete" | "signed_off";
  items: ChecklistItem[];
  notes: string;
}

// ─── Templates ─────────────────────────────────────────────────

const CHECKLIST_TEMPLATES: Record<
  ChecklistType,
  {
    title: string;
    icon: React.ReactNode;
    items: { text: string; required: boolean }[];
  }
> = {
  bombardier: {
    title: "Bombardier Instructions",
    icon: <Plane className="h-4 w-4" />,
    items: [
      { text: "Confirm DAI machine loaded and secured", required: true },
      { text: "Verify sphere count matches flight plan", required: true },
      { text: "Check DAI machine glycol levels", required: true },
      { text: "Confirm potassium permanganate supply", required: true },
      { text: "Radio check with pilot", required: true },
      { text: "Review drop zones on map", required: true },
      { text: "Confirm no-go zones briefed", required: true },
      { text: "Safety harness inspection", required: true },
      { text: "Emergency procedure review", required: true },
      { text: "GPS tracker powered on", required: false },
    ],
  },
  ground_crew: {
    title: "Ground Burning Crew",
    icon: <Users className="h-4 w-4" />,
    items: [
      { text: "PPE check — all crew members", required: true },
      { text: "Drip torch fuel levels checked", required: true },
      { text: "Water tanker full and operational", required: true },
      { text: "Radio communications tested", required: true },
      { text: "First aid kit inspected", required: true },
      { text: "Vehicle fuel levels adequate", required: false },
      { text: "Burn area boundaries confirmed on map", required: true },
      { text: "Wind direction and speed checked", required: true },
      { text: "Cultural zones briefed to all crew", required: true },
      { text: "Emergency evacuation route identified", required: true },
      { text: "Crew sign-on register completed", required: true },
    ],
  },
  pre_flight: {
    title: "Pre-Flight Safety",
    icon: <Shield className="h-4 w-4" />,
    items: [
      { text: "Weather conditions checked — within limits", required: true },
      { text: "NOTAM check completed", required: true },
      { text: "Aircraft daily inspection signed off", required: true },
      { text: "Fuel quantity verified", required: true },
      { text: "Weight and balance within limits", required: true },
      { text: "Flight plan filed", required: true },
      { text: "Emergency locator transmitter checked", required: true },
      { text: "Communication frequencies confirmed", required: true },
      { text: "Passenger safety briefing completed", required: true },
      { text: "Fire danger rating confirmed", required: false },
    ],
  },
  post_flight: {
    title: "Post-Flight Debrief",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { text: "Actual burn area recorded", required: true },
      { text: "DAI sphere count reconciled", required: true },
      { text: "Any incidents or near-misses reported", required: true },
      { text: "GPS track downloaded", required: true },
      { text: "Aircraft hours recorded in tech log", required: true },
      { text: "Fuel remaining recorded", required: true },
      { text: "Photos/video saved and labelled", required: false },
      { text: "Weather conditions at burn noted", required: false },
      { text: "Effectiveness assessment completed", required: true },
      { text: "Debrief notes recorded", required: false },
    ],
  },
  safety: {
    title: "Daily Safety Briefing",
    icon: <Shield className="h-4 w-4" />,
    items: [
      { text: "Weather forecast reviewed with team", required: true },
      { text: "Fire danger rating confirmed", required: true },
      { text: "Task assignments confirmed", required: true },
      { text: "Communication plan reviewed", required: true },
      { text: "Emergency procedures reviewed", required: true },
      { text: "Cultural zone restrictions briefed", required: true },
      { text: "Fatigue management check", required: true },
      { text: "Vehicle safety check", required: false },
      { text: "First aid officer confirmed", required: true },
      { text: "Sign-on register completed", required: true },
    ],
  },
};

// ─── Mock checklists ─────────────────────────────────────────────

function createMockChecklist(
  id: string,
  type: ChecklistType,
  date: string,
  status: Checklist["status"],
  completedBy: string | null,
  checkedUpTo: number
): Checklist {
  const template = CHECKLIST_TEMPLATES[type];
  return {
    id,
    type,
    title: template.title,
    date,
    dailyPlanId: null,
    completedBy,
    completedAt: status !== "incomplete" ? `${date}T16:00:00Z` : null,
    status,
    notes: "",
    items: template.items.map((item, i) => ({
      id: `${id}-item-${i}`,
      text: item.text,
      checked: i < checkedUpTo,
      required: item.required,
      checkedAt: i < checkedUpTo ? `${date}T${8 + i}:00:00Z` : null,
      checkedBy: i < checkedUpTo ? (completedBy ?? "Toby Barton") : null,
    })),
  };
}

const INITIAL_CHECKLISTS: Checklist[] = [
  createMockChecklist("cl-001", "bombardier", "2026-03-02", "signed_off", "David Williams", 10),
  createMockChecklist("cl-002", "pre_flight", "2026-03-02", "signed_off", "John Mitchell", 10),
  createMockChecklist("cl-003", "ground_crew", "2026-03-02", "incomplete", null, 5),
  createMockChecklist("cl-004", "post_flight", "2026-03-01", "complete", "John Mitchell", 10),
  createMockChecklist("cl-005", "safety", "2026-03-02", "signed_off", "Toby Barton", 10),
];

// ─── Component ─────────────────────────────────────────────────

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>(INITIAL_CHECKLISTS);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered =
    typeFilter === "all"
      ? checklists
      : checklists.filter((c) => c.type === typeFilter);

  const activeChecklist = checklists.find((c) => c.id === activeChecklistId) ?? null;

  const toggleItem = useCallback(
    (checklistId: string, itemId: string) => {
      setChecklists((prev) =>
        prev.map((cl) => {
          if (cl.id !== checklistId || cl.status === "signed_off") return cl;
          const updatedItems = cl.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  checked: !item.checked,
                  checkedAt: !item.checked ? new Date().toISOString() : null,
                  checkedBy: !item.checked ? "Toby Barton" : null,
                }
              : item
          );
          const allChecked = updatedItems.every((item) => item.checked);
          const allRequiredChecked = updatedItems
            .filter((item) => item.required)
            .every((item) => item.checked);
          return {
            ...cl,
            items: updatedItems,
            status: allChecked
              ? "complete"
              : cl.status === "complete"
                ? "incomplete"
                : cl.status,
          };
        })
      );
    },
    []
  );

  const signOffChecklist = useCallback((checklistId: string) => {
    setChecklists((prev) =>
      prev.map((cl) => {
        if (cl.id !== checklistId) return cl;
        const allRequired = cl.items
          .filter((i) => i.required)
          .every((i) => i.checked);
        if (!allRequired) return cl;
        return {
          ...cl,
          status: "signed_off" as const,
          completedBy: "Toby Barton",
          completedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const deleteChecklist = useCallback(
    (checklistId: string) => {
      setChecklists((prev) => prev.filter((c) => c.id !== checklistId));
      if (activeChecklistId === checklistId) setActiveChecklistId(null);
    },
    [activeChecklistId]
  );

  const createChecklist = useCallback(
    (type: ChecklistType) => {
      const template = CHECKLIST_TEMPLATES[type];
      const now = new Date();
      const id = `cl-${Date.now()}`;
      const newChecklist: Checklist = {
        id,
        type,
        title: template.title,
        date: now.toISOString().split("T")[0],
        dailyPlanId: null,
        completedBy: null,
        completedAt: null,
        status: "incomplete",
        notes: "",
        items: template.items.map((item, i) => ({
          id: `${id}-item-${i}`,
          text: item.text,
          checked: false,
          required: item.required,
          checkedAt: null,
          checkedBy: null,
        })),
      };
      setChecklists((prev) => [newChecklist, ...prev]);
      setActiveChecklistId(id);
      setCreateOpen(false);
    },
    []
  );

  // Stats
  const totalToday = checklists.filter(
    (c) => c.date === new Date().toISOString().split("T")[0]
  ).length;
  const completedToday = checklists.filter(
    (c) =>
      c.date === new Date().toISOString().split("T")[0] &&
      (c.status === "complete" || c.status === "signed_off")
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklists</h1>
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">
              Digital bombardier, ground crew, safety, and flight checklists
            </p>
            <InfoTooltip text="Checklists ensure standardised safety and operational procedures are followed before, during, and after aerial and ground burning operations." />
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Checklist</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 pt-4">
              {(
                Object.entries(CHECKLIST_TEMPLATES) as [
                  ChecklistType,
                  (typeof CHECKLIST_TEMPLATES)[ChecklistType],
                ][]
              ).map(([type, template]) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto justify-start gap-3 p-4"
                  onClick={() => createChecklist(type)}
                >
                  {template.icon}
                  <div className="text-left">
                    <p className="font-medium">{template.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.items.length} items ({template.items.filter((i) => i.required).length}{" "}
                      required)
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{checklists.length}</p>
            <p className="text-xs text-muted-foreground">Total Checklists</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{totalToday}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedToday}</p>
            <p className="text-xs text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {checklists.filter((c) => c.status === "incomplete").length}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {checklists.filter((c) => c.status === "signed_off").length}
            </p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-xs text-muted-foreground">Signed Off</p>
              <InfoTooltip text="Checklists that have been completed and formally signed off by an authorised person. Signed-off checklists are locked and cannot be modified." />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <ClipboardList className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bombardier">Bombardier</SelectItem>
            <SelectItem value="ground_crew">Ground Crew</SelectItem>
            <SelectItem value="pre_flight">Pre-Flight</SelectItem>
            <SelectItem value="post_flight">Post-Flight</SelectItem>
            <SelectItem value="safety">Safety</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist list */}
        <div className="space-y-3 lg:col-span-1">
          {filtered.map((checklist) => {
            const completedCount = checklist.items.filter((i) => i.checked).length;
            const totalCount = checklist.items.length;
            const template = CHECKLIST_TEMPLATES[checklist.type];
            const isActive = activeChecklistId === checklist.id;

            return (
              <Card
                key={checklist.id}
                className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                  isActive ? "border-primary bg-muted/20" : ""
                }`}
                onClick={() =>
                  setActiveChecklistId(isActive ? null : checklist.id)
                }
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      {template.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{checklist.title}</p>
                        <ChecklistStatusBadge status={checklist.status} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {checklist.date}
                        {checklist.completedBy && (
                          <>
                            <User className="ml-1 h-3 w-3" />
                            {checklist.completedBy}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {completedCount}/{totalCount}
                      </p>
                      <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{
                            width: `${(completedCount / totalCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No checklists match the filter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active checklist detail */}
        <div className="lg:col-span-2">
          {activeChecklist ? (
            <ChecklistDetail
              checklist={activeChecklist}
              onToggleItem={(itemId) => toggleItem(activeChecklist.id, itemId)}
              onSignOff={() => signOffChecklist(activeChecklist.id)}
              onDelete={() => deleteChecklist(activeChecklist.id)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No checklist selected</p>
                  <p className="text-sm text-muted-foreground">
                    Select a checklist from the list or create a new one
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

// ─── Checklist Detail ─────────────────────────────────────────

function ChecklistDetail({
  checklist,
  onToggleItem,
  onSignOff,
  onDelete,
}: {
  checklist: Checklist;
  onToggleItem: (itemId: string) => void;
  onSignOff: () => void;
  onDelete: () => void;
}) {
  const completedCount = checklist.items.filter((i) => i.checked).length;
  const totalCount = checklist.items.length;
  const requiredCount = checklist.items.filter((i) => i.required).length;
  const requiredCompleted = checklist.items.filter(
    (i) => i.required && i.checked
  ).length;
  const canSignOff =
    checklist.status !== "signed_off" && requiredCompleted === requiredCount;
  const isSigned = checklist.status === "signed_off";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {CHECKLIST_TEMPLATES[checklist.type].icon}
              {checklist.title}
              <ChecklistStatusBadge status={checklist.status} />
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {checklist.date}
              {checklist.completedBy && ` — Signed off by ${checklist.completedBy}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isSigned}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} of {totalCount} items complete
            </span>
            <span>
              {requiredCompleted}/{requiredCount} required
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          {checklist.items.map((item) => (
            <button
              key={item.id}
              onClick={() => !isSigned && onToggleItem(item.id)}
              disabled={isSigned}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isSigned
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-muted/50"
              }`}
            >
              {item.checked ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1">
                <span
                  className={
                    item.checked ? "text-muted-foreground line-through" : ""
                  }
                >
                  {item.text}
                </span>
                {item.checkedAt && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.checkedBy} —{" "}
                    {new Date(item.checkedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {item.required && (
                  <Badge
                    variant={item.checked ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    Required
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        {!isSigned && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {canSignOff
                ? "All required items complete. Ready to sign off."
                : `${requiredCount - requiredCompleted} required item${requiredCount - requiredCompleted !== 1 ? "s" : ""} remaining`}
            </p>
            <Button onClick={onSignOff} disabled={!canSignOff}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Sign Off
            </Button>
          </div>
        )}

        {isSigned && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Signed Off
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  by {checklist.completedBy} on{" "}
                  {checklist.completedAt
                    ? new Date(checklist.completedAt).toLocaleString()
                    : checklist.date}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function ChecklistStatusBadge({
  status,
}: {
  status: "incomplete" | "complete" | "signed_off";
}) {
  const config: Record<
    string,
    { variant: "default" | "secondary" | "outline"; label: string }
  > = {
    incomplete: { variant: "outline", label: "In Progress" },
    complete: { variant: "secondary", label: "Complete" },
    signed_off: { variant: "default", label: "Signed Off" },
  };
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
