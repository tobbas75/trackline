"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpTooltip } from "@/components/help/help-tooltip";
import { chartHelp } from "@/lib/help-content";

interface SpeciesRichnessData {
  site: string;
  richness: number;
}

interface SpeciesRichnessChartProps {
  projectId: string;
}

export function SpeciesRichnessChart({ projectId }: SpeciesRichnessChartProps) {
  const [data, setData] = useState<SpeciesRichnessData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analytics/species-richness`
        );
        if (res.ok) {
          const json = (await res.json()) as SpeciesRichnessData[];
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [projectId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Species Richness by Site
          <HelpTooltip text={chartHelp.speciesRichness} side="right" />
        </CardTitle>
        <CardDescription>
          Number of unique species detected per site
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No species data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="site"
                angle={-45}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 11 }}
                height={80}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="richness"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
