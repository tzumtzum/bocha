"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { queueOfflineLog } from "@/lib/db/offline-queue";
import { getTodayInTimezone } from "@/lib/utils";
import { useWeightUnit } from "@/lib/hooks/use-weight-unit";
import { useInvalidateAppData } from "@/lib/hooks/use-dashboard-data";
import { toast } from "@/lib/toast";
import { Bird } from "lucide-react";
import {
  SingleBirdLog,
  MultiBirdLog,
  BirdData,
  BirdLogEntry,
} from "./quick-log-forms";

interface QuickLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  birdId?: string | null;
}

export function QuickLogSheet({ open, onOpenChange, birdId }: QuickLogSheetProps) {
  const supabase = createClient();
  const defaultUnit = useWeightUnit();
  const [weightUnit, setWeightUnit] = useState(defaultUnit);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [singleBird, setSingleBird] = useState<BirdData | null>(null);
  const [multiBirds, setMultiBirds] = useState<BirdData[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const { invalidateAll } = useInvalidateAppData();

  useEffect(() => {
    setWeightUnit(defaultUnit);
  }, [defaultUnit]);

  useEffect(() => {
    if (open) {
      setRenderKey((k) => k + 1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    async function fetchBirds() {
      setFetching(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFetching(false);
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
        const { data } = await supabase
          .from("birds")
          .select("id, name, species, target_weight, current_weight, avatar_color")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true });
        if (data) {
          const typed = data as unknown as BirdData[];
          if (typed.length === 1) {
            setSingleBird(typed[0]);
            setMultiBirds([]);
          } else {
            setSingleBird(null);
            setMultiBirds(typed);
          }
        }
      }
      setFetching(false);
    }

    fetchBirds();
  }, [open, birdId, supabase]);

  const handleSuccess = useCallback(() => {
    invalidateAll();
    setLoading(false);
    onOpenChange(false);
  }, [invalidateAll, onOpenChange]);

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
      setLoading(false);
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

    toast(`Logged ${singleBird.name}: ${data.weight}${data.weightUnit}`, { type: "success" });
    handleSuccess();
  }

  async function saveMulti(entries: BirdLogEntry[]) {
    const toSave = entries.filter((e) => e.weight.trim() !== "");
    if (toSave.length === 0) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
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

    toast(`Logged ${toSave.length} bird${toSave.length > 1 ? "s" : ""}!`, { type: "success" });
    handleSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Quick Log</SheetTitle>
          <SheetDescription>
            {singleBird
              ? `Log weight for ${singleBird.name}`
              : multiBirds.length > 1
              ? `Log weight for all ${multiBirds.length} birds`
              : "Log today's weight"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {fetching ? (
            <div className="animate-pulse space-y-3 pt-4">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          ) : singleBird ? (
            <div key={renderKey} className="pt-2">
              <SingleBirdLog
                bird={singleBird}
                weightUnit={weightUnit}
                onWeightUnitChange={setWeightUnit}
                onSave={saveSingle}
                saving={loading}
              />
            </div>
          ) : multiBirds.length > 0 ? (
            <div key={renderKey} className="pt-2">
              <MultiBirdLog
                birds={multiBirds}
                weightUnit={weightUnit}
                onWeightUnitChange={setWeightUnit}
                onSave={saveMulti}
                saving={loading}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <Bird className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No active birds to log</p>
              <Button className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
