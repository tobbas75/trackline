import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns false for desktop width", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true for mobile width", async () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener,
    }));

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});
