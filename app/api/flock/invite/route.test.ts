import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("crypto", () => {
  const mockRandomBytes = vi.fn().mockReturnValue(Buffer.alloc(24, 0xab));
  return {
    randomBytes: mockRandomBytes,
    default: { randomBytes: mockRandomBytes },
  };
});

const { createClient } = await import("@/lib/supabase/server");
const { POST } = await import("./route");
const { randomBytes: mockRandomBytes } = await import("crypto");

function createMockClient(overrides: Record<string, unknown> = {}) {
  const singleResult = (data: unknown, error: unknown) =>
    Promise.resolve({ data, error });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: (overrides.user as { id: string } | null) ?? null },
        error: overrides.userError ?? null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "flock_members") {
        const selectBuilder = {
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockImplementation(() =>
                singleResult(
                  overrides.membership ?? null,
                  overrides.membershipError ?? null
                )
              ),
            })),
            single: vi.fn().mockImplementation(() =>
              singleResult(
                overrides.membership ?? null,
                overrides.membershipError ?? null
              )
            ),
          })),
          single: vi.fn().mockImplementation(() =>
            singleResult(
              overrides.membership ?? null,
              overrides.membershipError ?? null
            )
          ),
        };

        return {
          select: vi.fn().mockReturnValue(selectBuilder),
          insert: vi.fn().mockResolvedValue({
            error: overrides.insertError ?? null,
          }),
        };
      }

      if (table === "flock_invites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() =>
                singleResult(
                  overrides.invite ?? null,
                  overrides.inviteError ?? null
                )
              ),
            }),
          }),
          insert: vi.fn().mockResolvedValue({
            error: overrides.insertError ?? null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: overrides.updateError ?? null,
            }),
          }),
        };
      }

      return {};
    }),
  };
}

describe("POST /api/flock/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 401 when no user", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({ user: null })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when missing flock_id", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({ user: { id: "user-1" } })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
  });

  it("returns 400 when invalid role", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({ user: { id: "user-1" } })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "invalid" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
  });

  it("returns 403 when user is not owner/admin of flock", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        membership: { role: "member" },
      })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when membership query fails", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        membershipError: new Error("not found"),
      })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 with token and inviteUrl when user is owner", async () => {
    (mockRandomBytes as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.alloc(24, 0xab)
    );

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        membership: { role: "owner" },
      })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBe("ab".repeat(24));
    expect(body.inviteUrl).toBe(
      "http://localhost:3000/invite/" + "ab".repeat(24)
    );
  });

  it("returns 500 when Supabase insert fails", async () => {
    (mockRandomBytes as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.alloc(24, 0xab)
    );

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        membership: { role: "owner" },
        insertError: new Error("db error"),
      })
    );

    const request = new Request("http://localhost:3000/api/flock/invite", {
      method: "POST",
      body: JSON.stringify({ flock_id: "flock-1", role: "member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create invite");
  });
});
