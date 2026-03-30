import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project-store";

const mockProject = (id: string, name: string) => ({
  id,
  organization_id: "org-1",
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: null,
  boundary: null,
  area_ha: 786000,
  rainfall_zone: "high" as const,
  state: "NT",
  status: "active",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

describe("project-store", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      activeProject: null,
      isLoading: false,
    });
  });

  it("starts with no active project", () => {
    expect(useProjectStore.getState().activeProject).toBeNull();
  });

  it("sets active project", () => {
    useProjectStore.getState().setActiveProject(mockProject("p-1", "Tiwi Islands"));
    expect(useProjectStore.getState().activeProject?.name).toBe("Tiwi Islands");
  });

  it("sets projects list", () => {
    useProjectStore.getState().setProjects([mockProject("p-1", "Tiwi")]);
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it("sets loading state", () => {
    useProjectStore.getState().setLoading(true);
    expect(useProjectStore.getState().isLoading).toBe(true);
  });
});
