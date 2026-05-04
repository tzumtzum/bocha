"use client";

import { useEffect, useState } from "react";
import { WifiOff, Check, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getQueuedCount, flushOfflineQueue } from "@/lib/db/offline-queue";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showSynced, setShowSynced] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    // Check queued count on mount and periodically
    const checkQueue = async () => {
      const count = await getQueuedCount();
      setQueuedCount(count);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await getQueuedCount();
      if (count > 0) {
        const { succeeded, failed } = await flushOfflineQueue(async (log) => {
          const { error } = await supabase.from("daily_logs").insert({
            bird_id: log.bird_id,
            user_id: log.user_id,
            log_date: log.log_date,
            log_type: log.log_type,
            weight: log.weight,
            weight_unit: log.weight_unit,
            overall_status: log.overall_status,
            observations: log.observations,
            logged_at: log.logged_at,
            created_at: log.created_at,
          });
          return { error };
        });
        setQueuedCount(await getQueuedCount());
        if (succeeded > 0) {
          toast(`Synced ${succeeded} offline log${succeeded > 1 ? "s" : ""}`, {
            type: "success",
            duration: 3000,
          });
        }
        if (failed > 0) {
          toast(`${failed} log${failed > 1 ? "s" : ""} failed to sync`, {
            type: "warning",
            duration: 5000,
          });
        }
      }
      setShowSynced(true);
      setTimeout(() => setShowSynced(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [supabase]);

  if (isOnline && !showSynced && queuedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-1.5 text-xs font-medium transition-all",
        !isOnline
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200"
          : queuedCount > 0
          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/80 dark:text-orange-200"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 mr-1.5" />
          Sync pending... You&apos;re offline
          {queuedCount > 0 && ` (${queuedCount})`}
        </>
      ) : queuedCount > 0 ? (
        <>
          <CloudOff className="w-3.5 h-3.5 mr-1.5" />
          {queuedCount} log{queuedCount > 1 ? "s" : ""} queued
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Synced
        </>
      )}
    </div>
  );
}
