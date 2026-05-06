"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { Users, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateFlockPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please enter a flock name", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Create flock
      const { data: flock, error: flockError } = await supabase
        .from("flocks")
        .insert({ name: name.trim(), owner_id: user.id })
        .select("id")
        .single();

      if (flockError || !flock) {
        toast(flockError?.message || "Failed to create flock", { type: "error" });
        setLoading(false);
        return;
      }

      // Add owner as member
      const { error: memberError } = await supabase.from("flock_members").insert({
        flock_id: flock.id,
        user_id: user.id,
        role: "owner",
      });

      if (memberError) {
        toast(memberError.message || "Failed to add you to the flock", { type: "error" });
        setLoading(false);
        return;
      }

      toast("Flock created!", { type: "success" });
      router.push("/flock");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", { type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center pb-2">
            <Users className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <CardTitle>Create Your Flock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Give your flock a name. You can add birds afterward.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="flock-name">Flock Name</Label>
                <Input
                  id="flock-name"
                  placeholder="e.g., The Aviary, My Budgies"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Flock
              </Button>
            </form>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/flock">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
