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

interface DiversityData {
  site: string;
  speciesCount: number;
  totalObservations: number;
  shannon: number;
  simpson: number;
}

interface DiversityChartProps {
  projectId: string;
}

function DiversityTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DiversityData }> }) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{data.site}</p>
      <p className="text-sm text-muted-foreground">
        Shannon H&prime;: {data.shannon.toFixed(3)}
      </p>
      <p className="text-sm text-muted-foreground">
        Simpson 1-D: {data.simpson.toFixed(3)}
      </p>
      <p className="text-sm text-muted-foreground">
        Species: {data.speciesCount}
      </p>
    </div>
  );
}

export function DiversityChart({ projectId }: DiversityChartProps) {
  const [data, setData] = useState<DiversityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analytics/diversity`
        );
        if (res.ok) {
          const json = (await res.json()) as DiversityData[];
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [projectId]);

  const chartData = data.slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Site Diversity
          <HelpTooltip text={chartHelp.diversity} side="right" />
        </CardTitle>
        <CardDescription>
          Shannon-Wiener diversity index (H&prime;) per site
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No diversity data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="site"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={true} />
              <Tooltip content={<DiversityTooltip />} />
              <Bar
                dataKey="shannon"
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
