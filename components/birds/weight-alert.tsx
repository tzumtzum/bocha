"use client";

import { AlertTriangle } from "lucide-react";
import { getWeightChangeBadge } from "@/lib/utils";

interface WeightAlertProps {
  currentWeight: number;
  previousWeight: number;
}

export function WeightAlert({ currentWeight, previousWeight }: WeightAlertProps) {
  const badge = getWeightChangeBadge(currentWeight, previousWeight);

  if (!badge) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${badge.color}`}
    >
      <AlertTriangle className="w-4 h-4" />
      <span>
        Weight change: {badge.label} from 7-day average
      </span>
    </div>
  );
}
