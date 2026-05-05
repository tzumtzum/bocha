"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import {
  Bell,
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  Trash2,
  LogOut,
  Weight,
  Clock,
  AlertTriangle,
  ArchiveRestore,
  Bird,
  Crown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Maximize,
  Minimize,
  Home,
  Users,
  Copy,
  Check,
  UserPlus,
  Bug,
} from "lucide-react";
import { useTelegramContext } from "@/components/layout/telegram-provider";
import { toast, confirmDialog } from "@/lib/toast";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const tg = useTelegramContext();

  const [, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [weightUnit, setWeightUnit] = useState("g");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [archivedBirds, setArchivedBirds] = useState<{ id: string; name: string; species: string }[]>([]);
  const [activeBirds, setActiveBirds] = useState<{ id: string; name: string; species: string; sort_order: number }[]>([]);
  const [importing, setImporting] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flock sharing state
  const [flockId, setFlockId] = useState("");
  const [flockName, setFlockName] = useState("");
  const [flockMembers, setFlockMembers] = useState<{ id: string; user_id: string; role: string; full_name: string | null }[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as Record<string, unknown>);
        setRemindersEnabled(data.reminders_enabled || false);
        setWeightUnit(data.weight_unit || "g");
        setReminderTime(data.reminder_time || "09:00");
        setQuietStart(data.quiet_hours_start || "22:00");
        setQuietEnd(data.quiet_hours_end || "07:00");
        setIsPro(data.is_pro || false);
      }

      // Fetch user's flock memberships
      const { data: memberships } = await supabase
        .from("flock_members")
        .select("flock_id, role")
        .eq("user_id", user.id);

      const membership = memberships?.[0];
      if (membership) {
        setUserRole(membership.role);
        setFlockId(membership.flock_id);

        // Fetch flock details
        const { data: flockData } = await supabase
          .from("flocks")
          .select("name")
          .eq("id", membership.flock_id)
          .single();

        if (flockData) {
          setFlockName(flockData.name || "My Flock");
        }

        // Fetch flock members with profiles
        const { data: members } = await supabase
          .from("flock_members")
          .select("id, user_id, role, profiles(full_name)")
          .eq("flock_id", membership.flock_id)
          .order("joined_at", { ascending: true });

        if (members) {
          setFlockMembers(
            members.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              user_id: m.user_id as string,
              role: m.role as string,
              full_name: (m.profiles as Record<string, unknown> | null)?.full_name as string | null,
            }))
          );
        }
      }

      // Fetch archived birds (from user's flocks)
      const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];
      let archived: unknown[] = [];
      let active: unknown[] = [];

      if (flockIds.length > 0) {
        const { data: archivedData } = await supabase
          .from("birds")
          .select("id, name, species")
          .in("flock_id", flockIds)
          .eq("status", "monitoring");
        archived = archivedData ?? [];

        const { data: activeData } = await supabase
          .from("birds")
          .select("id, name, species, sort_order")
          .in("flock_id", flockIds)
          .eq("status", "active")
          .order("sort_order", { ascending: true });
        active = activeData ?? [];
      }

      setArchivedBirds(archived as { id: string; name: string; species: string }[]);
      setActiveBirds(active as { id: string; name: string; species: string; sort_order: number }[]);
    }
    fetchProfile();
  }, [supabase]);

  async function handleSavePreferences() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        reminders_enabled: remindersEnabled,
        weight_unit: weightUnit,
        reminder_time: reminderTime,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        theme,
      })
      .eq("id", user.id);

    setLoading(false);
    toast("Preferences saved!", { type: "success" });
  }

  async function handleExportData(birdId?: string, birdName?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false });

    if (birdId) {
      query = query.eq("bird_id", birdId);
    }

    const { data: logs } = await query;

    const { data: birdsData } = await supabase
      .from("birds")
      .select("id, name")
      .eq("user_id", user.id);

    if (!logs || logs.length === 0) {
      toast("No data to export for this selection.", { type: "warning" });
      return;
    }

    const birdNameMap = new Map(
      (birdsData ?? []).map((b: Record<string, unknown>) => [b.id, b.name])
    );

    const csv = [
      "Date,Bird Name,Weight,Weight Unit,Status,Activity,Appetite,Observations",
      ...logs.map((l: Record<string, unknown>) => {
        return [
          l.log_date,
          birdNameMap.get(l.bird_id) || "",
          l.weight != null ? l.weight : "",
          l.weight_unit,
          l.overall_status,
          l.activity_level,
          l.appetite,
          `"${String(l.observations || "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = birdName
      ? `${birdName.replace(/\s+/g, "_")}_logs.csv`
      : "bobo_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    confirmDialog(
      "WARNING: This will permanently delete your account and all data. This cannot be undone. Are you sure?",
      () => handleDeleteAccountConfirmed(),
      () => {}
    );
    return;
  }

  async function handleDeleteAccountConfirmed() {

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Delete user's birds (cascade will handle logs)
    await supabase.from("birds").delete().eq("user_id", user.id);

    // In demo mode, clear all localStorage data
    const isDemo =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");
    if (isDemo) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("bobo_demo_"))
        .forEach((key) => localStorage.removeItem(key));
    }

    // Sign out
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleImportCSV(file: File) {
    setImporting(true);
    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toast("CSV file is empty or missing header", { type: "error" });
      setImporting(false);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const dateIdx = headers.indexOf("date");
    const birdIdx = headers.indexOf("bird name");
    const weightIdx = headers.indexOf("weight");
    const statusIdx = headers.indexOf("status");
    const observationsIdx = headers.indexOf("observations");

    if (dateIdx === -1 || birdIdx === -1 || weightIdx === -1) {
      toast("CSV must have Date, Bird Name, and Weight columns", { type: "error" });
      setImporting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: birds } = await supabase
      .from("birds")
      .select("id, name")
      .eq("user_id", user.id);

    const birdMap = new Map(
      (birds ?? []).map((b: Record<string, unknown>) => [b.name, b.id])
    );

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const birdName = cols[birdIdx];
      const birdId = birdMap.get(birdName);
      if (!birdId) continue;

      const weight = parseFloat(cols[weightIdx]);
      if (isNaN(weight)) continue;

      await supabase.from("daily_logs").upsert(
        {
          bird_id: birdId,
          user_id: user.id,
          log_date: cols[dateIdx],
          log_type: "quick",
          weight,
          weight_unit: weightUnit,
          overall_status:
            statusIdx >= 0 ? cols[statusIdx] || "normal" : "normal",
          observations:
            observationsIdx >= 0 ? cols[observationsIdx] || null : null,
        },
        { onConflict: "bird_id,log_date" }
      );
      imported++;
    }

    setImporting(false);
    toast(`Imported ${imported} log entries!`, { type: "success" });
  }

  async function handleGenerateInvite() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const membership = flockMembers.find((m) => m.user_id === user.id);
    if (!membership) return;

    setGeneratingInvite(true);
    try {
      const res = await fetch("/api/flock/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flock_id: membership.id ? membership.id.split("-")[0] : "", role: inviteRole }),
      });

      const result = await res.json();
      if (res.ok && result.inviteUrl) {
        setInviteLink(result.inviteUrl);
      } else {
        toast(result.error || "Failed to generate invite", { type: "error" });
      }
    } catch {
      toast("Failed to generate invite", { type: "error" });
    }
    setGeneratingInvite(false);
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy link", { type: "error" });
    }
  }

  async function handleRevokeMember(userId: string) {
    confirmDialog("Remove this member from the flock?", async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("flock_members")
        .delete()
        .eq("flock_id", flockId)
        .eq("user_id", userId);

      if (error) {
        toast("Failed to remove member", { type: "error" });
        return;
      }

      setFlockMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast("Member removed", { type: "success" });
    });
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Pro Status */}
      <Card className={isPro ? "border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className={`w-4 h-4 ${isPro ? "text-amber-500" : "text-slate-400"}`} />
            Pro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-medium">You&apos;re on Pro — unlimited birds!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Upgrade to Pro for unlimited birds and more features.
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  setUpgrading(true);
                  await supabase.from("profiles").update({ is_pro: true }).eq("id", user.id);
                  setIsPro(true);
                  setUpgrading(false);
                  toast("Welcome to Pro!", { type: "success" });
                }}
                disabled={upgrading}
              >
                {upgrading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5 animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-1.5" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setTheme("light")}
            >
              <Sun className="w-4 h-4 mr-1.5" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setTheme("dark")}
            >
              <Moon className="w-4 h-4 mr-1.5" />
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setTheme("system")}
            >
              <Monitor className="w-4 h-4 mr-1.5" />
              Auto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram */}
      {tg?.isInTelegram && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Fullscreen toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Fullscreen</p>
                <p className="text-xs text-slate-500">
                  {tg.isFullscreen ? "Active" : "Inactive"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  tg.isFullscreen ? tg.exitFullscreen() : tg.requestFullscreen()
                }
              >
                {tg.isFullscreen ? (
                  <Minimize className="w-4 h-4 mr-1.5" />
                ) : (
                  <Maximize className="w-4 h-4 mr-1.5" />
                )}
                {tg.isFullscreen ? "Exit" : "Enter"}
              </Button>
            </div>

            {/* Add to home screen */}
            {tg.isCheckingHomeScreen ? (
              <p className="text-xs text-slate-500">Checking home screen status…</p>
            ) : tg.homeScreenStatus === "added" ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                Added to home screen
              </p>
            ) : tg.homeScreenStatus === "unsupported" ? (
              <p className="text-xs text-slate-500">
                Home screen shortcut not supported on this device.
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  tg.addToHomeScreen();
                  // Re-check after a delay since the native dialog may have been shown
                  setTimeout(() => tg.checkHomeScreen(), 3000);
                }}
              >
                <Home className="w-4 h-4 mr-2" />
                Add to Home Screen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Units */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Weight className="w-4 h-4" />
            Units
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={weightUnit === "g" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setWeightUnit("g")}
            >
              Grams (g)
            </Button>
            <Button
              variant={weightUnit === "oz" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setWeightUnit("oz")}
            >
              Ounces (oz)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders">Enable reminders</Label>
            <Switch
              id="reminders"
              checked={remindersEnabled}
              onCheckedChange={setRemindersEnabled}
            />
          </div>

          {remindersEnabled && (
            <>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Reminder time
                </Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quiet hours start</Label>
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Quiet hours end</Label>
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Export all */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleExportData()}
          >
            <Download className="w-4 h-4 mr-2" />
            All Birds
          </Button>

          {/* Per-bird exports */}
          {activeBirds.length > 0 && (
            <div className="space-y-1">
              {activeBirds.map((bird) => (
                <Button
                  key={bird.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-9 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleExportData(bird.id, bird.name)}
                >
                  <span className="text-sm">{bird.name}</span>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportCSV(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "Importing..." : "Import Data (CSV)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bird Order */}
      {activeBirds.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bird className="w-4 h-4" />
              Bird Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activeBirds.map((bird, index) => (
              <div
                key={bird.id}
                className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4">{index + 1}</span>
                  <p className="text-sm font-medium">{bird.name}</p>
                  <p className="text-xs text-slate-500">{bird.species}</p>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={async () => {
                      const newOrder = [...activeBirds];
                      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                      setActiveBirds(newOrder);
                      await supabase.from("birds").update({ sort_order: index - 1 }).eq("id", bird.id);
                      await supabase.from("birds").update({ sort_order: index }).eq("id", newOrder[index].id);
                    }}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === activeBirds.length - 1}
                    onClick={async () => {
                      const newOrder = [...activeBirds];
                      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                      setActiveBirds(newOrder);
                      await supabase.from("birds").update({ sort_order: index + 1 }).eq("id", bird.id);
                      await supabase.from("birds").update({ sort_order: index }).eq("id", newOrder[index].id);
                    }}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Archived Birds */}
      {archivedBirds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArchiveRestore className="w-4 h-4" />
              Archived Birds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {archivedBirds.map((bird) => (
              <div
                key={bird.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Bird className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{bird.name}</p>
                    <p className="text-xs text-slate-500">{bird.species}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase
                        .from("birds")
                        .update({ status: "active" })
                        .eq("id", bird.id);
                      setArchivedBirds((prev) =>
                        prev.filter((b) => b.id !== bird.id)
                      );
                    }}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                    onClick={async () => {
                      confirmDialog(
                        `Permanently delete ${bird.name}? This will remove all logs and cannot be undone.`,
                        async () => {
                          await supabase.from("daily_logs").delete().eq("bird_id", bird.id);
                          await supabase.from("birds").delete().eq("id", bird.id);
                          setArchivedBirds((prev) => prev.filter((b) => b.id !== bird.id));
                        },
                        () => {}
                      );
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <Button
        onClick={handleSavePreferences}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        Save Preferences
      </Button>

      <Separator />

      {/* Flock Sharing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Flock Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">{flockName || "My Flock"}</p>
            <p className="text-xs text-slate-500">
              Your role: <span className="capitalize font-medium">{userRole}</span>
            </p>
          </div>

          {/* Member list */}
          {flockMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Members</p>
              {flockMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                      {(member.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm">{member.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{member.role}</p>
                    </div>
                  </div>
                  {userRole === "owner" && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRevokeMember(member.user_id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Generate invite */}
          {userRole === "owner" || userRole === "admin" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Invite Member</p>
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  className="text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 dark:border-slate-700"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  {generatingInvite ? "Generating..." : "Generate Link"}
                </Button>
              </div>

              {inviteLink && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">
                    {inviteLink}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                Link expires in 24 hours or after first use.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Only owners and admins can invite new members.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => router.push("/debug")}
      >
        <Bug className="w-4 h-4 mr-2" />
        Debug Info
      </Button>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
        Bobo is for informational purposes only and is not a substitute for
        professional veterinary advice. Always consult a qualified avian
        veterinarian for medical concerns.
      </p>
    </div>
  );
}
