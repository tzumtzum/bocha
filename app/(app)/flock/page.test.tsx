import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FlockPage from "./page";
import type { ReactNode } from "react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/hooks/use-flock", () => ({
  FLOCK_KEY: "flock",
  useFlockData: vi.fn(),
  useCreateInvite: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import { useFlockData } from "@/lib/hooks/use-flock";

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

describe("FlockPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when user has no flock", async () => {
    (useFlockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { flock: null, members: [], myRole: null },
      isLoading: false,
    });

    render(<FlockPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/no flock yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create flock/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join a flock/i })).toBeInTheDocument();
  });

  it("shows flock name and members when user has a flock", async () => {
    (useFlockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        flock: { id: "flock-1", name: "Test Flock", owner_id: "user-1" },
        members: [
          {
            id: "m1",
            user_id: "user-1",
            role: "owner",
            joined_at: "2024-01-01",
            profile: { full_name: "Alice", username: null },
          },
        ],
        myRole: "owner",
      },
      isLoading: false,
    });

    render(<FlockPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Test Flock")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("shows invite section for owners", async () => {
    (useFlockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        flock: { id: "flock-1", name: "Test Flock", owner_id: "user-1" },
        members: [
          {
            id: "m1",
            user_id: "user-1",
            role: "owner",
            joined_at: "2024-01-01",
            profile: { full_name: "Alice", username: null },
          },
        ],
        myRole: "owner",
      },
      isLoading: false,
    });

    render(<FlockPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Invite Members")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate invite link/i })).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching", () => {
    (useFlockData as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<FlockPage />, { wrapper: createWrapper() });

    expect(document.querySelector("[data-slot='skeleton']")).toBeInTheDocument();
  });
});
