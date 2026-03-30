"use client";

import dynamic from "next/dynamic";
import { TrapEvent } from "@/lib/types";

// Recharts must be client-side only (uses browser APIs)
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-(--tm-muted)">
        Loading chart...
      </div>
    ),
  },
);
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});
const ReferenceLine = dynamic(
  () => import("recharts").then((mod) => mod.ReferenceLine),
  { ssr: false },
);

interface BatteryChartProps {
  unitId: string;
  events: TrapEvent[];
}

export default function BatteryChart({ unitId, events }: BatteryChartProps) {
  // Extract battery data for this unit, sorted by time
  const batteryData = events
    .filter((e) => e.unit_id === unitId && e.battery_pct !== null)
    .sort(
      (a, b) =>
        new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime(),
    )
    .map((e) => ({
      time: new Date(e.triggered_at).toLocaleDateString("en-AU"),
      timestamp: new Date(e.triggered_at).getTime(),
      battery: e.battery_pct!,
      type: e.event_type,
    }));

  // Deduplicate by day (keep latest reading per day)
  const dedupedData: typeof batteryData = [];
  let lastDay = "";
  for (const point of batteryData) {
    if (point.time !== lastDay) {
      // Also check if we already have this day
      if (!dedupedData.find((d) => d.time === point.time)) {
        dedupedData.push(point);
        lastDay = point.time;
      }
    }
  }

  if (dedupedData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-(--tm-muted)">
        No battery data available
      </div>
    );
  }

  return (
    <LineChart
      width={400}
      height={300}
      data={dedupedData}
      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis
        dataKey="time"
        tick={{ fontSize: 12, fill: "#9ca3af" }}
        angle={-45}
        height={60}
      />
      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#9ca3af" }} />
      <Tooltip
        contentStyle={{
          backgroundColor: "#1f2937",
          border: "1px solid #4b5563",
          borderRadius: "4px",
        }}
        labelStyle={{ color: "#d1d5db" }}
      />

      {/* Reference lines at warning thresholds */}
      <ReferenceLine
        y={20}
        stroke="#ef4444"
        strokeDasharray="5 5"
        label={{
          value: "20% (Low)",
          position: "right",
          fill: "#ef4444",
          fontSize: 11,
        }}
      />
      <ReferenceLine
        y={10}
        stroke="#dc2626"
        strokeDasharray="5 5"
        label={{
          value: "10% (Critical)",
          position: "right",
          fill: "#dc2626",
          fontSize: 11,
        }}
      />

      <Line
        type="monotone"
        dataKey="battery"
        stroke="#22c55e"
        strokeWidth={2}
        dot={{ fill: "#22c55e", r: 3 }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  );
}
