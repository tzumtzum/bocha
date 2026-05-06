"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BirdCard } from "@/components/birds/bird-card";
import { DailyStatusSummary } from "@/components/birds/daily-status-summary";
import { EmptyBirdState } from "@/components/birds/empty-state";
import { StreakCounter } from "@/components/birds/streak-counter";
import { ReminderBanner } from "@/components/layout/reminder-banner";
import { SetPasswordPrompt } from "@/components/auth/set-password-prompt";
import { Plus, Crown, Sparkles, Feather } from "lucide-react";
import dynamic from "next/dynamic";

const CombinedWeightChart = dynamic(
  () => import("@/components/charts/combined-weight-chart").then((m) => m.CombinedWeightChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);

const QuickLogSheet = dynamic(
  () => import("@/components/logs/quick-log-sheet").then((m) => m.QuickLogSheet),
  { ssr: false }
);
import { getTodayInTimezone, calculateStreak } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useDashboardData, useProfile, useUpgradeToPro } from "@/lib/hooks/use-dashboard-data";

interface BirdWithLogs {
  id: string;
  name: string;
  species: string;
  current_weight: number | null;
  target_weight: number | null;
  avatar_color: { bg: string; fg: string };
  status: string;
  timezone: string;
  daily_logs: { log_date: string; weight: number | null }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const today = getTodayInTimezone();
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [logSheetBirdId, setLogSheetBirdId] = useState<string | null>(null);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useDashboardData();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const upgrade = useUpgradeToPro();

  // Redirect unauthenticated users
  useEffect(() => {
    if (dashboardError && (dashboardError as Error).message === "Not authenticated") {
      router.push("/login");
    }
  }, [dashboardError, router]);

  // Redirect to onboarding if no active birds (and data is loaded)
  useEffect(() => {
    if (!dashboardLoading && dashboardData?.birds && dashboardData.birds.length === 0) {
      router.push("/onboarding");
    }
  }, [dashboardLoading, dashboardData, router]);

  const isLoading = dashboardLoading || profileLoading;
  const isPro = profile?.is_pro ?? false;
  const birdCount = dashboardData?.birds?.length ?? 0;

  // Merge logs into birds for display
  const birds: BirdWithLogs[] = (dashboardData?.birds ?? []).map((bird: Record<string, unknown>) => {
    const birdLogs =
      (dashboardData?.logs ?? [])
        .filter((log: Record<string, unknown>) => log.bird_id === bird.id)
        .map((log: Record<string, unknown>) => ({ log_date: String(log.log_date), weight: log.weight as number | null })) ?? [];
    return {
      ...(bird as unknown as BirdWithLogs),
      daily_logs: birdLogs,
    };
  });

  // Calculate streak
  const allLogs = birds.flatMap((b) => b.daily_logs);
  const uniqueDates = Array.from(new Set(allLogs.map((l) => l.log_date))).map((d) => ({
    log_date: d,
  }));
  const streak = calculateStreak(uniqueDates, birds.length);

  const handleUpgrade = () => {
    upgrade.mutate(undefined, {
      onSuccess: () => {
        toast("Welcome to Pro! You can now add unlimited birds.", { type: "success" });
      },
      onError: (err) => {
        toast(err instanceof Error ? err.message : "Upgrade failed", { type: "error" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (birds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyBirdState />
      </div>
    );
  }

  const canAddBird = isPro || birdCount < 2;
  const freeLimit = 2;

  const chartBirds = birds.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.avatar_color?.fg || "#10b981",
    logs: b.daily_logs ?? [],
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Your Flock
          </h1>
          {isPro && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
              <Feather className="w-3 h-3" />
              Pro
            </span>
          )}
        </div>
        <StreakCounter streak={streak} />
      </div>

      {/* Reminder Banner */}
      <ReminderBanner />

      {/* Set Password Prompt for new magic-link users */}
      <SetPasswordPrompt />

      {/* Daily Status Summary */}
      <DailyStatusSummary
        birds={birds.map((bird) => ({
          id: bird.id,
          name: bird.name,
          avatar_color: bird.avatar_color,
          hasTodayLog: (bird.daily_logs ?? []).some((l) => l.log_date === today),
        }))}
        onLogClick={(id) => {
          setLogSheetBirdId(id);
          setLogSheetOpen(true);
        }}
        onLogAllClick={() => {
          setLogSheetBirdId(null);
          setLogSheetOpen(true);
        }}
      />

      {/* Combined Weight Chart */}
      <CombinedWeightChart birds={chartBirds} />

      {/* Bird Cards */}
      <div className="space-y-3">
        {birds.map((bird) => {
          const hasTodayLog = (bird.daily_logs ?? []).some(
            (l) => l.log_date === today
          );
          return (
            <BirdCard
              key={bird.id}
              bird={bird}
              hasTodayLog={hasTodayLog}
              recentLogs={bird.daily_logs ?? []}
              onLogClick={(id) => {
                setLogSheetBirdId(id);
                setLogSheetOpen(true);
              }}
            />
          );
        })}
      </div>

      {/* Add Bird */}
      <QuickLogSheet
        open={logSheetOpen}
        onOpenChange={setLogSheetOpen}
        birdId={logSheetBirdId}
      />

      {canAddBird ? (
        <Button
          variant="outline"
          className="w-full h-12 border-dashed border-2"
          asChild
        >
          <Link href="/onboarding">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Bird {isPro ? "" : `(${birdCount}/${freeLimit})`}
          </Link>
        </Button>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-center space-y-2">
          <Crown className="w-5 h-5 text-amber-500 mx-auto" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Bird limit reached
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Upgrade to Pro for unlimited birds
          </p>
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            onClick={handleUpgrade}
            disabled={upgrade.isPending}
          >
            {upgrade.isPending ? (
              <>
                <Sparkles className="w-4 h-4 mr-1.5 animate-spin" />
                Upgrading...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-1.5" />
                Upgrade to Pro
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
