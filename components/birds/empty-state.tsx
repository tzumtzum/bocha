"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Plus, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function EmptyBirdState() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);

    let token = inviteToken.trim();
    if (!token) {
      setJoinError("Please enter an invite link or token");
      return;
    }

    // Extract token from full URL if pasted
    const urlMatch = token.match(/\/invite\/([a-f0-9]+)/);
    if (urlMatch) {
      token = urlMatch[1];
    }

    router.push(`/invite/${token}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
        <Bird className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Welcome to Bobo!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
          Get started by creating your own flock or joining an existing one.
        </p>
      </div>

      <div className="w-full max-w-[280px] space-y-3">
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href="/flock/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Your Flock
          </Link>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
              or
            </span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Join a Flock
            </span>
          </div>
          <Input
            placeholder="Paste invite link or token"
            value={inviteToken}
            onChange={(e) => {
              setInviteToken(e.target.value);
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
            disabled={!inviteToken.trim()}
          >
            Join Flock
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}
