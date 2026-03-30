import { create } from "zustand";
import type { Database } from "@/lib/supabase/types";

type Organization = Database["public"]["Tables"]["organization"]["Row"];

interface OrgState {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  setOrganizations: (orgs: Organization[]) => void;
  setActiveOrg: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
}

/** Mock organizations for development */
const MOCK_ORGS: Organization[] = [
  {
    id: "org-1",
    name: "Tiwi Land Council",
    slug: "tiwi-lc",
    logo_url: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "org-2",
    name: "ALFA NT",
    slug: "alfa-nt",
    logo_url: null,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "org-3",
    name: "KLC Fire Program",
    slug: "klc-fire",
    logo_url: null,
    created_at: "2024-06-01T00:00:00Z",
  },
];

export const useOrgStore = create<OrgState>((set) => ({
  organizations: MOCK_ORGS,
  activeOrg: MOCK_ORGS[0],
  isLoading: false,
  setOrganizations: (organizations) => set({ organizations }),
  setActiveOrg: (activeOrg) => set({ activeOrg }),
  setLoading: (isLoading) => set({ isLoading }),
}));
