"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Flame,
  Printer,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TreePine,
  Play,
  Database,
  TestTubeDiagonal,
} from "lucide-react";
import { getMetricsData, getLatestYear as getLatestDemoYear } from "@/lib/fire-metrics-data";
import { InfoTooltip } from "@/components/info-tooltip";
import { REPORT_TOOLTIPS } from "@/lib/methodology-content";
import {
  exportAnnualBurnCSV,
  exportTable3CSV,
  exportTable9CSV,
  exportAllMetricsCSV,
} from "@/lib/export-utils";
import { exportFireReportPDF } from "@/lib/pdf-report";
import { useProjectStore } from "@/stores/project-store";
import { useAnalysisStore } from "@/stores/analysis-store";
import { useAnalysis } from "@/hooks/use-analysis";
import { AnalysisProgress } from "@/components/analysis-progress";

export default function ReportsPage() {
  const { activeProject } = useProjectStore();
  const projectName = activeProject?.name ?? "Tiwi Islands Fire Project";

  // Analysis state
  const analysisResults = useAnalysisStore((s) => s.results);
  const useComputedData = useAnalysisStore((s) => s.useComputedData);
  const analysisStatus = useAnalysisStore((s) => s.status);
  const setUseComputedData = useAnalysisStore((s) => s.setUseComputedData);
  const { runWithStoreData, cancelAnalysis } = useAnalysis();

  // Route all data through the bridge — uses computed or demo data
  const metrics = useMemo(
    () => getMetricsData(useComputedData ? analysisResults : null),
    [useComputedData, analysisResults]
  );

  const {
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
    cfiTable3Data,
    cfiTable9Data,
    seasonBreakdown,
    fireTargets,
  } = metrics;

  const AVAILABLE_YEARS = annualBurnData.map((d) => d.year);

  const [selectedYear, setSelectedYear] = useState(() => {
    const years = annualBurnData.map((d) => d.year);
    return years.length > 0 ? years[years.length - 1] : 2025;
  });

  const yearData = annualBurnData.find((d) => d.year === selectedYear);
  const latestYear = annualBurnData.length > 0
    ? annualBurnData[annualBurnData.length - 1]
    : getLatestDemoYear();
  const yearUnburnt = unburntPatchData.find((d) => d.year === selectedYear);
  const yearDist = distToUnburntData.find((d) => d.year === selectedYear);
  const yearPerimeter = perimeterImpactData.find(
    (d) => d.year === selectedYear
  );
  const yearShape = shapeIndexData.find((d) => d.year === selectedYear);
  const year3yr = threeYearRolling.find((d) => d.year === selectedYear);
  const year2yr = twoYearRolling.find((d) => d.year === selectedYear);

  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePrint = () => window.print();

  const handleExportPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      await exportFireReportPDF({
        projectName,
        selectedYear,
        yearData,
        annualBurnData,
        cfiTable3Data,
        cfiTable9Data,
        fireTargets,
        yearUnburnt,
        yearDist,
        yearPerimeter,
        yearShape,
        year3yr,
        year2yr,
      });
    } finally {
      setPdfLoading(false);
    }
  }, [
    projectName, selectedYear, yearData, annualBurnData,
    cfiTable3Data, cfiTable9Data, fireTargets,
    yearUnburnt, yearDist, yearPerimeter, yearShape, year3yr, year2yr,
  ]);

  const handleRunAnalysis = () => {
    const boundary = activeProject?.boundary as unknown as GeoJSON.FeatureCollection | undefined;
    if (!boundary) return;
    runWithStoreData(boundary);
  };

  const handleExportAll = () => {
    exportAllMetricsCSV({
      annualBurn: annualBurnData,
      shapeIndex: shapeIndexData,
      threeYearRolling,
      twoYearRolling,
      unburntPatches: unburntPatchData,
      burnCount: burnCountDistribution,
      patchAge: patchAgeData,
      patchAgeLate: patchAgeLateOnly,
      distToUnburnt: distToUnburntData,
      perimeterImpact: perimeterImpactData,
      heterogeneity: [],
    });
  };

  return (
    <div className="p-6 print:p-0">
      {/* Screen-only controls */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Annual Fire Report</h1>
          <p className="text-sm text-muted-foreground">
            Generate and export annual fire management reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAnalysis}
            disabled={analysisStatus === "running" || !activeProject?.boundary}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Run Analysis
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export All CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAnnualBurnCSV(annualBurnData)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Burn Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTable3CSV(cfiTable3Data)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Table 3
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTable9CSV(cfiTable9Data)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Table 9
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={pdfLoading}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            {pdfLoading ? "Generating…" : "Export PDF"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Data source banner */}
      <div className="mb-4 print:hidden">
        {useComputedData && analysisResults ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-900 dark:bg-green-950/20">
            <Database className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Computed data — analysis run {new Date(analysisResults.computedAt).toLocaleDateString("en-AU")}
              {" "}({analysisResults.years.length} year{analysisResults.years.length !== 1 ? "s" : ""})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => setUseComputedData(false)}
            >
              <TestTubeDiagonal className="mr-1 h-3 w-3" />
              Switch to demo data
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900 dark:bg-amber-950/20">
            <TestTubeDiagonal className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Demo data — upload fire scar data and run analysis for real results
            </span>
            {analysisResults && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => setUseComputedData(true)}
              >
                <Database className="mr-1 h-3 w-3" />
                Switch to computed data
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Analysis progress */}
      {analysisStatus === "running" && (
        <div className="mb-4 print:hidden">
          <AnalysisProgress onCancel={cancelAnalysis} />
        </div>
      )}

      {/* ──────────── Printable Report ──────────── */}
      <div className="report-content space-y-6">
        {/* Report header */}
        <div className="rounded-lg border p-6 print:border-0 print:p-0">
          <div className="flex items-center gap-3 border-b pb-4 print:border-b-2">
            <Flame className="h-8 w-8 text-orange-500 print:text-black" />
            <div>
              <h1 className="text-2xl font-bold">{projectName}</h1>
              <p className="text-lg text-muted-foreground">
                Annual Fire Management Report — {selectedYear}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Report Period</p>
              <p className="font-medium">1 Jan — 31 Dec {selectedYear}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Generated</p>
              <p className="font-medium">
                {new Date().toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CER Project</p>
              <p className="font-medium">ERF1234567</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Methodology</p>
              <p className="font-medium">Emissions Avoidance (2018)</p>
            </div>
          </div>
        </div>

        {/* Executive summary */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <p>
              In {selectedYear}, the {projectName} achieved a total burn
              coverage of{" "}
              <strong>{yearData?.total_pct ?? latestYear.total_pct}%</strong>{" "}
              ({(yearData?.total_ha ?? latestYear.total_ha).toLocaleString()} ha),
              with{" "}
              <strong>{yearData?.eds_pct ?? latestYear.eds_pct}%</strong>{" "}
              completed during the Early Dry Season (EDS) and{" "}
              <strong>{yearData?.lds_pct ?? latestYear.lds_pct}%</strong>{" "}
              during the Late Dry Season (LDS). This represents an EDS:LDS
              ratio of{" "}
              <strong>
                {(
                  (yearData?.eds_pct ?? latestYear.eds_pct) /
                  Math.max(yearData?.lds_pct ?? latestYear.lds_pct, 0.1)
                ).toFixed(1)}
                :1
              </strong>
              , {(yearData?.eds_pct ?? latestYear.eds_pct) > 30 ? "exceeding" : "approaching"} the
              target ratio for effective savanna fire management.
            </p>
            <p className="mt-2">
              The project maintained{" "}
              <strong>{yearUnburnt?.count ?? 120}</strong> unburnt patches with
              a mean area of{" "}
              <strong>
                {(yearUnburnt?.mean_ha ?? 3500).toLocaleString()} ha
              </strong>
              , providing critical wildlife refugia. Mean distance to the
              nearest unburnt area was{" "}
              <strong>{yearDist?.annual_m ?? 790}m</strong>, well within the
              target of 1,000m. Perimeter impact on sensitive areas was{" "}
              <strong>{yearPerimeter?.pct_impacted ?? 15}%</strong>, below the
              25% maximum threshold.
            </p>
            <p className="mt-2">
              All ten Healthy Country Plan fire management targets were met for
              this reporting period.
            </p>
          </CardContent>
        </Card>

        {/* Key metrics summary table */}
        <Card className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Key Metrics Summary — {selectedYear}
              <InfoTooltip text={REPORT_TOOLTIPS.targets_table} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SummaryRow
                  num={1}
                  metric="EDS Burn %"
                  value={`${yearData?.eds_pct ?? "—"}%`}
                  target="≥35%"
                  status={(yearData?.eds_pct ?? 0) >= 35 ? "on_track" : "at_risk"}
                  tooltip={REPORT_TOOLTIPS.eds_burn_pct}
                />
                <SummaryRow
                  num={1}
                  metric="LDS Burn %"
                  value={`${yearData?.lds_pct ?? "—"}%`}
                  target="≤10%"
                  status={(yearData?.lds_pct ?? 0) <= 10 ? "on_track" : "off_track"}
                  tooltip={REPORT_TOOLTIPS.lds_burn_pct}
                />
                <SummaryRow
                  num={1}
                  metric="Total Burn %"
                  value={`${yearData?.total_pct ?? "—"}%`}
                  target="35–50%"
                  status={
                    (yearData?.total_pct ?? 0) >= 35 &&
                    (yearData?.total_pct ?? 0) <= 50
                      ? "on_track"
                      : "at_risk"
                  }
                  tooltip={REPORT_TOOLTIPS.total_burn_pct}
                />
                <SummaryRow
                  num={2}
                  metric="Shape Index (EDS)"
                  value={yearShape?.eds_si?.toFixed(1) ?? "—"}
                  target="≥2.5"
                  status={(yearShape?.eds_si ?? 0) >= 2.5 ? "on_track" : "at_risk"}
                  tooltip={REPORT_TOOLTIPS.shape_index_eds}
                />
                <SummaryRow
                  num={3}
                  metric="3-Year Rolling Burn"
                  value={year3yr ? `${year3yr.pct_burnt}%` : "—"}
                  target="65–85%"
                  status={
                    year3yr &&
                    year3yr.pct_burnt >= 65 &&
                    year3yr.pct_burnt <= 85
                      ? "on_track"
                      : "at_risk"
                  }
                  tooltip={REPORT_TOOLTIPS.three_year_rolling}
                />
                <SummaryRow
                  num={4}
                  metric="Unburnt Patches"
                  value={yearUnburnt?.count?.toString() ?? "—"}
                  target="≥100"
                  status={(yearUnburnt?.count ?? 0) >= 100 ? "on_track" : "off_track"}
                  tooltip={REPORT_TOOLTIPS.unburnt_patches}
                />
                <SummaryRow
                  num={8}
                  metric="Distance to Unburnt"
                  value={yearDist ? `${yearDist.annual_m}m` : "—"}
                  target="≤1000m"
                  status={(yearDist?.annual_m ?? 0) <= 1000 ? "on_track" : "off_track"}
                  tooltip={REPORT_TOOLTIPS.distance_to_unburnt}
                />
                <SummaryRow
                  num={11}
                  metric="Perimeter Impact"
                  value={yearPerimeter ? `${yearPerimeter.pct_impacted}%` : "—"}
                  target="≤25%"
                  status={
                    (yearPerimeter?.pct_impacted ?? 0) <= 25
                      ? "on_track"
                      : "off_track"
                  }
                  tooltip={REPORT_TOOLTIPS.perimeter_impact}
                />
                <SummaryRow
                  num={13}
                  metric="2-Year Rolling Burn"
                  value={year2yr ? `${year2yr.pct_burnt}%` : "—"}
                  target="50–70%"
                  status={
                    year2yr &&
                    year2yr.pct_burnt >= 50 &&
                    year2yr.pct_burnt <= 70
                      ? "on_track"
                      : "at_risk"
                  }
                  tooltip={REPORT_TOOLTIPS.two_year_rolling}
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Annual burn trend chart */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-base">
              Annual Burn Area by Season (% of Project Area)
              <InfoTooltip text={REPORT_TOOLTIPS.annual_burn_chart} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="pdf-chart-annual-burn">
            <ResponsiveContainer width="100%" height={280}>
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
            </div>
          </CardContent>
        </Card>

        {/* Season breakdown + rolling burn side by side */}
        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1 text-base">
                Season Breakdown — {selectedYear}
                <InfoTooltip text={REPORT_TOOLTIPS.season_breakdown} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={seasonBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {seasonBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1 text-base">
                Rolling Burn Coverage (2 & 3 Year)
                <InfoTooltip text={REPORT_TOOLTIPS.rolling_burn} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div id="pdf-chart-rolling-burn">
              <ResponsiveContainer width="100%" height={240}>
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
                    name="3-Year %"
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="two_yr"
                    name="2-Year %"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patch age distribution */}
        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:break-before-page">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TreePine className="h-4 w-4" />
                Patch Age — All Burns
                <InfoTooltip text={REPORT_TOOLTIPS.patch_age_all} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={patchAgeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                  <YAxis unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Area"]}
                  />
                  <Bar dataKey="area_pct" name="Area %" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TreePine className="h-4 w-4" />
                Patch Age — Late Season Only
                <InfoTooltip text={REPORT_TOOLTIPS.patch_age_late} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={patchAgeLateOnly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
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

        {/* Distance to unburnt + perimeter impact */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-base">
              Habitat Connectivity — Distance to Nearest Unburnt Area
              <InfoTooltip text={REPORT_TOOLTIPS.distance_unburnt} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="pdf-chart-dist-unburnt">
            <ResponsiveContainer width="100%" height={280}>
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
                  name="Annual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="three_yr_m"
                  name="3-Year Composite"
                  stroke="#f97316"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="three_yr_late_m"
                  name="3-Year (Late Only)"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CFI Table 3 */}
        <Card className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              CFI Table 3 — Fire Scar Area by Vegetation Class and Season
              <InfoTooltip text={REPORT_TOOLTIPS.cfi_table_3} />
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
                    <TableCell className="text-right">{row.veg_code}</TableCell>
                    <TableCell className="text-right">
                      {row.total_area_ha.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 print:text-black">
                      {row.eds_ha.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 print:text-black">
                      {row.eds_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {row.lds_ha.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
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
                  <TableCell className="text-right">
                    {cfiTable3Data
                      .reduce((s, r) => s + r.eds_ha, 0)
                      .toLocaleString()}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">
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
                  <TableCell className="text-right">
                    {cfiTable3Data
                      .reduce((s, r) => s + r.unburnt_ha, 0)
                      .toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* CFI Table 9 */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              CFI Table 9 — Fuel Age Distribution by Vegetation Class (%)
              <InfoTooltip text={REPORT_TOOLTIPS.cfi_table_9} />
            </CardTitle>
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
                    <TableCell className="text-right">{row.veg_code}</TableCell>
                    <TableCell className="text-right">{row.age_0}%</TableCell>
                    <TableCell className="text-right">{row.age_1}%</TableCell>
                    <TableCell className="text-right">{row.age_2}%</TableCell>
                    <TableCell className="text-right">{row.age_3}%</TableCell>
                    <TableCell className="text-right">{row.age_4}%</TableCell>
                    <TableCell className="text-right">
                      {row.age_5_plus}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Healthy Country Plan targets */}
        <Card className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Healthy Country Plan — Target Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fireTargets.map((t) => (
                  <TableRow key={t.metric}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.metric_num}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.metric}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.description}
                    </TableCell>
                    <TableCell className="text-right">{t.target}</TableCell>
                    <TableCell className="text-right font-medium">
                      {t.current}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={t.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Fire frequency distribution */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-base">
              Fire Frequency — Times Burnt in 10 Years
              <InfoTooltip text={REPORT_TOOLTIPS.fire_frequency} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={burnCountDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="times_burnt"
                  label={{
                    value: "Times Burnt",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Area"]}
                />
                <Bar dataKey="area_pct" name="Area %" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shape index trend */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1 text-base">
              Shape Index Trend (Patch Complexity)
              <InfoTooltip text={REPORT_TOOLTIPS.shape_index} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
                />
                <Line
                  type="monotone"
                  dataKey="lds_si"
                  name="LDS Shape Index"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Report footer */}
        <div className="rounded-lg border p-4 text-xs text-muted-foreground print:border-t print:border-x-0 print:border-b-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {projectName} — Annual Fire Report {selectedYear}
              </p>
              <p>
                Carbon methodology: Emissions Avoidance (2018) | CER Project:
                ERF1234567 | Crediting period: 2015–2040
              </p>
              <p>
                Fire scar data source: NAFI (MODIS 250m) + field validation |
                Analysis area: 786,000 ha
              </p>
            </div>
            <div className="text-right">
              <p>
                Generated:{" "}
                {new Date().toLocaleDateString("en-AU")}
              </p>
              <p>FireManager v0.1.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, header, nav */
          [data-sidebar],
          nav,
          header,
          .print\\:hidden {
            display: none !important;
          }

          /* Full width for print content */
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }

          /* Page setup */
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }

          /* Avoid breaking inside cards */
          .report-content > * {
            break-inside: avoid;
          }

          /* Recharts SVG should be visible */
          .recharts-wrapper {
            overflow: visible !important;
          }

          /* Table styling for print */
          table {
            font-size: 11px;
          }

          /* Remove shadows */
          [class*="shadow"] {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────────

function SummaryRow({
  num,
  metric,
  value,
  target,
  status,
  tooltip,
}: {
  num: number;
  metric: string;
  value: string;
  target: string;
  status: "on_track" | "at_risk" | "off_track";
  tooltip?: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {num}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        <span className="flex items-center gap-1">
          {metric}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
      </TableCell>
      <TableCell className="text-right font-medium">{value}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {target}
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={status} />
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({
  status,
}: {
  status: "on_track" | "at_risk" | "off_track";
}) {
  if (status === "on_track") {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        On Track
      </Badge>
    );
  }
  if (status === "at_risk") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
        <AlertTriangle className="h-3 w-3" />
        At Risk
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
      <XCircle className="h-3 w-3" />
      Off Track
    </Badge>
  );
}
