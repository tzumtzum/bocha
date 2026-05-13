import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useWeightUnit() {
  const [unit, setUnit] = useState("g");
  const supabase = createClient();

  useEffect(() => {
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
