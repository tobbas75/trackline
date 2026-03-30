import type { OrgRole } from "@/lib/supabase/types";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function hasMinRole(userRole: OrgRole | null, requiredRole: OrgRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canEdit(role: OrgRole | null): boolean {
  return hasMinRole(role, "member");
}

export function canAdmin(role: OrgRole | null): boolean {
  return hasMinRole(role, "admin");
}

export function isOwner(role: OrgRole | null): boolean {
  return role === "owner";
}

export function getRoleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  };
  return labels[role];
}

export function getOrgTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ranger_team: "Ranger Team",
    national_park: "National Park",
    research_group: "Research Group",
    ngo: "NGO",
    private_landholder: "Private Landholder",
    government: "Government",
    other: "Other",
  };
  return labels[type] || type;
}
