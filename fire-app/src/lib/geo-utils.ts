/**
 * Geographic utility functions for bounding box calculations, buffering, etc.
 */

/** Simple bounding box: [minLon, minLat, maxLon, maxLat] */
export type BBox = [number, number, number, number];

/**
 * Extract the bounding box from a GeoJSON object (FeatureCollection, Feature, or Geometry).
 */
export function getBBox(geojson: GeoJSON.GeoJSON): BBox | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let hasCoords = false;

  function processCoord(coord: number[]) {
    hasCoords = true;
    if (coord[0] < minLon) minLon = coord[0];
    if (coord[1] < minLat) minLat = coord[1];
    if (coord[0] > maxLon) maxLon = coord[0];
    if (coord[1] > maxLat) maxLat = coord[1];
  }

  function processCoords(coords: number[][]) {
    coords.forEach(processCoord);
  }

  function processGeometry(geom: GeoJSON.Geometry) {
    switch (geom.type) {
      case "Point":
        processCoord(geom.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        processCoords(geom.coordinates);
        break;
      case "MultiLineString":
      case "Polygon":
        geom.coordinates.forEach(processCoords);
        break;
      case "MultiPolygon":
        geom.coordinates.forEach((poly) => poly.forEach(processCoords));
        break;
      case "GeometryCollection":
        geom.geometries.forEach(processGeometry);
        break;
    }
  }

  if (geojson.type === "FeatureCollection") {
    geojson.features.forEach((f) => processGeometry(f.geometry));
  } else if (geojson.type === "Feature") {
    processGeometry(geojson.geometry);
  } else {
    processGeometry(geojson);
  }

  if (!hasCoords) return null;
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Expand a bounding box by a buffer distance in kilometres.
 * Uses approximate degree conversion (1° lat ≈ 111km, 1° lon ≈ 111km × cos(lat)).
 */
export function bufferBBox(bbox: BBox, bufferKm: number): BBox {
  const KM_PER_DEG_LAT = 111.32;
  const midLat = (bbox[1] + bbox[3]) / 2;
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);

  const dLat = bufferKm / KM_PER_DEG_LAT;
  const dLon = bufferKm / kmPerDegLon;

  return [
    bbox[0] - dLon,
    bbox[1] - dLat,
    bbox[2] + dLon,
    bbox[3] + dLat,
  ];
}

/**
 * Get a buffered bounding box string from a GeoJSON boundary.
 * Returns "minLon,minLat,maxLon,maxLat" format suitable for WFS/WMS queries.
 * Returns null if no valid coordinates found.
 */
export function getBufferedBBoxString(
  geojson: GeoJSON.GeoJSON,
  bufferKm: number
): string | null {
  const bbox = getBBox(geojson);
  if (!bbox) return null;
  const buffered = bufferBBox(bbox, bufferKm);
  return buffered.map((v) => v.toFixed(6)).join(",");
}
