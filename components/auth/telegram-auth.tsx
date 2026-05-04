"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { isTMA } from "@telegram-apps/sdk";

function getInitDataFromUrl(): string | null {
  try {
    // Telegram sometimes passes initData in URL query or hash
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
  if (raw) return { data: raw, source: "webapp.initData" };

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

export function TelegramAuthButton({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const checkTelegram = () => {
      try {
        const hasTma = isTMA();
        const hasWebApp = typeof window !== "undefined" && !!window.Telegram?.WebApp;
        const { data, source } = getInitData();

        if (hasTma || hasWebApp) {
          setIsInTelegram(true);
          setDebugInfo(`source: ${source} | length: ${data?.length ?? 0}`);

          if (data) {
            handleTelegramAuth(data);
          }
        }
      } catch (err) {
        setDebugInfo(`err: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    checkTelegram();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTelegramAuth(initData: string) {
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
        setAuthError(errMsg);
        toast(errMsg, { type: "error" });
        return;
      }

      if (responseData.session) {
        const { error } = await supabase.auth.setSession({
          access_token: responseData.session.access_token,
          refresh_token: responseData.session.refresh_token,
        });

        if (error) {
          setAuthError("Failed to set session");
          toast("Failed to set session", { type: "error" });
          return;
        }

        toast(`Welcome, ${responseData.user.first_name}!`, { type: "success" });
        router.replace("/dashboard");
      } else {
        setAuthError("No session returned from server");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      setAuthError(msg);
      toast(msg, { type: "error" });
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }

  if (!isInTelegram) return null;

  return (
    <div className="space-y-2">
      <Button
        className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white"
        onClick={() => {
          const { data, source } = getInitData();
          if (data) {
            handleTelegramAuth(data);
          } else {
            setAuthError(`No initData found (${source}). Close and reopen from the bot menu.`);
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4 mr-2" />
        )}
        {isLoading ? "Connecting..." : "Continue with Telegram"}
      </Button>
      {authError && (
        <p className="text-xs text-red-500 text-center">{authError}</p>
      )}
      {debugInfo && (
        <p className="text-[10px] text-slate-400 text-center font-mono">{debugInfo}</p>
      )}
    </div>
  );
}
