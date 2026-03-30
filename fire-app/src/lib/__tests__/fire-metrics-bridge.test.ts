import { describe, it, expect } from "vitest";
import {
  getMetricsData,
  annualBurnData,
  seasonBreakdown,
  fireTargets,
} from "@/lib/fire-metrics-data";
import type { AnalysisResults } from "@/lib/analysis-types";

describe("getMetricsData", () => {
  it("returns hardcoded data when computed is null", () => {
    const data = getMetricsData(null);
    expect(data.annualBurnData).toBe(annualBurnData);
    expect(data.seasonBreakdown).toBe(seasonBreakdown);
    expect(data.fireTargets).toBe(fireTargets);
  });

  it("returns computed data when provided", () => {
    const computed: AnalysisResults = {
      computedAt: "2026-01-01T00:00:00Z",
      years: [2022],
      annualBurnData: [
        { year: 2022, eds_ha: 100, lds_ha: 50, total_ha: 150, eds_pct: 20, lds_pct: 10, total_pct: 30 },
      ],
      shapeIndexData: [{ year: 2022, eds_si: 3.0, lds_si: 1.5 }],
      threeYearRolling: [],
      twoYearRolling: [],
      unburntPatchData: [],
      burnCountDistribution: [],
      patchAgeData: [],
      patchAgeLateOnly: [],
      distToUnburntData: [],
      perimeterImpactData: [],
      cfiTable3Data: [],
      cfiTable9Data: [],
      seasonBreakdown: [
        { name: "EDS", value: 20, color: "#3b82f6" },
        { name: "LDS", value: 10, color: "#ef4444" },
        { name: "Unburnt", value: 70, color: "#d1d5db" },
      ],
      fireTargets: [],
    };

    const data = getMetricsData(computed);
    expect(data.annualBurnData).toBe(computed.annualBurnData);
    expect(data.annualBurnData[0].eds_ha).toBe(100);
    expect(data.seasonBreakdown[2].value).toBe(70);
    // Should NOT be the hardcoded data
    expect(data.annualBurnData).not.toBe(annualBurnData);
  });
});
