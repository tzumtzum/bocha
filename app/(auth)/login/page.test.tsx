import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "1" } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: "1" } }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  });

  it("renders login form immediately", () => {
    render(<LoginPage />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows Try Demo Mode button when placeholder URL is set", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /try demo mode/i })).toBeInTheDocument();
  });

  it("redirects to dashboard on successful sign in", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("toggles between sign in and sign up modes", () => {
    render(<LoginPage />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.getByText(/create account/i)).toBeInTheDocument();
  });
});
