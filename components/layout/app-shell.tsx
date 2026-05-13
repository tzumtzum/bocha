"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SyncIndicator } from "@/components/layout/sync-indicator";

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

  // Apply content safe area insets when in Telegram.
  // Add 80px bottom padding so content isn't hidden under the fixed BottomNav.
  const safeAreaStyle = isInTelegram
    ? {
        paddingTop: ctx?.contentSafeAreaInsets.top ?? 0,
        paddingRight: ctx?.contentSafeAreaInsets.right ?? 0,
        paddingBottom: (ctx?.contentSafeAreaInsets.bottom ?? 0) + 80,
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
        <SyncIndicator />
        <main className="max-w-md mx-auto min-h-screen">{children}</main>
        <BottomNav
          hasBirds={hasBirds}
          safeAreaBottom={isInTelegram ? ctx?.contentSafeAreaInsets.bottom ?? 0 : 0}
        />
      </div>
    </>
  );
}
