"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Leaf,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Calculator,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Plus,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  accuPeriods,
  emissionsByGas,
  baselineYears,
  accuSales,
  getTotalACCUs,
  getTotalRevenue,
  getBaselineAverage,
  getCumulativeACCUs,
  getRevenueByBuyer,
  type AccuPeriod,
} from "@/lib/carbon-data";
import {
  cfiTable3Data,
  cfiTable9Data,
} from "@/lib/fire-metrics-data";
import {
  exportTable3CSV,
  exportTable9CSV,
  exportCSV,
} from "@/lib/export-utils";

const BUYER_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];

export default function CarbonPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<AccuPeriod | null>(null);
  const [showNewPeriod, setShowNewPeriod] = useState(false);

  const totalACCUs = getTotalACCUs();
  const totalRevenue = getTotalRevenue();
  const baselineAvg = getBaselineAverage();
  const cumulativeData = getCumulativeACCUs();
  const revenueByBuyer = getRevenueByBuyer();
  const issuedPeriods = accuPeriods.filter((p) => p.accus_issued > 0);
  const latestIssued = issuedPeriods[issuedPeriods.length - 1];

  const accuChartData = accuPeriods
    .filter((p) => p.accus_issued > 0 || p.status !== "draft")
    .map((p) => ({
      period: p.period,
      issued: p.accus_issued,
      price: p.accu_price,
      revenue: p.revenue / 1000,
    }));

  const emissionsChartData = accuPeriods
    .filter((p) => p.project_emissions > 0)
    .map((p) => ({
      period: p.period,
      baseline: p.baseline_emissions,
      project: p.project_emissions,
      abatement: p.gross_abatement,
    }));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Carbon &amp; ACCU Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Savanna burning carbon project — emissions abatement, ACCU
            generation, and CER submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                accuPeriods.map((p) => ({
                  period: p.period,
                  baseline: p.baseline_emissions,
                  project: p.project_emissions,
                  abatement: p.gross_abatement,
                  accus_issued: p.accus_issued,
                  price: p.accu_price,
                  revenue: p.revenue,
                  status: p.status,
                })),
                "accu-periods.csv"
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export ACCUs
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/carbon/savbat">
              <Calculator className="mr-2 h-4 w-4" />
              SavBAT Prep
            </a>
          </Button>
        </div>
      </div>

      {/* Project registration info */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4" />
            Carbon Project Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              CER Project
              <InfoTooltip text="Clean Energy Regulator project registration number under the ACCU Scheme (formerly ERF)." />
            </p>
            <p className="font-medium">ERF1234567</p>
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Methodology
              <InfoTooltip text="Carbon Credits (Carbon Farming Initiative—Savanna Fire Management—Emissions Avoidance) Methodology Determination 2018. Credits EDS burning that reduces CH₄ and N₂O emissions." />
            </p>
            <p className="font-medium">Emissions Avoidance (2018)</p>
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Crediting Period
              <InfoTooltip text="The 25-year window during which the project can earn ACCUs. After expiry, must re-register." />
            </p>
            <p className="font-medium">2015 – 2040 (25 yr)</p>
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Permanence
              <InfoTooltip text="Risk-of-reversal discount. 25% deduction for 25-year permanence obligation; 5% for 100-year." />
            </p>
            <Badge variant="outline">25% discount (25yr)</Badge>
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Baseline Period
              <InfoTooltip text="Pre-project fire history used to calculate baseline emissions. 10 years for high rainfall (>1000mm), 15 years for low rainfall (600-1000mm)." />
            </p>
            <p className="font-medium">2005–2014 (10 yr)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className="bg-green-600">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total ACCUs Issued"
          value={totalACCUs.toLocaleString()}
          icon={<Leaf className="h-4 w-4 text-green-500" />}
          detail={`${issuedPeriods.length} reporting periods`}
          tooltip="Australian Carbon Credit Units issued under the ACCU Scheme. One ACCU = one tonne CO₂-e avoided."
        />
        <SummaryCard
          label="Latest Period"
          value={latestIssued.accus_issued.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          detail={latestIssued.period}
        />
        <SummaryCard
          label="Total Revenue"
          value={`$${(totalRevenue / 1000000).toFixed(2)}M`}
          icon={<DollarSign className="h-4 w-4 text-amber-500" />}
          detail="Completed sales"
          tooltip="Total revenue from ACCU sales (government contracts + voluntary market)."
        />
        <SummaryCard
          label="Baseline Avg."
          value={`${(baselineAvg / 1000).toFixed(1)}k`}
          icon={<BarChart3 className="h-4 w-4 text-red-400" />}
          detail="tCO₂-e / year"
          tooltip="Average annual baseline emissions calculated from 10-year pre-project fire history (2005-2014)."
        />
        <SummaryCard
          label="ACCU Price"
          value="$36.00"
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          detail="Current market (AUD)"
          tooltip="Spot market price per ACCU. Indigenous fire management ACCUs attract ~42% premium over market."
        />
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="periods" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="periods">Reporting Periods</TabsTrigger>
          <TabsTrigger value="emissions">Emissions</TabsTrigger>
          <TabsTrigger value="baseline">Baseline</TabsTrigger>
          <TabsTrigger value="accus">ACCU Trend</TabsTrigger>
          <TabsTrigger value="sales">Sales &amp; Revenue</TabsTrigger>
          <TabsTrigger value="table3">CFI Table 3</TabsTrigger>
          <TabsTrigger value="table9">CFI Table 9</TabsTrigger>
        </TabsList>

        {/* ── Reporting Periods ── */}
        <TabsContent value="periods">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ACCU Reporting Periods
              </CardTitle>
              <Button size="sm" onClick={() => setShowNewPeriod(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Period
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Project</TableHead>
                    <TableHead className="text-right">Abatement</TableHead>
                    <TableHead className="text-right">ACCUs</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>SavBAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accuPeriods.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedPeriod(p)}
                    >
                      <TableCell className="font-medium">{p.period}</TableCell>
                      <TableCell className="text-right text-red-500">
                        {p.baseline_emissions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-500">
                        {p.project_emissions > 0
                          ? p.project_emissions.toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {p.gross_abatement > 0
                          ? p.gross_abatement.toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {p.accus_issued > 0
                          ? p.accus_issued.toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${p.accu_price.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.revenue > 0
                          ? `$${(p.revenue / 1000).toFixed(0)}k`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <PeriodStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.savbat_ref ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right text-green-600">
                      {accuPeriods
                        .reduce((s, p) => s + p.gross_abatement, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalACCUs.toLocaleString()}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      $
                      {(
                        accuPeriods.reduce((s, p) => s + p.revenue, 0) / 1000000
                      ).toFixed(2)}
                      M
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Emissions Abatement ── */}
        <TabsContent value="emissions">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Baseline vs Project Emissions (tCO₂-e)
                  <InfoTooltip text="Baseline = average annual emissions from pre-project fire history. Project = actual emissions during managed burning. The gap is the net abatement." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={emissionsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      name="Baseline"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="project"
                      name="Project"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="abatement"
                      name="Abatement"
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Emissions by Gas (tCO₂-e)
                  <InfoTooltip text="CH₄ (methane, GWP=25) and N₂O (nitrous oxide, GWP=298) are the two greenhouse gases credited under the savanna burning methodology." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={emissionsByGas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="ch4_baseline"
                      name="CH₄ Baseline"
                      fill="#fca5a5"
                      stackId="baseline"
                    />
                    <Bar
                      dataKey="n2o_baseline"
                      name="N₂O Baseline"
                      fill="#ef4444"
                      stackId="baseline"
                    />
                    <Bar
                      dataKey="ch4_project"
                      name="CH₄ Project"
                      fill="#93c5fd"
                      stackId="project"
                    />
                    <Bar
                      dataKey="n2o_project"
                      name="N₂O Project"
                      fill="#3b82f6"
                      stackId="project"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Baseline Calculation ── */}
        <TabsContent value="baseline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Baseline Emissions — Pre-Project Fire History (2005–2014)
                <InfoTooltip text="10-year pre-project fire history used to calculate baseline emissions. For high-rainfall zones (>1000mm), the baseline period is 10 years. The average annual emissions from this period becomes the baseline against which project performance is measured." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    Baseline Average
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {baselineAvg.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    tCO₂-e per year
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    Mean Area Burnt (baseline)
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      baselineYears.reduce(
                        (s, y) => s + y.total_area_burnt_ha,
                        0
                      ) / baselineYears.length
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">ha / year</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    Mean LDS % (baseline)
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {Math.round(
                      (baselineYears.reduce((s, y) => s + y.lds_ha, 0) /
                        baselineYears.reduce(
                          (s, y) => s + y.total_area_burnt_ha,
                          0
                        )) *
                        100
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of total area burnt
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">
                      Total Burnt (ha)
                    </TableHead>
                    <TableHead className="text-right">EDS (ha)</TableHead>
                    <TableHead className="text-right">LDS (ha)</TableHead>
                    <TableHead className="text-right">
                      CH₄ (tCO₂-e)
                    </TableHead>
                    <TableHead className="text-right">
                      N₂O (tCO₂-e)
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      Total (tCO₂-e)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baselineYears.map((y) => (
                    <TableRow key={y.year}>
                      <TableCell className="font-medium">{y.year}</TableCell>
                      <TableCell className="text-right">
                        {y.total_area_burnt_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-500">
                        {y.eds_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        {y.lds_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {y.ch4_tco2e.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {y.n2o_tco2e.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {y.total_tco2e.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Average</TableCell>
                    <TableCell className="text-right">
                      {Math.round(
                        baselineYears.reduce(
                          (s, y) => s + y.total_area_burnt_ha,
                          0
                        ) / baselineYears.length
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-blue-500">
                      {Math.round(
                        baselineYears.reduce((s, y) => s + y.eds_ha, 0) /
                          baselineYears.length
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {Math.round(
                        baselineYears.reduce((s, y) => s + y.lds_ha, 0) /
                          baselineYears.length
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(
                        baselineYears.reduce((s, y) => s + y.ch4_tco2e, 0) /
                          baselineYears.length
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(
                        baselineYears.reduce((s, y) => s + y.n2o_tco2e, 0) /
                          baselineYears.length
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {baselineAvg.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACCU Trend ── */}
        <TabsContent value="accus">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  ACCUs Issued &amp; Price per Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={accuChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" unit="$" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="issued"
                      name="ACCUs Issued"
                      fill="#22c55e"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="price"
                      name="Price ($/ACCU)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Cumulative ACCUs Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative ACCUs"
                      fill="#22c55e"
                      fillOpacity={0.3}
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sales & Revenue ── */}
        <TabsContent value="sales">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  ACCU Sales Register
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">$/ACCU</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accuSales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">
                          {new Date(s.date).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {s.buyer}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${s.price_per_accu.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${s.total_aud.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {s.contract_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <SaleStatusBadge status={s.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {accuSales
                          .reduce((s, r) => s + r.quantity, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        $
                        {accuSales
                          .reduce((s, r) => s + r.total_aud, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={revenueByBuyer}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="total"
                      nameKey="type"
                      label={({ name, value }) =>
                        `${name}: $${(Number(value) / 1000).toFixed(0)}k`
                      }
                    >
                      {revenueByBuyer.map((_, i) => (
                        <Cell
                          key={i}
                          fill={BUYER_COLORS[i % BUYER_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `$${Number(value).toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {revenueByBuyer.map((b, i) => (
                    <div
                      key={b.type}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              BUYER_COLORS[i % BUYER_COLORS.length],
                          }}
                        />
                        <span>{b.type}</span>
                      </div>
                      <span className="font-medium">
                        {b.count.toLocaleString()} ACCUs
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CFI Table 3 ── */}
        <TabsContent value="table3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CFI Table 3 — Fire Scar Area by Vegetation Class &amp; Season
                <InfoTooltip text="Required under the CFI methodology. Shows the area burnt within each vegetation fuel type, split by EDS and LDS. This data feeds directly into the SavBAT emissions calculator." />
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportTable3CSV(cfiTable3Data)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vegetation Class</TableHead>
                    <TableHead className="text-right">Code</TableHead>
                    <TableHead className="text-right">
                      Total Area (ha)
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-blue-600">EDS (ha)</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-blue-600">EDS %</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-red-600">LDS (ha)</span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="text-red-600">LDS %</span>
                    </TableHead>
                    <TableHead className="text-right">Total Burnt</TableHead>
                    <TableHead className="text-right">Unburnt (ha)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfiTable3Data.map((row) => (
                    <TableRow key={row.veg_code}>
                      <TableCell className="font-medium">
                        {row.veg_class}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.veg_code}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.total_area_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {row.eds_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {row.eds_pct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {row.lds_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {row.lds_pct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.total_ha.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.unburnt_ha.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      {cfiTable3Data
                        .reduce((s, r) => s + r.total_area_ha, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {cfiTable3Data
                        .reduce((s, r) => s + r.eds_ha, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right text-red-600">
                      {cfiTable3Data
                        .reduce((s, r) => s + r.lds_ha, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      {cfiTable3Data
                        .reduce((s, r) => s + r.total_ha, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cfiTable3Data
                        .reduce((s, r) => s + r.unburnt_ha, 0)
                        .toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CFI Table 9 ── */}
        <TabsContent value="table9">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CFI Table 9 — Fuel Age Distribution by Vegetation Class (%)
                <InfoTooltip text="Pixel counts by years-since-last-burn per vegetation class. Required for the sequestration methodology to calculate dead organic matter carbon storage. Source: NAFI fire scar analysis." />
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportTable9CSV(cfiTable9Data)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vegetation Class</TableHead>
                    <TableHead className="text-right">Code</TableHead>
                    <TableHead className="text-right">0 yr</TableHead>
                    <TableHead className="text-right">1 yr</TableHead>
                    <TableHead className="text-right">2 yr</TableHead>
                    <TableHead className="text-right">3 yr</TableHead>
                    <TableHead className="text-right">4 yr</TableHead>
                    <TableHead className="text-right">5+ yr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfiTable9Data.map((row) => (
                    <TableRow key={row.veg_code}>
                      <TableCell className="font-medium">
                        {row.veg_class}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.veg_code}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_0}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_1}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_2}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_3}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_4}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.age_5_plus}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Values show percentage of each vegetation class area by
                years-since-last-burn. Source: NAFI fire scar analysis.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Methodology reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Emissions Calculation Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg bg-muted p-4 font-mono text-xs">
            <p className="font-bold">
              Net Abatement = Baseline Emissions - Project Emissions -
              Uncertainty Buffer
            </p>
            <p className="mt-2">
              ACCUs Issued = Net Abatement &times; (1 - Permanence Discount)
            </p>
            <p className="mt-3 border-t pt-2">
              Per-gas: E = A &times; (1 - P) &times; FL &times; BE &times; EF
            </p>
            <p className="mt-1 text-muted-foreground">
              A = Area burnt | P = Patchiness | FL = Fuel load | BE = Burn
              efficiency | EF = Emission factor
            </p>
            <p className="mt-1 text-muted-foreground">
              CH₄ GWP = 25 | N₂O GWP = 298 | Applied separately per vegetation
              fuel type
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline">CH₄ GWP = 25</Badge>
            <Badge variant="outline">N₂O GWP = 298</Badge>
            <Badge variant="outline">9 vegetation fuel types</Badge>
            <Badge variant="outline">
              Baseline: 10yr (high) / 15yr (low)
            </Badge>
            <Badge variant="outline">Permanence: 25% (25yr)</Badge>
            <Badge variant="outline">Reporting: every 2 years</Badge>
            <Badge variant="outline">SavBAT v3 required</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Period detail dialog */}
      {selectedPeriod && (
        <PeriodDetailDialog
          period={selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
        />
      )}

      {/* New period dialog */}
      {showNewPeriod && (
        <NewPeriodDialog onClose={() => setShowNewPeriod(false)} />
      )}
    </div>
  );
}

// ─── Period Detail Dialog ──────────────────────────────────────────

function PeriodDetailDialog({
  period,
  onClose,
}: {
  period: AccuPeriod;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reporting Period: {period.period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{period.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium">{period.end_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Baseline Emissions
              </p>
              <p className="font-medium text-red-500">
                {period.baseline_emissions.toLocaleString()} tCO₂-e
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Project Emissions
              </p>
              <p className="font-medium text-blue-500">
                {period.project_emissions > 0
                  ? `${period.project_emissions.toLocaleString()} tCO₂-e`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Abatement</p>
              <p className="font-medium text-green-600">
                {period.gross_abatement > 0
                  ? `${period.gross_abatement.toLocaleString()} tCO₂-e`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Uncertainty Buffer
              </p>
              <p className="font-medium">
                {period.uncertainty_buffer > 0
                  ? `${period.uncertainty_buffer.toLocaleString()} tCO₂-e`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Permanence Discount
              </p>
              <p className="font-medium">
                {(period.permanence_discount * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ACCUs Issued</p>
              <p className="text-lg font-bold">
                {period.accus_issued > 0
                  ? period.accus_issued.toLocaleString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ACCU Price</p>
              <p className="font-medium">${period.accu_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="font-medium">
                {period.revenue > 0
                  ? `$${period.revenue.toLocaleString()}`
                  : "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <PeriodStatusBadge status={period.status} />
          </div>
          {period.submitted_date && (
            <div>
              <p className="text-xs text-muted-foreground">Submitted to CER</p>
              <p className="text-sm">{period.submitted_date}</p>
            </div>
          )}
          {period.savbat_ref && (
            <div>
              <p className="text-xs text-muted-foreground">SavBAT Reference</p>
              <p className="text-sm font-mono">{period.savbat_ref}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm">{period.notes}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Period Dialog ─────────────────────────────────────────────

function NewPeriodDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Reporting Period</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period Name</Label>
              <Input placeholder="e.g. 2025-26" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="draft">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Baseline Emissions (tCO₂-e)</Label>
              <Input type="number" defaultValue={45000} />
            </div>
            <div className="space-y-1.5">
              <Label>Project Emissions (tCO₂-e)</Label>
              <Input type="number" placeholder="From SavBAT" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SavBAT Reference</Label>
            <Input placeholder="e.g. SB-2026-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Period notes..." rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>Create Period</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper Components ─────────────────────────────────────────────

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
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodStatusBadge({
  status,
}: {
  status: AccuPeriod["status"];
}) {
  switch (status) {
    case "issued":
      return (
        <Badge className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Issued
        </Badge>
      );
    case "approved":
      return (
        <Badge className="gap-1 bg-blue-600">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case "under_review":
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
          <Clock className="h-3 w-3" />
          Review
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <Send className="h-3 w-3" />
          Submitted
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          Draft
        </Badge>
      );
  }
}

function SaleStatusBadge({
  status,
}: {
  status: "completed" | "pending" | "contracted";
}) {
  if (status === "completed") {
    return (
      <Badge className="gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Done
      </Badge>
    );
  }
  if (status === "contracted") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
        <FileText className="h-3 w-3" />
        Contracted
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}
