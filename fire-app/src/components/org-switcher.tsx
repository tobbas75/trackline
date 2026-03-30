"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgStore } from "@/stores/org-store";
import { Building2 } from "lucide-react";

export function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrg } = useOrgStore();

  return (
    <Select
      value={activeOrg?.id ?? ""}
      onValueChange={(id) => {
        const org = organizations.find((o) => o.id === id);
        if (org) setActiveOrg(org);
      }}
    >
      <SelectTrigger className="h-8 w-full text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select organization" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
