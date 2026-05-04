"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatWeight } from "@/lib/utils";
import { Loader2, Save, Bird, CheckCircle2 } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "normal", label: "Normal", emoji: "😊", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  { value: "off", label: "Off", emoji: "🤔", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { value: "concerning", label: "Bad", emoji: "😟", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

export interface BirdData {
  id: string;
  name: string;
  species: string;
  target_weight: number | null;
  current_weight: number | null;
  avatar_color: { bg: string; fg: string };
}

export interface BirdLogEntry {
  birdId: string;
  name: string;
  species: string;
  target_weight: number | null;
  current_weight: number | null;
  avatar_color: { bg: string; fg: string };
  weight: string;
  status: string;
}

export function SingleBirdLog({
  bird,
  weightUnit,
  onWeightUnitChange,
  onSave,
  saving,
}: {
  bird: BirdData;
  weightUnit: string;
  onWeightUnitChange: (u: string) => void;
  onSave: (data: {
    weight: string;
    weightUnit: string;
    status: string;
  }) => void;
  saving: boolean;
}) {
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState("normal");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: bird.avatar_color?.bg || "#e0f2fe",
                color: bird.avatar_color?.fg || "#0ea5e9",
              }}
            >
              <Bird className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {bird.name}
              </p>
              <p className="text-xs text-slate-500">{bird.species}</p>
              {bird.target_weight != null && (
                <p className="text-xs text-slate-400">
                  Target: {formatWeight(bird.target_weight, weightUnit)}
                </p>
              )}
            </div>
          </div>

          {/* Weight */}
          <div>
            <Label className="text-base">Weight</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-2xl font-bold h-14 text-center"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant={weightUnit === "g" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onWeightUnitChange("g")}
              >
                Grams (g)
              </Button>
              <Button
                variant={weightUnit === "oz" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onWeightUnitChange("oz")}
              >
                Ounces (oz)
              </Button>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-base">How are they doing?</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    status === opt.value
                      ? `border-emerald-500 ${opt.color}`
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => onSave({ weight, weightUnit, status })}
        disabled={!weight || saving}
        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
      >
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        <Save className="w-4 h-4 mr-1.5" />
        Save Log
      </Button>
    </div>
  );
}

export function MultiBirdLog({
  birds,
  weightUnit,
  onWeightUnitChange,
  onSave,
  saving,
}: {
  birds: BirdData[];
  weightUnit: string;
  onWeightUnitChange: (u: string) => void;
  onSave: (entries: BirdLogEntry[]) => void;
  saving: boolean;
}) {
  const [entries, setEntries] = useState<BirdLogEntry[]>(() =>
    birds.map((b) => ({
      birdId: b.id,
      name: b.name,
      species: b.species,
      target_weight: b.target_weight,
      current_weight: b.current_weight,
      avatar_color: b.avatar_color,
      weight: "",
      status: "normal",
    }))
  );

  const filledCount = entries.filter((e) => e.weight.trim() !== "").length;

  function updateEntry(
    birdId: string,
    patch: Partial<Omit<BirdLogEntry, "birdId">>
  ) {
    setEntries((prev) =>
      prev.map((e) => (e.birdId === birdId ? { ...e, ...patch } : e))
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact unit toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {filledCount === 0
            ? "Enter weight for each bird"
            : `${filledCount} of ${entries.length} ready`}
        </p>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => onWeightUnitChange("g")}
            className={`px-3 py-1 text-xs font-medium ${
              weightUnit === "g"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
            }`}
          >
            g
          </button>
          <button
            onClick={() => onWeightUnitChange("oz")}
            className={`px-3 py-1 text-xs font-medium ${
              weightUnit === "oz"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
            }`}
          >
            oz
          </button>
        </div>
      </div>

      {/* Compact bird entries */}
      {entries.map((entry, index) => (
        <Card key={entry.birdId} className="overflow-hidden">
          <CardContent className="p-3 space-y-2">
            {/* Row 1: Avatar + info + checkmark */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: entry.avatar_color?.bg || "#e0f2fe",
                    color: entry.avatar_color?.fg || "#0ea5e9",
                  }}
                >
                  <Bird className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {entry.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {entry.species}
                    {entry.target_weight != null && (
                      <span className="ml-1 text-slate-400">
                        · target {formatWeight(entry.target_weight, weightUnit)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {entry.weight.trim() !== "" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              )}
            </div>

            {/* Row 2: Weight input */}
            <Input
              type="number"
              inputMode="decimal"
              placeholder={weightUnit}
              value={entry.weight}
              onChange={(e) =>
                updateEntry(entry.birdId, { weight: e.target.value })
              }
              className="h-10 text-lg font-bold text-center w-full"
              autoFocus={index === 0}
            />

            {/* Row 3: Status buttons with labels */}
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    updateEntry(entry.birdId, { status: opt.value })
                  }
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border-2 transition-all ${
                    entry.status === opt.value
                      ? `border-emerald-500 ${opt.color}`
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save */}
      <Button
        onClick={() => onSave(entries)}
        disabled={filledCount === 0 || saving}
        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
      >
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        <Save className="w-4 h-4 mr-1.5" />
        Save {filledCount > 0 ? `${filledCount} Log${filledCount > 1 ? "s" : ""}` : "Logs"}
      </Button>
    </div>
  );
}
