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

  useEffect(() => {
    const checkTelegram = () => {
      const inTg = isTMA() || (typeof window !== "undefined" && !!window.Telegram?.WebApp);
      if (inTg) {
        setIsInTelegram(true);
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          handleTelegramAuth(initData);
        }
      }
    };

    // Try immediately and after a short delay
    checkTelegram();
    const timer = setTimeout(checkTelegram, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTelegramAuth(initData: string) {
    setIsLoading(true);
    onLoadingChange?.(true);
    setAuthError(null);

    try {
      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
        return;
      }

      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error ?? "Telegram authentication failed";
        setAuthError(errMsg);
        toast(errMsg, { type: "error" });
        return;
      }

      if (data.session) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (error) {
          setAuthError("Failed to set session");
          toast("Failed to set session", { type: "error" });
          return;
        }

        toast(`Welcome, ${data.user.first_name}!`, { type: "success" });
        router.replace("/dashboard");
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
          if (initData) handleTelegramAuth(initData);
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
    </div>
  );
}
