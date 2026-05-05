import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { flock_id, role } = body;

    if (!flock_id || !role || !["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify the user is owner or admin of this flock
    const { data: membership, error: membershipError } = await supabase
      .from("flock_members")
      .select("role")
      .eq("flock_id", flock_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from("flock_invites").insert({
      flock_id,
      token,
      role,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Failed to create invite:", error);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    return NextResponse.json({ token, inviteUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
