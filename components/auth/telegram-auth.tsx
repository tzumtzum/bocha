"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { isTMA } from "@telegram-apps/sdk";

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
        const initData = window.Telegram?.WebApp?.initData;
        const initDataUnsafe = window.Telegram?.WebApp?.initDataUnsafe;

        if (hasTma || hasWebApp) {
          setIsInTelegram(true);
          setDebugInfo(`initData length: ${initData?.length ?? 0}`);

          if (initData) {
            handleTelegramAuth(initData);
          } else if (initDataUnsafe?.hash) {
            // Fallback: build initData string from initDataUnsafe if raw initData is missing
            const params = new URLSearchParams();
            params.set("auth_date", String(initDataUnsafe.auth_date));
            params.set("hash", initDataUnsafe.hash);
            if (initDataUnsafe.user) {
              params.set("user", JSON.stringify(initDataUnsafe.user));
            }
            if (initDataUnsafe.query_id) {
              params.set("query_id", initDataUnsafe.query_id);
            }
            handleTelegramAuth(params.toString());
          }
        }
      } catch (err) {
        setDebugInfo(`Detection error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    checkTelegram();
    const timer = setTimeout(checkTelegram, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTelegramAuth(initData: string) {
    setIsLoading(true);
    onLoadingChange?.(true);
    setAuthError(null);

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
        return;
      }

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
          const initData = window.Telegram?.WebApp?.initData;
          const initDataUnsafe = window.Telegram?.WebApp?.initDataUnsafe;

          if (initData) {
            handleTelegramAuth(initData);
          } else if (initDataUnsafe?.hash) {
            const params = new URLSearchParams();
            params.set("auth_date", String(initDataUnsafe.auth_date));
            params.set("hash", initDataUnsafe.hash);
            if (initDataUnsafe.user) {
              params.set("user", JSON.stringify(initDataUnsafe.user));
            }
            if (initDataUnsafe.query_id) {
              params.set("query_id", initDataUnsafe.query_id);
            }
            handleTelegramAuth(params.toString());
          } else {
            setAuthError("No Telegram initData found. Try closing and reopening the app.");
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
