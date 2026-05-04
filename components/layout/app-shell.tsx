"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SyncIndicator } from "@/components/layout/sync-indicator";
import { DemoBanner } from "@/components/layout/demo-banner";
import { TelegramThemeSync, TelegramSafeArea } from "@/components/layout/telegram-shell";
import { useTelegramContext } from "./telegram-provider";

export function AppShell({
  children,
  hasBirds,
}: {
  children: React.ReactNode;
  hasBirds: boolean;
}) {
  const ctx = useTelegramContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial hydration, assume non-Telegram to avoid mismatch
  const isInTelegram = mounted ? (ctx?.isInTelegram ?? false) : false;

  // Apply content safe area insets when in Telegram
  const safeAreaStyle = isInTelegram
    ? {
        paddingTop: ctx?.contentSafeAreaInsets.top ?? 0,
        paddingRight: ctx?.contentSafeAreaInsets.right ?? 0,
        paddingBottom: ctx?.contentSafeAreaInsets.bottom ?? 0,
        paddingLeft: ctx?.contentSafeAreaInsets.left ?? 0,
      }
    : undefined;

  return (
    <>
      <TelegramThemeSync />
      <TelegramSafeArea />
      <div
        className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${
          isInTelegram ? "" : "pb-20"
        }`}
        style={safeAreaStyle}
      >
        <DemoBanner />
        <SyncIndicator />
        <main className="max-w-md mx-auto min-h-screen">{children}</main>
        {!isInTelegram && <BottomNav hasBirds={hasBirds} />}
      </div>
    </>
  );
}
