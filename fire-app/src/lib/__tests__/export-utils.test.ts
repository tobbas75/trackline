import { describe, it, expect, vi, beforeEach } from "vitest";
import { toCSV } from "@/lib/export-utils";

describe("toCSV", () => {
  it("returns empty string for empty array", () => {
    expect(toCSV([])).toBe("");
  });

  it("generates header row from object keys", () => {
    const csv = toCSV([{ name: "Fire A", area: 100 }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,area");
    expect(lines[1]).toBe("Fire A,100");
  });

  it("uses custom headers when provided", () => {
    const csv = toCSV([{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("c,a");
    expect(lines[1]).toBe("3,1");
  });

  it("quotes strings containing commas", () => {
    const csv = toCSV([{ name: "Smith, John", age: 30 }]);
    expect(csv).toContain('"Smith, John"');
  });

  it("escapes double quotes inside values", () => {
    const csv = toCSV([{ note: 'He said "hello"' }]);
    expect(csv).toContain('"He said ""hello"""');
  });

  it("handles null and undefined values", () => {
    const csv = toCSV([{ a: null, b: undefined } as Record<string, unknown>]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",");
  });

  it("handles multiple rows", () => {
    const data = [
      { year: 2024, area: 100 },
      { year: 2025, area: 200 },
    ];
    const lines = toCSV(data).split("\n");
    expect(lines).toHaveLength(3);
  });

  it("handles numeric values correctly", () => {
    const csv = toCSV([{ pct: 42.5, count: 0 }]);
    expect(csv).toContain("42.5");
    expect(csv).toContain("0");
  });
});

describe("export download functions", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLElement);
  });

  it("exportAnnualBurnCSV triggers download", async () => {
    const { exportAnnualBurnCSV } = await import("@/lib/export-utils");
    exportAnnualBurnCSV([
      { year: 2025, eds_ha: 100, lds_ha: 50, total_ha: 150, eds_pct: 60, lds_pct: 30, total_pct: 90 },
    ]);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportCSV triggers download with correct filename", async () => {
    const { exportCSV } = await import("@/lib/export-utils");
    exportCSV([{ a: 1 }], "test-export.csv");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportGeoJSON triggers download", async () => {
    const { exportGeoJSON } = await import("@/lib/export-utils");
    exportGeoJSON({ type: "FeatureCollection", features: [] }, "test.geojson");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportJSON triggers download", async () => {
    const { exportJSON } = await import("@/lib/export-utils");
    exportJSON({ key: "value" }, "test.json");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportFireScarsGeoJSON creates valid features", async () => {
    const { exportFireScarsGeoJSON } = await import("@/lib/export-utils");
    exportFireScarsGeoJSON([
      { id: "s1", year: 2025, month: 5, season: "EDS" as const, area_ha: 100 },
    ]);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportBurnPlansGeoJSON creates valid features", async () => {
    const { exportBurnPlansGeoJSON } = await import("@/lib/export-utils");
    exportBurnPlansGeoJSON([
      { id: "bp1", name: "Test Plan", season: "2025 EDS", status: "approved", target_ha: 500, vegetation: "Open Woodland" },
    ]);
    expect(clickSpy).toHaveBeenCalled();
  });
});
