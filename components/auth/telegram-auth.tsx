"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";

function getInitDataFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const fromSearch = url.searchParams.get("tgWebAppData");
    if (fromSearch) return fromSearch;

    const hash = window.location.hash;
    if (hash.includes("tgWebAppData=")) {
      const match = hash.match(/tgWebAppData=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch {
    // ignore
  }
  return null;
}

function getInitData(): { data: string | null; source: string } {
  // 1. Try raw window.Telegram.WebApp.initData
  const raw = window.Telegram?.WebApp?.initData;
  if (raw && raw.length > 10) return { data: raw, source: "webapp.initData" };

  // 2. Try initDataUnsafe hash
  const unsafe = window.Telegram?.WebApp?.initDataUnsafe;
  if (unsafe?.hash) {
    const params = new URLSearchParams();
    params.set("auth_date", String(unsafe.auth_date));
    params.set("hash", unsafe.hash);
    if (unsafe.user) params.set("user", JSON.stringify(unsafe.user));
    if (unsafe.query_id) params.set("query_id", unsafe.query_id);
    return { data: params.toString(), source: "initDataUnsafe" };
  }

  // 3. Try URL params
  const fromUrl = getInitDataFromUrl();
  if (fromUrl) return { data: fromUrl, source: "url" };

  return { data: null, source: "none" };
}

function isTelegramEnv(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Check for Telegram WebApp object
    if (!!window.Telegram?.WebApp) return true;
    // Check URL for Telegram params
    const url = new URL(window.location.href);
    if (url.searchParams.has("tgWebAppData")) return true;
    if (window.location.hash.includes("tgWebAppData=")) return true;
    // Check user agent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("telegram") || ua.includes("tgwebview")) return true;
  } catch {
    // ignore
  }
  return false;
}

export function TelegramAuthButton({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [initDataReady, setInitDataReady] = useState(false);
  const mountedRef = useRef(true);
  const attemptsRef = useRef(0);

  const handleTelegramAuth = useCallback(async (initData: string) => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    onLoadingChange?.(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errMsg = responseData.error ?? `Auth failed (${res.status})`;
        if (mountedRef.current) {
          setAuthError(errMsg);
          toast(errMsg, { type: "error" });
        }
        return;
      }

      if (responseData.session) {
        const { error } = await supabase.auth.setSession({
          access_token: responseData.session.access_token,
          refresh_token: responseData.session.refresh_token,
        });

        if (error) {
          if (mountedRef.current) {
            setAuthError("Failed to set session");
            toast("Failed to set session", { type: "error" });
          }
          return;
        }

        toast(`Welcome, ${responseData.user.first_name}!`, { type: "success" });
        router.replace("/dashboard");
      } else {
        if (mountedRef.current) {
          setAuthError("No session returned from server");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      if (mountedRef.current) {
        setAuthError(msg);
        toast(msg, { type: "error" });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
  }, [router, supabase, onLoadingChange]);

  // Poll for Telegram env and initData
  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkTelegram = () => {
      if (!mountedRef.current) return;

      const inTg = isTelegramEnv();
      const { data, source } = getInitData();
      attemptsRef.current += 1;

      if (inTg) {
        setIsInTelegram(true);
        setDebugInfo(`source: ${source} | length: ${data?.length ?? 0} | attempts: ${attemptsRef.current}`);

        if (data && data.length > 10) {
          setInitDataReady(true);
          handleTelegramAuth(data);
          return; // Stop polling once we have data and triggered auth
        }
      }

      // Continue polling up to 30 attempts (~3 seconds)
      if (attemptsRef.current < 30) {
        timeoutId = setTimeout(checkTelegram, 100);
      } else {
        // Done polling
        setDebugInfo(`source: ${source} | length: ${data?.length ?? 0} | attempts: ${attemptsRef.current} (done)`);
      }
    };

    // Start polling after a short delay to let Telegram inject WebApp
    timeoutId = setTimeout(checkTelegram, 50);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [handleTelegramAuth]);

  if (!isInTelegram) return null;

  return (
    <div className="space-y-3">
      <Button
        className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white h-12 text-base"
        onClick={() => {
          const { data, source } = getInitData();
          if (data && data.length > 10) {
            handleTelegramAuth(data);
          } else {
            setAuthError(
              `No Telegram auth data found (${source}). Close the app and reopen it from the bot menu. If the problem persists, try clearing the app's cache in Telegram Settings > Data and Storage.`
            );
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="w-5 h-5 mr-2" />
        )}
        {isLoading ? "Connecting to Telegram..." : "Continue with Telegram"}
      </Button>

      {!initDataReady && !isLoading && !authError && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Waiting for Telegram data...
        </p>
      )}

      {authError && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            {authError}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setAuthError(null);
              attemptsRef.current = 0;
              const { data } = getInitData();
              if (data && data.length > 10) {
                handleTelegramAuth(data);
              } else {
                setAuthError("Still no Telegram auth data. Please close and reopen the app from the bot menu.");
              }
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {debugInfo && (
        <p className="text-[10px] text-slate-400 text-center font-mono">{debugInfo}</p>
      )}
    </div>
  );
}

export function useIsInTelegram() {
  const [isInTelegram, setIsInTelegram] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsInTelegram(isTelegramEnv());
    };
    check();
    // Re-check a few times since Telegram WebApp might inject late
    const timers = [100, 500, 1000].map((ms) => setTimeout(check, ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  return isInTelegram;
}
