import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "error", message: "Database connectivity issue" },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
