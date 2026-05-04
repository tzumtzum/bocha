"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getTodayInTimezone } from "@/lib/utils";

function isInQuietHours(
  now: string,
  quietStart: string,
  quietEnd: string
): boolean {
  if (!quietStart || !quietEnd) return false;
  if (quietStart === quietEnd) return false;

  const current = now.replace(":", "");
  const start = quietStart.replace(":", "");
  const end = quietEnd.replace(":", "");

  if (start < end) {
    return current >= start && current < end;
  }
  // Wraps past midnight
  return current >= start || current < end;
}

export function ReminderBanner() {
  const supabase = createClient();
  const [show, setShow] = useState(false);
  const [birdId, setBirdId] = useState<string | null>(null);
  const [birdName, setBirdName] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("reminders_enabled, reminder_time, quiet_hours_start, quiet_hours_end")
        .eq("id", user.id)
        .single();

      if (!profile?.reminders_enabled) return;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (
        isInQuietHours(
          timeStr,
          profile.quiet_hours_start || "22:00",
          profile.quiet_hours_end || "07:00"
        )
      ) {
        return;
      }

      const today = getTodayInTimezone();

      const { data: birds } = await supabase
        .from("birds")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!birds || birds.length === 0) return;

      const { data: logs } = await supabase
        .from("daily_logs")
        .select("bird_id")
        .eq("user_id", user.id)
        .eq("log_date", today);

      const loggedBirdIds = new Set((logs ?? []).map((l: Record<string, unknown>) => l.bird_id));
      const missing = birds.find((b: Record<string, unknown>) => !loggedBirdIds.has(b.id)) as
        | { id: string; name: string }
        | undefined;

      if (missing) {
        setBirdId(missing.id);
        setBirdName(missing.name);
        setShow(true);
      }
    }

    check();
  }, [supabase]);

  if (!show || dismissed) return null;

  return (
    <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <Bell className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
          Time to weigh {birdName}!
        </p>
        <p className="text-xs text-sky-600 dark:text-sky-400">
          You haven&apos;t logged today&apos;s weight yet.
        </p>
      </div>
      <Button size="sm" className="bg-sky-600 hover:bg-sky-700 shrink-0" asChild>
        <Link href={`/log/quick?birdId=${birdId}`}>Log Now</Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-sky-600 hover:text-sky-800 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900"
        onClick={() => setDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
