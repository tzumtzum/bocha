"use client";

import { useEffect } from "react";
import { useTelegramContext } from "./telegram-provider";
import { useTheme } from "next-themes";
import { miniApp } from "@telegram-apps/sdk";

export function TelegramThemeSync() {
  const ctx = useTelegramContext();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (ctx?.isInTelegram && ctx.colorScheme) {
      setTheme(ctx.colorScheme);
    }
  }, [ctx?.isInTelegram, ctx?.colorScheme, setTheme]);

  // Bind Telegram CSS variables so Tailwind can consume them
  useEffect(() => {
    if (!ctx?.isInTelegram) return;

    const unbind = miniApp.bindCssVars();
    return () => {
      unbind?.();
    };
  }, [ctx?.isInTelegram]);

  return null;
}

export function TelegramSafeArea() {
  const ctx = useTelegramContext();

  useEffect(() => {
    if (!ctx?.isInTelegram) return;

    // Apply Telegram theme params as CSS variables for manual consumption
    const tp = ctx.themeParams;
    const root = document.documentElement;
    if (tp?.bgColor) root.style.setProperty("--tg-bg", tp.bgColor);
    if (tp?.textColor) root.style.setProperty("--tg-text", tp.textColor);
    if (tp?.buttonColor) root.style.setProperty("--tg-button", tp.buttonColor);
    if (tp?.buttonTextColor) root.style.setProperty("--tg-button-text", tp.buttonTextColor);
    if (tp?.secondaryBgColor) root.style.setProperty("--tg-secondary-bg", tp.secondaryBgColor);
    if (tp?.headerBgColor) root.style.setProperty("--tg-header-bg", tp.headerBgColor);
    if (tp?.bottomBarBgColor) root.style.setProperty("--tg-bottom-bar-bg", tp.bottomBarBgColor);

    // Set header/background colors to match Telegram
    try {
      miniApp.setHeaderColor("secondary_bg_color");
      miniApp.setBackgroundColor("bg_color");
      miniApp.setBottomBarColor("bottom_bar_bg_color");
    } catch {
      // Ignore if methods are not supported on this platform version
    }
  }, [ctx?.isInTelegram, ctx?.themeParams]);

  return null;
}
