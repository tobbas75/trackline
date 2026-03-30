/**
 * PDF report generation for the Fire Management system.
 * Uses jsPDF for layout and jspdf-autotable for tables.
 * Charts are captured from the live DOM as SVG → canvas → PNG.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types matching reports/page.tsx data ──────────────────────────

interface AnnualBurnRow {
  year: number;
  eds_ha: number;
  lds_ha: number;
  total_ha: number;
  eds_pct: number;
  lds_pct: number;
  total_pct: number;
}

interface CfiTable3Row {
  veg_class: string;
  veg_code: number;
  total_area_ha: number;
  eds_ha: number;
  eds_pct: number;
  lds_ha: number;
  lds_pct: number;
  total_ha: number;
  unburnt_ha: number;
}

interface CfiTable9Row {
  veg_class: string;
  veg_code: number;
  age_0: number;
  age_1: number;
  age_2: number;
  age_3: number;
  age_4: number;
  age_5_plus: number;
}

interface FireTarget {
  metric_num: number;
  metric: string;
  description: string;
  target: string;
  current: string;
  status: "on_track" | "at_risk" | "off_track";
}

interface YearMetrics {
  eds_pct?: number;
  lds_pct?: number;
  total_pct?: number;
  total_ha?: number;
}

interface UnburntPatch {
  count?: number;
  mean_ha?: number;
}

interface DistToUnburnt {
  annual_m?: number;
}

interface PerimeterImpact {
  pct_impacted?: number;
}

interface ShapeIndex {
  eds_si?: number;
  lds_si?: number;
}

interface RollingBurn {
  pct_burnt?: number;
}

export interface FireReportData {
  projectName: string;
  selectedYear: number;
  yearData: YearMetrics | undefined;
  annualBurnData: AnnualBurnRow[];
  cfiTable3Data: CfiTable3Row[];
  cfiTable9Data: CfiTable9Row[];
  fireTargets: FireTarget[];
  yearUnburnt: UnburntPatch | undefined;
  yearDist: DistToUnburnt | undefined;
  yearPerimeter: PerimeterImpact | undefined;
  yearShape: ShapeIndex | undefined;
  year3yr: RollingBurn | undefined;
  year2yr: RollingBurn | undefined;
}

// ─── Chart capture ─────────────────────────────────────────────────

/**
 * Capture a recharts SVG inside a named container as a PNG data URL.
 * Returns null if the container or SVG is not found.
 */
async function captureChartById(id: string, width = 540, height = 220): Promise<string | null> {
  const container = document.getElementById(id);
  if (!container) return null;

  const svg = container.querySelector<SVGSVGElement>("svg");
  if (!svg) return null;

  // Clone so we can safely mutate
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Force explicit dimensions on the clone
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${svg.clientWidth || width} ${svg.clientHeight || height}`);
  }

  // White background
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "100%");
  rect.setAttribute("height", "100%");
  rect.setAttribute("fill", "white");
  clone.insertBefore(rect, clone.firstChild);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// ─── Colours ───────────────────────────────────────────────────────

const COLORS = {
  orange: [220, 90, 20] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  grey: [80, 80, 80] as [number, number, number],
  lightGrey: [200, 200, 200] as [number, number, number],
  green: [22, 128, 73] as [number, number, number],
  amber: [180, 120, 0] as [number, number, number],
  red: [180, 30, 30] as [number, number, number],
  headerBg: [245, 245, 245] as [number, number, number],
};

function statusColor(status: "on_track" | "at_risk" | "off_track"): [number, number, number] {
  if (status === "on_track") return COLORS.green;
  if (status === "at_risk") return COLORS.amber;
  return COLORS.red;
}

function statusLabel(status: "on_track" | "at_risk" | "off_track"): string {
  if (status === "on_track") return "On Track";
  if (status === "at_risk") return "At Risk";
  return "Off Track";
}

// ─── Main export function ──────────────────────────────────────────

export async function exportFireReportPDF(data: FireReportData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Cover page ──────────────────────────────────────────────────

  // Orange header bar
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, 0, pageW, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.projectName, margin, 20);

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(`Annual Fire Management Report — ${data.selectedYear}`, margin, 30);

  doc.setFontSize(10);
  doc.text("Savanna Burning Methodology | Carbon Farming Initiative", margin, 38);

  // Meta grid
  doc.setTextColor(...COLORS.grey);
  doc.setFontSize(9);
  const metaY = 52;
  const col = contentW / 4;

  const metaItems = [
    ["Report Period", `1 Jan – 31 Dec ${data.selectedYear}`],
    ["Generated", today],
    ["CER Project", "ERF1234567"],
    ["Methodology", "Emissions Avoidance (2018)"],
  ];
  metaItems.forEach(([label, value], i) => {
    const x = margin + i * col;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.grey);
    doc.text(label, x, metaY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.black);
    doc.text(value, x, metaY + 5);
  });

  // Divider
  doc.setDrawColor(...COLORS.lightGrey);
  doc.line(margin, metaY + 11, pageW - margin, metaY + 11);

  // Executive summary
  let y = metaY + 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text("Executive Summary", margin, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grey);

  const edsPct = data.yearData?.eds_pct ?? "—";
  const ldsPct = data.yearData?.lds_pct ?? "—";
  const totalPct = data.yearData?.total_pct ?? "—";
  const totalHa = (data.yearData?.total_ha ?? 0).toLocaleString();
  const patchCount = data.yearUnburnt?.count ?? "—";
  const meanHa = (data.yearUnburnt?.mean_ha ?? 0).toLocaleString();
  const distM = data.yearDist?.annual_m ?? "—";
  const perimPct = data.yearPerimeter?.pct_impacted ?? "—";

  const summary = [
    `In ${data.selectedYear}, the project achieved a total burn coverage of ${totalPct}% (${totalHa} ha),`,
    `with ${edsPct}% completed during the Early Dry Season (EDS) and ${ldsPct}% during the Late`,
    `Dry Season (LDS).`,
    "",
    `The project maintained ${patchCount} unburnt patches with a mean area of ${meanHa} ha,`,
    `providing critical wildlife refugia. Mean distance to the nearest unburnt area was ${distM} m,`,
    `and perimeter impact on sensitive areas was ${perimPct}%.`,
  ];
  summary.forEach((line) => {
    doc.text(line, margin, y);
    y += line === "" ? 3 : 4.5;
  });

  // ── Key Metrics table ───────────────────────────────────────────

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text(`Key Metrics Summary — ${data.selectedYear}`, margin, y);

  const summaryRows = [
    ["1", "EDS Burn %", `${edsPct}%`, "≥35%", (data.yearData?.eds_pct ?? 0) >= 35 ? "on_track" : "at_risk"],
    ["1", "LDS Burn %", `${ldsPct}%`, "≤10%", (data.yearData?.lds_pct ?? 0) <= 10 ? "on_track" : "off_track"],
    ["1", "Total Burn %", `${totalPct}%`, "35–50%", (v => v >= 35 && v <= 50 ? "on_track" : "at_risk")(data.yearData?.total_pct ?? 0)],
    ["2", "Shape Index (EDS)", data.yearShape?.eds_si?.toFixed(1) ?? "—", "≥2.5", (data.yearShape?.eds_si ?? 0) >= 2.5 ? "on_track" : "at_risk"],
    ["3", "3-Year Rolling Burn", data.year3yr?.pct_burnt ? `${data.year3yr.pct_burnt}%` : "—", "65–85%", (v => v >= 65 && v <= 85 ? "on_track" : "at_risk")(data.year3yr?.pct_burnt ?? 0)],
    ["4", "Unburnt Patches", patchCount.toString(), "≥100", (data.yearUnburnt?.count ?? 0) >= 100 ? "on_track" : "off_track"],
    ["8", "Distance to Unburnt", `${distM}m`, "≤1000m", (data.yearDist?.annual_m ?? 0) <= 1000 ? "on_track" : "off_track"],
    ["11", "Perimeter Impact", `${perimPct}%`, "≤25%", (data.yearPerimeter?.pct_impacted ?? 0) <= 25 ? "on_track" : "off_track"],
    ["13", "2-Year Rolling Burn", data.year2yr?.pct_burnt ? `${data.year2yr.pct_burnt}%` : "—", "50–70%", (v => v >= 50 && v <= 70 ? "on_track" : "at_risk")(data.year2yr?.pct_burnt ?? 0)],
  ] as [string, string, string, string, "on_track" | "at_risk" | "off_track"][];

  autoTable(doc, {
    startY: y + 3,
    margin: { left: margin, right: margin },
    head: [["#", "Metric", "Value", "Target", "Status"]],
    body: summaryRows.map(([num, metric, value, target, status]) => [
      num, metric, value, target, statusLabel(status),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8 },
      2: { halign: "right" },
      3: { halign: "right", textColor: COLORS.grey },
      4: { halign: "center" },
    },
    didParseCell(hookData) {
      if (hookData.section === "body" && hookData.column.index === 4) {
        const status = summaryRows[hookData.row.index]?.[4];
        if (status) hookData.cell.styles.textColor = statusColor(status);
      }
    },
  });

  // ── Annual Burn chart ───────────────────────────────────────────

  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text("Annual Burn Area by Season", margin, 20);

  const burnChart = await captureChartById("pdf-chart-annual-burn", 540, 220);
  if (burnChart) {
    doc.addImage(burnChart, "PNG", margin, 25, contentW, contentW * (220 / 540));
  } else {
    // Fallback: simple data table if chart capture fails
    autoTable(doc, {
      startY: 25,
      margin: { left: margin, right: margin },
      head: [["Year", "EDS (ha)", "LDS (ha)", "Total (ha)", "EDS %", "LDS %", "Total %"]],
      body: data.annualBurnData.map((r) => [
        r.year, r.eds_ha.toLocaleString(), r.lds_ha.toLocaleString(), r.total_ha.toLocaleString(),
        `${r.eds_pct}%`, `${r.lds_pct}%`, `${r.total_pct}%`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255] },
    });
  }

  // Rolling burn chart
  const chartImgH = contentW * (220 / 540);
  let chartY = 25 + chartImgH + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Rolling Burn Coverage (2 & 3 Year)", margin, chartY);

  const rollingChart = await captureChartById("pdf-chart-rolling-burn", 540, 220);
  if (rollingChart) {
    doc.addImage(rollingChart, "PNG", margin, chartY + 5, contentW, chartImgH);
  }

  chartY = chartY + 5 + chartImgH + 10;

  // Distance to unburnt chart
  if (chartY < 250) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Habitat Connectivity — Distance to Unburnt", margin, chartY);

    const distChart = await captureChartById("pdf-chart-dist-unburnt", 540, 200);
    if (distChart) {
      doc.addImage(distChart, "PNG", margin, chartY + 5, contentW, contentW * (200 / 540));
    }
  }

  // ── CFI Table 3 ─────────────────────────────────────────────────

  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text("CFI Table 3 — Fire Scar Area by Vegetation Class and Season", margin, 20);

  const t3Totals = {
    total_area_ha: data.cfiTable3Data.reduce((s, r) => s + r.total_area_ha, 0),
    eds_ha: data.cfiTable3Data.reduce((s, r) => s + r.eds_ha, 0),
    lds_ha: data.cfiTable3Data.reduce((s, r) => s + r.lds_ha, 0),
    total_ha: data.cfiTable3Data.reduce((s, r) => s + r.total_ha, 0),
    unburnt_ha: data.cfiTable3Data.reduce((s, r) => s + r.unburnt_ha, 0),
  };

  autoTable(doc, {
    startY: 25,
    margin: { left: margin, right: margin },
    head: [["Vegetation Class", "Code", "Total Area (ha)", "EDS (ha)", "EDS %", "LDS (ha)", "LDS %", "Total Burnt", "Unburnt (ha)"]],
    body: [
      ...data.cfiTable3Data.map((r) => [
        r.veg_class, r.veg_code,
        r.total_area_ha.toLocaleString(), r.eds_ha.toLocaleString(), `${r.eds_pct.toFixed(1)}%`,
        r.lds_ha.toLocaleString(), `${r.lds_pct.toFixed(1)}%`,
        r.total_ha.toLocaleString(), r.unburnt_ha.toLocaleString(),
      ]),
      [
        { content: "Total", styles: { fontStyle: "bold" } },
        "",
        { content: t3Totals.total_area_ha.toLocaleString(), styles: { fontStyle: "bold" } },
        { content: t3Totals.eds_ha.toLocaleString(), styles: { fontStyle: "bold" } },
        "",
        { content: t3Totals.lds_ha.toLocaleString(), styles: { fontStyle: "bold" } },
        "",
        { content: t3Totals.total_ha.toLocaleString(), styles: { fontStyle: "bold" } },
        { content: t3Totals.unburnt_ha.toLocaleString(), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
  });

  // ── CFI Table 9 ─────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterT3Y = (doc as any).lastAutoTable?.finalY ?? 80;
  const t9StartY = afterT3Y + 12;
  const t9NeedsNewPage = t9StartY > 200;

  if (t9NeedsNewPage) doc.addPage();

  const t9Y = t9NeedsNewPage ? 20 : t9StartY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text("CFI Table 9 — Fuel Age Distribution by Vegetation Class (%)", margin, t9Y);

  autoTable(doc, {
    startY: t9Y + 5,
    margin: { left: margin, right: margin },
    head: [["Vegetation Class", "Code", "0 yr", "1 yr", "2 yr", "3 yr", "4 yr", "5+ yr"]],
    body: data.cfiTable9Data.map((r) => [
      r.veg_class, r.veg_code,
      `${r.age_0}%`, `${r.age_1}%`, `${r.age_2}%`,
      `${r.age_3}%`, `${r.age_4}%`, `${r.age_5_plus}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  // ── Healthy Country Plan targets ─────────────────────────────────

  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);
  doc.text("Healthy Country Plan — Target Compliance", margin, 20);

  autoTable(doc, {
    startY: 25,
    margin: { left: margin, right: margin },
    head: [["#", "Metric", "Description", "Target", "Actual", "Status"]],
    body: data.fireTargets.map((t) => [
      t.metric_num, t.metric, t.description, t.target, t.current, statusLabel(t.status),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLORS.orange, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8 },
      2: { cellWidth: 60, fontSize: 7 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
    },
    didParseCell(hookData) {
      if (hookData.section === "body" && hookData.column.index === 5) {
        const t = data.fireTargets[hookData.row.index];
        if (t) hookData.cell.styles.textColor = statusColor(t.status);
      }
    },
  });

  // ── Footer on every page ─────────────────────────────────────────

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.grey);
    const footerY = doc.internal.pageSize.getHeight() - 8;
    doc.text(
      `${data.projectName} — Annual Fire Report ${data.selectedYear} | Carbon methodology: Emissions Avoidance (2018) | FireManager v0.1.0`,
      margin,
      footerY
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, footerY, { align: "right" });
  }

  // ── Save ─────────────────────────────────────────────────────────

  doc.save(`fire-report-${data.selectedYear}.pdf`);
}
