import { describe, it, expect } from "vitest";
import { featureCollection, polygon } from "@turf/helpers";
import {
  clipToProjectBoundary,
  classifyBySeason,
  computeShapeIndex,
  computeRollingAverages,
  evaluateTargets,
} from "@/lib/analysis-engine";
import type {
  AnnualBurnRow,
  ShapeIndexRow,
  RollingBurnRow,
  UnburntPatchRow,
  PatchAgeRow,
  DistToUnburntRow,
  PerimeterImpactRow,
} from "@/lib/analysis-types";

function makePoly(ring: number[][], props?: Record<string, unknown>) {
  return polygon([ring], props ?? {});
}

function square(lon: number, lat: number, size = 0.1) {
  return makePoly([[lon-size,lat-size],[lon+size,lat-size],[lon+size,lat+size],[lon-size,lat+size],[lon-size,lat-size]]);
}

function annualRow(year: number, eds_pct: number, lds_pct: number, total_pct = eds_pct + lds_pct): AnnualBurnRow {
  return { year, eds_ha: eds_pct*1000, lds_ha: lds_pct*1000, total_ha: total_pct*1000, eds_pct, lds_pct, total_pct };
}

const SMALL_RING = [[130,-11.5],[130.1,-11.5],[130.1,-11.6],[130,-11.6],[130,-11.5]];
const BIG_RING = [[130,-11.5],[130.5,-11.5],[130.5,-12],[130,-12],[130,-11.5]];

describe("clipToProjectBoundary", () => {
  it("returns empty when fireScars is empty", () => {
    expect(clipToProjectBoundary(featureCollection([]), featureCollection([square(130,-11.5)]))).toEqual([]);
  });
  it("returns empty when boundary is empty", () => {
    expect(clipToProjectBoundary(featureCollection([square(130,-11.5)]), featureCollection([]))).toEqual([]);
  });
  it("clips overlapping scar", () => {
    const scar = makePoly([[130,-11],[130.5,-11],[130.5,-12],[130,-12],[130,-11]], {month:5});
    const bound = makePoly([[130.2,-11.2],[130.4,-11.2],[130.4,-11.8],[130.2,-11.8],[130.2,-11.2]]);
    const r = clipToProjectBoundary(featureCollection([scar]), featureCollection([bound]));
    expect(r.length).toBe(1);
    expect(["Polygon","MultiPolygon"]).toContain(r[0].geometry.type);
  });
  it("excludes scars entirely outside boundary", () => {
    expect(clipToProjectBoundary(featureCollection([square(140,-20,0.1)]), featureCollection([square(130,-11.5)]))).toHaveLength(0);
  });
  it("preserves properties on clipped features", () => {
    const scar = makePoly([[130,-11],[130.5,-11],[130.5,-12],[130,-12],[130,-11]], {month:4,year:2023});
    const bound = makePoly([[130.1,-11.1],[130.4,-11.1],[130.4,-11.9],[130.1,-11.9],[130.1,-11.1]]);
    const r = clipToProjectBoundary(featureCollection([scar]), featureCollection([bound]));
    expect(r[0].properties?.month).toBe(4);
  });
  it("skips Point geometries", () => {
    const pt: GeoJSON.Feature = {type:"Feature",geometry:{type:"Point",coordinates:[130,-11.5]},properties:{}};
    expect(clipToProjectBoundary(featureCollection([pt]), featureCollection([square(130,-11.5)]))).toHaveLength(0);
  });
});

describe("classifyBySeason", () => {
  const PROJECT_HA = 100_000;
  it("returns empty for empty input", () => {
    const {annualBurnData,seasonBreakdown} = classifyBySeason(new Map(), PROJECT_HA, 7);
    expect(annualBurnData).toEqual([]);
    expect(seasonBreakdown).toEqual([]);
  });
  it("months 1-7 classified as EDS", () => {
    const features = [1,3,7].map(m => makePoly(SMALL_RING, {month:m}));
    const {annualBurnData} = classifyBySeason(new Map([[2024,features]]), PROJECT_HA, 7);
    expect(annualBurnData[0].eds_ha).toBeGreaterThan(0);
    expect(annualBurnData[0].lds_ha).toBe(0);
  });
  it("months 8-12 classified as LDS", () => {
    const features = [8,12].map(m => makePoly(SMALL_RING, {month:m}));
    const {annualBurnData} = classifyBySeason(new Map([[2024,features]]), PROJECT_HA, 7);
    expect(annualBurnData[0].lds_ha).toBeGreaterThan(0);
    expect(annualBurnData[0].eds_ha).toBe(0);
  });
  it("month 8 is EDS when cutoff=8", () => {
    const {annualBurnData} = classifyBySeason(new Map([[2024,[makePoly(SMALL_RING,{month:8})]]]), PROJECT_HA, 8);
    expect(annualBurnData[0].eds_ha).toBeGreaterThan(0);
  });
  it("years sorted ascending", () => {
    const f = (y:number) => makePoly(SMALL_RING,{month:4,year:y});
    const {annualBurnData} = classifyBySeason(new Map([[2022,[f(2022)]],[2020,[f(2020)]],[2021,[f(2021)]]]), PROJECT_HA, 7);
    expect(annualBurnData.map(r=>r.year)).toEqual([2020,2021,2022]);
  });
  it("seasonBreakdown sums to ~100%", () => {
    const {seasonBreakdown} = classifyBySeason(new Map([[2024,[makePoly(BIG_RING,{month:4})]]]), PROJECT_HA, 7);
    expect(seasonBreakdown).toHaveLength(3);
    expect(seasonBreakdown.reduce((s,r)=>s+r.value,0)).toBeCloseTo(100,0);
  });
});

describe("computeShapeIndex", () => {
  it("empty input", () => { expect(computeShapeIndex(new Map(), 7)).toEqual([]); });
  it("eds_si > 0 for EDS month", () => {
    const r = computeShapeIndex(new Map([[2024,[makePoly(BIG_RING,{month:4})]]]), 7);
    expect(r[0].eds_si).toBeGreaterThan(0);
    expect(r[0].lds_si).toBe(0);
  });
  it("lds_si > 0 for LDS month", () => {
    const r = computeShapeIndex(new Map([[2024,[makePoly(BIG_RING,{month:9})]]]), 7);
    expect(r[0].lds_si).toBeGreaterThan(0);
    expect(r[0].eds_si).toBe(0);
  });
});

describe("computeRollingAverages", () => {
  it("empty input returns empty arrays", () => {
    const {twoYearRolling,threeYearRolling} = computeRollingAverages([]);
    expect(twoYearRolling).toEqual([]);
    expect(threeYearRolling).toEqual([]);
  });
  it("no rolling entries for single year", () => {
    const {twoYearRolling,threeYearRolling} = computeRollingAverages([annualRow(2024,40,8)]);
    expect(twoYearRolling).toEqual([]);
    expect(threeYearRolling).toEqual([]);
  });
  it("1 twoYear entry for 2 years", () => {
    const {twoYearRolling} = computeRollingAverages([annualRow(2023,40,8),annualRow(2024,42,7)]);
    expect(twoYearRolling).toHaveLength(1);
    expect(twoYearRolling[0].year).toBe(2024);
  });
  it("1 threeYear entry for 3 years", () => {
    const {threeYearRolling} = computeRollingAverages([annualRow(2022,40,8),annualRow(2023,42,7),annualRow(2024,38,9)]);
    expect(threeYearRolling).toHaveLength(1);
    expect(threeYearRolling[0].year).toBe(2024);
  });
});

describe("evaluateTargets", () => {
  const E: ShapeIndexRow[] = [];
  const ER: RollingBurnRow[] = [];
  const EU: UnburntPatchRow[] = [];
  const EPA: PatchAgeRow[] = [];
  const ED: DistToUnburntRow[] = [];
  const EP: PerimeterImpactRow[] = [];

  it("empty annual data returns only unconditional metrics", () => {
    // Mean Patch Age and LDS Patch Age are always computed even with empty inputs
    expect(evaluateTargets([],E,ER,ER,EU,EPA,EPA,ED,EP)).toHaveLength(2);
  });
  it("EDS on_track when >= 35%", () => {
    const r = evaluateTargets([annualRow(2024,40,8)],E,ER,ER,EU,EPA,EPA,ED,EP);
    expect(r.find(t=>t.metric==="EDS Burn %")?.status).toBe("on_track");
  });
  it("EDS off_track when < 30%", () => {
    const r = evaluateTargets([annualRow(2024,20,8)],E,ER,ER,EU,EPA,EPA,ED,EP);
    expect(r.find(t=>t.metric==="EDS Burn %")?.status).toBe("off_track");
  });
  it("EDS at_risk between 30-35%", () => {
    const r = evaluateTargets([annualRow(2024,32,8)],E,ER,ER,EU,EPA,EPA,ED,EP);
    expect(r.find(t=>t.metric==="EDS Burn %")?.status).toBe("at_risk");
  });
  it("LDS on_track when <= 10%", () => {
    const r = evaluateTargets([annualRow(2024,40,8)],E,ER,ER,EU,EPA,EPA,ED,EP);
    expect(r.find(t=>t.metric==="LDS Burn %")?.status).toBe("on_track");
  });
  it("LDS off_track when > 15%", () => {
    const r = evaluateTargets([annualRow(2024,40,20)],E,ER,ER,EU,EPA,EPA,ED,EP);
    expect(r.find(t=>t.metric==="LDS Burn %")?.status).toBe("off_track");
  });
});