import { describe, it, expect } from "vitest";
import {
  getLatestYear,
  getEdsLdsRatio,
  annualBurnData,
} from "@/lib/fire-metrics-data";

describe("getLatestYear", () => {
  it("returns the last entry in annualBurnData", () => {
    const latest = getLatestYear();
    expect(latest).toBe(annualBurnData[annualBurnData.length - 1]);
  });

  it("returns year 2025", () => {
    expect(getLatestYear().year).toBe(2025);
  });

  it("has valid burn percentages", () => {
    const latest = getLatestYear();
    expect(latest.eds_pct).toBeGreaterThan(0);
    expect(latest.total_pct).toBe(latest.eds_pct + latest.lds_pct);
  });
});

describe("getEdsLdsRatio", () => {
  it("returns correct ratio for 2025 (36/4 = 9)", () => {
    expect(getEdsLdsRatio(2025)).toBe(9);
  });

  it("returns a finite number for a year with non-zero LDS", () => {
    const ratio = getEdsLdsRatio(2021);
    expect(ratio).toBeGreaterThan(0);
    expect(isFinite(ratio)).toBe(true);
  });

  it("returns Infinity for non-existent year", () => {
    expect(getEdsLdsRatio(1900)).toBe(Infinity);
  });
});
