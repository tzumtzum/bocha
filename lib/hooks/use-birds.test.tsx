import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBirds, useLogs, useProfile } from "./use-birds";
import type { ReactNode } from "react";

// ------------------------------------------------------------------
//  Mock Supabase client
// ------------------------------------------------------------------

function createMockQueryBuilder(
  tableData: Record<string, unknown[]>,
  overrides: Record<string, unknown> = {}
) {
  // We need to support chained calls like:
  //   from('x').select('...').eq('...').eq('...').order('...')
  //   from('x').select('...').in('...', [...]).eq('...').order('...')
  //   from('x').select('...').eq('...').single()

  function buildSelectResult(table: string, rows: unknown[]) {
    const currentRows = rows;

    const result = {
      eq: vi.fn().mockImplementation(() => {
        // For simplicity we just return the same result builder.
        // Tests control data via tableData, not via precise filtering.
        return result;
      }),
      in: vi.fn().mockImplementation(() => {
        return result;
      }),
      order: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: currentRows, error: null });
      }),
      single: vi.fn().mockImplementation(() => {
        const row = currentRows.length > 0 ? currentRows[0] : null;
        return Promise.resolve({ data: row, error: row ? null : new Error("not found") });
      }),
      // When nothing else is chained, the builder itself resolves
      then: (resolve: (v: unknown) => unknown) => resolve({ data: currentRows, error: null }),
    };

    return result;
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides.user !== undefined ? (overrides.user as { id: string } | null) : { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const rows = tableData[table] ?? [];
      return {
        select: vi.fn().mockImplementation(() => {
          return buildSelectResult(table, rows);
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }),
  };
}

const mockClient = {
  createClient: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockClient.createClient(),
}));

// ------------------------------------------------------------------
//  Helpers
// ------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ------------------------------------------------------------------
//  Tests
// ------------------------------------------------------------------

describe("useBirds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns birds when user has flock memberships and birds exist", async () => {
    const birds = [
      { id: "bird-1", name: "Tweety", species: "Budgie", current_weight: 30, target_weight: 32, avatar_color: "blue", status: "active", timezone: "UTC", sort_order: 0 },
      { id: "bird-2", name: "Sky", species: "Cockatiel", current_weight: 90, target_weight: 95, avatar_color: "yellow", status: "active", timezone: "UTC", sort_order: 1 },
    ];

    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [{ flock_id: "flock-1" }],
          birds,
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useBirds(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(birds);
  });

  it("returns empty array when user has no flock memberships", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [],
          birds: [],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useBirds(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("returns empty array when flock_ids exist but no birds match", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [{ flock_id: "flock-1" }],
          birds: [],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useBirds(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("throws 'Not authenticated' when no user", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {},
        { user: null }
      )
    );

    const { result } = renderHook(() => useBirds(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("Not authenticated");
  });
});

describe("useLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns logs when birds and logs exist", async () => {
    const logs = [
      { bird_id: "bird-1", log_date: "2026-05-04", weight: 92, logged_at: "2026-05-04T08:00:00Z" },
      { bird_id: "bird-2", log_date: "2026-05-04", weight: 31, logged_at: "2026-05-04T09:00:00Z" },
    ];

    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [{ flock_id: "flock-1" }],
          birds: [{ id: "bird-1" }, { id: "bird-2" }],
          daily_logs: logs,
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(logs);
  });

  it("returns empty array when no flock memberships", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [],
          birds: [],
          daily_logs: [],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile data", async () => {
    const profile = {
      id: "user-1",
      weight_unit: "g",
      timezone: "UTC",
      theme: "light",
      reminders_enabled: true,
      is_pro: false,
    };

    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          profiles: [profile],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
  });
});
