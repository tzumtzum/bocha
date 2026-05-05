"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { queueOfflineLog } from "@/lib/db/offline-queue";
import { getTodayInTimezone } from "@/lib/utils";
import { useWeightUnit } from "@/lib/hooks/use-weight-unit";
import { Bird } from "lucide-react";
import { PageBackButton } from "@/components/layout/page-back-button";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  SingleBirdLog,
  MultiBirdLog,
  BirdData,
  BirdLogEntry,
} from "@/components/logs/quick-log-forms";

function QuickLogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const birdId = searchParams.get("birdId");

  const defaultUnit = useWeightUnit();
  const [weightUnit, setWeightUnit] = useState(defaultUnit);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [singleBird, setSingleBird] = useState<BirdData | null>(null);
  const [multiBirds, setMultiBirds] = useState<BirdData[]>([]);

  useEffect(() => {
    setWeightUnit(defaultUnit);
  }, [defaultUnit]);

  useEffect(() => {
    async function fetchBirds() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      if (birdId) {
        const { data } = await supabase
          .from("birds")
          .select("id, name, species, target_weight, current_weight, avatar_color")
          .eq("id", birdId)
          .eq("status", "active")
          .single();
        if (data) setSingleBird(data as unknown as BirdData);
      } else {
        const { data: memberships } = await supabase
          .from("flock_members")
          .select("flock_id")
          .eq("user_id", user.id);

        const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];

        if (flockIds.length > 0) {
          const { data } = await supabase
            .from("birds")
            .select("id, name, species, target_weight, current_weight, avatar_color")
            .in("flock_id", flockIds)
            .eq("status", "active")
            .order("sort_order", { ascending: true });
          if (data) {
            const typed = data as unknown as BirdData[];
            if (typed.length === 1) {
              setSingleBird(typed[0]);
            } else {
              setMultiBirds(typed);
            }
          }
        }
      }
      setFetching(false);
    }
    fetchBirds();
  }, [birdId, supabase, router]);

  async function saveSingle(data: {
    weight: string;
    weightUnit: string;
    status: string;
  }) {
    if (!singleBird) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const logDate = getTodayInTimezone();
    const now = new Date().toISOString();
    const logData = {
      bird_id: singleBird.id,
      user_id: user.id,
      log_date: logDate,
      log_type: "quick" as const,
      weight: parseFloat(data.weight),
      weight_unit: data.weightUnit,
      overall_status: data.status,
      logged_at: now,
      created_at: now,
    };

    if (navigator.onLine) {
      const { error } = await supabase.from("daily_logs").insert(logData);
      if (error) {
        console.error("Supabase error, queuing offline:", error);
        await queueOfflineLog(logData);
      }
      await supabase
        .from("birds")
        .update({ current_weight: parseFloat(data.weight) })
        .eq("id", singleBird.id);
    } else {
      await queueOfflineLog(logData);
    }

    setLoading(false);
    router.push("/dashboard");
  }

  async function saveMulti(entries: BirdLogEntry[]) {
    const toSave = entries.filter((e) => e.weight.trim() !== "");
    if (toSave.length === 0) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const logDate = getTodayInTimezone();
    const now = new Date().toISOString();

    for (const entry of toSave) {
      const logData = {
        bird_id: entry.birdId,
        user_id: user.id,
        log_date: logDate,
        log_type: "quick" as const,
        weight: parseFloat(entry.weight),
        weight_unit: weightUnit,
        overall_status: entry.status,
        logged_at: now,
        created_at: now,
      };

      if (navigator.onLine) {
        const { error } = await supabase.from("daily_logs").insert(logData);
        if (error) {
          console.error("Supabase error, queuing offline:", error);
          await queueOfflineLog(logData);
        }
        await supabase
          .from("birds")
          .update({ current_weight: parseFloat(entry.weight) })
          .eq("id", entry.birdId);
      } else {
        await queueOfflineLog(logData);
      }
    }

    setLoading(false);
    toast(`Logged ${toSave.length} bird${toSave.length > 1 ? "s" : ""}!`, { type: "success" });
    router.push("/dashboard");
  }

  if (fetching) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <PageBackButton href="/dashboard" />
          <h1 className="text-lg font-bold">Quick Log</h1>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <PageBackButton href="/dashboard" />
        <div>
          <h1 className="text-lg font-bold">Quick Log</h1>
          {multiBirds.length > 1 && (
            <p className="text-xs text-slate-500">
              Log weight for all {multiBirds.length} birds
            </p>
          )}
        </div>
      </div>

      {singleBird ? (
        <SingleBirdLog
          bird={singleBird}
          weightUnit={weightUnit}
          onWeightUnitChange={setWeightUnit}
          onSave={saveSingle}
          saving={loading}
        />
      ) : multiBirds.length > 0 ? (
        <MultiBirdLog
          birds={multiBirds}
          weightUnit={weightUnit}
          onWeightUnitChange={setWeightUnit}
          onSave={saveMulti}
          saving={loading}
        />
      ) : (
        <div className="text-center py-12">
          <Bird className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No active birds to log</p>
          <Button className="mt-4" asChild>
            <Link href="/onboarding">Add a Bird</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function QuickLogPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <QuickLogForm />
    </Suspense>
  );
}
