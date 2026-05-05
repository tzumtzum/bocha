"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageBackButton } from "@/components/layout/page-back-button";

export default function DebugPage() {
  const supabase = createClient();
  const [user, setUser] = useState<unknown>(null);
  const [birds, setBirds] = useState<unknown[]>([]);
  const [memberships, setMemberships] = useState<unknown[]>([]);
  const [flocks, setFlocks] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiResult, setApiResult] = useState<unknown>(null);

  useEffect(() => {
    async function load() {
      const errs: string[] = [];

      // 1. Auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) errs.push(`auth.getUser: ${userError.message}`);
      setUser(userData.user);

      if (userData.user) {
        // 2. Flock memberships
        const { data: memData, error: memError } = await supabase
          .from("flock_members")
          .select("*")
          .eq("user_id", userData.user.id);
        if (memError) errs.push(`flock_members: ${memError.message}`);
        setMemberships(memData ?? []);

        // 3. Flocks
        const { data: flockData, error: flockError } = await supabase
          .from("flocks")
          .select("*")
          .eq("owner_id", userData.user.id);
        if (flockError) errs.push(`flocks: ${flockError.message}`);
        setFlocks(flockData ?? []);

        // 4. Birds via flock_ids
        const flockIds = memData?.map((m: { flock_id: string }) => m.flock_id) ?? [];
        if (flockIds.length > 0) {
          const { data: birdData, error: birdError } = await supabase
            .from("birds")
            .select("*")
            .in("flock_id", flockIds);
          if (birdError) errs.push(`birds: ${birdError.message}`);
          setBirds(birdData ?? []);

          const birdIds = birdData?.map((b: { id: string }) => b.id) ?? [];
          if (birdIds.length > 0) {
            const { data: logData, error: logError } = await supabase
              .from("daily_logs")
              .select("*")
              .in("bird_id", birdIds)
              .limit(5);
            if (logError) errs.push(`daily_logs: ${logError.message}`);
            setLogs(logData ?? []);
          }
        }

        // 5. Call debug API
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          try {
            const res = await fetch("/api/debug/user-data", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const json = await res.json();
            setApiResult(json);
          } catch (e) {
            errs.push(`api/debug: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      setErrors(errs);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-slate-500">Loading debug data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageBackButton href="/dashboard" />
      <h1 className="text-xl font-bold">Debug</h1>

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300 text-sm">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Flock Memberships ({memberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(memberships, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Flocks ({flocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(flocks, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Birds ({birds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(birds, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(logs, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">API Debug Result</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
      >
        Sign Out & Clear Session
      </Button>
    </div>
  );
}
