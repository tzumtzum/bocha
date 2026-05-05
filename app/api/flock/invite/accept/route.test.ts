import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import("@/lib/supabase/server");

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

      if (table === "flock_members") {
        const selectBuilder = {
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockImplementation(() =>
                singleResult(
                  overrides.existingMember ?? null,
                  overrides.existingMemberError ?? null
                )
              ),
            })),
            single: vi.fn().mockImplementation(() =>
              singleResult(
                overrides.existingMember ?? null,
                overrides.existingMemberError ?? null
              )
            ),
          })),
          single: vi.fn().mockImplementation(() =>
            singleResult(
              overrides.existingMember ?? null,
              overrides.existingMemberError ?? null
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

      return {};
    }),
  };
}

describe("POST /api/flock/invite/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no user", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({ user: null })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when missing token", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({ user: { id: "user-1" } })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 404 when token doesn't exist", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        inviteError: new Error("not found"),
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "nonexistent" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Invite not found");
  });

  it("returns 410 when token is expired", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        invite: {
          id: "invite-1",
          flock_id: "flock-1",
          role: "member",
          expires_at: twoDaysAgo,
          used_by: null,
          used_at: null,
        },
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "expired-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.error).toBe("Invite expired");
  });

  it("returns 409 when token already used", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        invite: {
          id: "invite-1",
          flock_id: "flock-1",
          role: "member",
          expires_at: tomorrow,
          used_by: "user-2",
          used_at: new Date().toISOString(),
        },
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "used-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Invite already used");
  });

  it("returns 409 when already a member of this flock", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        invite: {
          id: "invite-1",
          flock_id: "flock-1",
          role: "member",
          expires_at: tomorrow,
          used_by: null,
          used_at: null,
        },
        existingMember: { id: "member-1" },
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already a member of this flock");
  });

  it("returns 200 when token is valid and inserts flock_members", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        invite: {
          id: "invite-1",
          flock_id: "flock-1",
          role: "member",
          expires_at: tomorrow,
          used_by: null,
          used_at: null,
        },
        existingMember: null,
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.flock_id).toBe("flock-1");
  });

  it("returns 500 when Supabase insert fails", async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockClient({
        user: { id: "user-1" },
        invite: {
          id: "invite-1",
          flock_id: "flock-1",
          role: "member",
          expires_at: tomorrow,
          used_by: null,
          used_at: null,
        },
        existingMember: null,
        insertError: new Error("db error"),
      })
    );

    const request = new Request(
      "http://localhost:3000/api/flock/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to join flock");
  });
});
