/**
 * Composites multiple CDSE Processing API chunk PNGs into a single image.
 * Uses sharp for efficient server-side image processing.
 *
 * Also provides `differenceImages()` for dMIBR: pixel-by-pixel subtraction
 * of baseline MIBR from current MIBR, with optional color ramp.
 */

import sharp from "sharp";
import type { TiwiChunk } from "@/lib/tiwi-grid";
import { TOTAL_WIDTH, TOTAL_HEIGHT } from "@/lib/tiwi-grid";
import { CONFIG } from "@/lib/config";

export { TOTAL_WIDTH, TOTAL_HEIGHT };

interface ChunkResult {
  chunk: TiwiChunk;
  buffer: Buffer;
}

/**
 * Composite chunk PNG buffers into a single full-extent image.
 * Chunks are placed on a transparent canvas at their computed offsets.
 */
export async function compositeChunks(
  results: ChunkResult[]
): Promise<Buffer> {
  const composites = results.map(({ chunk, buffer }) => ({
    input: buffer,
    left: chunk.offsetX,
    top: chunk.offsetY,
  }));

  return sharp({
    create: {
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 85, alphaQuality: 90 })
    .toBuffer();
}

/**
 * Aggressive auto-levels + S-curve contrast for grayscale composites.
 *
 * 1. Histogram-based percentile stretch (0.5%/99.5%) maps the real data
 *    range to 0–255, clipping extreme outliers.
 * 2. S-curve (sigmoid) contrast boost pushes midtones toward black/white,
 *    producing the deep-black / bright-white look typical of GIS viewers.
 *
 * Transparent pixels are left untouched.
 */
export async function enhanceContrast(imageBuf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build histogram of opaque pixel values only
  const hist = new Uint32Array(256);
  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    hist[data[i]]++;
    opaqueCount++;
  }

  if (opaqueCount === 0) return imageBuf;

  // Aggressive percentile clipping: 0.5% / 99.5%
  const clipLow = Math.floor(opaqueCount * CONFIG.CONTRAST.PERCENTILE_LOW);
  const clipHigh = Math.floor(opaqueCount * CONFIG.CONTRAST.PERCENTILE_HIGH);
  let low = 0;
  let high = 255;
  let lowFound = false;
  let cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v];
    if (!lowFound && cumulative >= clipLow) { low = v; lowFound = true; }
    if (cumulative >= clipHigh) { high = v; break; }
  }
  console.log(`[enhanceContrast] opaque=${opaqueCount} low=${low} high=${high} range=${high - low}`);

  const range = high - low;
  if (range <= 0) return imageBuf;

  // Pre-compute S-curve LUT for 0–255 → 0–255
  // sigmoid: f(x) = 1 / (1 + exp(-k*(x - 0.5))) rescaled to [0,1]
  // k=8 gives a strong S-curve that pushes midtones toward extremes
  const K = CONFIG.CONTRAST.SIGMOID_K;
  const lut = new Uint8Array(256);
  const sigMin = 1 / (1 + Math.exp(K * 0.5));
  const sigMax = 1 / (1 + Math.exp(-K * 0.5));
  const sigRange = sigMax - sigMin;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;                              // normalized [0,1]
    const sig = 1 / (1 + Math.exp(-K * (t - 0.5))); // sigmoid
    lut[i] = Math.round(((sig - sigMin) / sigRange) * 255);
  }

  // Apply: linear stretch [low,high]→[0,255] then S-curve
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const stretched = Math.max(0, Math.min(255, Math.round(((data[i] - low) / range) * 255)));
    const val = lut[stretched];
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 95 })
    .toBuffer();
}

/**
 * Diverging color ramp for dMIBR colour product.
 * `diff` is in [-1, 1] where negative = burnt, positive = recovery.
 *
 * Burnt (negative): dark purple → red → orange
 * Unchanged (~0): neutral light gray
 * Recovery (positive): yellow-green → green
 */
function dmibrColorRamp(diff: number): [number, number, number] {
  if (diff < -0.4) return [100, 0, 80]; // deep purple — severe burn
  if (diff < -0.2) return [180, 30, 20]; // dark red — moderate burn
  if (diff < -0.1) return [220, 100, 20]; // orange — light burn
  if (diff < -0.03) return [240, 180, 80]; // tan — slight burn signal
  if (diff < 0.03) return [200, 200, 200]; // neutral gray — no change
  if (diff < 0.1) return [180, 220, 120]; // light green — slight recovery
  if (diff < 0.2) return [80, 180, 60]; // green — moderate recovery
  return [20, 130, 40]; // dark green — strong recovery
}

/**
 * Compute dMIBR by subtracting baseline MIBR from current MIBR pixel-by-pixel.
 *
 * Both inputs are WebP composites produced by `compositeChunks()` using the
 * `mibr_bw` evalscript, which encodes MIBR as grayscale: `norm = clamp((mibr+1)/5, 0, 1)`.
 *
 * @param currentBuf - WebP composite of current period MIBR (grayscale)
 * @param baselineBuf - WebP composite of baseline period MIBR (grayscale)
 * @param colorMap - true for diverging colour ramp (dmibr), false for B&W (dmibr_bw)
 * @returns WebP buffer of the difference image
 */
export async function differenceImages(
  currentBuf: Buffer,
  baselineBuf: Buffer,
  colorMap: boolean
): Promise<Buffer> {
  // Decode both images to raw RGBA
  const [currentRaw, baselineRaw] = await Promise.all([
    sharp(currentBuf).ensureAlpha().raw().toBuffer(),
    sharp(baselineBuf).ensureAlpha().raw().toBuffer(),
  ]);

  const pixelCount = TOTAL_WIDTH * TOTAL_HEIGHT;
  const output = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const curAlpha = currentRaw[idx + 3];
    const baseAlpha = baselineRaw[idx + 3];

    // Transparent if either source is no-data
    if (curAlpha === 0 || baseAlpha === 0) {
      output[idx] = 0;
      output[idx + 1] = 0;
      output[idx + 2] = 0;
      output[idx + 3] = 0;
      continue;
    }

    // Decode normalized MIBR from grayscale R channel (0-255 → 0.0-1.0)
    const curNorm = currentRaw[idx] / 255;
    const baseNorm = baselineRaw[idx] / 255;

    // Difference in normalized space: range [-1, 1]
    // mibr_bw evalscript is inverted (1-norm), so swap subtraction order
    // to restore: Negative = MIBR decreased = burnt, Positive = recovery
    const diff = baseNorm - curNorm;

    if (colorMap) {
      const [r, g, b] = dmibrColorRamp(diff);
      output[idx] = r;
      output[idx + 1] = g;
      output[idx + 2] = b;
    } else {
      // B&W: map diff [-1,1] to [255,0] centered at 128
      // Bright = burn (negative diff), Dark = recovery (positive diff)
      const val = Math.max(0, Math.min(255, Math.round((1 - diff) * 127.5)));
      output[idx] = val;
      output[idx + 1] = val;
      output[idx + 2] = val;
    }

    output[idx + 3] = 255;
  }

  return sharp(output, {
    raw: { width: TOTAL_WIDTH, height: TOTAL_HEIGHT, channels: 4 },
  })
    .webp({ quality: 85, alphaQuality: 90 })
    .toBuffer();
}
