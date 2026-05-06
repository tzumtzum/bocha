"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FLOCK_KEY } from "./use-flock";

export const DASHBOARD_KEY = "dashboard";
const PROFILE_KEY = "profile";

interface DashboardData {
  birds: Array<{
    id: string;
    name: string;
    species: string;
    current_weight: number | null;
    target_weight: number | null;
    avatar_color: { bg: string; fg: string };
    status: string;
    timezone: string;
    sort_order: number;
  }>;
  logs: Array<{
    bird_id: string;
    log_date: string;
    weight: number | null;
    logged_at: string;
  }>;
}

export function useDashboardData() {
  const supabase = createClient();
  return useQuery({
    queryKey: [DASHBOARD_KEY],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Get flock memberships (needed for both birds and logs)
      const { data: memberships, error: membershipError } = await supabase
        .from("flock_members")
        .select("flock_id")
        .eq("user_id", user.id);

      if (membershipError) {
        console.error("[useDashboardData] flock_members error:", membershipError);
        throw membershipError;
      }

      const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];
      if (flockIds.length === 0) {
        return { birds: [], logs: [] } as DashboardData;
      }

      // 2. Get birds in parallel with profile
      const [{ data: birdsData, error: birdsError }] = await Promise.all([
        supabase
          .from("birds")
          .select("id, name, species, current_weight, target_weight, avatar_color, status, timezone, sort_order")
          .in("flock_id", flockIds)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
      ]);

      if (birdsError) {
        console.error("[useDashboardData] birds error:", birdsError);
        throw birdsError;
      }

      const birds = birdsData ?? [];
      const birdIds = birds.map((b: { id: string }) => b.id);

      if (birdIds.length === 0) {
        return { birds, logs: [] } as DashboardData;
      }

      // 3. Get logs for those birds
      const { data: logsData, error: logsError } = await supabase
        .from("daily_logs")
        .select("bird_id, log_date, weight, logged_at")
        .in("bird_id", birdIds)
        .order("log_date", { ascending: false });

      if (logsError) {
        console.error("[useDashboardData] logs error:", logsError);
        throw logsError;
      }

      return { birds, logs: logsData ?? [] } as DashboardData;
    },
    staleTime: 30 * 1000,
  });
}

export function useProfile() {
  const supabase = createClient();
  return useQuery({
    queryKey: [PROFILE_KEY],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpgradeToPro() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: true })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}

export function useInvalidateAppData() {
  const queryClient = useQueryClient();
  return {
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] }),
    invalidateProfile: () => queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] }),
    invalidateFlock: () => queryClient.invalidateQueries({ queryKey: [FLOCK_KEY] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
      queryClient.invalidateQueries({ queryKey: [FLOCK_KEY] });
    },
  };
}
