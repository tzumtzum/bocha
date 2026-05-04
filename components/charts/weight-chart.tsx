"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface WeightChartProps {
  data: { log_date: string; weight: number | null }[];
  targetWeight: number | null;
}

type Range = 7 | 30 | 90;

export function WeightChart({ data, targetWeight }: WeightChartProps) {
  const [range, setRange] = useState<Range>(30);

  const filtered = data
    .filter((d) => d.weight != null)
    .sort(
      (a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    )
    .slice(-range);

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Weight Trend
          </h3>
        </div>
        <div className="h-48 w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No weight data available
          </p>
        </div>
      </div>
    );
  }

  const chartData = filtered.map((d) => ({
    date: d.log_date,
    weight: d.weight,
    label: formatDate(d.log_date),
  }));

  const minWeight = Math.min(...filtered.map((d) => d.weight!));
  const maxWeight = Math.max(...filtered.map((d) => d.weight!));
  const padding = (maxWeight - minWeight) * 0.15 || 5;

  const ranges: { value: Range; label: string }[] = [
    { value: 7, label: "7D" },
    { value: 30, label: "30D" },
    { value: 90, label: "90D" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Weight Trend
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

      <div className="h-48 w-full">
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
              formatter={(value) => [`${Number(value).toFixed(1)} g`, "Weight"]}
              labelFormatter={(label) => formatDate(label)}
            />
            {targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: "Target",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
