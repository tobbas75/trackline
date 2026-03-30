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

interface NaiveOccupancyData {
  species: string;
  sitesDetected: number;
  totalSites: number;
  occupancy: number;
}

interface NaiveOccupancyChartProps {
  projectId: string;
}

function OccupancyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: NaiveOccupancyData }> }) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{data.species}</p>
      <p className="text-sm text-muted-foreground">
        Sites: {data.sitesDetected}/{data.totalSites}
      </p>
      <p className="text-sm text-muted-foreground">
        Occupancy: {(data.occupancy * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export function NaiveOccupancyChart({
  projectId,
}: NaiveOccupancyChartProps) {
  const [data, setData] = useState<NaiveOccupancyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analytics/naive-occupancy`
        );
        if (res.ok) {
          const json = (await res.json()) as NaiveOccupancyData[];
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [projectId]);

  const chartData = data.slice(0, 15);
  const chartHeight = Math.max(350, chartData.length * 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Naive Occupancy
          <HelpTooltip text={chartHelp.naiveOccupancy} side="right" />
        </CardTitle>
        <CardDescription>
          Proportion of sites where each species was detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No occupancy data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis
                type="category"
                dataKey="species"
                tick={{ fontSize: 12 }}
                width={75}
              />
              <Tooltip content={<OccupancyTooltip />} />
              <Bar
                dataKey="occupancy"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
