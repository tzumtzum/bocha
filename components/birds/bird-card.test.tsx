import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BirdCard } from "./bird-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BirdCard", () => {
  const mockBird = {
    id: "bird-1",
    name: "Bobo",
    species: "Cockatiel",
    current_weight: 96.5,
    target_weight: 95,
    avatar_color: { bg: "#fef3c7", fg: "#f59e0b" },
    status: "active",
  };

  const mockLogs = [
    { log_date: "2024-03-10", weight: 95 },
    { log_date: "2024-03-11", weight: 96 },
    { log_date: "2024-03-12", weight: 96.5 },
  ];

  it("renders bird name and species", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={mockLogs} />);
    expect(screen.getByText("Bobo")).toBeInTheDocument();
    expect(screen.getByText("Cockatiel")).toBeInTheDocument();
  });

  it("renders current weight and target", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={mockLogs} />);
    expect(screen.getByText(/96\.5 g/)).toBeInTheDocument();
    expect(screen.getByText(/target/)).toBeInTheDocument();
    expect(screen.getByText(/95\.0 g/)).toBeInTheDocument();
  });

  it("shows checkmark when today is logged", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={mockLogs} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows warning when today is not logged", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={false} recentLogs={mockLogs} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("links to bird detail page", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={mockLogs} />);
    const link = screen.getByText("Bobo").closest("a");
    expect(link).toHaveAttribute("href", "/birds/bird-1");
  });

  it("shows quick log plus button when today is not logged", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={false} recentLogs={mockLogs} onLogClick={() => {}} />);
    expect(screen.getByLabelText(/quick log Bobo/i)).toBeInTheDocument();
  });

  it("does not show quick log plus button when today is logged", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={mockLogs} onLogClick={() => {}} />);
    expect(screen.queryByLabelText(/quick log/i)).not.toBeInTheDocument();
  });

  it("renders without sparkline when fewer than 2 weight logs", () => {
    render(<BirdCard bird={mockBird} hasTodayLog={true} recentLogs={[]} />);
    expect(screen.getByText("Bobo")).toBeInTheDocument();
  });
});
