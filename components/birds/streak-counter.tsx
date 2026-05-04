"use client";

import { Flame } from "lucide-react";

interface StreakCounterProps {
  streak: number;
}

export function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900 rounded-xl px-3 py-2">
      <Flame
        className={`w-4 h-4 ${
          streak > 0
            ? "text-orange-500 fill-orange-500"
            : "text-slate-400"
        }`}
      />
      <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">
        {streak}-day streak
      </span>
    </div>
  );
}
