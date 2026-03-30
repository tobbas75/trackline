"use client";

import { Organization } from "@/hooks/useDashboardData";

interface OrgSelectorProps {
  orgs: Organization[];
  currentOrg: Organization | null;
  onOrgChange: (org: Organization) => void;
}

export function OrgSelector({ orgs, currentOrg, onOrgChange }: OrgSelectorProps) {
  if (orgs.length === 0) return null;

  if (orgs.length > 1) {
    return (
      <select
        value={currentOrg?.id}
        onChange={(e) => {
          const org = orgs.find((o) => o.id === e.target.value);
          if (org) onOrgChange(org);
        }}
        aria-label="Select organization"
        className="rounded-lg border border-(--tm-border) bg-(--tm-panel) px-3 py-2 text-sm font-medium text-(--tm-text) outline-none transition-colors focus:border-(--tm-accent)"
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className="rounded-full bg-(--tm-panel-soft) px-3 py-1.5 text-sm font-medium text-(--tm-muted)">
      {currentOrg?.name}
    </span>
  );
}
