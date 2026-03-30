import { describe, it, expect, beforeEach } from "vitest";
import { useAuditStore } from "@/stores/audit-store";

describe("audit-store", () => {
  beforeEach(() => {
    useAuditStore.setState({ entries: [] });
  });

  it("starts empty after reset", () => {
    expect(useAuditStore.getState().entries).toHaveLength(0);
  });

  it("adds an entry with auto-generated id and timestamp", () => {
    useAuditStore.getState().addEntry({
      user_id: "u-1",
      user_name: "Test User",
      action: "burn_plan.create",
      resource_type: "burn_plan",
      resource_id: "bp-1",
      resource_name: "Test Plan",
      details: "Created test plan",
      ip_address: "127.0.0.1",
    });

    const entries = useAuditStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeTruthy();
    expect(entries[0].action).toBe("burn_plan.create");
  });

  it("prepends new entries (newest first)", () => {
    const { addEntry } = useAuditStore.getState();
    addEntry({
      user_id: "u-1", user_name: "A", action: "export.csv",
      resource_type: "export", resource_id: null, resource_name: null,
      details: "First", ip_address: null,
    });
    addEntry({
      user_id: "u-1", user_name: "A", action: "export.geojson",
      resource_type: "export", resource_id: null, resource_name: null,
      details: "Second", ip_address: null,
    });

    const entries = useAuditStore.getState().entries;
    expect(entries[0].details).toBe("Second");
    expect(entries[1].details).toBe("First");
  });

  it("preserves existing entries when adding", () => {
    useAuditStore.setState({
      entries: [{
        id: "existing", timestamp: "2025-01-01T00:00:00Z",
        user_id: "u-1", user_name: "A", action: "settings.update",
        resource_type: "project", resource_id: null, resource_name: null,
        details: "Existing", ip_address: null,
      }],
    });

    useAuditStore.getState().addEntry({
      user_id: "u-2", user_name: "B", action: "user.invite",
      resource_type: "user", resource_id: null, resource_name: null,
      details: "New", ip_address: null,
    });

    expect(useAuditStore.getState().entries).toHaveLength(2);
  });
});
