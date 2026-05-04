"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";

export function TelegramAuthButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      setIsInTelegram(true);
      // Auto-authenticate if initData is present and user is not already logged in
      const initData = window.Telegram.WebApp.initData;
      if (initData) {
        handleTelegramAuth(initData);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTelegramAuth(initData: string) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Telegram authentication failed", { type: "error" });
        return;
      }

      if (data.session) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (error) {
          toast("Failed to set session", { type: "error" });
          return;
        }

        toast(`Welcome, ${data.user.first_name}!`, { type: "success" });
        router.push("/dashboard");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Authentication error", { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isInTelegram) return null;

  return (
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
  );
}
