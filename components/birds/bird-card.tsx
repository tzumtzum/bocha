"use client";

import Link from "next/link";
import { Bird, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWeight } from "@/lib/utils";
import { useWeightUnit } from "@/lib/hooks/use-weight-unit";
import dynamic from "next/dynamic";

const MiniSparkline = dynamic(
  () => import("@/components/charts/mini-sparkline").then((m) => m.MiniSparkline),
  { ssr: false }
);

interface BirdCardProps {
  bird: {
    id: string;
    name: string;
    species: string;
    current_weight: number | null;
    target_weight: number | null;
    avatar_color: { bg: string; fg: string };
    status: string;
  };
  hasTodayLog: boolean;
  recentLogs: { log_date: string; weight: number | null }[];
  onLogClick?: (birdId: string) => void;
}

export function BirdCard({ bird, hasTodayLog, recentLogs, onLogClick }: BirdCardProps) {
  const weightUnit = useWeightUnit();
  const weights = (recentLogs ?? [])
    .filter((l) => l.weight != null)
    .map((l) => l.weight!)
    .slice(0, 7)
    .reverse();

  return (
    <Link
      href={`/birds/${bird.id}`}
      prefetch
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
    >
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer relative">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: bird.avatar_color?.bg || "#e0f2fe",
                color: bird.avatar_color?.fg || "#0ea5e9",
              }}
            >
              <Bird className="w-6 h-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {bird.name}
                </h3>
                {hasTodayLog ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[10px] px-1.5 py-0"
                  >
                    ✓
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] px-1.5 py-0"
                  >
                    ⚠️
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bird.species}
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {formatWeight(bird.current_weight, weightUnit)}
                {bird.target_weight != null && (
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    target {formatWeight(bird.target_weight, weightUnit)}
                  </span>
                )}
              </p>
            </div>

            {/* Right side: sparkline + quick log button */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {!hasTodayLog && onLogClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLogClick(bird.id);
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                  aria-label={`Quick log ${bird.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {weights.length > 1 && (
                <div className="w-16 h-8">
                  <MiniSparkline data={weights} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
