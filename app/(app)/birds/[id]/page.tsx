"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WeightAlert } from "@/components/birds/weight-alert";
import dynamic from "next/dynamic";

const WeightChart = dynamic(
  () => import("@/components/charts/weight-chart").then((m) => m.WeightChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);
import { SafeImage } from "@/components/ui/safe-image";
import { formatWeight, formatDate, formatTime } from "@/lib/utils";
import { useWeightUnit } from "@/lib/hooks/use-weight-unit";
import { getDemoPhotoUrl } from "@/lib/utils/photo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Archive,
  Download,
  ClipboardList,
  Pencil,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { PageBackButton } from "@/components/layout/page-back-button";
import { toast, confirmDialog } from "@/lib/toast";

interface BirdDetail {
  id: string;
  user_id: string;
  name: string;
  species: string;
  date_of_birth: string | null;
  date_type: string;
  target_weight: number | null;
  current_weight: number | null;
  avatar_color: { bg: string; fg: string };
  status: string;
}

interface DailyLog {
  id: string;
  log_date: string;
  weight: number | null;
  overall_status: string;
  observations: string | null;
  poop_photo_url: string | null;
  logged_at: string;
  created_at: string;
}

export default function BirdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const birdId = params.id as string;

  const [bird, setBird] = useState<BirdDetail | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editTargetWeight, setEditTargetWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const weightUnit = useWeightUnit();

  // Log editing state
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [editLogId, setEditLogId] = useState("");
  const [editLogDate, setEditLogDate] = useState("");
  const [editLogWeight, setEditLogWeight] = useState("");
  const [editLogStatus, setEditLogStatus] = useState("normal");
  const [editLogObservations, setEditLogObservations] = useState("");
  const [editLogSaving, setEditLogSaving] = useState(false);

  // Add retroactive log state
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [addLogDate, setAddLogDate] = useState("");
  const [addLogWeight, setAddLogWeight] = useState("");
  const [addLogStatus, setAddLogStatus] = useState("normal");
  const [addLogObservations, setAddLogObservations] = useState("");
  const [addLogSaving, setAddLogSaving] = useState(false);

  useEffect(() => {
    if (bird) {
      setEditName(bird.name);
      setEditSpecies(bird.species);
      setEditTargetWeight(bird.target_weight?.toString() || "");
    }
  }, [bird]);

  useEffect(() => {
    async function fetchData() {
      const { data: birdData } = await supabase
        .from("birds")
        .select("*")
        .eq("id", birdId)
        .single();

      if (birdData) setBird(birdData as unknown as BirdDetail);

      const { data: logsData } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("bird_id", birdId)
        .order("log_date", { ascending: false })
        .limit(30);

      if (logsData) setLogs(logsData as unknown as DailyLog[]);
      setLoading(false);
    }

    fetchData();
  }, [supabase, birdId]);

  async function handleArchive() {
    confirmDialog(
      "Archive this bird? You can restore it later.",
      async () => {
        await supabase.from("birds").update({ status: "monitoring" }).eq("id", birdId);
        router.push("/dashboard");
      },
      () => {}
    );
  }

  async function handleSaveEdit() {
    if (!bird) return;
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (editName.trim()) updates.name = editName.trim();
    if (editSpecies.trim()) updates.species = editSpecies.trim();
    if (editTargetWeight !== "" && !isNaN(parseFloat(editTargetWeight))) {
      updates.target_weight = parseFloat(editTargetWeight);
    }

    await supabase.from("birds").update(updates).eq("id", birdId);

    const { data: updatedBird } = await supabase
      .from("birds")
      .select("*")
      .eq("id", birdId)
      .single();

    if (updatedBird) setBird(updatedBird as unknown as BirdDetail);
    setSaving(false);
    setEditOpen(false);
  }

  function openEditLog(log: DailyLog) {
    setEditLogId(log.id);
    setEditLogDate(log.log_date);
    setEditLogWeight(log.weight != null ? String(log.weight) : "");
    setEditLogStatus(log.overall_status);
    setEditLogObservations(log.observations || "");
    setEditLogOpen(true);
  }

  async function handleSaveLogEdit() {
    if (!editLogId) return;
    setEditLogSaving(true);

    const weight = parseFloat(editLogWeight);
    if (isNaN(weight)) {
      toast("Please enter a valid weight", { type: "error" });
      setEditLogSaving(false);
      return;
    }

    await supabase
      .from("daily_logs")
      .update({
        log_date: editLogDate,
        weight,
        overall_status: editLogStatus,
        observations: editLogObservations || null,
      })
      .eq("id", editLogId);

    setLogs((prev) =>
      prev
        .map((l) =>
          l.id === editLogId
            ? {
                ...l,
                log_date: editLogDate,
                weight,
                overall_status: editLogStatus,
                observations: editLogObservations || null,
              }
            : l
        )
        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
    );

    setEditLogOpen(false);
    setEditLogSaving(false);
  }

  async function handleDeleteLog(log: DailyLog) {
    confirmDialog(
      "Delete this log? This cannot be undone.",
      async () => {
        await supabase.from("daily_logs").delete().eq("id", log.id);
        setLogs((prev) => prev.filter((l) => l.id !== log.id));
        toast("Log deleted", { type: "success" });
      },
      () => {}
    );
  }

  function openAddLog() {
    const today = new Date().toISOString().split("T")[0];
    setAddLogDate(today);
    setAddLogWeight("");
    setAddLogStatus("normal");
    setAddLogObservations("");
    setAddLogOpen(true);
  }

  async function handleSaveAddLog() {
    if (!bird) return;
    setAddLogSaving(true);

    const weight = parseFloat(addLogWeight);
    if (isNaN(weight)) {
      toast("Please enter a valid weight", { type: "error" });
      setAddLogSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const logData = {
      bird_id: bird.id,
      user_id: bird.user_id,
      log_date: addLogDate,
      log_type: "quick" as const,
      weight,
      weight_unit: weightUnit,
      overall_status: addLogStatus,
      observations: addLogObservations || null,
      logged_at: now,
      created_at: now,
    };

    const { error } = await supabase.from("daily_logs").insert(logData);

    if (error) {
      console.error("Failed to add log:", error);
      toast("Failed to add log. Please try again.", { type: "error" });
      setAddLogSaving(false);
      return;
    }

    const newLog: DailyLog = {
      id: Math.random().toString(36).substring(2, 15),
      log_date: addLogDate,
      weight,
      overall_status: addLogStatus,
      observations: addLogObservations || null,
      poop_photo_url: null,
      logged_at: now,
      created_at: now,
    };

    setLogs((prev) =>
      [newLog, ...prev].sort(
        (a, b) =>
          new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
      )
    );

    setAddLogOpen(false);
    setAddLogSaving(false);
  }

  async function handleExport() {
    const csv = [
      "Date,Weight,Status,Observations",
      ...logs.map(
        (l) =>
          `${l.log_date},${l.weight || ""},${l.overall_status},"${(l.observations || "").replace(/"/g, '""')}"`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bird?.name || "bird"}_logs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!bird) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-500">Bird not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const recentWeights = logs
    .filter((l) => l.weight != null)
    .slice(0, 7)
    .reverse();
  const avgWeight =
    recentWeights.length > 0
      ? recentWeights.reduce((s, l) => s + l.weight!, 0) / recentWeights.length
      : null;

  const latestLog = logs[0];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <PageBackButton href="/dashboard" />
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              backgroundColor: bird.avatar_color?.bg || "#e0f2fe",
              color: bird.avatar_color?.fg || "#0ea5e9",
            }}
          >
            {bird.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{bird.name}</h1>
            <p className="text-xs text-slate-500">
              {bird.species} • {formatWeight(bird.current_weight, weightUnit)}
            </p>
          </div>
        </div>
      </div>

      {/* Weight Alert */}
      {latestLog?.weight != null && avgWeight != null && (
        <WeightAlert
          currentWeight={latestLog.weight}
          previousWeight={avgWeight}
        />
      )}

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <WeightChart
            data={logs.map((l) => ({ log_date: l.log_date, weight: l.weight }))}
            targetWeight={bird.target_weight}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
          <Link href={`/log/quick?birdId=${birdId}`}>
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Quick Log
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/log/full?birdId=${birdId}`}>
            <FileText className="w-4 h-4 mr-1.5" />
            Full Log
          </Link>
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label="Edit" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Export" onClick={handleExport}>
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Archive" onClick={handleArchive}>
          <Archive className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Log Dialog */}
      <Dialog open={editLogOpen} onOpenChange={setEditLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-log-date">Date</Label>
              <Input
                id="edit-log-date"
                type="date"
                value={editLogDate}
                onChange={(e) => setEditLogDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-log-weight">Weight ({weightUnit})</Label>
              <Input
                id="edit-log-weight"
                type="number"
                inputMode="decimal"
                value={editLogWeight}
                onChange={(e) => setEditLogWeight(e.target.value)}
                className="text-xl font-bold text-center"
                autoFocus
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { value: "normal", label: "Normal", emoji: "😊", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
                  { value: "off", label: "Off", emoji: "🤔", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
                  { value: "concerning", label: "Bad", emoji: "😟", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditLogStatus(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      editLogStatus === opt.value
                        ? `border-emerald-500 ${opt.color}`
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-log-obs">Observations</Label>
              <Textarea
                id="edit-log-obs"
                value={editLogObservations}
                onChange={(e) => setEditLogObservations(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditLogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLogEdit}
              disabled={editLogSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {editLogSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bird Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bird Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={bird.name}
              />
            </div>
            <div>
              <Label htmlFor="edit-species">Species</Label>
              <Input
                id="edit-species"
                value={editSpecies}
                onChange={(e) => setEditSpecies(e.target.value)}
                placeholder={bird.species}
              />
            </div>
            <div>
              <Label htmlFor="edit-target">Target Weight (g)</Label>
              <Input
                id="edit-target"
                type="number"
                inputMode="decimal"
                value={editTargetWeight}
                onChange={(e) => setEditTargetWeight(e.target.value)}
                placeholder={bird.target_weight?.toString() || "95"}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Log Dialog */}
      <Dialog open={addLogOpen} onOpenChange={setAddLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Log for {bird.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="add-log-date">Date</Label>
              <Input
                id="add-log-date"
                type="date"
                value={addLogDate}
                onChange={(e) => setAddLogDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-log-weight">Weight ({weightUnit})</Label>
              <Input
                id="add-log-weight"
                type="number"
                inputMode="decimal"
                value={addLogWeight}
                onChange={(e) => setAddLogWeight(e.target.value)}
                className="text-xl font-bold text-center mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { value: "normal", label: "Normal", emoji: "😊", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
                  { value: "off", label: "Off", emoji: "🤔", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
                  { value: "concerning", label: "Bad", emoji: "😟", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAddLogStatus(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      addLogStatus === opt.value
                        ? `border-emerald-500 ${opt.color}`
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="add-log-obs">Observations</Label>
              <Textarea
                id="add-log-obs"
                value={addLogObservations}
                onChange={(e) => setAddLogObservations(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddLogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAddLog}
              disabled={addLogSaving || !addLogDate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {addLogSaving ? "Saving..." : "Add Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent Logs */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Logs</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={openAddLog}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Log
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(log.log_date)}{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      {formatTime(log.logged_at || log.created_at)}
                    </span>
                  </p>
                  {log.observations && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {log.observations}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {log.weight != null && (
                    <span className="text-sm font-medium">
                      {formatWeight(log.weight, weightUnit)}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      log.overall_status === "normal"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : log.overall_status === "off"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {log.overall_status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit log"
                    className="h-6 w-6 text-slate-400 hover:text-slate-600"
                    onClick={() => openEditLog(log)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete log"
                    className="h-6 w-6 text-slate-400 hover:text-red-600"
                    onClick={() => handleDeleteLog(log)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {log.poop_photo_url && (
                <div className="relative mt-2 w-full h-24">
                  <SafeImage
                    src={getDemoPhotoUrl(log.poop_photo_url) || log.poop_photo_url}
                    alt="Droppings photo"
                    fill
                    className="object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              No logs yet. Start tracking today!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
