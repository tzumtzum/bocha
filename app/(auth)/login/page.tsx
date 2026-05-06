"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bird, Loader2, Play } from "lucide-react";
import { TelegramAuthButton, useIsInTelegram } from "@/components/auth/telegram-auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const router = useRouter();

  function switchMode(newMode: "signin" | "signup") {
    setMode(newMode);
    setError(null);
    setResetSent(false);
  }
  const supabase = createClient();
  const isInTelegram = useIsInTelegram();

  // Redirect in background if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) throw error;
        setMode("signin");
        setError("Account created! You can now sign in.");
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError("Please enter your email above first");
      return;
    }
    setLoading(true);
    setError(null);
    setResetSent(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoMode() {
    if (!isDemoEnabled) {
      setError("Demo mode is not enabled");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@example.com",
        password: "demo",
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo mode failed");
      setLoading(false);
    }
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  const isDemoEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" || isPlaceholder;

  const showEmail = !isInTelegram || showEmailForm;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-2xl flex items-center justify-center mb-4">
            <Bird className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Bobo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Your bird&apos;s health companion
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Sign in to track your birds"
                : "Start tracking your bird's health"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  error.includes("Account created")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {error}
              </div>
            )}

            {resetSent ? (
              <div className="text-center py-4">
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  Reset email sent!
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Check your email to set a new password.
                </p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setResetSent(false);
                    setError(null);
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                {isInTelegram && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        You&apos;re in Telegram
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tap the button below to sign in instantly
                      </p>
                    </div>
                    <TelegramAuthButton />
                    <button
                      onClick={() => setShowEmailForm(!showEmailForm)}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-center py-2"
                    >
                      {showEmailForm ? "Hide email sign in ↑" : "Sign in with email instead ↓"}
                    </button>
                  </div>
                )}

                {showEmail && (
                  <>
                    {!isInTelegram && <TelegramAuthButton />}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                          or
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-3">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          {mode === "signin" && (
                            <button
                              type="button"
                              onClick={handleResetPassword}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {mode === "signin" ? "Sign In" : "Sign Up"}
                      </Button>
                    </form>

                    {isDemoEnabled && (
                      <Button
                        variant="secondary"
                        className="w-full bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-200"
                        onClick={handleDemoMode}
                        disabled={loading}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Try Demo Mode
                      </Button>
                    )}

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                      {mode === "signin" ? (
                        <>
                          Don&apos;t have an account?{" "}
                          <button
                            onClick={() => switchMode("signup")}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            Sign up
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            onClick={() => switchMode("signin")}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </p>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
