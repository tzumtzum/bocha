"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export const FLOCK_KEY = "flock";

export interface FlockMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    full_name: string | null;
    username: string | null;
  } | null;
}

export interface FlockData {
  flock: {
    id: string;
    name: string;
    owner_id: string;
  } | null;
  members: FlockMember[];
  myRole: string | null;
}

export function useFlockData() {
  const supabase = createClient();
  return useQuery({
    queryKey: [FLOCK_KEY],
    queryFn: async (): Promise<FlockData> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's flock membership
      const { data: membership, error: membershipError } = await supabase
        .from("flock_members")
        .select("flock_id, role")
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership) {
        return { flock: null, members: [], myRole: null };
      }

      // Get flock details
      const { data: flock, error: flockError } = await supabase
        .from("flocks")
        .select("id, name, owner_id")
        .eq("id", membership.flock_id)
        .single();

      if (flockError || !flock) {
        return { flock: null, members: [], myRole: null };
      }

      // Get flock members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("flock_members")
        .select("id, user_id, role, joined_at, profiles!inner(full_name, username)")
        .eq("flock_id", flock.id)
        .order("joined_at", { ascending: true });

      if (membersError) {
        console.error("[useFlockData] members error:", membersError);
        // Return flock data with empty members rather than crashing the UI
        return { flock, members: [], myRole: membership.role };
      }

      const members: FlockMember[] = (membersData ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        user_id: String(m.user_id),
        role: String(m.role),
        joined_at: String(m.joined_at),
        profile: m.profiles as { full_name: string | null; username: string | null } | null,
      }));

      return { flock, members, myRole: membership.role };
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flockId, role }: { flockId: string; role: string }) => {
      const res = await fetch("/api/flock/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flock_id: flockId, role }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create invite");
      }
      return result as { token: string; inviteUrl: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FLOCK_KEY] });
    },
  });
}
