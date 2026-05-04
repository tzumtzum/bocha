import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const isPlaceholder =
  typeof process !== "undefined" &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"));

function getDemoWeightUnit(): string {
  try {
    const raw = localStorage.getItem("bobo_demo_profile");
    if (raw) {
      const profile = JSON.parse(raw);
      return profile.weight_unit || "g";
    }
  } catch {
    // ignore
  }
  return "g";
}

export function useWeightUnit() {
  const [unit, setUnit] = useState(() =>
    isPlaceholder ? getDemoWeightUnit() : "g"
  );
  const supabase = createClient();

  useEffect(() => {
    if (isPlaceholder) {
      setUnit(getDemoWeightUnit());
      return;
    }

    let cancelled = false;
    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const user = res.data.user;
      if (!user || cancelled) return;
      supabase
        .from("profiles")
        .select("weight_unit")
        .eq("id", user.id)
        .single()
        .then((profileRes: { data: { weight_unit: string | null } | null }) => {
          if (!cancelled && profileRes.data?.weight_unit) {
            setUnit(profileRes.data.weight_unit);
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return unit;
}
