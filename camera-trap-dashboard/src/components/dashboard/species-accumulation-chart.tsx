"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
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

interface SpeciesAccumulationData {
  date: string;
  cumulativeSpecies: number;
}

interface SpeciesAccumulationChartProps {
  projectId: string;
}

export function SpeciesAccumulationChart({
  projectId,
}: SpeciesAccumulationChartProps) {
  const [data, setData] = useState<SpeciesAccumulationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analytics/species-accumulation`
        );
        if (res.ok) {
          const json = (await res.json()) as SpeciesAccumulationData[];
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
          Species Accumulation
          <HelpTooltip text={chartHelp.speciesAccumulation} side="right" />
        </CardTitle>
        <CardDescription>
          Cumulative species discovered over the survey period
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No species accumulation data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="speciesAccumulationGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cumulativeSpecies"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#speciesAccumulationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
