import "@testing-library/jest-dom";
import "fake-indexeddb/auto";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Suppress noisy Recharts container-size warnings in jsdom
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args[0]?.toString?.() || "";
  if (
    msg.includes("width") &&
    msg.includes("height") &&
    msg.includes("chart should be greater than 0")
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
