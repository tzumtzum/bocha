"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { useFlockData, useCreateInvite } from "@/lib/hooks/use-flock";
import {
  Users,
  Crown,
  User,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Loader2,
  Link2,
  Bird,
} from "lucide-react";
import Link from "next/link";

export default function FlockPage() {
  const router = useRouter();
  const { data: flockData, isLoading } = useFlockData();
  const createInvite = useCreateInvite();
  const [copied, setCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const flock = flockData?.flock;
  const members = flockData?.members ?? [];
  const myRole = flockData?.myRole;
  const isOwner = myRole === "owner";
  const canInvite = isOwner || myRole === "admin";

  async function handleGenerateInvite() {
    if (!flock) return;
    setInviteUrl(null);
    createInvite.mutate(
      { flockId: flock.id, role: inviteRole },
      {
        onSuccess: (data) => {
          setInviteUrl(data.inviteUrl);
          toast("Invite link created!", { type: "success" });
        },
        onError: (err) => {
          toast(err instanceof Error ? err.message : "Failed to create invite", {
            type: "error",
          });
        },
      }
    );
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast("Copied to clipboard!", { type: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", { type: "error" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!flock) {
    return (
      <div className="p-4 min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center space-y-4">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                No Flock Yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create your own flock or join an existing one.
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Link href="/flock/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Flock
                </Link>
              </Button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setJoinError(null);
                  let token = joinToken.trim();
                  if (!token) {
                    setJoinError("Please enter an invite link or token");
                    return;
                  }
                  const urlMatch = token.match(/\/invite\/([a-f0-9]+)/);
                  if (urlMatch) token = urlMatch[1];
                  router.push(`/invite/${token}`);
                }}
                className="space-y-2"
              >
                <Input
                  placeholder="Paste invite link or token"
                  value={joinToken}
                  onChange={(e) => {
                    setJoinToken(e.target.value);
                    setJoinError(null);
                  }}
                  className="text-sm"
                />
                {joinError && (
                  <p className="text-xs text-red-600 dark:text-red-400 text-left">
                    {joinError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!joinToken.trim()}
                >
                  Join a Flock
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {flock.name}
        </h1>
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  {member.role === "owner" ? (
                    <Crown className="w-4 h-4 text-amber-500" />
                  ) : (
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {member.profile?.full_name || member.profile?.username || "Unnamed"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Bird */}
      <Button asChild variant="outline" className="w-full">
        <Link href="/onboarding">
          <Bird className="w-4 h-4 mr-2" />
          Add Bird to Flock
        </Link>
      </Button>

      {/* Invite */}
      {canInvite && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Invite Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={inviteRole === "member" ? "default" : "outline"}
                size="sm"
                onClick={() => setInviteRole("member")}
                className="flex-1"
              >
                Member
              </Button>
              <Button
                variant={inviteRole === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => setInviteRole("admin")}
                className="flex-1"
              >
                Admin
              </Button>
            </div>

            <Button
              onClick={handleGenerateInvite}
              disabled={createInvite.isPending}
              className="w-full"
            >
              {createInvite.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Generate Invite Link
            </Button>

            {inviteUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="text-xs bg-slate-50 dark:bg-slate-900"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Link expires in 24 hours.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
