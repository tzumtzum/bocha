/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const isPlaceholder =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

export function createClient() {
  // Demo mode: return a mock client
  if (isPlaceholder) {
    return {
      auth: {
        getUser: () =>
          Promise.resolve({
            data: {
              user: {
                id: "demo-user-123",
                email: "demo@bobo.app",
              },
            },
            error: null,
          }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                then: (cb: (arg: { data: { id: string }[]; error: null }) => unknown) =>
                  Promise.resolve({ data: [{ id: "demo-bird" }], error: null }).then(cb),
              }),
            }),
            limit: () => ({
              then: (cb: (arg: { data: { id: string }[]; error: null }) => unknown) =>
                Promise.resolve({ data: [{ id: "demo-bird" }], error: null }).then(cb),
            }),
          }),
          limit: () => ({
            then: (cb: (arg: { data: { id: string }[]; error: null }) => unknown) =>
              Promise.resolve({ data: [{ id: "demo-bird" }], error: null }).then(cb),
          }),
        }),
        limit: () => ({
          then: (cb: (arg: { data: { id: string }[]; error: null }) => unknown) =>
            Promise.resolve({ data: [{ id: "demo-bird" }], error: null }).then(cb),
        }),
      }),
    } as any;
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}
