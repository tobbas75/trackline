"use client";

import { useState } from "react";
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
import {
  BookOpen,
  Printer,
  Satellite,
  ChevronDown,
  ChevronUp,
  Workflow,
  AlertTriangle,
  Target,
  Database,
} from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  METRICS,
  DATA_SOURCES,
  PIPELINE_STEPS,
  ASSUMPTIONS,
  OVERVIEW_TEXT,
  CFI_TABLE_3_TEXT,
  CFI_TABLE_9_TEXT,
} from "@/lib/methodology-content";
import { GLOSSARY, CATEGORY_LABELS, type GlossaryCategory } from "@/lib/help-content";

export default function MethodologyPage() {
  const handlePrint = () => window.print();

  return (
    <div className="p-6 print:p-0">
      {/* Screen-only controls */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Fire Metrics Methodology</h1>
          <p className="text-sm text-muted-foreground">
            Data sources, analysis pipeline, metric definitions, and assumptions
          </p>
        </div>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print / PDF
        </Button>
      </div>

      {/* Table of contents */}
      <Card className="mb-6 print:hidden">
        <CardContent className="pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Contents</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "data-sources", label: "Data Sources" },
              { id: "pipeline", label: "Analysis Pipeline" },
              { id: "metrics", label: "Fire Metrics" },
              { id: "cfi-tables", label: "CFI Tables" },
              { id: "assumptions", label: "Assumptions" },
              { id: "glossary", label: "Glossary" },
            ].map((item) => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="report-content space-y-6">
        {/* Overview */}
        <Card id="overview" className="print:border-0 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm leading-relaxed">
              {OVERVIEW_TEXT.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card id="data-sources" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Satellite className="h-4 w-4" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {DATA_SOURCES.map((source) => (
                <div key={source.name} className="border-l-2 border-muted pl-4">
                  <h3 className="font-semibold">{source.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{source.provider}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Resolution:</span>{" "}
                      <span className="font-medium">{source.resolution}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Update Frequency:</span>{" "}
                      <span className="font-medium">{source.revisit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coverage:</span>{" "}
                      <span className="font-medium">{source.coverage}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{source.description}</p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    <strong>Limitations:</strong> {source.limitations}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Pipeline */}
        <Card id="pipeline" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4" />
              Analysis Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              When you click &ldquo;Run Analysis&rdquo; on the Reports page, the following steps are
              executed in a background Web Worker. Processing time depends on data volume —
              typically 5–30 seconds for the Tiwi Islands project area.
            </p>
            <div className="space-y-4">
              {PIPELINE_STEPS.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview Table */}
        <Card id="metrics" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Fire Metrics — Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRICS.map((m) => (
                  <TableRow key={m.num + m.name}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.num}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{m.name}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {m.description.split(".")[0]}.
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{m.target}</TableCell>
                    <TableCell className="text-center">
                      {m.status === "implemented" ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Deferred</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detailed Metric Cards */}
        <MetricDetailCards />

        {/* CFI Tables */}
        <Card id="cfi-tables" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              CER Reporting Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">CFI Table 3 — Area by Vegetation Class and Season</h3>
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {CFI_TABLE_3_TEXT.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="mb-2 font-semibold">CFI Table 9 — Fuel Age Distribution by Vegetation Class</h3>
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {CFI_TABLE_9_TEXT.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assumptions & Limitations */}
        <Card id="assumptions" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Assumptions & Limitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              {ASSUMPTIONS.map((item, i) => (
                <li key={i} className="text-muted-foreground">
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card id="glossary" className="print:border-0 print:shadow-none print:break-before-page">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Glossary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GlossarySection />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="rounded-lg border p-4 text-xs text-muted-foreground print:border-t print:border-x-0 print:border-b-0">
          <p className="font-medium text-foreground">
            Fire Metrics Methodology Reference
          </p>
          <p>
            Carbon methodology: Emissions Avoidance (2018) | Analysis engine: Turf.js client-side processing
          </p>
          <p>
            Generated: {new Date().toLocaleDateString("en-AU")} | FireManager v0.1.0
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          [data-sidebar], nav, header, .print\\:hidden {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          .report-content > * {
            break-inside: avoid;
          }
          [class*="shadow"] {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Metric Detail Cards (expandable) ──────────────────────────

function MetricDetailCards() {
  const [expandedMetric, setExpandedMetric] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Metric Details</h2>
      {METRICS.map((m) => {
        const isExpanded = expandedMetric === m.num;
        return (
          <Card
            key={m.num + m.name}
            className="print:border-0 print:shadow-none"
          >
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedMetric(isExpanded ? null : m.num)}
              >
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">
                    {m.num}
                  </Badge>
                  {m.name}
                  {m.status === "deferred" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Deferred
                    </Badge>
                  )}
                </CardTitle>
                <span className="print:hidden">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </button>
            </CardHeader>
            {/* Always show in print, toggle on screen */}
            <CardContent
              className={`space-y-3 text-sm ${isExpanded ? "" : "hidden print:block"}`}
            >
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
                <p className="mt-1 leading-relaxed">{m.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Formula / Calculation</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-muted px-3 py-2 font-mono text-xs">
                  {m.formula}
                </pre>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Data Required</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{m.dataRequired}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Target</p>
                  <p className="mt-1 font-medium">{m.target}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Interpretation</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{m.interpretation}</p>
              </div>
              {m.cfiRelevance && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">CER Relevance</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{m.cfiRelevance}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Glossary Section ───────────────────────────────────────────

function GlossarySection() {
  const categories = Object.keys(CATEGORY_LABELS) as GlossaryCategory[];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const entries = GLOSSARY.filter((e) => e.category === cat);
        if (entries.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="mb-2 font-semibold">{CATEGORY_LABELS[cat]}</h3>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.term} className="flex gap-2 text-sm">
                  <span className="w-32 shrink-0 font-medium">{entry.term}</span>
                  <span className="text-muted-foreground">
                    {entry.long ?? entry.short}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
