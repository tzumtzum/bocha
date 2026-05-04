"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Bird, ArrowRight } from "lucide-react";

interface DailyStatusBird {
  id: string;
  name: string;
  avatar_color: { bg: string; fg: string };
  hasTodayLog: boolean;
}

interface DailyStatusSummaryProps {
  birds: DailyStatusBird[];
  onLogClick?: (birdId: string) => void;
  onLogAllClick?: () => void;
}

export function DailyStatusSummary({ birds, onLogClick, onLogAllClick }: DailyStatusSummaryProps) {
  const loggedBirds = birds.filter((b) => b.hasTodayLog);
  const pendingBirds = birds.filter((b) => !b.hasTodayLog);
  const allLogged = pendingBirds.length === 0;

  if (allLogged) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                All caught up!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {loggedBirds.length === 1
                  ? `${loggedBirds[0].name} has been logged today`
                  : `All ${loggedBirds.length} birds logged today`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
            <Bird className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {pendingBirds.length === 1
                ? `${pendingBirds[0].name} needs logging`
                : `${pendingBirds.length} birds need logging`}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Tap a bird below to log today&apos;s weight
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {birds.map((bird) => (
            <div
              key={bird.id}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: bird.avatar_color?.bg || "#e0f2fe",
                    color: bird.avatar_color?.fg || "#0ea5e9",
                  }}
                >
                  {bird.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {bird.name}
                </span>
              </div>

              {bird.hasTodayLog ? (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Logged</span>
                </div>
              ) : onLogClick ? (
                <button
                  onClick={() => onLogClick(bird.id)}
                  className="h-7 px-2.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center"
                >
                  Log
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-3"
                  asChild
                >
                  <Link href={`/log/quick?birdId=${bird.id}`}>
                    Log
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        {pendingBirds.length > 1 && (
          onLogAllClick ? (
            <button
              onClick={onLogAllClick}
              className="w-full h-9 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center"
            >
              Log All Birds
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          ) : (
            <Button
              className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700"
              asChild
            >
              <Link href="/log/quick">
                Log All Birds
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
