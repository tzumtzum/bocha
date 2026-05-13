import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has any active birds in their flocks
  let hasBirds = false;
  const { data: memberships } = await supabase
    .from("flock_members")
    .select("flock_id")
    .eq("user_id", user.id);

  const flockIds = memberships?.map((m: { flock_id: string }) => m.flock_id) ?? [];
  if (flockIds.length > 0) {
    const { data: birds } = await supabase
      .from("birds")
      .select("id")
      .in("flock_id", flockIds)
      .eq("status", "active")
      .limit(1);
    hasBirds = !!(birds && birds.length > 0);
  }

  return <AppShell hasBirds={hasBirds}>{children}</AppShell>;
}
