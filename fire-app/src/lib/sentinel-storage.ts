/**
 * Supabase Storage persistence for processed Sentinel imagery.
 *
 * After the imagery route processes a product, it saves the WebP to
 * Supabase Storage + inserts a record in sentinel_imagery_cache.
 * On disk cache miss, this module is checked before hitting CDSE.
 *
 * Server-side only — uses the admin (service role) client.
 */

import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { TIWI_BBOX, TOTAL_WIDTH, TOTAL_HEIGHT, RESOLUTION_M } from "@/lib/tiwi-grid";
import type { Database } from "@/lib/supabase/types";

type ImageCacheInsert = Database["public"]["Tables"]["sentinel_imagery_cache"]["Insert"];

const BUCKET = "sentinel-imagery";

export interface StorageMeta {
  product: string;
  dateStart: string;
  dateEnd: string;
  baselineStart?: string;
  baselineEnd?: string;
}

/** Build a deterministic storage path from product + dates */
function storagePath(meta: StorageMeta): string {
  const parts = [meta.product];
  if (meta.baselineStart && meta.baselineEnd) {
    parts.push(`${meta.baselineStart}_${meta.baselineEnd}_vs_${meta.dateStart}_${meta.dateEnd}`);
  } else {
    parts.push(`${meta.dateStart}_${meta.dateEnd}`);
  }
  return `${parts[0]}/${parts[1]}.webp`;
}

/**
 * Save processed imagery to Supabase Storage and insert a cache record.
 * Runs fire-and-forget from the imagery route — errors are logged, not thrown.
 */
export async function persistToStorage(
  imageBuffer: Buffer,
  meta: StorageMeta
): Promise<void> {
  if (!isAdminConfigured()) {
    console.log("[sentinel-storage] Supabase admin not configured, skipping persistence");
    return;
  }

  try {
    const client = getAdminClient();
    const path = storagePath(meta);

    // Upload to storage (upsert to handle re-processing)
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(path, imageBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("[sentinel-storage] Upload failed:", uploadError.message);
      return;
    }

    // Upsert cache record
    const [bboxWest, bboxSouth, bboxEast, bboxNorth] = TIWI_BBOX;
    const row: ImageCacheInsert = {
      product: meta.product,
      date_start: meta.dateStart,
      date_end: meta.dateEnd,
      baseline_start: meta.baselineStart ?? null,
      baseline_end: meta.baselineEnd ?? null,
      storage_path: path,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      resolution_m: RESOLUTION_M,
      bbox_west: bboxWest,
      bbox_south: bboxSouth,
      bbox_east: bboxEast,
      bbox_north: bboxNorth,
      file_size_bytes: imageBuffer.length,
      source: "cdse_processing_api",
    };

    // Type assertion needed: supabase-js generic inference breaks with
    // manually-defined Database types. The row shape matches the schema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (client as any)
      .from("sentinel_imagery_cache")
      .upsert(row, {
        onConflict: "product,date_start,date_end,baseline_start,baseline_end",
      });

    if (dbError) {
      console.error("[sentinel-storage] DB record insert failed:", dbError.message);
      return;
    }

    console.log(`[sentinel-storage] Persisted ${path} (${imageBuffer.length} bytes)`);
  } catch (err) {
    console.error("[sentinel-storage] Unexpected error:", err);
  }
}

/**
 * Try to load imagery from Supabase Storage.
 * Returns the image buffer if found, null otherwise.
 */
export async function loadFromStorage(
  meta: StorageMeta
): Promise<Buffer | null> {
  if (!isAdminConfigured()) return null;

  try {
    const client = getAdminClient();
    const path = storagePath(meta);

    // Check if record exists first (cheaper than downloading)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from("sentinel_imagery_cache")
      .select("id")
      .eq("product", meta.product)
      .eq("date_start", meta.dateStart)
      .eq("date_end", meta.dateEnd);

    if (meta.baselineStart) {
      query = query.eq("baseline_start", meta.baselineStart);
    } else {
      query = query.is("baseline_start", null);
    }
    if (meta.baselineEnd) {
      query = query.eq("baseline_end", meta.baselineEnd);
    } else {
      query = query.is("baseline_end", null);
    }

    const { data: record } = await query.maybeSingle();

    if (!record) return null;

    // Download from storage
    const { data, error } = await client.storage
      .from(BUCKET)
      .download(path);

    if (error || !data) {
      console.warn("[sentinel-storage] Download failed:", error?.message);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    console.log(`[sentinel-storage] Loaded ${path} from Supabase Storage (${arrayBuffer.byteLength} bytes)`);
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn("[sentinel-storage] Load error:", err);
    return null;
  }
}
