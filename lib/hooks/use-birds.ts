"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const BIRDS_KEY = "birds";
const LOGS_KEY = "logs";
const PROFILE_KEY = "profile";

export function useBirds() {
  const supabase = createClient();
  return useQuery({
    queryKey: [BIRDS_KEY],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's flock memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("flock_members")
        .select("flock_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];
      if (flockIds.length === 0) return [];

      const { data, error } = await supabase
        .from("birds")
        .select("id, name, species, current_weight, target_weight, avatar_color, status, timezone, sort_order")
        .in("flock_id", flockIds)
        .eq("status", "active")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });
}

export function useLogs() {
  const supabase = createClient();
  return useQuery({
    queryKey: [LOGS_KEY],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's flock memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("flock_members")
        .select("flock_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];
      if (flockIds.length === 0) return [];

      // Get birds in those flocks, then their logs
      const { data: birdsData, error: birdsError } = await supabase
        .from("birds")
        .select("id")
        .in("flock_id", flockIds);

      if (birdsError) throw birdsError;

      const birdIds = birdsData?.map((b: { id: string }) => b.id) ?? [];
      if (birdIds.length === 0) return [];

      const { data, error } = await supabase
        .from("daily_logs")
        .select("bird_id, log_date, weight, logged_at")
        .in("bird_id", birdIds)
        .order("log_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
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
    invalidateBirds: () => queryClient.invalidateQueries({ queryKey: [BIRDS_KEY] }),
    invalidateLogs: () => queryClient.invalidateQueries({ queryKey: [LOGS_KEY] }),
    invalidateProfile: () => queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: [BIRDS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  };
}
