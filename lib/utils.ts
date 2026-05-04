import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(
  weight: number | null | undefined,
  unit: string = "g"
): string {
  if (weight == null) return "—";
  return `${weight.toFixed(1)} ${unit}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function getTodayInTimezone(timezone: string = "UTC"): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function calculateStreak(
  logs: { log_date: string }[],
  birdCount: number
): number {
  if (!logs.length || birdCount === 0) return 0;

  const dates = new Set(logs.map((l) => l.log_date));
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  let streak = 0;

  // If today is logged, start from today. If not, start from yesterday.
  const startOffset = dates.has(todayStr) ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    if (dates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function getWeightChangeBadge(
  current: number,
  previous: number
): { label: string; color: string } | null {
  const pct = ((current - previous) / previous) * 100;
  const absPct = Math.abs(pct);

  if (absPct < 5) return null;
  if (absPct < 10)
    return {
      label: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  if (absPct < 15)
    return {
      label: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
  return {
    label: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
}
