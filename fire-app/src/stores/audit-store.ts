import { create } from "zustand";

export type AuditAction =
  | "project.create"
  | "project.update"
  | "project.delete"
  | "burn_plan.create"
  | "burn_plan.update"
  | "burn_plan.approve"
  | "burn_plan.complete"
  | "daily_plan.create"
  | "daily_plan.update"
  | "checklist.sign_off"
  | "fire_scar.import"
  | "fire_scar.delete"
  | "carbon.period_create"
  | "carbon.period_submit"
  | "carbon.accu_sale"
  | "user.invite"
  | "user.role_change"
  | "user.remove"
  | "settings.update"
  | "export.csv"
  | "export.geojson"
  | "export.report";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: string;
  ip_address: string | null;
}

interface AuditState {
  entries: AuditEntry[];
  addEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
}

/** Mock audit log entries */
const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "a-1", timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    user_id: "u-1", user_name: "Toby Barton", action: "export.report",
    resource_type: "report", resource_id: null, resource_name: "Annual Fire Report 2025",
    details: "Exported annual fire report as PDF.", ip_address: "203.0.113.42",
  },
  {
    id: "a-2", timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user_id: "u-1", user_name: "Toby Barton", action: "carbon.period_submit",
    resource_type: "accu_period", resource_id: "ap-9", resource_name: "2024-25",
    details: "Submitted ACCU period 2024-25 to CER. SavBAT ref: SB-2025-001.", ip_address: "203.0.113.42",
  },
  {
    id: "a-3", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_id: "u-2", user_name: "Jane Smith", action: "burn_plan.approve",
    resource_type: "burn_plan", resource_id: "bp-5", resource_name: "Western Sector Block A",
    details: "Approved burn plan for aerial EDS operations.", ip_address: "198.51.100.22",
  },
  {
    id: "a-4", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    user_id: "u-3", user_name: "David Williams", action: "checklist.sign_off",
    resource_type: "checklist", resource_id: "cl-12", resource_name: "Pre-flight Checklist — BK117",
    details: "Signed off pre-flight checklist. All 14 items passed.", ip_address: null,
  },
  {
    id: "a-5", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    user_id: "u-2", user_name: "Jane Smith", action: "daily_plan.create",
    resource_type: "daily_plan", resource_id: "dp-8", resource_name: "Daily Plan — 2 Mar 2026",
    details: "Created daily plan with 2 flight sorties and 4 ground crew.", ip_address: "198.51.100.22",
  },
  {
    id: "a-6", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    user_id: "u-1", user_name: "Toby Barton", action: "fire_scar.import",
    resource_type: "fire_scar", resource_id: null, resource_name: "NAFI Oct 2025",
    details: "Imported 15 fire scar polygons from NAFI (2,520 ha total).", ip_address: "203.0.113.42",
  },
  {
    id: "a-7", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user_id: "u-1", user_name: "Toby Barton", action: "user.invite",
    resource_type: "user", resource_id: "u-5", resource_name: "Tom Brown",
    details: "Invited tom@example.com as viewer.", ip_address: "203.0.113.42",
  },
  {
    id: "a-8", timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user_id: "u-2", user_name: "Jane Smith", action: "burn_plan.create",
    resource_type: "burn_plan", resource_id: "bp-6", resource_name: "Eastern Ridge Line",
    details: "Created EDS burn plan — 4,200 ha target, aerial ignition.", ip_address: "198.51.100.22",
  },
  {
    id: "a-9", timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    user_id: "u-1", user_name: "Toby Barton", action: "settings.update",
    resource_type: "project", resource_id: "proj-1", resource_name: "Tiwi Islands",
    details: "Updated EDS cutoff month from July to August.", ip_address: "203.0.113.42",
  },
  {
    id: "a-10", timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    user_id: "u-3", user_name: "David Williams", action: "export.geojson",
    resource_type: "export", resource_id: null, resource_name: "Burn Plans GeoJSON",
    details: "Exported active burn plans as GeoJSON for QGIS.", ip_address: null,
  },
];

export const useAuditStore = create<AuditState>((set) => ({
  entries: MOCK_AUDIT,
  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: `a-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        ...state.entries,
      ],
    })),
}));
