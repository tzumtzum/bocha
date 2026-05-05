import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

/**
 * Validate Telegram WebApp initData on the server side.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */

function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const checkHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(checkHash), Buffer.from(hash));
  } catch {
    return false;
  }
}

function generateSecurePassword(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("[Telegram Auth] TELEGRAM_BOT_TOKEN not set");
      return NextResponse.json(
        { error: "Telegram bot token not configured" },
        { status: 500 }
      );
    }

    const isValid = validateInitData(initData, botToken);
    if (!isValid) {
      console.error("[Telegram Auth] Invalid initData signature");
      return NextResponse.json({ error: "Invalid initData signature" }, { status: 403 });
    }

    const params = new URLSearchParams(initData);

    // Check auth_date freshness (prevent replay attacks)
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) {
      console.error("[Telegram Auth] initData expired", { authDate, now, diff: now - authDate });
      return NextResponse.json({ error: "initData expired" }, { status: 403 });
    }

    const userJson = params.get("user");
    if (!userJson) {
      return NextResponse.json({ error: "Missing user data" }, { status: 400 });
    }

    const telegramUser = JSON.parse(userJson) as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Telegram Auth] Missing Supabase configuration");
      return NextResponse.json(
        { error: "Supabase service configuration missing" },
        { status: 500 }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const email = `telegram_${telegramUser.id}@bobo.app`;

    // Check if a user already exists with this telegram_id
    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 100,
    });

    if (listError) {
      console.error("[Telegram Auth] Failed to list users:", listError);
      return NextResponse.json({ error: "Failed to lookup user" }, { status: 500 });
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.user_metadata?.telegram_id === telegramUser.id
    );

    let session;

    if (existingUser) {
      // Existing user — retrieve their random password from telegram_auth
      const { data: creds, error: credsError } = await adminClient
        .from("telegram_auth")
        .select("password")
        .eq("user_id", existingUser.id)
        .single();

      if (credsError || !creds) {
        console.error("[Telegram Auth] Credentials not found for user:", existingUser.id, credsError);
        return NextResponse.json(
          { error: "Authentication credentials not found" },
          { status: 500 }
        );
      }

      const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
        email,
        password: creds.password,
      });

      if (signInError || !signInData.session) {
        console.error("[Telegram Auth] Sign in failed:", signInError);
        return NextResponse.json(
          { error: signInError?.message ?? "Failed to authenticate" },
          { status: 500 }
        );
      }

      session = signInData.session;

      // Update profile with latest Telegram info
      await adminClient
        .from("profiles")
        .update({
          full_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || null,
          username: telegramUser.username || null,
          avatar_url: telegramUser.photo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
    } else {
      // New user — create with random password
      const randomPassword = generateSecurePassword();

      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          avatar_url: telegramUser.photo_url,
        },
      });

      if (signUpError || !signUpData.user) {
        console.error("[Telegram Auth] Create user failed:", signUpError);
        return NextResponse.json(
          { error: signUpError?.message ?? "Failed to create user" },
          { status: 500 }
        );
      }

      // Store the random password for future logins
      const { error: insertAuthError } = await adminClient
        .from("telegram_auth")
        .insert({
          user_id: signUpData.user.id,
          password: randomPassword,
        });

      if (insertAuthError) {
        // Clean up the created user if we can't store credentials
        await adminClient.auth.admin.deleteUser(signUpData.user.id);
        return NextResponse.json(
          { error: "Failed to store authentication credentials" },
          { status: 500 }
        );
      }

      // Sign in the newly created user
      const { data: newSignInData, error: newSignInError } = await adminClient.auth.signInWithPassword({
        email,
        password: randomPassword,
      });

      if (newSignInError || !newSignInData.session) {
        console.error("[Telegram Auth] New user sign in failed:", newSignInError);
        return NextResponse.json(
          { error: newSignInError?.message ?? "Failed to establish session" },
          { status: 500 }
        );
      }

      session = newSignInData.session;

      // Update profile with Telegram info (trigger creates basic profile, we enrich it)
      await adminClient
        .from("profiles")
        .update({
          full_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || null,
          username: telegramUser.username || null,
          avatar_url: telegramUser.photo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
      user: {
        id: session.user.id,
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        photo_url: telegramUser.photo_url,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Telegram Auth] Unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
