import { describe, it, expect } from "vitest";
import {
  getTotalACCUs,
  getTotalRevenue,
  getBaselineAverage,
  getCumulativeACCUs,
  getRevenueByBuyer,
  getIssuedPeriods,
  getPendingPeriods,
  accuPeriods,
  accuSales,
  baselineYears,
} from "@/lib/carbon-data";

describe("getTotalACCUs", () => {
  it("sums all accus_issued values", () => {
    const total = getTotalACCUs();
    const manual = accuPeriods.reduce((s, p) => s + p.accus_issued, 0);
    expect(total).toBe(manual);
  });

  it("returns a positive number", () => {
    expect(getTotalACCUs()).toBeGreaterThan(0);
  });
});

describe("getTotalRevenue", () => {
  it("sums revenue from completed sales only", () => {
    const total = getTotalRevenue();
    const completedSum = accuSales
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + s.total_aud, 0);
    expect(total).toBe(completedSum);
  });

  it("excludes non-completed sales", () => {
    const total = getTotalRevenue();
    const allSum = accuSales.reduce((sum, s) => sum + s.total_aud, 0);
    expect(total).toBeLessThan(allSum);
  });
});

describe("getBaselineAverage", () => {
  it("computes rounded average of baseline years", () => {
    const avg = getBaselineAverage();
    const expected = Math.round(
      baselineYears.reduce((s, y) => s + y.total_tco2e, 0) / baselineYears.length
    );
    expect(avg).toBe(expected);
  });

  it("returns a reasonable value for Tiwi (40k-50k range)", () => {
    const avg = getBaselineAverage();
    expect(avg).toBeGreaterThan(40000);
    expect(avg).toBeLessThan(55000);
  });
});

describe("getCumulativeACCUs", () => {
  it("returns monotonically increasing cumulative values", () => {
    const data = getCumulativeACCUs();
    for (let i = 1; i < data.length; i++) {
      expect(data[i].cumulative).toBeGreaterThan(data[i - 1].cumulative);
    }
  });

  it("excludes periods with zero ACCUs", () => {
    const data = getCumulativeACCUs();
    data.forEach((d) => expect(d.issued).toBeGreaterThan(0));
  });

  it("final cumulative equals total ACCUs", () => {
    const data = getCumulativeACCUs();
    expect(data[data.length - 1].cumulative).toBe(getTotalACCUs());
  });
});

describe("getRevenueByBuyer", () => {
  it("groups completed sales by contract type", () => {
    const result = getRevenueByBuyer();
    expect(result.length).toBeGreaterThan(0);
    const types = result.map((r) => r.type);
    expect(types).toContain("Government (ERF)");
    expect(types).toContain("Voluntary Market");
  });

  it("total revenue matches getTotalRevenue", () => {
    const result = getRevenueByBuyer();
    const sum = result.reduce((s, r) => s + r.total, 0);
    expect(sum).toBe(getTotalRevenue());
  });
});

describe("getIssuedPeriods / getPendingPeriods", () => {
  it("issued periods all have status 'issued'", () => {
    getIssuedPeriods().forEach((p) => expect(p.status).toBe("issued"));
  });

  it("pending periods have non-issued status", () => {
    getPendingPeriods().forEach((p) => expect(p.status).not.toBe("issued"));
  });

  it("issued + pending equals all periods", () => {
    expect(getIssuedPeriods().length + getPendingPeriods().length).toBe(accuPeriods.length);
  });
});
