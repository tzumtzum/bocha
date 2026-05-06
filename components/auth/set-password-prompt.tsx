"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { Lock, X, Loader2 } from "lucide-react";

const PROMPT_DISMISSED_KEY = "bobo_password_prompt_dismissed";
const NEW_USER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function SetPasswordPrompt() {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) return;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user?.created_at) return;
      const createdAt = new Date(user.created_at).getTime();
      const now = Date.now();
      if (now - createdAt < NEW_USER_WINDOW_MS) {
        setVisible(true);
      }
    });
  }, [supabase]);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast("Password set! You can now sign in with email and password.", {
        type: "success",
      });
      setVisible(false);
      localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Set a password
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              So you can sign in with email + password next time instead of magic links.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <Label htmlFor="new-password" className="text-xs text-emerald-700 dark:text-emerald-300">
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800"
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="text-xs text-emerald-700 dark:text-emerald-300">
            Confirm password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800"
            required
          />
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <Button
          type="submit"
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={loading}
        >
          {loading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
          Set Password
        </Button>
      </form>
    </div>
  );
}
