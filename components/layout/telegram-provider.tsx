"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";
import {
  init,
  isTMA,
  miniApp,
  themeParams,
  viewport,
  mountClosingBehavior,
  enableClosingConfirmation,
  mountSwipeBehavior,
  disableVerticalSwipes,
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
  addToHomeScreen,
  checkHomeScreenStatus,
  isCheckingHomeScreenStatus,
  type ThemeParams,
} from "@telegram-apps/sdk";

interface TelegramContextValue {
  isInTelegram: boolean;
  isReady: boolean;
  colorScheme: "light" | "dark";
  themeParams: ThemeParams;
  viewportHeight: number;
  safeAreaInsets: { top: number; right: number; bottom: number; left: number };
  contentSafeAreaInsets: { top: number; right: number; bottom: number; left: number };
  isFullscreen: boolean;
  homeScreenStatus: "unsupported" | "unknown" | "added" | "missed" | string | null;
  isCheckingHomeScreen: boolean;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  addToHomeScreen: () => void;
  checkHomeScreen: () => void;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

function useSdkSignal<T>(signal: { sub: (fn: (current: T) => void) => () => void; (): T }, fallback: T): T {
  return useSyncExternalStore(
    (cb) => signal.sub(() => cb()),
    () => signal(),
    () => fallback
  );
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isTMA()) {
      setIsReady(true);
      return;
    }

    try {
      init();
      miniApp.mountSync();
      miniApp.ready();
      void viewport.mount();
      void themeParams.mount();
      viewport.expand();
      // Prevent accidental swipe-to-close with a native confirmation dialog
      mountClosingBehavior();
      enableClosingConfirmation();
      // Disable vertical swipe-to-close (Bot API 7.7+)
      mountSwipeBehavior();
      disableVerticalSwipes();
      // Request fullscreen mode (Bot API 8.0+)
      try {
        const promise = requestFullscreen.ifAvailable();
        if (promise && typeof (promise as unknown as Promise<unknown>).catch === "function") {
          (promise as unknown as Promise<unknown>).catch(() => {
            // Fullscreen may fail on older clients or if already fullscreen
          });
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Telegram SDK init error:", err);
    }

    setIsReady(true);
  }, []);

  const isInTelegram = isTMA();

  const colorScheme = useSdkSignal(miniApp.isDark, false)
    ? "dark"
    : "light";

  const tp = useSdkSignal(themeParams.state, {} as ThemeParams);
  const vpHeight = useSdkSignal(viewport.stableHeight, 0);
  const safeArea = useSdkSignal(viewport.safeAreaInsets, { top: 0, right: 0, bottom: 0, left: 0 });
  const contentSafeArea = useSdkSignal(viewport.contentSafeAreaInsets, { top: 0, right: 0, bottom: 0, left: 0 });
  const fullscreen = useSdkSignal(isFullscreen, false);
  const checkingHomeScreen = useSdkSignal(isCheckingHomeScreenStatus, false);

  const [homeScreenStatus, setHomeScreenStatus] = useState<string | null>(null);

  const doCheckHomeScreen = useCallback(() => {
    if (!checkHomeScreenStatus.isAvailable()) return;
    checkHomeScreenStatus()
      .then((status) => setHomeScreenStatus(status))
      .catch(() => setHomeScreenStatus("unknown"));
  }, []);

  useEffect(() => {
    if (!isInTelegram) return;
    // Check once after a short delay so the SDK is fully ready
    const timer = setTimeout(doCheckHomeScreen, 1500);
    return () => clearTimeout(timer);
  }, [isInTelegram, doCheckHomeScreen]);

  return (
    <TelegramContext.Provider
      value={{
        isInTelegram,
        isReady,
        colorScheme,
        themeParams: tp,
        viewportHeight: vpHeight,
        safeAreaInsets: safeArea ?? { top: 0, right: 0, bottom: 0, left: 0 },
        contentSafeAreaInsets: contentSafeArea ?? { top: 0, right: 0, bottom: 0, left: 0 },
        isFullscreen: fullscreen,
        homeScreenStatus,
        isCheckingHomeScreen: checkingHomeScreen,
        requestFullscreen: () => {
          try {
            const promise = requestFullscreen.ifAvailable();
            if (promise && typeof (promise as unknown as Promise<unknown>).catch === "function") {
              (promise as unknown as Promise<unknown>).catch(() => {});
            }
          } catch { /* ignore */ }
        },
        exitFullscreen: () => {
          try {
            const promise = exitFullscreen.ifAvailable();
            if (promise && typeof (promise as unknown as Promise<unknown>).catch === "function") {
              (promise as unknown as Promise<unknown>).catch(() => {});
            }
          } catch { /* ignore */ }
        },
        addToHomeScreen: () => {
          try { addToHomeScreen.ifAvailable(); } catch { /* ignore */ }
        },
        checkHomeScreen: doCheckHomeScreen,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegramContext() {
  return useContext(TelegramContext);
}
