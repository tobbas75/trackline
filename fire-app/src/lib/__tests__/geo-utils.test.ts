import { describe, it, expect } from "vitest";
import { getBBox, bufferBBox, getBufferedBBoxString, type BBox } from "@/lib/geo-utils";
import { mockPointFeature, mockPolygonFeature, mockFeatureCollection } from "@/test/helpers";

// ─── getBBox ────────────────────────────────────────────────────

describe("getBBox", () => {
  it("extracts bbox from FeatureCollection", () => {
    const fc = mockFeatureCollection([
      mockPointFeature(130, -12),
      mockPointFeature(131, -11),
    ]);
    expect(getBBox(fc)).toEqual([130, -12, 131, -11]);
  });

  it("extracts bbox from a single Feature", () => {
    const feature = mockPointFeature(130.5, -11.5);
    expect(getBBox(feature)).toEqual([130.5, -11.5, 130.5, -11.5]);
  });

  it("returns null for empty FeatureCollection", () => {
    expect(getBBox(mockFeatureCollection())).toBeNull();
  });

  it("handles Polygon geometry", () => {
    const feature = mockPolygonFeature(129, -13, 132, -10);
    expect(getBBox(feature)).toEqual([129, -13, 132, -10]);
  });

  it("handles bare Geometry object", () => {
    const geom: GeoJSON.Geometry = {
      type: "Point",
      coordinates: [130, -12],
    };
    expect(getBBox(geom)).toEqual([130, -12, 130, -12]);
  });

  it("handles MultiLineString", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [[129, -13], [130, -12]],
          [[131, -11], [132, -10]],
        ],
      },
    };
    expect(getBBox(feature)).toEqual([129, -13, 132, -10]);
  });

  it("handles GeometryCollection", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [130, -12] },
          { type: "Point", coordinates: [131, -11] },
        ],
      },
    };
    expect(getBBox(feature)).toEqual([130, -12, 131, -11]);
  });
});

// ─── bufferBBox ─────────────────────────────────────────────────

describe("bufferBBox", () => {
  it("expands bbox accounting for latitude", () => {
    const bbox: BBox = [130, -12, 131, -11];
    const buffered = bufferBBox(bbox, 50);
    expect(buffered[0]).toBeLessThan(130);
    expect(buffered[1]).toBeLessThan(-12);
    expect(buffered[2]).toBeGreaterThan(131);
    expect(buffered[3]).toBeGreaterThan(-11);
  });

  it("uses latitude-dependent longitude expansion", () => {
    const equator = bufferBBox([130, -1, 131, 1], 100);
    const tropical = bufferBBox([130, -30, 131, -28], 100);
    const lonSpreadEquator = equator[2] - equator[0];
    const lonSpreadTropical = tropical[2] - tropical[0];
    // Higher latitude = more degrees per km in longitude
    expect(lonSpreadTropical).toBeGreaterThan(lonSpreadEquator);
  });

  it("returns same bbox for zero buffer", () => {
    const bbox: BBox = [130, -12, 131, -11];
    expect(bufferBBox(bbox, 0)).toEqual(bbox);
  });
});

// ─── getBufferedBBoxString ──────────────────────────────────────

describe("getBufferedBBoxString", () => {
  it("returns comma-separated bbox string", () => {
    const fc = mockFeatureCollection([mockPointFeature(130.5, -11.5)]);
    const result = getBufferedBBoxString(fc, 10);
    expect(result).toBeTruthy();
    const parts = result!.split(",").map(Number);
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBeLessThan(130.5);
    expect(parts[2]).toBeGreaterThan(130.5);
  });

  it("returns null for empty FeatureCollection", () => {
    expect(getBufferedBBoxString(mockFeatureCollection(), 10)).toBeNull();
  });
});
