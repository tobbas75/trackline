import { describe, it, expect, beforeEach } from "vitest";
import { useZoneStore } from "@/stores/zone-store";

const mockZone = (id: string, name: string) => ({
  id,
  project_id: "p-1",
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: null,
  boundary: null,
  area_ha: 100000,
  color: "#ff0000",
  sort_order: 0,
  created_at: "2024-01-01T00:00:00Z",
});

describe("zone-store", () => {
  beforeEach(() => {
    useZoneStore.setState({ zones: [], activeZone: null });
  });

  it("starts empty", () => {
    expect(useZoneStore.getState().zones).toHaveLength(0);
    expect(useZoneStore.getState().activeZone).toBeNull();
  });

  it("sets zones", () => {
    useZoneStore.getState().setZones([mockZone("z-1", "Bathurst"), mockZone("z-2", "Melville")]);
    expect(useZoneStore.getState().zones).toHaveLength(2);
  });

  it("adds a zone", () => {
    useZoneStore.getState().addZone(mockZone("z-1", "Bathurst"));
    expect(useZoneStore.getState().zones).toHaveLength(1);
    expect(useZoneStore.getState().zones[0].name).toBe("Bathurst");
  });

  it("removes a zone", () => {
    useZoneStore.getState().setZones([mockZone("z-1", "Bathurst"), mockZone("z-2", "Melville")]);
    useZoneStore.getState().removeZone("z-1");
    expect(useZoneStore.getState().zones).toHaveLength(1);
    expect(useZoneStore.getState().zones[0].id).toBe("z-2");
  });

  it("resets activeZone when removing the active zone", () => {
    const zone = mockZone("z-1", "Bathurst");
    useZoneStore.getState().setZones([zone]);
    useZoneStore.getState().setActiveZone(zone);
    expect(useZoneStore.getState().activeZone?.id).toBe("z-1");

    useZoneStore.getState().removeZone("z-1");
    expect(useZoneStore.getState().activeZone).toBeNull();
  });

  it("preserves activeZone when removing a different zone", () => {
    const z1 = mockZone("z-1", "Bathurst");
    const z2 = mockZone("z-2", "Melville");
    useZoneStore.getState().setZones([z1, z2]);
    useZoneStore.getState().setActiveZone(z1);

    useZoneStore.getState().removeZone("z-2");
    expect(useZoneStore.getState().activeZone?.id).toBe("z-1");
  });
});
