/**
 * Tiwi Islands boundary and grid utilities for CDSE Processing API.
 * Hardcoded to the Tiwi Islands project area — no external bbox accepted.
 *
 * At 20m resolution the full extent is ~8290 x 4340 pixels, which exceeds
 * the CDSE Processing API's 2500x2500 limit per request. We split into a
 * grid of equally-sized chunks, each within the limit.
 */

import type { BBox } from "@/lib/geo-utils";
import tiwiBoundariesData from "@/lib/tiwi-boundaries.json";

/** Tiwi Islands bounding box [west, south, east, north] in EPSG:4326 */
export const TIWI_BBOX: BBox = [130.02, -11.94, 131.54, -11.16];

/** Target resolution in metres (20m = native SWIR band resolution) */
export const RESOLUTION_M = 20;

/** Max pixels per CDSE Processing API request per dimension */
export const MAX_CHUNK_PX = 2500;

/** Approximate metres per degree at the Tiwi latitude (~11.5°S) */
const DEG_TO_M_LAT = 111_320;
const DEG_TO_M_LON = 111_320 * Math.cos((11.55 * Math.PI) / 180);

/** Total pixel dimensions of the Tiwi extent at target resolution */
export const TOTAL_WIDTH = Math.ceil(
  ((TIWI_BBOX[2] - TIWI_BBOX[0]) * DEG_TO_M_LON) / RESOLUTION_M
);
export const TOTAL_HEIGHT = Math.ceil(
  ((TIWI_BBOX[3] - TIWI_BBOX[1]) * DEG_TO_M_LAT) / RESOLUTION_M
);

/** Grid dimensions (number of chunks per axis) */
export const COLS = Math.ceil(TOTAL_WIDTH / MAX_CHUNK_PX);
export const ROWS = Math.ceil(TOTAL_HEIGHT / MAX_CHUNK_PX);

/**
 * Base chunk pixel dimensions — each chunk gets an equal share of pixels
 * so that resolution is uniform across the composite image.
 */
export const BASE_CHUNK_W = Math.floor(TOTAL_WIDTH / COLS);
export const BASE_CHUNK_H = Math.floor(TOTAL_HEIGHT / ROWS);

/** Corner coordinates for MapLibre image source [topLeft, topRight, bottomRight, bottomLeft] */
export const TIWI_IMAGE_COORDS: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [TIWI_BBOX[0], TIWI_BBOX[3]], // top-left [west, north]
  [TIWI_BBOX[2], TIWI_BBOX[3]], // top-right [east, north]
  [TIWI_BBOX[2], TIWI_BBOX[1]], // bottom-right [east, south]
  [TIWI_BBOX[0], TIWI_BBOX[1]], // bottom-left [west, south]
];

/**
 * Tiwi Islands boundary as a MultiPolygon geometry for CDSE clip.
 * Merges both island polygons so CDSE only processes land pixels.
 */
export const TIWI_CLIP_GEOMETRY: GeoJSON.MultiPolygon = {
  type: "MultiPolygon",
  coordinates: (
    tiwiBoundariesData as GeoJSON.FeatureCollection<GeoJSON.Polygon>
  ).features.map((f) => f.geometry.coordinates),
};

/** A single chunk of the Tiwi grid for a Processing API request */
export interface TiwiChunk {
  col: number;
  row: number;
  bbox: BBox;
  width: number;
  height: number;
  /** Pixel offset in the composite image */
  offsetX: number;
  offsetY: number;
}

/**
 * Generate the grid of chunks covering the Tiwi extent.
 * Each chunk has proportional pixel dimensions so resolution is uniform.
 */
export function getTiwiChunks(): TiwiChunk[] {
  const lonRange = TIWI_BBOX[2] - TIWI_BBOX[0];
  const latRange = TIWI_BBOX[3] - TIWI_BBOX[1];
  const colWidth = lonRange / COLS;
  const rowHeight = latRange / ROWS;

  const chunks: TiwiChunk[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const west = TIWI_BBOX[0] + col * colWidth;
      const east = TIWI_BBOX[0] + (col + 1) * colWidth;
      // Rows go top to bottom (north to south)
      const north = TIWI_BBOX[3] - row * rowHeight;
      const south = TIWI_BBOX[3] - (row + 1) * rowHeight;

      // Each chunk gets equal pixels; last chunk absorbs rounding remainder
      const pxWidth =
        col === COLS - 1
          ? TOTAL_WIDTH - col * BASE_CHUNK_W
          : BASE_CHUNK_W;
      const pxHeight =
        row === ROWS - 1
          ? TOTAL_HEIGHT - row * BASE_CHUNK_H
          : BASE_CHUNK_H;

      chunks.push({
        col,
        row,
        bbox: [west, south, east, north],
        width: pxWidth,
        height: pxHeight,
        offsetX: col * BASE_CHUNK_W,
        offsetY: row * BASE_CHUNK_H,
      });
    }
  }

  return chunks;
}
