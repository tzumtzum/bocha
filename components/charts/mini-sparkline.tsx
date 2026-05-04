"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

interface MiniSparklineProps {
  data: number[];
}

export function MiniSparkline({ data }: MiniSparklineProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={32} minHeight={32}>
      <LineChart data={chartData}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#10b981"
          strokeWidth={1.5}
          dot={false}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
