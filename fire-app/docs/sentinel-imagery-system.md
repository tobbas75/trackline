# Sentinel-2 Imagery System

Technical documentation for the Sentinel-2 satellite imagery processing pipeline.

## Overview

The system fetches, processes, caches, and displays Sentinel-2 L2A imagery from the Copernicus Data Space Ecosystem (CDSE). It supports 9 spectral products including custom fire indices (MIBR, dMIBR) with a three-tier caching strategy and async processing for computationally expensive difference products.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │ MapLayerPanel │  │ useSentinelLib  │  │ useSentinelImagery│  │
│  │ (controls)   │→ │ (saved maps)    │  │ (fetch + cache)   │  │
│  └──────────────┘  └────────┬────────┘  └────────┬──────────┘  │
│                              │                     │             │
│  ┌───────────────────────────┴─────────────────────┘             │
│  │ map-store.ts (Zustand)                                       │
│  │ product, dateRange, cloudCover, opacity, loading              │
│  └──────────────────────────────────────┬────────────────────┘  │
│                                          │ blob URL              │
│  ┌───────────────────────────────────────┴───────────────────┐  │
│  │ fire-map.tsx (MapLibre GL)                                 │  │
│  │ sentinel-imagery source (type: image) → sentinel-raster    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
          │ fetch                │ poll                │ fetch
          ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Next.js API Routes (server)                                      │
│                                                                    │
│  GET /api/sentinel/imagery          ← main endpoint               │
│  GET /api/sentinel/imagery/status   ← job polling (dMIBR)        │
│  GET /api/sentinel/imagery/library  ← saved maps list             │
│  GET /api/sentinel/scenes           ← STAC scene discovery        │
└───────┬─────────────────┬──────────────────────────┬──────────────┘
        │                  │                          │
        ▼                  ▼                          ▼
   ┌─────────┐     ┌──────────────┐          ┌──────────────┐
   │ Disk    │     │ Supabase     │          │ CDSE         │
   │ Cache   │     │ Storage +    │          │ Processing   │
   │ (local) │     │ Database     │          │ API          │
   └─────────┘     └──────────────┘          └──────────────┘
```

## Products

| Product | Type | Evalscript | Description |
|---------|------|------------|-------------|
| `ndvi` | Standard | Color ramp | Normalized Difference Vegetation Index (B08-B04)/(B08+B04) |
| `nbr` | Standard | Color ramp | Normalized Burn Ratio (B08-B12)/(B08+B12) |
| `ndwi` | Standard | Color ramp | Normalized Difference Water Index (B03-B08)/(B03+B08) |
| `true_colour` | Standard | RGB | Natural colour (B04, B03, B02) with 3x brightness boost |
| `false_colour` | Standard | RGB | NIR false colour (B08, B04, B03) with 3x brightness boost |
| `mibr` | Standard | Color ramp | Mid-Infrared Burn Ratio: `10*B12 - 9.8*B11 + 2.0` |
| `mibr_bw` | Standard | Grayscale | MIBR as inverted grayscale + auto-levels + S-curve contrast |
| `dmibr` | Async | Color ramp | Difference MIBR: current minus baseline, diverging colour |
| `dmibr_bw` | Async | Grayscale | Difference MIBR: current minus baseline, B&W |

### MIBR Formula

```
MIBR = 10.0 × B12 (SWIR2) - 9.8 × B11 (SWIR1) + 2.0
Normalized: (MIBR + 1) / 5    → range [0, 1]
B&W output: 1 - normalized     → inverted (burnt = bright)
```

### dMIBR (Difference MIBR)

Compares current MIBR against a pre-fire baseline to detect change:
- **Baseline**: Nov 1 – Dec 31 of the year before the selected period
- **Current**: User's selected date range
- **Calculation**: `baselineNorm - currentNorm` (pixel-by-pixel)
- **Result**: Negative = burnt, Positive = recovery, Zero = no change

Colour ramp (dmibr):
| Range | Colour | Meaning |
|-------|--------|---------|
| < -0.4 | Deep purple | Severe burn |
| -0.4 to -0.2 | Dark red | Moderate burn |
| -0.2 to -0.1 | Orange | Light burn |
| -0.1 to -0.03 | Tan | Slight burn signal |
| -0.03 to 0.03 | Gray | No change |
| 0.03 to 0.1 | Light green | Slight recovery |
| 0.1 to 0.2 | Green | Moderate recovery |
| > 0.2 | Dark green | Strong recovery |

## API Endpoints

### GET /api/sentinel/imagery

Main imagery fetch and processing endpoint.

**Parameters:**
| Param | Required | Format | Description |
|-------|----------|--------|-------------|
| `product` | Yes | string | One of: ndvi, nbr, ndwi, true_colour, false_colour, mibr, mibr_bw, dmibr, dmibr_bw |
| `dateStart` | Yes | YYYY-MM or YYYY-MM-DD | Start of date range |
| `dateEnd` | Yes | YYYY-MM or YYYY-MM-DD | End of date range |
| `maxCloud` | No | 0–100 (default 30) | Max cloud cover % |

**Responses:**
- `200` — Image returned (WebP). Headers: `Content-Type: image/webp`, `X-Sentinel-Cached: true/false`, `X-Sentinel-Bbox: west,south,east,north`
- `202` — dMIBR job started. Body: `{ jobId, status, progress, step, totalSteps }`
- `400` — Invalid product or date format
- `502` — CDSE fetch error
- `503` — CDSE credentials not configured

**Rate limit:** 30 requests/minute

### GET /api/sentinel/imagery/status

Polls async dMIBR job progress.

**Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `jobId` | Yes | UUID from 202 response |

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing | complete | error | not_found",
  "progress": "Fetching baseline imagery (2/4)",
  "step": 2,
  "totalSteps": 5,
  "error": null
}
```

**dMIBR Processing Steps:**
1. Fetch baseline imagery chunks (Nov–Dec previous year)
2. Fetch current imagery chunks (user-selected range)
3. Composite both periods into full-extent images
4. Pixel-by-pixel differencing
5. Save to disk cache + Supabase Storage

**Rate limit:** 60 requests/minute

### GET /api/sentinel/imagery/library

Lists all processed and saved imagery records.

**Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `product` | No | Filter by product type |
| `limit` | No | Max results (default 20, max 50) |

**Response:**
```json
{
  "maps": [{
    "id": "uuid",
    "product": "ndvi",
    "dateStart": "2025-12-01",
    "dateEnd": "2025-12-07",
    "baselineStart": null,
    "baselineEnd": null,
    "fileSizeBytes": 1048576,
    "createdAt": "2025-12-08T10:30:00Z"
  }],
  "total": 42
}
```

**Rate limit:** 30 requests/minute

### GET /api/sentinel/scenes

Searches STAC catalog for available Sentinel-2 scenes.

**Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `bbox` | Yes | `west,south,east,north` in EPSG:4326 |
| `dateStart` | Yes | ISO date |
| `dateEnd` | Yes | ISO date |
| `maxCloud` | No | Cloud cover threshold (default 30) |
| `limit` | No | Max results (default 20, max 50) |

**Rate limit:** 15 requests/minute

## Three-Tier Caching Strategy

```
Request → Client blob cache → Disk cache → Supabase Storage → CDSE API
             (in-memory)      (local fs)    (durable cloud)    (fresh fetch)
```

### Tier 1: Client In-Memory (blob URLs)
- **Location**: `useSentinelImagery` hook `cacheRef`
- **Key**: `"product|dateStart|dateEnd|cloudCover|v2"`
- **Lifetime**: Component mount duration (cleared on unmount)
- **Purpose**: Instant switching between previously viewed products/dates
- Blob URLs are revoked on unmount to prevent memory leaks

### Tier 2: Server Disk Cache
- **Location**: `public/data/sentinel-cache/{product}/`
- **File format**: `{dateStart}_{dateEnd}.webp` (or `{baseline}_vs_{current}.webp` for dMIBR)
- **Lifetime**: Permanent until manually cleared
- **Purpose**: Fast local serving without network roundtrip to Supabase

### Tier 3: Supabase Storage (durable)
- **Bucket**: `sentinel-imagery` (private, 50 MB file limit)
- **Path format**: `{product}/{dateStart}_{dateEnd}.webp`
- **Database table**: `sentinel_imagery_cache` (metadata + storage path)
- **Purpose**: Survives server restarts, deployments, disk cache clears
- **Access**: Authenticated users only (RLS policy)

### Enhancement on Cache Read

When serving `mibr_bw` from any cache tier, `enhanceContrast()` is applied before responding. This ensures old pre-enhancement images get proper contrast treatment.

## Grid Chunking System

CDSE Processing API limits requests to 2500×2500 pixels. The Tiwi Islands extent at 20m resolution requires ~8290×4340 pixels.

**Solution**: Split into 4×2 grid (8 chunks), fetch in parallel, composite server-side.

```
┌──────────┬──────────┬──────────┬──────────┐
│ (0,0)    │ (1,0)    │ (2,0)    │ (3,0)    │
│ 2073×2170│ 2073×2170│ 2073×2170│ 2071×2170│
├──────────┼──────────┼──────────┼──────────┤
│ (0,1)    │ (1,1)    │ (2,1)    │ (3,1)    │
│ 2073×2170│ 2073×2170│ 2073×2170│ 2071×2170│
└──────────┴──────────┴──────────┴──────────┘
Total: 8290 × 4340 pixels @ 20m resolution
Bbox: [130.02, -11.94, 131.54, -11.16] (EPSG:4326)
```

Each chunk is fetched with the Tiwi Islands boundary as a clipping geometry (MultiPolygon), so ocean pixels are transparent (alpha = 0).

## Image Processing Pipeline

### Standard Products (NDVI, NBR, etc.)

```
1. Fetch 8 chunks in parallel from CDSE → PNG buffers
2. compositeChunks() → merge onto transparent canvas → WebP
3. enhanceContrast() (mibr_bw only) → auto-levels + S-curve
4. Write to disk cache + Supabase Storage (fire-and-forget)
5. Return WebP to client
```

### dMIBR Products (dmibr, dmibr_bw)

```
1. Return 202 immediately with jobId
2. Background: Fetch 8 baseline chunks (mibr_bw, Nov–Dec prev year)
3. Background: Fetch 8 current chunks (mibr_bw, user date range)
4. Background: compositeChunks() on both sets → 2 full images
5. Background: differenceImages() → pixel-by-pixel subtraction
6. Background: Write to cache + Supabase Storage
7. Client polls status every 3s until complete
8. Client fetches final cached image
```

### Contrast Enhancement (mibr_bw)

Applied via `enhanceContrast()` in `sentinel-compositor.ts`:

1. **Histogram analysis**: Count pixel values for opaque pixels only (alpha > 0)
2. **Percentile clipping**: Find 0.5th and 99.5th percentile values
3. **Linear stretch**: Map [low, high] → [0, 255]
4. **S-curve boost**: Apply sigmoid function (k=8) to push midtones toward extremes
5. **Output**: Deep blacks and bright whites matching GIS-viewer quality

The S-curve LUT is pre-computed for all 256 values, so the pixel loop is efficient.

## File Reference

### API Routes

| File | Endpoint | Purpose |
|------|----------|---------|
| `src/app/api/sentinel/imagery/route.ts` | GET /api/sentinel/imagery | Main fetch + cache + process |
| `src/app/api/sentinel/imagery/status/route.ts` | GET /api/sentinel/imagery/status | dMIBR job polling |
| `src/app/api/sentinel/imagery/library/route.ts` | GET /api/sentinel/imagery/library | Saved maps list |
| `src/app/api/sentinel/scenes/route.ts` | GET /api/sentinel/scenes | STAC scene discovery |

### Library Modules

| File | Purpose |
|------|---------|
| `src/lib/sentinel-evalscripts.ts` | Sentinel Hub v3 evalscript registry (all 7 scripts) |
| `src/lib/sentinel-compositor.ts` | Image compositing, differencing, contrast enhancement (Sharp) |
| `src/lib/sentinel-jobs.ts` | In-memory async job state machine (15-min TTL) |
| `src/lib/sentinel-storage.ts` | Supabase Storage persistence (upload + download) |
| `src/lib/cdse-auth.ts` | CDSE OAuth2 client credentials flow (token caching) |
| `src/lib/cdse-process.ts` | CDSE Processing API client (chunk fetcher with retry) |
| `src/lib/tiwi-grid.ts` | Tiwi Islands grid geometry, bbox, chunk computation |

### Client Hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-sentinel-imagery.ts` | Fetches imagery, manages blob URLs, polls dMIBR jobs |
| `src/hooks/use-sentinel-library.ts` | Fetches saved maps list, auto-refreshes on new imagery |
| `src/hooks/use-sentinel-scenes.ts` | STAC scene discovery with project bbox |

### Components

| File | Purpose |
|------|---------|
| `src/components/map/fire-map.tsx` | MapLibre map with sentinel-imagery source/layer |
| `src/components/map/map-layer-panel.tsx` | Layer controls, sentinel product picker, saved maps |
| `src/components/map/sentinel-date-range-picker.tsx` | Date selection with "Find Clear" auto-discovery |

### State

| File | Sentinel Fields |
|------|-----------------|
| `src/stores/map-store.ts` | `sentinelProduct`, `sentinelDateRange`, `sentinelCloudCover`, `sentinelOpacity`, `sentinelLoading` |

### Database

| File | Purpose |
|------|---------|
| `supabase/migrations/006_sentinel_imagery_cache.sql` | Table + storage bucket + RLS policies |

## CDSE Authentication

The system uses OAuth2 client credentials flow to authenticate with CDSE:

1. **Token endpoint**: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
2. **Grant type**: `client_credentials`
3. **Credentials**: `CDSE_CLIENT_ID` + `CDSE_CLIENT_SECRET` (from `.env.local`)
4. **Token caching**: In-memory with 30-second proactive refresh buffer
5. **Processing API**: `https://sh.dataspace.copernicus.eu/api/v1/process`

Tokens are never exposed to the browser — all CDSE calls go through server-side API routes.

## Database Schema

```sql
CREATE TABLE sentinel_imagery_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product TEXT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    baseline_start DATE,          -- NULL for non-dMIBR
    baseline_end DATE,            -- NULL for non-dMIBR
    storage_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    resolution_m INTEGER DEFAULT 20,
    bbox_west DECIMAL(10,6),
    bbox_south DECIMAL(10,6),
    bbox_east DECIMAL(10,6),
    bbox_north DECIMAL(10,6),
    file_size_bytes INTEGER,
    source TEXT DEFAULT 'cdse_processing_api',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product, date_start, date_end, baseline_start, baseline_end)
);
```

**Supabase Storage bucket**: `sentinel-imagery`
- Max file size: 50 MB
- Allowed types: `image/webp`, `image/png`
- Access: authenticated users can download; server (service role) uploads

## Retry & Error Handling

- **CDSE chunk fetch**: 3 attempts with exponential backoff (3s, 6s)
- **dMIBR jobs**: Errors stored in job state, surfaced to client via status endpoint
- **Storage persist**: Fire-and-forget with error logging (doesn't block response)
- **Client polling**: Transient errors logged but polling continues; AbortController on unmount
- **Rate limiting**: Per-endpoint limits via `apiGuard()` (30/min imagery, 60/min status, 15/min STAC)
