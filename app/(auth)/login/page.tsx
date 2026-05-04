"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bird, Loader2, Mail, Play } from "lucide-react";
import { TelegramAuthButton } from "@/components/auth/telegram-auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
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
        setError("Check your email to confirm your account!");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      // Mock client ignores credentials; real Supabase will reject these dummy values
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-500 text-sm">Checking session...</p>
        </div>
      </div>
    );
  }

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
                  error.includes("Check your email")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {error}
              </div>
            )}

            {magicLinkSent ? (
              <div className="text-center py-4">
                <Mail className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  Magic link sent!
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Check your email to sign in.
                </p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setMagicLinkSent(false)}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
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
                    <Label htmlFor="password">Password</Label>
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

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleMagicLink}
                  disabled={loading}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Magic Link
                </Button>

                <TelegramAuthButton />

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
                        onClick={() => setMode("signup")}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => setMode("signin")}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
