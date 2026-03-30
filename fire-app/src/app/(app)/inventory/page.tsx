"use client";

import { useState, useCallback } from "react";
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
import {
  Plus,
  Minus,
  Package,
  Fuel,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  History,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

type InventoryCategory = "incendiary" | "fuel" | "safety" | "equipment";

interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  recordedBy: string;
  date: string;
}

// ─── Mock Data ─────────────────────────────────────────────────

const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "inv-001",
    name: "DAI Spheres",
    category: "incendiary",
    unit: "spheres",
    currentStock: 12400,
    minStock: 2000,
    maxStock: 20000,
    lastUpdated: "2026-03-02",
  },
  {
    id: "inv-002",
    name: "Potassium Permanganate (KMnO₄)",
    category: "incendiary",
    unit: "kg",
    currentStock: 45,
    minStock: 10,
    maxStock: 100,
    lastUpdated: "2026-03-01",
  },
  {
    id: "inv-003",
    name: "Ethylene Glycol (DAI Machine)",
    category: "incendiary",
    unit: "litres",
    currentStock: 28,
    minStock: 5,
    maxStock: 50,
    lastUpdated: "2026-03-01",
  },
  {
    id: "inv-004",
    name: "Drip Torch Fuel (Diesel/Petrol mix)",
    category: "fuel",
    unit: "litres",
    currentStock: 180,
    minStock: 50,
    maxStock: 500,
    lastUpdated: "2026-03-02",
  },
  {
    id: "inv-005",
    name: "Avgas 100LL (R44)",
    category: "fuel",
    unit: "litres",
    currentStock: 820,
    minStock: 200,
    maxStock: 2000,
    lastUpdated: "2026-03-02",
  },
  {
    id: "inv-006",
    name: "Jet A-1 (AS350)",
    category: "fuel",
    unit: "litres",
    currentStock: 1450,
    minStock: 500,
    maxStock: 3000,
    lastUpdated: "2026-03-01",
  },
  {
    id: "inv-007",
    name: "Vehicle Diesel",
    category: "fuel",
    unit: "litres",
    currentStock: 650,
    minStock: 200,
    maxStock: 1000,
    lastUpdated: "2026-03-02",
  },
  {
    id: "inv-008",
    name: "Drip Torches",
    category: "equipment",
    unit: "units",
    currentStock: 8,
    minStock: 4,
    maxStock: 12,
    lastUpdated: "2026-02-28",
  },
  {
    id: "inv-009",
    name: "UHF Radios",
    category: "equipment",
    unit: "units",
    currentStock: 12,
    minStock: 6,
    maxStock: 15,
    lastUpdated: "2026-02-28",
  },
  {
    id: "inv-010",
    name: "First Aid Kits (Field)",
    category: "safety",
    unit: "kits",
    currentStock: 6,
    minStock: 4,
    maxStock: 10,
    lastUpdated: "2026-02-28",
  },
  {
    id: "inv-011",
    name: "Fire Extinguishers (Vehicle)",
    category: "safety",
    unit: "units",
    currentStock: 5,
    minStock: 3,
    maxStock: 8,
    lastUpdated: "2026-02-28",
  },
  {
    id: "inv-012",
    name: "EPIRB Beacons",
    category: "safety",
    unit: "units",
    currentStock: 4,
    minStock: 2,
    maxStock: 6,
    lastUpdated: "2026-02-28",
  },
];

const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: "mv-001",
    itemId: "inv-001",
    itemName: "DAI Spheres",
    type: "out",
    quantity: 800,
    reason: "Bathurst North Block 3 — Flight FP-001",
    recordedBy: "Tommy Puruntatameri",
    date: "2026-03-02T07:30:00Z",
  },
  {
    id: "mv-002",
    itemId: "inv-001",
    itemName: "DAI Spheres",
    type: "out",
    quantity: 600,
    reason: "Melville East Coast — Flight FP-002",
    recordedBy: "Daniel Tipiloura",
    date: "2026-03-02T08:00:00Z",
  },
  {
    id: "mv-003",
    itemId: "inv-005",
    itemName: "Avgas 100LL (R44)",
    type: "out",
    quantity: 280,
    reason: "R44 VH-HFR — 3.5hr flight",
    recordedBy: "Jane Smith",
    date: "2026-03-02T11:30:00Z",
  },
  {
    id: "mv-004",
    itemId: "inv-004",
    itemName: "Drip Torch Fuel (Diesel/Petrol mix)",
    type: "out",
    quantity: 30,
    reason: "Ground crew — Bathurst South firebreak",
    recordedBy: "Marcus Johnson",
    date: "2026-03-02T08:15:00Z",
  },
  {
    id: "mv-005",
    itemId: "inv-001",
    itemName: "DAI Spheres",
    type: "in",
    quantity: 5000,
    reason: "Resupply — Darwin freight",
    recordedBy: "Toby Barton",
    date: "2026-03-01T14:00:00Z",
  },
  {
    id: "mv-006",
    itemId: "inv-006",
    itemName: "Jet A-1 (AS350)",
    type: "in",
    quantity: 2000,
    reason: "Fuel delivery — Tiwi barge",
    recordedBy: "Toby Barton",
    date: "2026-02-28T10:00:00Z",
  },
];

// ─── Component ─────────────────────────────────────────────────

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out">("out");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const filtered =
    categoryFilter === "all"
      ? items
      : items.filter((i) => i.category === categoryFilter);

  const lowStockItems = items.filter((i) => i.currentStock <= i.minStock);

  const openAdjust = useCallback(
    (item: InventoryItem, type: "in" | "out") => {
      setAdjustItem(item);
      setAdjustType(type);
      setAdjustQty("");
      setAdjustReason("");
      setAdjustOpen(true);
    },
    []
  );

  const confirmAdjust = useCallback(() => {
    if (!adjustItem || !adjustQty) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) return;

    // Update stock
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== adjustItem.id) return item;
        return {
          ...item,
          currentStock:
            adjustType === "in"
              ? item.currentStock + qty
              : Math.max(0, item.currentStock - qty),
          lastUpdated: new Date().toISOString().split("T")[0],
        };
      })
    );

    // Record movement
    const movement: StockMovement = {
      id: `mv-${Date.now()}`,
      itemId: adjustItem.id,
      itemName: adjustItem.name,
      type: adjustType,
      quantity: qty,
      reason: adjustReason || `Manual ${adjustType === "in" ? "restock" : "issue"}`,
      recordedBy: "Toby Barton",
      date: new Date().toISOString(),
    };
    setMovements((prev) => [movement, ...prev]);

    setAdjustOpen(false);
    setAdjustItem(null);
  }, [adjustItem, adjustQty, adjustType, adjustReason]);

  const categoryIcons: Record<InventoryCategory, React.ReactNode> = {
    incendiary: <Flame className="h-4 w-4 text-red-500" />,
    fuel: <Fuel className="h-4 w-4 text-amber-500" />,
    safety: <AlertTriangle className="h-4 w-4 text-green-500" />,
    equipment: <Package className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Track fuel, incendiaries, safety equipment, and field supplies
          </p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Low Stock Alert
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="border-amber-400 text-amber-700 dark:text-amber-300"
                >
                  {item.name}: {item.currentStock} {item.unit} (min:{" "}
                  {item.minStock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {(
          ["incendiary", "fuel", "safety", "equipment"] as InventoryCategory[]
        ).map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          const lowCount = catItems.filter(
            (i) => i.currentStock <= i.minStock
          ).length;
          return (
            <Card key={cat}>
              <CardContent className="flex items-center gap-3 pt-4">
                {categoryIcons[cat]}
                <div>
                  <p className="text-xl font-bold">{catItems.length}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {cat} items
                  </p>
                </div>
                {lowCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {lowCount} low
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Inventory table */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stock Levels</CardTitle>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="incendiary">Incendiary</SelectItem>
                    <SelectItem value="fuel">Fuel</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const pct = Math.min(
                      100,
                      (item.currentStock / item.maxStock) * 100
                    );
                    const isLow = item.currentStock <= item.minStock;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${isLow ? "font-bold text-red-600" : ""}`}
                        >
                          {item.currentStock.toLocaleString()} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {item.minStock}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLow
                                    ? "bg-red-500"
                                    : pct < 40
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.lastUpdated}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => openAdjust(item, "in")}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => openAdjust(item, "out")}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recent movements */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Recent Movements
              </CardTitle>
              <CardDescription>
                {movements.length} transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {movements.slice(0, 12).map((mv) => (
                <div
                  key={mv.id}
                  className="flex items-start gap-2 rounded-lg border p-2.5 text-xs"
                >
                  {mv.type === "in" ? (
                    <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {mv.type === "in" ? "+" : "−"}
                      {mv.quantity} {mv.itemName}
                    </p>
                    <p className="text-muted-foreground">{mv.reason}</p>
                    <p className="text-muted-foreground">
                      {mv.recordedBy} —{" "}
                      {new Date(mv.date).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock adjustment dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {adjustType === "in" ? "Add Stock" : "Issue Stock"}
            </DialogTitle>
          </DialogHeader>
          {adjustItem && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="font-medium">{adjustItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current: {adjustItem.currentStock.toLocaleString()}{" "}
                  {adjustItem.unit}
                </p>
              </div>
              <div>
                <Label>Quantity ({adjustItem.unit})</Label>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Enter quantity"
                  min={1}
                  autoFocus
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={
                    adjustType === "in"
                      ? "e.g., Resupply from Darwin"
                      : "e.g., Flight FP-003 — Western Ridge"
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={confirmAdjust}
                disabled={!adjustQty || parseInt(adjustQty) <= 0}
              >
                {adjustType === "in" ? (
                  <Plus className="mr-1.5 h-4 w-4" />
                ) : (
                  <Minus className="mr-1.5 h-4 w-4" />
                )}
                {adjustType === "in" ? "Add" : "Issue"}{" "}
                {adjustQty ? parseInt(adjustQty).toLocaleString() : "0"}{" "}
                {adjustItem.unit}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
