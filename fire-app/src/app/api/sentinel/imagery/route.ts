import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { isCdseConfigured } from "@/lib/cdse-auth";
import { EVALSCRIPTS, VALID_PRODUCTS, DMIBR_PRODUCTS } from "@/lib/sentinel-evalscripts";
import {
  getTiwiChunks,
  TIWI_BBOX,
  TOTAL_WIDTH,
  TOTAL_HEIGHT,
  RESOLUTION_M,
} from "@/lib/tiwi-grid";
import { fetchChunk } from "@/lib/cdse-process";
import { compositeChunks, differenceImages, enhanceContrast } from "@/lib/sentinel-compositor";
import { createJob, updateJob } from "@/lib/sentinel-jobs";
import { persistToStorage, loadFromStorage } from "@/lib/sentinel-storage";
import type { TiwiChunk } from "@/lib/tiwi-grid";

/**
 * Sentinel-2 imagery endpoint — fetches and caches processed imagery
 * clipped to the Tiwi Islands boundary.
 *
 * GET /api/sentinel/imagery?product=ndvi&dateStart=2025-12&dateEnd=2026-03
 *
 * Standard products (ndvi, nbr, etc.): synchronous fetch + composite.
 * dMIBR products: returns 202 immediately and processes in the background.
 * Client polls /api/sentinel/imagery/status?jobId=xxx for progress.
 */

const CACHE_DIR = path.join(process.cwd(), "public", "data", "sentinel-cache");

/** Validate YYYY-MM or YYYY-MM-DD date format */
function isValidDate(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])(-([0-2]\d|3[01]))?$/.test(s);
}

/** Expand a date string to a full YYYY-MM-DD. YYYY-MM → first/last of month. */
function toFullDate(s: string, end: boolean): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY-MM format — expand to first or last day
  return end ? `${s}-28` : `${s}-01`;
}

/**
 * Derive baseline dates for dMIBR from the user's selected start date.
 * Baseline = Nov 1 – Dec 31 of the year before the selected period.
 */
function getBaselineDates(dateStart: string): { baselineStart: string; baselineEnd: string } {
  const year = parseInt(dateStart.slice(0, 4), 10);
  const baselineYear = year - 1;
  return {
    baselineStart: `${baselineYear}-11-01`,
    baselineEnd: `${baselineYear}-12-31`,
  };
}

/** Get cache file paths for a product+date combo */
function getCachePaths(
  product: string,
  dateStart: string,
  dateEnd: string,
  baseline?: { baselineStart: string; baselineEnd: string }
) {
  const dir = path.join(CACHE_DIR, product);
  const base = baseline
    ? `${baseline.baselineStart}_${baseline.baselineEnd}_vs_${dateStart}_${dateEnd}`
    : `${dateStart}_${dateEnd}`;
  return {
    dir,
    image: path.join(dir, `${base}.webp`),
    meta: path.join(dir, `${base}.json`),
  };
}

/**
 * Process dMIBR in the background. Updates job progress as chunks complete.
 * Writes final image to disk cache on success, marks job error on failure.
 */
async function processDmibrBackground(
  jobId: string,
  product: string,
  chunks: TiwiChunk[],
  baseline: { baselineStart: string; baselineEnd: string },
  fullDateStart: string,
  fullDateEnd: string,
  cachePaths: { dir: string; image: string; meta: string },
  dateStart: string,
  dateEnd: string,
  maxCloudCoverage: number
): Promise<void> {
  try {
    const mibrBwScript = EVALSCRIPTS["mibr_bw"];
    if (!mibrBwScript) {
      updateJob(jobId, { status: "error", error: "mibr_bw evalscript not found" });
      return;
    }

    const chunkCount = chunks.length;

    // Step 1: Fetch baseline chunks (parallel, with per-chunk progress)
    updateJob(jobId, { step: 1, progress: `Fetching baseline imagery (0/${chunkCount})` });
    let baselineDone = 0;
    const baselineResults = await Promise.all(
      chunks.map(async (chunk) => {
        const buffer = await fetchChunk(
          chunk, mibrBwScript,
          baseline.baselineStart, baseline.baselineEnd,
          { maxCloudCoverage: Math.max(maxCloudCoverage, 50) }
        );
        baselineDone++;
        updateJob(jobId, { progress: `Fetching baseline imagery (${baselineDone}/${chunkCount})` });
        return { chunk, buffer };
      })
    );
    console.log(`[sentinel] dMIBR job ${jobId}: baseline ${baselineResults.length} chunks fetched`);

    // Step 2: Fetch current chunks (parallel, with per-chunk progress)
    updateJob(jobId, { step: 2, progress: `Fetching current imagery (0/${chunkCount})` });
    let currentDone = 0;
    const currentResults = await Promise.all(
      chunks.map(async (chunk) => {
        const buffer = await fetchChunk(chunk, mibrBwScript, fullDateStart, fullDateEnd, { maxCloudCoverage });
        currentDone++;
        updateJob(jobId, { progress: `Fetching current imagery (${currentDone}/${chunkCount})` });
        return { chunk, buffer };
      })
    );
    console.log(`[sentinel] dMIBR job ${jobId}: current ${currentResults.length} chunks fetched`);

    // Step 3: Composite
    updateJob(jobId, { step: 3, progress: "Compositing images" });
    const [baselineComposite, currentComposite] = await Promise.all([
      compositeChunks(baselineResults),
      compositeChunks(currentResults),
    ]);
    console.log(
      `[sentinel] dMIBR job ${jobId}: composites done — ` +
      `baseline ${baselineComposite.length}B, current ${currentComposite.length}B`
    );

    // Step 4: Pixel-by-pixel differencing
    updateJob(jobId, { step: 4, progress: "Computing difference" });
    const finalImage = await differenceImages(
      currentComposite,
      baselineComposite,
      product === "dmibr"
    );
    console.log(`[sentinel] dMIBR job ${jobId}: difference image ${finalImage.length} bytes`);

    // Step 5: Write to cache
    updateJob(jobId, { step: 5, progress: "Saving to cache" });
    await fs.mkdir(cachePaths.dir, { recursive: true });
    await fs.writeFile(cachePaths.image, finalImage);

    const metadata: Record<string, unknown> = {
      product,
      dateStart,
      dateEnd,
      bbox: TIWI_BBOX,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      resolution_m: RESOLUTION_M,
      created_at: new Date().toISOString(),
      source: "cdse_processing_api",
      baselineStart: baseline.baselineStart,
      baselineEnd: baseline.baselineEnd,
    };
    await fs.writeFile(cachePaths.meta, JSON.stringify(metadata, null, 2));

    // Persist to Supabase Storage (fire-and-forget — don't block job completion)
    persistToStorage(finalImage, {
      product,
      dateStart,
      dateEnd,
      baselineStart: baseline.baselineStart,
      baselineEnd: baseline.baselineEnd,
    }).catch((err) => console.error("[sentinel] Storage persist error:", err));

    updateJob(jobId, { status: "complete", step: 5, progress: "Complete" });
    console.log(`[sentinel] dMIBR job ${jobId}: complete`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process dMIBR imagery";
    console.error(`[sentinel] dMIBR job ${jobId} failed:`, error);
    updateJob(jobId, { status: "error", error: message });
  }
}

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  const maxCloudParam = searchParams.get("maxCloud");
  const maxCloudCoverage = maxCloudParam !== null ? Number(maxCloudParam) : 30;

  if (isNaN(maxCloudCoverage) || maxCloudCoverage < 0 || maxCloudCoverage > 100) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "maxCloud must be a number between 0 and 100" },
        { status: 400 }
      )
    );
  }

  // Validate params
  if (!product || !VALID_PRODUCTS.includes(product)) {
    return NextResponse.json(
      {
        error: `Invalid product. Available: ${VALID_PRODUCTS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (!dateStart || !dateEnd || !isValidDate(dateStart) || !isValidDate(dateEnd)) {
    return NextResponse.json(
      { error: "dateStart and dateEnd must be YYYY-MM or YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (dateStart > dateEnd) {
    return NextResponse.json(
      { error: "dateStart must be before or equal to dateEnd" },
      { status: 400 }
    );
  }

  const isDmibr = DMIBR_PRODUCTS.has(product);
  const baseline = isDmibr ? getBaselineDates(dateStart) : undefined;
  const cachePaths = getCachePaths(product, dateStart, dateEnd, baseline);
  console.log(`[sentinel] Request: product=${product} dateStart=${dateStart} dateEnd=${dateEnd}`);
  if (isDmibr && baseline) {
    console.log(`[sentinel] dMIBR mode: baseline=${baseline.baselineStart}..${baseline.baselineEnd}`);
  }
  console.log(`[sentinel] Cache path: ${cachePaths.image}`);

  // --- Cache hit: serve from disk ---
  try {
    let cached: Buffer = await fs.readFile(cachePaths.image);
    console.log(`[sentinel] Cache HIT (${cached.length} bytes)`);

    // Apply contrast enhancement for grayscale products (old cached images may be unenhanced)
    if (product === "mibr_bw") {
      cached = await enhanceContrast(cached);
    }

    // Ensure it's also persisted to Supabase Storage (fire-and-forget, upsert is idempotent)
    const storageMeta = {
      product,
      dateStart,
      dateEnd,
      ...(baseline ? { baselineStart: baseline.baselineStart, baselineEnd: baseline.baselineEnd } : {}),
    };
    persistToStorage(Buffer.from(cached), storageMeta)
      .catch((err) => console.error("[sentinel] Storage persist error:", err));

    const resp = new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Sentinel-Cached": "true",
        "X-Sentinel-Bbox": TIWI_BBOX.join(","),
      },
    });
    return withSecurityHeaders(resp);
  } catch {
    console.log("[sentinel] Disk cache MISS — checking Supabase Storage");
  }

  // --- Supabase Storage: durable persistent cache ---
  const storageMeta = {
    product,
    dateStart,
    dateEnd,
    ...(baseline ? { baselineStart: baseline.baselineStart, baselineEnd: baseline.baselineEnd } : {}),
  };
  let storedImage = await loadFromStorage(storageMeta);
  if (storedImage) {
    // Apply contrast enhancement for grayscale products (old cached images may be unenhanced)
    if (product === "mibr_bw") {
      storedImage = await enhanceContrast(Buffer.from(storedImage));
    }

    // Restore to disk cache for next time
    try {
      await fs.mkdir(cachePaths.dir, { recursive: true });
      await fs.writeFile(cachePaths.image, storedImage);
      console.log("[sentinel] Restored from Supabase Storage → disk cache");
    } catch (err) {
      console.warn("[sentinel] Failed to restore to disk cache:", err);
    }

    const resp = new NextResponse(new Uint8Array(storedImage), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Sentinel-Cached": "true",
        "X-Sentinel-Bbox": TIWI_BBOX.join(","),
      },
    });
    return withSecurityHeaders(resp);
  }

  // --- Full cache miss: fetch from CDSE ---
  if (!isCdseConfigured()) {
    return NextResponse.json(
      {
        error:
          "CDSE not configured. Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in .env.local",
      },
      { status: 503 }
    );
  }

  const chunks = getTiwiChunks();
  const fullDateStart = toFullDate(dateStart, false);
  const fullDateEnd = toFullDate(dateEnd, true);

  try {
    // --- dMIBR: async background processing with polling ---
    if (isDmibr && baseline) {
      const cacheKey = cachePaths.image;
      const job = createJob(cacheKey);

      console.log(
        `[sentinel] dMIBR: job ${job.jobId} — ` +
        `${job.status === "processing" && job.step > 0 ? "already in progress" : "starting"} ` +
        `(baseline ${baseline.baselineStart}..${baseline.baselineEnd}, ` +
        `current ${fullDateStart}..${fullDateEnd})`
      );

      // Kick off background processing if this is a new job (step 0)
      if (job.step === 0) {
        // Fire-and-forget: do NOT await this
        processDmibrBackground(
          job.jobId, product, chunks, baseline,
          fullDateStart, fullDateEnd, cachePaths,
          dateStart, dateEnd, maxCloudCoverage
        ).catch((err) => {
          console.error(`[sentinel] dMIBR background processing unexpected error:`, err);
        });
      }

      // Return 202 immediately with job info
      const resp = NextResponse.json(
        {
          jobId: job.jobId,
          status: job.status,
          progress: job.progress,
          step: job.step,
          totalSteps: job.totalSteps,
        },
        { status: 202 }
      );
      return withSecurityHeaders(resp);
    }

    // --- Standard single-fetch path (non-dMIBR) ---
    const evalscript = EVALSCRIPTS[product];
    if (!evalscript) {
      console.error(`[sentinel] No evalscript found for product: ${product}`);
      return NextResponse.json({ error: `No evalscript for product: ${product}` }, { status: 400 });
    }

    console.log(`[sentinel] Fetching ${chunks.length} chunks from CDSE (${fullDateStart} to ${fullDateEnd})`);
    console.log(`[sentinel] Chunk dimensions: ${chunks[0]?.width}x${chunks[0]?.height}`);

    const results = await Promise.all(
      chunks.map(async (chunk) => ({
        chunk,
        buffer: await fetchChunk(chunk, evalscript, fullDateStart, fullDateEnd, { maxCloudCoverage }),
      }))
    );

    console.log(`[sentinel] All ${results.length} chunks fetched successfully`);
    let finalImage = await compositeChunks(results);

    // Contrast-enhance grayscale products so they aren't washed out
    if (product === "mibr_bw") {
      finalImage = await enhanceContrast(finalImage);
    }
    console.log(`[sentinel] Composite done: ${finalImage.length} bytes (${TOTAL_WIDTH}x${TOTAL_HEIGHT})`);

    // Write to cache
    await fs.mkdir(cachePaths.dir, { recursive: true });
    await fs.writeFile(cachePaths.image, finalImage);

    // Write metadata
    const metadata: Record<string, unknown> = {
      product,
      dateStart,
      dateEnd,
      bbox: TIWI_BBOX,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      resolution_m: RESOLUTION_M,
      created_at: new Date().toISOString(),
      source: "cdse_processing_api",
    };
    await fs.writeFile(cachePaths.meta, JSON.stringify(metadata, null, 2));

    // Persist to Supabase Storage (fire-and-forget)
    persistToStorage(finalImage, { product, dateStart, dateEnd })
      .catch((err) => console.error("[sentinel] Storage persist error:", err));

    const resp = new NextResponse(new Uint8Array(finalImage), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Sentinel-Cached": "false",
        "X-Sentinel-Bbox": TIWI_BBOX.join(","),
      },
    });
    return withSecurityHeaders(resp);
  } catch (error) {
    console.error("Sentinel imagery processing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process sentinel imagery",
      },
      { status: 502 }
    );
  }
}
