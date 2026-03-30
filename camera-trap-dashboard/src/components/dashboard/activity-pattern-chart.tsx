"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
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

interface ActivityPatternData {
  hour: number;
  count: number;
}

interface ActivityPatternChartProps {
  projectId: string;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function ActivityPatternChart({
  projectId,
}: ActivityPatternChartProps) {
  const [data, setData] = useState<ActivityPatternData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analytics/activity-pattern`
        );
        if (res.ok) {
          const json = (await res.json()) as ActivityPatternData[];
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [projectId]);

  const chartData = data.map((d) => ({
    ...d,
    hourLabel: formatHour(d.hour),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Activity Pattern
          <HelpTooltip text={chartHelp.activityPattern} side="right" />
        </CardTitle>
        <CardDescription>
          Hourly distribution of animal detections
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            No activity pattern data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="hourLabel" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis allowDecimals={false} />
              <Tooltip />
              <Radar
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
