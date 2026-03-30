import { create } from "zustand";
import type { Organisation, OrgRole } from "@/lib/supabase/types";

interface OrgMember {
  user_id: string;
  role: OrgRole;
  joined_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface OrgState {
  activeOrg: Organisation | null;
  orgs: Organisation[];
  members: OrgMember[];
  userRole: OrgRole | null;
  setActiveOrg: (org: Organisation | null) => void;
  setOrgs: (orgs: Organisation[]) => void;
  setMembers: (members: OrgMember[]) => void;
  setUserRole: (role: OrgRole | null) => void;
  canEdit: () => boolean;
  canAdmin: () => boolean;
  isOwner: () => boolean;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrg: null,
  orgs: [],
  members: [],
  userRole: null,
  setActiveOrg: (activeOrg) => set({ activeOrg }),
  setOrgs: (orgs) => set({ orgs }),
  setMembers: (members) => set({ members }),
  setUserRole: (userRole) => set({ userRole }),
  canEdit: () => {
    const role = get().userRole;
    return role === "owner" || role === "admin" || role === "member";
  },
  canAdmin: () => {
    const role = get().userRole;
    return role === "owner" || role === "admin";
  },
  isOwner: () => get().userRole === "owner",
}));
