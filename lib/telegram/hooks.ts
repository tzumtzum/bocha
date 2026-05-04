"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initTelegramWebApp, isTelegramWebApp, type TelegramWebApp } from "./webapp";

export function useTelegramWebApp() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const instance = initTelegramWebApp();
    setTg(instance);
    setIsReady(true);
  }, []);

  return { tg, isReady, isInTelegram: isTelegramWebApp() };
}

export function useTelegramTheme() {
  const { tg, isInTelegram } = useTelegramWebApp();
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return tg?.colorScheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    if (!tg) return;
    setColorScheme(tg.colorScheme);
    const handler = () => setColorScheme(tg.colorScheme);
    tg.onEvent("themeChanged", handler);
    return () => tg.offEvent("themeChanged", handler);
  }, [tg]);

  return { colorScheme, isInTelegram, themeParams: tg?.themeParams };
}

export function useTelegramViewport() {
  const { tg } = useTelegramWebApp();
  const [viewportHeight, setViewportHeight] = useState(tg?.viewportStableHeight ?? 0);

  useEffect(() => {
    if (!tg) return;
    setViewportHeight(tg.viewportStableHeight);
    const handler = () => setViewportHeight(tg.viewportStableHeight);
    tg.onEvent("viewportChanged", handler);
    return () => tg.offEvent("viewportChanged", handler);
  }, [tg]);

  return viewportHeight;
}

export function useTelegramBackButton(callback?: () => void) {
  const { tg } = useTelegramWebApp();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!tg || !cbRef.current) return;
    const back = tg.BackButton;
    const handler = () => cbRef.current?.();
    back.show();
    back.onClick(handler);
    return () => {
      back.offClick(handler);
      back.hide();
    };
  }, [tg]);

  return tg?.BackButton ?? null;
}

export function useTelegramMainButton(
  text: string,
  onClick: () => void,
  options?: { color?: string; textColor?: string; visible?: boolean; active?: boolean }
) {
  const { tg } = useTelegramWebApp();
  const cbRef = useRef(onClick);
  cbRef.current = onClick;

  useEffect(() => {
    if (!tg) return;
    const btn = tg.MainButton;
    const handler = () => cbRef.current();
    btn.setParams({
      text,
      color: options?.color,
      text_color: options?.textColor,
      is_visible: options?.visible ?? true,
      is_active: options?.active ?? true,
    });
    btn.onClick(handler);
    return () => {
      btn.offClick(handler);
      btn.hide();
    };
  }, [tg, text, options?.color, options?.textColor, options?.visible, options?.active]);

  return tg?.MainButton ?? null;
}

export function useTelegramHaptics() {
  const { tg } = useTelegramWebApp();

  const impact = useCallback(
    (style: "light" | "medium" | "heavy" | "rigid" | "soft") => {
      tg?.HapticFeedback?.impactOccurred(style);
    },
    [tg]
  );

  const notify = useCallback(
    (type: "error" | "success" | "warning") => {
      tg?.HapticFeedback?.notificationOccurred(type);
    },
    [tg]
  );

  const selection = useCallback(() => {
    tg?.HapticFeedback?.selectionChanged();
  }, [tg]);

  return { impact, notify, selection };
}

export function useTelegramClosingConfirmation(enabled: boolean) {
  const { tg } = useTelegramWebApp();

  useEffect(() => {
    if (!tg) return;
    if (enabled) {
      tg.enableClosingConfirmation();
    } else {
      tg.disableClosingConfirmation();
    }
    return () => {
      tg.disableClosingConfirmation();
    };
  }, [tg, enabled]);
}
