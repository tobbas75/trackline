import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true });
  });

  it("starts with no user and loading true", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it("sets user and stops loading", () => {
    useAuthStore.getState().setUser({
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    });
    const state = useAuthStore.getState();
    expect(state.user?.name).toBe("Test User");
    expect(state.isLoading).toBe(false);
  });

  it("sets loading state", () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("loadFromCookie parses valid cookie", () => {
    const user = { name: "Cookie User", email: "c@test.com", role: "ranger" };
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: `demo-auth=${encodeURIComponent(JSON.stringify(user))}`,
    });

    useAuthStore.getState().loadFromCookie();
    const state = useAuthStore.getState();
    expect(state.user?.name).toBe("Cookie User");
    expect(state.isLoading).toBe(false);
  });

  it("loadFromCookie sets null user when no cookie", () => {
    Object.defineProperty(document, "cookie", { writable: true, value: "" });
    useAuthStore.getState().loadFromCookie();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("logout clears user and sets cookie", async () => {
    useAuthStore.getState().setUser({
      name: "Test",
      email: "t@t.com",
      role: "admin",
    });

    // Mock window.location to prevent jsdom navigation error
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });
});
