"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Bird, ChevronRight, Loader2, Sparkles, Weight } from "lucide-react";
import { toast } from "@/lib/toast";

interface OnboardingData {
  name: string;
  species: string;
  dateOfBirth: string;
  dateType: string;
  weight: number;
  weightUnit: string;
  avatarColor: { bg: string; fg: string };
}

const AVATAR_COLORS = [
  { bg: "#e0f2fe", fg: "#0ea5e9" },
  { bg: "#fef3c7", fg: "#f59e0b" },
  { bg: "#fce7f3", fg: "#ec4899" },
  { bg: "#dcfce7", fg: "#22c55e" },
  { bg: "#f3e8ff", fg: "#a855f7" },
  { bg: "#fee2e2", fg: "#ef4444" },
  { bg: "#ffedd5", fg: "#f97316" },
  { bg: "#ecfccb", fg: "#84cc16" },
];

const STORAGE_KEY = "bobo_onboarding_progress";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingBirds, setCheckingBirds] = useState(true);
  const [species, setSpecies] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    species: "",
    dateOfBirth: "",
    dateType: "hatched",
    weight: 100,
    weightUnit: "g",
    avatarColor: AVATAR_COLORS[0],
  });

  // Check if user already has birds
  useEffect(() => {
    async function checkBirds() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: birds }, { data: profile }] = await Promise.all([
        supabase
          .from("birds")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase.from("profiles").select("is_pro").eq("id", user.id).single(),
      ]);

      const isPro = profile?.is_pro ?? false;
      if (!isPro && birds && birds.length >= 2) {
        // Bird limit reached, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      setCheckingBirds(false);
    }
    checkBirds();
  }, [supabase, router]);

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData((d) => ({ ...d, ...parsed.data }));
        setStep(parsed.step || 0);
      } catch {
        // ignore
      }
    }
  }, []);

  // Save progress on change
  useEffect(() => {
    if (step > 0 && step < 5) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
    }
  }, [step, data]);

  // Fetch species
  useEffect(() => {
    supabase
      .from("species")
      .select("id, name")
      .order("name")
      .then(({ data }: { data: { id: number; name: string }[] | null }) => {
        if (data) setSpecies(data);
      });
  }, [supabase]);

  async function handleCreateBird() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Check bird limit
    const [{ data: existingBirds }, { data: profile }] = await Promise.all([
      supabase
        .from("birds")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.from("profiles").select("is_pro").eq("id", user.id).single(),
    ]);

    const isPro = profile?.is_pro ?? false;
    if (!isPro && existingBirds && existingBirds.length >= 2) {
      toast("You've reached the 2-bird limit. Upgrade to Pro for unlimited birds!", { type: "warning" });
      setLoading(false);
      return;
    }

    // Get user's default flock
    const { data: flockData } = await supabase
      .from("flock_members")
      .select("flock_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    const flockId = flockData?.flock_id;

    const { error } = await supabase.from("birds").insert({
      user_id: user.id,
      flock_id: flockId,
      name: data.name,
      species: data.species,
      date_of_birth: data.dateOfBirth || null,
      date_type: data.dateType,
      target_weight: data.weight,
      current_weight: data.weight,
      avatar_color: data.avatarColor,
      status: "active",
      sort_order: existingBirds?.length || 0,
    });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    router.push("/dashboard");
  }

  if (checkingBirds) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const steps = [
    {
      title: "Welcome to Bobo!",
      description: "Have your bird&apos;s weight and a photo ready!",
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-sky-100 dark:from-emerald-900 dark:to-sky-900 rounded-full flex items-center justify-center mx-auto">
            <Bird className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Bobo helps you track your bird&apos;s weight, health, and daily
              observations.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Tip: Have a kitchen scale and your bird nearby!
            </div>
          </div>
          <Button onClick={() => setStep(1)} className="w-full">
            Get Started
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ),
    },
    {
      title: "What&apos;s your bird&apos;s name?",
      description: "Let's get to know your feathered friend",
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Kiwi, Mango, Blue"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              autoFocus
            />
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!data.name.trim()}
            className="w-full"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ),
    },
    {
      title: "Species",
      description: "Select your bird&apos;s species",
      content: (
        <div className="space-y-4">
          <Select
            value={data.species}
            onValueChange={(v) => setData({ ...data, species: v || "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a species" />
            </SelectTrigger>
            <SelectContent>
              {species.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setStep(3)}
            disabled={!data.species}
            className="w-full"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ),
    },
    {
      title: "Date & Weight",
      description: "When was your bird born or adopted?",
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={data.dateType === "hatched" ? "default" : "outline"}
              size="sm"
              onClick={() => setData({ ...data, dateType: "hatched" })}
              className="flex-1"
            >
              Hatched
            </Button>
            <Button
              variant={data.dateType === "adopted" ? "default" : "outline"}
              size="sm"
              onClick={() => setData({ ...data, dateType: "adopted" })}
              className="flex-1"
            >
              Adopted
            </Button>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) =>
                setData({ ...data, dateOfBirth: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Weight className="w-4 h-4" />
              Current Weight ({data.weightUnit})
            </Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                value={[data.weight]}
                onValueChange={(v) => setData({ ...data, weight: Array.isArray(v) ? v[0] || 100 : 100 })}
                min={10}
                max={1500}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={data.weight}
                onChange={(e) =>
                  setData({ ...data, weight: Number(e.target.value) })
                }
                className="w-24"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant={data.weightUnit === "g" ? "default" : "outline"}
                size="sm"
                onClick={() => setData({ ...data, weightUnit: "g" })}
              >
                Grams
              </Button>
              <Button
                variant={data.weightUnit === "oz" ? "default" : "outline"}
                size="sm"
                onClick={() => setData({ ...data, weightUnit: "oz" })}
              >
                Ounces
              </Button>
            </div>
          </div>
          <Button onClick={() => setStep(4)} className="w-full">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ),
    },
    {
      title: "Avatar",
      description: "Pick a color for your bird&apos;s avatar",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center py-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                backgroundColor: data.avatarColor.bg,
                color: data.avatarColor.fg,
              }}
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_COLORS.map((color, i) => (
              <button
                key={i}
                onClick={() => setData({ ...data, avatarColor: color })}
                className={`w-12 h-12 rounded-full border-2 transition-all ${
                  data.avatarColor.bg === color.bg
                    ? "border-slate-900 dark:border-white scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color.bg }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Photo upload coming soon! For now, pick a color.
          </p>
          <Button
            onClick={handleCreateBird}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Bird Profile
          </Button>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>{currentStep.content}</CardContent>
        </Card>

        {step > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
