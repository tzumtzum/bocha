"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FLOCK_KEY } from "@/lib/hooks/use-flock";
import { DASHBOARD_KEY } from "@/lib/hooks/use-dashboard-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { Users, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invite, setInvite] = useState<{
    flock_name: string;
    inviter_name: string;
    role: string;
    expired: boolean;
    alreadyUsed: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      const { data, error } = await supabase
        .from("flock_invites")
        .select("*, flocks(name), profiles!flock_invites_created_by_fkey(full_name)")
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      const expired = now > expiresAt;
      const alreadyUsed = !!data.used_by;

      setInvite({
        flock_name: data.flocks?.name || "Unknown Flock",
        inviter_name: data.profiles?.full_name || "Someone",
        role: data.role,
        expired,
        alreadyUsed,
      });
      setLoading(false);
    }

    fetchInvite();
  }, [supabase, token]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch("/api/flock/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast(result.error || "Failed to join flock", { type: "error" });
        setJoining(false);
        return;
      }

      toast("You've joined the flock!", { type: "success" });
      await queryClient.invalidateQueries({ queryKey: [FLOCK_KEY] });
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
      router.push("/dashboard");
    } catch {
      toast("Something went wrong. Please try again.", { type: "error" });
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <p className="text-slate-500 mb-4">{error || "Invite not found"}</p>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInvalid = invite.expired || invite.alreadyUsed;

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center pb-2">
          <Users className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <CardTitle className="text-lg">Flock Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-slate-600">
            <p>
              <span className="font-medium">{invite.inviter_name}</span> invited you to join{" "}
              <span className="font-medium">{invite.flock_name}</span>
            </p>
            <p className="mt-1 text-xs text-slate-400 capitalize">
              You will join as: <span className="font-medium">{invite.role}</span>
            </p>
          </div>

          {isInvalid ? (
            <div className="text-center">
              <p className="text-sm text-red-500 mb-4">
                {invite.expired ? "This invite has expired." : "This invite has already been used."}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {joining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {joining ? "Joining..." : "Join Flock"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
