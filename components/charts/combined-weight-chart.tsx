"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface BirdSeries {
  id: string;
  name: string;
  color: string;
  logs: { log_date: string; weight: number | null }[];
}

interface CombinedWeightChartProps {
  birds: BirdSeries[];
}

type Range = 7 | 30 | 90;

const BIRD_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function CombinedWeightChart({ birds }: CombinedWeightChartProps) {
  const [range, setRange] = useState<Range>(30);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleBirds = birds.filter((b) => !hidden.has(b.id));
  const allHidden = visibleBirds.length === 0;

  function toggleBird(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function showAll() {
    setHidden(new Set());
  }

  const { chartData, allWeights } = useMemo(() => {
    const dateSet = new Set<string>();
    const seriesMap = new Map<string, Map<string, number>>();

    for (const bird of visibleBirds) {
      const dateToWeight = new Map<string, number>();
      const sorted = [...bird.logs]
        .filter((l) => l.weight != null)
        .sort(
          (a, b) =>
            new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
        );
      for (const log of sorted) {
        dateToWeight.set(log.log_date, log.weight!);
        dateSet.add(log.log_date);
      }
      seriesMap.set(bird.id, dateToWeight);
    }

    const dates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const slicedDates = dates.slice(-range);
    const weights: number[] = [];

    const data = slicedDates.map((date) => {
      const point: Record<string, string | number> = { date };
      for (const bird of visibleBirds) {
        const w = seriesMap.get(bird.id)?.get(date);
        if (w != null) {
          point[bird.name] = w;
          weights.push(w);
        }
      }
      return point;
    });

    return { chartData: data, allWeights: weights };
  }, [visibleBirds, range]);

  const ranges: { value: Range; label: string }[] = [
    { value: 7, label: "7D" },
    { value: 30, label: "30D" },
    { value: 90, label: "90D" },
  ];

  const hasData = chartData.length > 0 && allWeights.length > 0;
  const minWeight = hasData ? Math.min(...allWeights) : 0;
  const maxWeight = hasData ? Math.max(...allWeights) : 100;
  const padding = hasData ? (maxWeight - minWeight) * 0.15 || 5 : 5;

  return (
    <div className="space-y-3">
      {/* Title + range */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Flock Weight Trends
        </h3>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bird toggles */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={showAll}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            hidden.size === 0
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
              : "bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
          }`}
        >
          All
        </button>
        {birds.map((bird, i) => {
          const isHidden = hidden.has(bird.id);
          const color = BIRD_COLORS[i % BIRD_COLORS.length];
          return (
            <button
              key={bird.id}
              onClick={() => toggleBird(bird.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                isHidden
                  ? "bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700 opacity-60"
                  : "text-white border-transparent"
              }`}
              style={
                isHidden
                  ? undefined
                  : { backgroundColor: color }
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isHidden ? "bg-current" : "bg-white"
                }`}
              />
              {bird.name}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-48 w-full">
        {allHidden ? (
          <div className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Select at least one bird to view trends
            </p>
          </div>
        ) : !hasData ? (
          <div className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No weight data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minWeight - padding, maxWeight + padding]}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)} g`,
                  name as string,
                ]}
                labelFormatter={(label) => formatDate(label)}
              />
              {visibleBirds.map((bird) => {
                const originalIndex = birds.findIndex((b) => b.id === bird.id);
                const color = BIRD_COLORS[originalIndex % BIRD_COLORS.length];
                return (
                  <Line
                    key={bird.id}
                    type="monotone"
                    dataKey={bird.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={{
                      r: 2,
                      fill: color,
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 4 }}
                    connectNulls
                    animationDuration={400}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
