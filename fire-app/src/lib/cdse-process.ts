/**
 * CDSE Sentinel Hub Processing API client.
 * Server-side only — fetches rendered imagery chunks from CDSE.
 *
 * Uses the Processing API (POST /api/v1/process) instead of WMS,
 * which supports custom bbox, evalscript, and pixel dimensions
 * in a single request.
 */

import { getCdseAccessToken } from "@/lib/cdse-auth";
import type { TiwiChunk } from "@/lib/tiwi-grid";
import { TIWI_CLIP_GEOMETRY } from "@/lib/tiwi-grid";

const PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process";

/** Max retries on transient failures (includes 429 rate-limit) */
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

/**
 * Fetch a single chunk of sentinel imagery from the CDSE Processing API.
 *
 * @param chunk - Grid chunk with bbox and pixel dimensions
 * @param evalscript - v3 evalscript string
 * @param dateStart - Start date as YYYY-MM-DD
 * @param dateEnd - End date as YYYY-MM-DD
 * @param options.maxCloudCoverage - Override cloud filter (default 30%). Baseline
 *   dMIBR fetches use 50% since the 2-month window + leastCC already selects well.
 * @returns PNG image as Buffer
 */
export async function fetchChunk(
  chunk: TiwiChunk,
  evalscript: string,
  dateStart: string,
  dateEnd: string,
  options?: { maxCloudCoverage?: number }
): Promise<Buffer> {
  const cloudCover = options?.maxCloudCoverage ?? 30;

  const body = {
    input: {
      bounds: {
        bbox: chunk.bbox,
        geometry: TIWI_CLIP_GEOMETRY,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: `${dateStart}T00:00:00Z`,
              to: `${dateEnd}T23:59:59Z`,
            },
            maxCloudCoverage: cloudCover,
            mosaickingOrder: "leastCC",
          },
        },
      ],
    },
    output: {
      width: chunk.width,
      height: chunk.height,
      responses: [
        {
          identifier: "default",
          format: { type: "image/png" },
        },
      ],
    },
    evalscript,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getCdseAccessToken();

      const response = await fetch(PROCESS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `CDSE Processing API returned ${response.status}: ${text}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
        );
      }
    }
  }

  throw lastError ?? new Error("Failed to fetch chunk from CDSE");
}
