import { describe, it, expect, beforeEach } from "vitest";
import { useOrgStore } from "@/stores/org-store";

describe("org-store", () => {
  beforeEach(() => {
    useOrgStore.setState({
      organizations: [
        { id: "org-1", name: "Test Org", slug: "test", logo_url: null, created_at: "2024-01-01T00:00:00Z" },
      ],
      activeOrg: { id: "org-1", name: "Test Org", slug: "test", logo_url: null, created_at: "2024-01-01T00:00:00Z" },
      isLoading: false,
    });
  });

  it("has an active org", () => {
    expect(useOrgStore.getState().activeOrg?.name).toBe("Test Org");
  });

  it("sets active org", () => {
    const newOrg = { id: "org-2", name: "ALFA NT", slug: "alfa", logo_url: null, created_at: "2024-01-01T00:00:00Z" };
    useOrgStore.getState().setActiveOrg(newOrg);
    expect(useOrgStore.getState().activeOrg?.id).toBe("org-2");
  });

  it("sets active org to null", () => {
    useOrgStore.getState().setActiveOrg(null);
    expect(useOrgStore.getState().activeOrg).toBeNull();
  });

  it("sets organizations list", () => {
    useOrgStore.getState().setOrganizations([]);
    expect(useOrgStore.getState().organizations).toHaveLength(0);
  });

  it("sets loading state", () => {
    useOrgStore.getState().setLoading(true);
    expect(useOrgStore.getState().isLoading).toBe(true);
  });
});
