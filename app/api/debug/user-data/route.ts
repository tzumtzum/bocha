import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 }
    );
  }

  // Read auth header (client sends their access token)
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.json(
      { error: "No access token provided. Send as Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  // Verify the token with Supabase
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: userError?.message ?? "Invalid token" },
      { status: 401 }
    );
  }

  // Query all data using service role (bypasses RLS)
  const [{ data: memberships }, { data: flocks }, { data: birds }] =
    await Promise.all([
      client.from("flock_members").select("*").eq("user_id", user.id),
      client.from("flocks").select("*").eq("owner_id", user.id),
      client.from("birds").select("*").eq("user_id", user.id),
    ]);

  const birdIds = birds?.map((b) => b.id) ?? [];
  const { data: logs } =
    birdIds.length > 0
      ? await client.from("daily_logs").select("*").in("bird_id", birdIds)
      : { data: [] };

  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Also check RLS perspective: what can the ANON client see with this token?
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await anonClient.auth.setSession({
    access_token: accessToken,
    refresh_token: "",
  });

  const [
    { data: rlsMemberships, error: rlsMembershipsError },
    { data: rlsBirds, error: rlsBirdsError },
  ] = await Promise.all([
    anonClient.from("flock_members").select("flock_id").eq("user_id", user.id),
    anonClient.from("birds").select("id, name, flock_id"),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      metadata: user.user_metadata,
    },
    data: {
      membershipCount: memberships?.length ?? 0,
      memberships,
      flockCount: flocks?.length ?? 0,
      flocks,
      birdCount: birds?.length ?? 0,
      birds,
      logCount: logs?.length ?? 0,
      logs: logs?.slice(0, 5),
      profile,
    },
    rlsCheck: {
      flockMembersViaRLS: rlsMemberships?.length ?? 0,
      rlsMembershipsError: rlsMembershipsError?.message ?? null,
      birdsViaRLS: rlsBirds?.length ?? 0,
      rlsBirdsError: rlsBirdsError?.message ?? null,
    },
  });
}
