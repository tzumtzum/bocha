import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("flock_invites")
      .select("*, flocks!inner(id, name)")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if already used
    if (invite.used_by) {
      return NextResponse.json({ error: "Invite already used" }, { status: 400 });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    const flockId = invite.flock_id;
    const role = invite.role;

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("flock_members")
      .select("id")
      .eq("flock_id", flockId)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "Already a member of this flock" }, { status: 409 });
    }

    // Add user to flock
    const { error: joinError } = await supabase.from("flock_members").insert({
      flock_id: flockId,
      user_id: user.id,
      role,
    });

    if (joinError) {
      console.error("Failed to join flock:", joinError);
      return NextResponse.json({ error: "Failed to join flock" }, { status: 500 });
    }

    // Mark invite as used
    const { error: updateError } = await supabase
      .from("flock_invites")
      .update({ used_by: user.id, used_at: now.toISOString() })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Failed to update invite:", updateError);
    }

    return NextResponse.json({ success: true, flock_id: flockId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
