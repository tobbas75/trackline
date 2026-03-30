"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Flame,
  TrendingDown,
  TreePine,
  Ruler,
  MapPin,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
} from "lucide-react";
import { useZoneStore } from "@/stores/zone-store";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  annualBurnData,
  shapeIndexData,
  threeYearRolling,
  twoYearRolling,
  unburntPatchData,
  burnCountDistribution,
  patchAgeData,
  patchAgeLateOnly,
  distToUnburntData,
  perimeterImpactData,
  heterogeneityData,
  seasonBreakdown,
  cfiTable3Data,
  cfiTable9Data,
  fireTargets,
  getLatestYear,
} from "@/lib/fire-metrics-data";

export default function DashboardPage() {
  const { activeZone } = useZoneStore();
  const latest = getLatestYear();
  const scopeLabel = activeZone ? activeZone.name : "Entire Project";
  const latestUnburnt = unburntPatchData[unburntPatchData.length - 1];
  const latestDist = distToUnburntData[distToUnburntData.length - 1];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fire Metrics Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              15 core fire activity metrics — {latest.year} data
            </p>
            {activeZone && (
              <Badge
                variant="secondary"
                className="gap-1"
                style={{ borderColor: activeZone.color ?? undefined }}
              >
                <MapPin className="h-3 w-3" />
                {activeZone.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{scopeLabel}</Badge>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top summary cards — Metrics 1, 2, 3, 4 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Annual Burn %"
          value={`${latest.total_pct}%`}
          sub={`${latest.total_ha.toLocaleString()} ha`}
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          metric="1"
          tooltip="Total percentage of the project area burnt this year (EDS + LDS)."
        />
        <MetricCard
          title="EDS : LDS Ratio"
          value={`${latest.eds_pct}% : ${latest.lds_pct}%`}
          sub={`${(latest.eds_pct / Math.max(latest.lds_pct, 0.1)).toFixed(1)}:1 ratio`}
          icon={<Flame className="h-4 w-4 text-blue-500" />}
          metric="1"
          tooltip="Ratio of early to late season burning. Higher is better — indicates more strategic, low-intensity management."
        />
        <MetricCard
          title="Shape Index"
          value={shapeIndexData[shapeIndexData.length - 1].eds_si.toFixed(1)}
          sub="EDS mean patch compactness"
          icon={<TreePine className="h-4 w-4 text-green-500" />}
          metric="2"
          tooltip="SI = Perimeter / (2√πArea). Higher values = more complex, patchy burns (better for biodiversity)."
        />
        <MetricCard
          title="3-Year Rolling"
          value={`${threeYearRolling[threeYearRolling.length - 1].pct_burnt}%`}
          sub="Cumulative 3yr burn"
          icon={<TreePine className="h-4 w-4 text-emerald-500" />}
          metric="3"
          tooltip="Cumulative burn coverage over a 3-year window. Ensures all areas are treated at least once every 3–5 years."
        />
      </div>

      {/* Second row — Metrics 4, 5, 6, 8 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Unburnt Patches"
          value={latestUnburnt.count.toString()}
          sub={`Mean: ${latestUnburnt.mean_ha.toLocaleString()} ha`}
          icon={<TreePine className="h-4 w-4 text-emerald-500" />}
          metric="4"
          tooltip="Number and average size of unburnt areas. Wildlife refuges that also accumulate fuel."
        />
        <MetricCard
          title="Mean Patch Age"
          value="2.1 yr"
          sub="Years since last burn"
          icon={<TreePine className="h-4 w-4 text-lime-500" />}
          metric="6"
          tooltip="Average time since each area was last burnt. Longer = higher fuel loads."
        />
        <MetricCard
          title="Dist. to Unburnt"
          value={`${latestDist.annual_m}m`}
          sub="Mean Euclidean distance"
          icon={<Ruler className="h-4 w-4 text-indigo-500" />}
          metric="8"
          tooltip="Average distance from burnt areas to nearest unburnt refuge. Indicates habitat connectivity."
        />
        <MetricCard
          title="Perimeter Impact"
          value={`${perimeterImpactData[perimeterImpactData.length - 1].pct_impacted}%`}
          sub="Sensitive area exposure"
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          metric="11"
          tooltip="Percentage of sensitive area (rainforest, riparian) perimeters adjacent to recently burnt land."
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="trend">Burn Trend</TabsTrigger>
          <TabsTrigger value="season">Season Split</TabsTrigger>
          <TabsTrigger value="patchage">Patch Age</TabsTrigger>
          <TabsTrigger value="rolling">Rolling Burn</TabsTrigger>
          <TabsTrigger value="frequency">Fire Frequency</TabsTrigger>
          <TabsTrigger value="distance">Dist. to Unburnt</TabsTrigger>
          <TabsTrigger value="shape">Shape Index</TabsTrigger>
          <TabsTrigger value="heterogeneity">Heterogeneity</TabsTrigger>
          <TabsTrigger value="table3">CFI Table 3</TabsTrigger>
          <TabsTrigger value="table9">CFI Table 9</TabsTrigger>
        </TabsList>

        {/* Metric 1: Annual burn trend */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Annual Burn Area by Season (%)
                <InfoTooltip text="Stacked bar chart showing the proportion of the project area burnt each year, split by Early Dry Season (EDS) and Late Dry Season (LDS). The goal is to maximise EDS burning and minimise LDS." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={annualBurnData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis unit="%" domain={[0, 60]} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}%`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="eds_pct"
                    name="EDS"
                    fill="#3b82f6"
                    stackId="a"
                  />
                  <Bar
                    dataKey="lds_pct"
                    name="LDS"
                    fill="#ef4444"
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Season breakdown pie */}
        <TabsContent value="season">
          <Card>
            <CardHeader>
              <CardTitle>Current Year Season Breakdown ({latest.year})</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={seasonBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {seasonBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics 6 & 7: Patch age */}
        <TabsContent value="patchage">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Patch Age — All Burns (Metric 6)
                  <InfoTooltip text="Distribution of the project area by years since last burn (any type). Shows the age structure of the landscape." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patchAgeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Area"]}
                    />
                    <Bar dataKey="area_pct" name="Area %" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Patch Age — Late Season Only (Metric 7)
                  <InfoTooltip text="Years since last LATE dry season burn. High values mean fewer destructive LDS fires — which is good." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patchAgeLateOnly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Area"]}
                    />
                    <Bar dataKey="area_pct" name="Area %" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Metrics 3 & 13: Rolling burn */}
        <TabsContent value="rolling">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                2-Year and 3-Year Rolling Burn % (Metrics 3 & 13)
                <InfoTooltip text="Cumulative burn coverage over 2-year and 3-year windows. Ensures all areas are treated regularly across the landscape." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={threeYearRolling.map((d, i) => ({
                    ...d,
                    two_yr: twoYearRolling[i]?.pct_burnt,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis unit="%" domain={[40, 90]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pct_burnt"
                    name="3-Year Rolling %"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="two_yr"
                    name="2-Year Rolling %"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metric 5: Fire frequency */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Fire Frequency — Times Burnt in 10 Years (Metric 5)
                <InfoTooltip text="Distribution of the project area by how many times each area has been burnt over the past 10 years. Indicates fire frequency patterns across the landscape." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={burnCountDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="times_burnt" label={{ value: "Times Burnt", position: "insideBottom", offset: -5 }} />
                  <YAxis unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Area"]}
                  />
                  <Bar dataKey="area_pct" name="Area %" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics 8-10: Distance to unburnt */}
        <TabsContent value="distance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Mean Distance to Nearest Unburnt Area (Metrics 8, 9, 10)
                <InfoTooltip text="Euclidean distance from burnt cells to nearest unburnt refuge. Measured annually, over 3-year composites, and excluding EDS-only burns. Lower = better habitat connectivity." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={distToUnburntData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis unit="m" />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}m`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="annual_m"
                    name="Annual (M8)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="three_yr_m"
                    name="3-Year (M9)"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="three_yr_late_m"
                    name="3-Year Late (M10)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metric 2: Shape index */}
        <TabsContent value="shape">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Shape Index by Season (Metric 2)
                <InfoTooltip text="Shape Index = Perimeter / (2 × √(π × Area)). SI=1 is a perfect circle. Higher values indicate more complex, patchy burn shapes — which is better for biodiversity (more edge habitat, fire refugia)." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={shapeIndexData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="eds_si"
                    name="EDS Shape Index"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lds_si"
                    name="LDS Shape Index"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metric 12: Heterogeneity */}
        <TabsContent value="heterogeneity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Heterogeneity Index — Multi-Scale (Metric 12)
                <InfoTooltip text="At different spatial scales (100m to 5km), what proportion of the landscape is classified as Unburnt, Mixed (partially burnt), or Burnt. Higher 'Mixed' values at fine scales indicate a more heterogeneous, patchy fire regime." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={heterogeneityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="scale_m"
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}km` : `${v}m`)}
                  />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(v) =>
                      `Scale: ${Number(v) >= 1000 ? `${Number(v) / 1000}km` : `${v}m`}`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="unburnt_pct"
                    name="Unburnt"
                    fill="#d1d5db"
                    stackId="a"
                  />
                  <Bar
                    dataKey="mixed_pct"
                    name="Mixed"
                    fill="#f59e0b"
                    stackId="a"
                  />
                  <Bar
                    dataKey="burnt_pct"
                    name="Burnt"
                    fill="#ef4444"
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metric 14: CFI Table 3 */}
        <TabsContent value="table3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                CFI Table 3 — Fire Scar Area by Vegetation Class × Season (Metric 14)
                <InfoTooltip text="Required for carbon reporting under the ACCU Scheme. Shows the burnt area (ha and %) for each vegetation fuel type, split by EDS and LDS. Used to calculate emissions per vegetation class." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vegetation Class</TableHead>
                    <TableHead className="text-right">Code</TableHead>
                    <TableHead className="text-right">Total Area (ha)</TableHead>
                    <TableHead className="text-right">EDS (ha)</TableHead>
                    <TableHead className="text-right">EDS %</TableHead>
                    <TableHead className="text-right">LDS (ha)</TableHead>
                    <TableHead className="text-right">LDS %</TableHead>
                    <TableHead className="text-right">Total Burnt (ha)</TableHead>
                    <TableHead className="text-right">Unburnt (ha)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfiTable3Data.map((row) => (
                    <TableRow key={row.veg_code}>
                      <TableCell className="font-medium">
                        {row.veg_class}
                      </TableCell>
                      <TableCell className="text-right">{row.veg_code}</TableCell>
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
                  {/* Totals row */}
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

        {/* Metric 15: CFI Table 9 */}
        <TabsContent value="table9">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                CFI Table 9 — Fuel Age Distribution by Vegetation Class (Metric 15)
                <InfoTooltip text="Pixel counts by years-since-last-burn per vegetation class. Required for carbon reporting — shows the age structure of fuel across the landscape. Used in emissions calculations for the sequestration methodology." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vegetation Class</TableHead>
                    <TableHead className="text-right">Code</TableHead>
                    <TableHead className="text-right">0 yr (%)</TableHead>
                    <TableHead className="text-right">1 yr (%)</TableHead>
                    <TableHead className="text-right">2 yr (%)</TableHead>
                    <TableHead className="text-right">3 yr (%)</TableHead>
                    <TableHead className="text-right">4 yr (%)</TableHead>
                    <TableHead className="text-right">5+ yr (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfiTable9Data.map((row) => (
                    <TableRow key={row.veg_code}>
                      <TableCell className="font-medium">
                        {row.veg_class}
                      </TableCell>
                      <TableCell className="text-right">{row.veg_code}</TableCell>
                      <TableCell className="text-right">{row.age_0}</TableCell>
                      <TableCell className="text-right">{row.age_1}</TableCell>
                      <TableCell className="text-right">{row.age_2}</TableCell>
                      <TableCell className="text-right">{row.age_3}</TableCell>
                      <TableCell className="text-right">{row.age_4}</TableCell>
                      <TableCell className="text-right">{row.age_5_plus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Targets comparison */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Healthy Country Plan Targets
            <InfoTooltip text="Comparison of current fire metrics against targets set in the Healthy Country Plan. Green = on track, Amber = at risk, Red = off track." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {fireTargets.map((t) => (
              <div
                key={t.metric}
                className="flex items-start gap-2 rounded-lg border p-3"
              >
                <StatusIcon status={t.status} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.metric}</p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-lg font-bold">{t.current}</span>
                    <span className="text-xs text-muted-foreground">
                      target: {t.target}
                    </span>
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    #{t.metric_num}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 15 metrics reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">All 15 Fire Activity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            {[
              "1. Annual Burn % (EDS/LDS/total)",
              "2. Shape Index (patch compactness)",
              "3. 3-Year Rolling Burn",
              "4. Unburnt Patch Stats (count/area)",
              "5. Burn Count (times burnt)",
              "6. Patch Age (years since burn)",
              "7. Patch Age - Late only",
              "8. Distance to Unburnt (annual)",
              "9. Distance to Unburnt (3-year)",
              "10. Distance to Unburnt (3yr, late)",
              "11. Perimeter Impact (%)",
              "12. Heterogeneity Index (multi-scale)",
              "13. Two-Year Rolling Burn",
              "14. CFI Table 3 (area by veg x season)",
              "15. CFI Table 9 (fuel age distribution)",
            ].map((metric, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {i + 1}
                </Badge>
                <span className="text-muted-foreground">
                  {metric.replace(/^\d+\.\s*/, "")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  icon,
  metric,
  tooltip,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  metric: string;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <div className="flex items-center gap-1.5">
          {icon}
          <Badge variant="outline" className="text-xs">
            #{metric}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: "on_track" | "at_risk" | "off_track" }) {
  if (status === "on_track") return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />;
  if (status === "at_risk") return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />;
  return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />;
}

function handleExportCSV() {
  const headers = [
    "Year",
    "EDS_ha",
    "LDS_ha",
    "Total_ha",
    "EDS_%",
    "LDS_%",
    "Total_%",
  ];
  const rows = annualBurnData.map((d) =>
    [d.year, d.eds_ha, d.lds_ha, d.total_ha, d.eds_pct, d.lds_pct, d.total_pct].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fire-metrics-annual-burn.csv";
  a.click();
  URL.revokeObjectURL(url);
}
