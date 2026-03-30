/**
 * Shared Sentinel-2 evalscript registry.
 * Used by the CDSE Processing API imagery route.
 *
 * All evalscripts are v3-compatible and produce RGBA output (4 bands).
 * The dataMask band ensures ocean/no-data pixels are transparent.
 */

/** Pre-built evalscripts matching the existing ArcPy processing pipeline */
export const EVALSCRIPTS: Record<string, string> = {
  ndvi: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let r, g, b;
  if (ndvi < -0.2) { r = 0.6; g = 0.4; b = 0.2; }
  else if (ndvi < 0.0) { r = 0.9; g = 0.8; b = 0.4; }
  else if (ndvi < 0.1) { r = 0.95; g = 0.95; b = 0.6; }
  else if (ndvi < 0.2) { r = 0.8; g = 0.9; b = 0.4; }
  else if (ndvi < 0.4) { r = 0.5; g = 0.8; b = 0.2; }
  else if (ndvi < 0.6) { r = 0.2; g = 0.7; b = 0.1; }
  else { r = 0.0; g = 0.5; b = 0.0; }
  return [r, g, b, s.dataMask];
}`,

  nbr: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B08", "B12", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  let nbr = (s.B08 - s.B12) / (s.B08 + s.B12);
  let r, g, b;
  if (nbr < -0.2) { r = 0.5; g = 0.0; b = 0.0; }
  else if (nbr < 0.0) { r = 0.8; g = 0.2; b = 0.0; }
  else if (nbr < 0.1) { r = 1.0; g = 0.6; b = 0.0; }
  else if (nbr < 0.27) { r = 1.0; g = 1.0; b = 0.4; }
  else if (nbr < 0.44) { r = 0.6; g = 0.9; b = 0.3; }
  else { r = 0.1; g = 0.6; b = 0.1; }
  return [r, g, b, s.dataMask];
}`,

  ndwi: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03", "B08", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  let ndwi = (s.B03 - s.B08) / (s.B03 + s.B08);
  let r, g, b;
  if (ndwi < -0.3) { r = 0.8; g = 0.6; b = 0.3; }
  else if (ndwi < 0.0) { r = 0.6; g = 0.8; b = 0.4; }
  else if (ndwi < 0.2) { r = 0.3; g = 0.7; b = 0.8; }
  else if (ndwi < 0.5) { r = 0.1; g = 0.4; b = 0.9; }
  else { r = 0.0; g = 0.2; b = 0.7; }
  return [r, g, b, s.dataMask];
}`,

  true_colour: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B03", "B02", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  return [s.B04 * 3.0, s.B03 * 3.0, s.B02 * 3.0, s.dataMask];
}`,

  false_colour: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B08", "B04", "B03", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  return [s.B08 * 3.0, s.B04 * 3.0, s.B03 * 3.0, s.dataMask];
}`,

  // --- MIBR (Mid-Infrared Burn Ratio) — 10×SWIR2 - 9.8×SWIR1 + 2 ---

  mibr: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B11", "B12", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  let mibr = 10.0 * s.B12 - 9.8 * s.B11 + 2.0;
  let norm = (mibr + 1.0) / 5.0;
  norm = Math.max(0, Math.min(1, norm));
  let r, g, b;
  if (norm < 0.2) { r = 0.4; g = 0.0; b = 0.5; }
  else if (norm < 0.35) { r = 0.8; g = 0.1; b = 0.1; }
  else if (norm < 0.5) { r = 1.0; g = 0.5; b = 0.0; }
  else if (norm < 0.65) { r = 1.0; g = 0.9; b = 0.2; }
  else if (norm < 0.8) { r = 0.5; g = 1.0; b = 0.5; }
  else { r = 0.0; g = 0.8; b = 0.9; }
  return [r, g, b, s.dataMask];
}`,

  mibr_bw: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B11", "B12", "dataMask"] }],
    output: { bands: 4 }
  };
}
function evaluatePixel(s) {
  let mibr = 10.0 * s.B12 - 9.8 * s.B11 + 2.0;
  let norm = (mibr + 1.0) / 5.0;
  norm = Math.max(0, Math.min(1, norm));
  let inv = 1.0 - norm;
  return [inv, inv, inv, s.dataMask];
}`,

};

/**
 * dMIBR products are computed server-side via dual-fetch differencing,
 * not via a single CDSE evalscript. They use the `mibr_bw` evalscript
 * for both baseline and current periods, then subtract pixel-by-pixel.
 */
export const DMIBR_PRODUCTS = new Set(["dmibr", "dmibr_bw"]);

/** All valid product names (includes dMIBR products computed server-side) */
export const VALID_PRODUCTS = [
  ...Object.keys(EVALSCRIPTS),
  ...DMIBR_PRODUCTS,
];
