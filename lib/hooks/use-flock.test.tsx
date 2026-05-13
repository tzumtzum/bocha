import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFlockData } from "./use-flock";
import type { ReactNode } from "react";

function createMockQueryBuilder(
  tableData: Record<string, unknown[]>,
  overrides: Record<string, unknown> = {}
) {
  function buildSelectResult(table: string, rows: unknown[]) {
    const currentRows = rows;

    const result = {
      eq: vi.fn().mockImplementation(() => {
        return result;
      }),
      order: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: currentRows, error: null });
      }),
      limit: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: currentRows.slice(0, 1), error: null });
      }),
      single: vi.fn().mockImplementation(() => {
        const row = currentRows.length > 0 ? currentRows[0] : null;
        return Promise.resolve({ data: row, error: row ? null : new Error("not found") });
      }),
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

describe("useFlockData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns flock data when user has a flock", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [{ flock_id: "flock-1", role: "owner" }],
          flocks: [{ id: "flock-1", name: "My Flock", owner_id: "user-1" }],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useFlockData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.flock).toEqual({ id: "flock-1", name: "My Flock", owner_id: "user-1" });
    expect(result.current.data?.myRole).toBe("owner");
  });

  it("returns null flock when user has no memberships", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder(
        {
          flock_members: [],
        },
        { user: { id: "user-1" } }
      )
    );

    const { result } = renderHook(() => useFlockData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.flock).toBeNull();
    expect(result.current.data?.members).toEqual([]);
    expect(result.current.data?.myRole).toBeNull();
  });

  it("throws 'Not authenticated' when no user", async () => {
    mockClient.createClient.mockReturnValue(
      createMockQueryBuilder({}, { user: null })
    );

    const { result } = renderHook(() => useFlockData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect((result.current.error as Error).message).toBe("Not authenticated");
  });
});
