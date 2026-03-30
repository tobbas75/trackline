import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

interface DemoUser {
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: DemoUser | null;
  isLoading: boolean;
  setUser: (user: DemoUser | null) => void;
  setLoading: (loading: boolean) => void;
  loadFromCookie: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  loadFromCookie: () => {
    try {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("demo-auth="));
      if (match) {
        const json = decodeURIComponent(match.split("=").slice(1).join("="));
        const parsed = JSON.parse(json) as DemoUser;
        set({ user: parsed, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },
  logout: async () => {
    // Sign out from Supabase session if one exists
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[auth-store] Supabase signOut failed (may have no active session):", error);
    }

    // Clear demo auth cookie and local state
    document.cookie = "demo-auth=; path=/; max-age=0";
    set({ user: null });

    // Full page redirect clears all client state cleanly
    window.location.href = "/login";
  },
}));
