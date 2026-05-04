import { describe, it, expect } from "vitest";
import {
  formatWeight,
  formatDate,
  getTodayInTimezone,
  calculateStreak,
  getWeightChangeBadge,
  cn,
} from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });
});

describe("formatWeight", () => {
  it("formats weight with unit", () => {
    expect(formatWeight(95.5, "g")).toBe("95.5 g");
  });

  it("returns em dash for null", () => {
    expect(formatWeight(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatWeight(undefined)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    expect(formatDate("2024-03-15")).toContain("Mar");
    expect(formatDate("2024-03-15")).toContain("15");
  });
});

describe("getTodayInTimezone", () => {
  it("returns a date string in YYYY-MM-DD format", () => {
    const today = getTodayInTimezone();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("calculateStreak", () => {
  it("returns 0 when no logs", () => {
    expect(calculateStreak([], 1)).toBe(0);
  });

  it("counts consecutive days with logs", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const logs = [{ log_date: today }, { log_date: yesterday }];
    expect(calculateStreak(logs, 1)).toBe(2);
  });

  it("does not break streak if today is not logged yet", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];
    const logs = [{ log_date: yesterday }, { log_date: twoDaysAgo }];
    expect(calculateStreak(logs, 1)).toBe(2);
  });

  it("breaks streak when a day is missed", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().split("T")[0];
    // Yesterday logged, but day before not = streak of 1
    const logs = [{ log_date: yesterday }, { log_date: threeDaysAgo }];
    expect(calculateStreak(logs, 1)).toBe(1);
  });
});

describe("getWeightChangeBadge", () => {
  it("returns null for changes under 5%", () => {
    expect(getWeightChangeBadge(100, 97)).toBeNull();
  });

  it("returns yellow badge for 5-10% change", () => {
    const badge = getWeightChangeBadge(100, 92);
    expect(badge).not.toBeNull();
    expect(badge?.label).toContain("+");
    expect(badge?.color).toContain("yellow");
  });

  it("returns orange badge for 10-15% change", () => {
    const badge = getWeightChangeBadge(100, 88);
    expect(badge).not.toBeNull();
    expect(badge?.color).toContain("orange");
  });

  it("returns red badge for over 15% change", () => {
    const badge = getWeightChangeBadge(100, 80);
    expect(badge).not.toBeNull();
    expect(badge?.color).toContain("red");
  });

  it("shows negative sign for weight loss", () => {
    const badge = getWeightChangeBadge(90, 100);
    expect(badge?.label).toContain("-");
  });
});
