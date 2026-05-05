"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { queueOfflineLog } from "@/lib/db/offline-queue";
import { getTodayInTimezone } from "@/lib/utils";
import { useWeightUnit } from "@/lib/hooks/use-weight-unit";
import { Loader2, Save, X, ImagePlus } from "lucide-react";
import { PageBackButton } from "@/components/layout/page-back-button";
import { compressImage, getBirdPhotoCount } from "@/lib/utils/photo";
import { toast } from "@/lib/toast";
import { SafeImage } from "@/components/ui/safe-image";

const OVERALL_STATUS = [
  { value: "normal", label: "Normal" },
  { value: "off", label: "A bit off" },
  { value: "concerning", label: "Concerning" },
];

const ACTIVITY_LEVELS = [
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
  { value: "lethargic", label: "Lethargic" },
];

const APPETITES = [
  { value: "normal", label: "Normal" },
  { value: "reduced", label: "Reduced" },
  { value: "increased", label: "Increased" },
];

const POOP_COLORS = [
  { value: "green", label: "Green" },
  { value: "brown", label: "Brown" },
  { value: "black", label: "Black" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
];

const POOP_CONSISTENCY = [
  { value: "formed", label: "Formed" },
  { value: "loose", label: "Loose" },
  { value: "watery", label: "Watery" },
  { value: "dry", label: "Dry" },
];

const URATES_COLORS = [
  { value: "white", label: "White" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "brown", label: "Brown" },
  { value: "red", label: "Red" },
];

const URINE_AMOUNTS = [
  { value: "normal", label: "Normal" },
  { value: "increased", label: "Increased" },
  { value: "decreased", label: "Decreased" },
];

function FullLogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const birdId = searchParams.get("birdId");

  const [weight, setWeight] = useState("");
  const defaultUnit = useWeightUnit();
  const [weightUnit, setWeightUnit] = useState(defaultUnit);
  const [overallStatus, setOverallStatus] = useState("normal");
  const [activityLevel, setActivityLevel] = useState("normal");
  const [appetite, setAppetite] = useState("normal");
  const [poopFecesColor, setPoopFecesColor] = useState("");
  const [poopFecesConsistency, setPoopFecesConsistency] = useState("");
  const [poopUratesColor, setPoopUratesColor] = useState("");
  const [poopUrineAmount, setPoopUrineAmount] = useState("");
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [birdName, setBirdName] = useState("");
  const [userBirds, setUserBirds] = useState<{ id: string; name: string }[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (birdId) {
      supabase
        .from("birds")
        .select("name")
        .eq("id", birdId)
        .single()
        .then(({ data }: { data: { name: string } | null }) => {
          if (data) setBirdName(data.name);
        });
    } else {
      supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
        const user = data.user;
        if (!user) return;
        supabase
          .from("birds")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("status", "active")
          .then(({ data: birdsData }: { data: { id: string; name: string }[] | null }) => {
            if (birdsData) setUserBirds(birdsData);
          });
      });
    }
  }, [birdId, supabase]);

  async function handleSave() {
    if (!weight) return;
    if (!birdId && userBirds.length === 0) return;
    const targetBirdId = birdId || userBirds[0]?.id;
    if (!targetBirdId) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const logDate = getTodayInTimezone();
    let photoUrl: string | null = null;

    if (photoFile && targetBirdId) {
      setUploadingPhoto(true);
      try {
        const compressed = await compressImage(photoFile);
        const fileName = `${targetBirdId}/${logDate}-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from("bird-photos")
          .upload(fileName, compressed);
        if (!error && data) {
          photoUrl = data.path;
        }
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
      setUploadingPhoto(false);
    }

    const now = new Date().toISOString();
    const logData = {
      bird_id: targetBirdId,
      user_id: user.id,
      log_date: logDate,
      log_type: "full" as const,
      weight: parseFloat(weight),
      weight_unit: weightUnit,
      overall_status: overallStatus,
      activity_level: activityLevel,
      appetite: appetite,
      poop_feces_color: poopFecesColor || null,
      poop_feces_consistency: poopFecesConsistency || null,
      poop_urates_color: poopUratesColor || null,
      poop_urine_amount: poopUrineAmount || null,
      observations: observations || null,
      poop_photo_url: photoUrl,
      logged_at: now,
      created_at: now,
    };

    if (navigator.onLine) {
      const { error } = await supabase.from("daily_logs").insert(logData);

      if (error) {
        console.error("Supabase error, queuing offline:", error);
        await queueOfflineLog(logData);
      }

      await supabase
        .from("birds")
        .update({ current_weight: parseFloat(weight) })
        .eq("id", targetBirdId);
    } else {
      await queueOfflineLog(logData);
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <PageBackButton href="/dashboard" />
        <h1 className="text-lg font-bold">Full Log</h1>
      </div>

      {birdName && (
        <p className="text-sm text-slate-500 -mt-2 ml-10">for {birdName}</p>
      )}

      {!birdId && userBirds.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Select a bird</p>
            <div className="flex gap-2">
              {userBirds.map((b) => (
                <Button
                  key={b.id}
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/log/full?birdId=${b.id}`)}
                >
                  {b.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Weight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-xl font-bold"
            />
            <Button
              variant={weightUnit === "g" ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightUnit("g")}
            >
              g
            </Button>
            <Button
              variant={weightUnit === "oz" ? "default" : "outline"}
              size="sm"
              onClick={() => setWeightUnit("oz")}
            >
              oz
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">General Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Overall</Label>
            <div className="flex gap-2 mt-1">
              {OVERALL_STATUS.map((s) => (
                <Button
                  key={s.value}
                  variant={overallStatus === s.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOverallStatus(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Activity Level</Label>
            <div className="flex gap-2 mt-1">
              {ACTIVITY_LEVELS.map((s) => (
                <Button
                  key={s.value}
                  variant={activityLevel === s.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActivityLevel(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Appetite</Label>
            <div className="flex gap-2 mt-1">
              {APPETITES.map((s) => (
                <Button
                  key={s.value}
                  variant={appetite === s.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAppetite(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poop Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Droppings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Feces Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {POOP_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPoopFecesColor(c.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    poopFecesColor === c.value
                      ? "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Feces Consistency</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {POOP_CONSISTENCY.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPoopFecesConsistency(c.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    poopFecesConsistency === c.value
                      ? "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Urates Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {URATES_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPoopUratesColor(c.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    poopUratesColor === c.value
                      ? "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Urine Amount</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {URINE_AMOUNTS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setPoopUrineAmount(c.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    poopUrineAmount === c.value
                      ? "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Photo</Label>
            {photoPreview ? (
              <div className="relative mt-1.5">
                <SafeImage
                  src={photoPreview}
                  alt="Droppings preview"
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <button
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoFile(null);
                  }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <ImagePlus className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-500">Tap to add photo</span>
                <span className="text-[10px] text-slate-400">Max 3 per bird</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !birdId) return;
                    if (getBirdPhotoCount(birdId) >= 3) {
                      toast("This bird already has 3 photos. Delete one first.", { type: "warning" });
                      e.target.value = "";
                      return;
                    }
                    setPhotoFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setPhotoPreview(reader.result as string);
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Observations</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any other observations?"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={!weight || loading || uploadingPhoto}
        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 fixed bottom-20 left-4 right-4 max-w-md mx-auto"
      >
        {(loading || uploadingPhoto) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        <Save className="w-4 h-4 mr-1.5" />
        Save Full Log
      </Button>
    </div>
  );
}

export default function FullLogPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <FullLogForm />
    </Suspense>
  );
}
