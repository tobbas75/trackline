-- Originally: 006_sentinel_imagery_cache.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Persistent cache for processed Sentinel-2 imagery (WebP composites).
-- Stores metadata + Supabase Storage path so imagery survives
-- server restarts and doesn't need re-fetching from CDSE.

CREATE TABLE sentinel_imagery_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product TEXT NOT NULL,                      -- e.g. "ndvi", "dmibr", "mibr_bw"
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    baseline_start DATE,                        -- NULL for non-dMIBR products
    baseline_end DATE,                          -- NULL for non-dMIBR products
    storage_path TEXT NOT NULL,                 -- path within the storage bucket
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    resolution_m INTEGER NOT NULL DEFAULT 20,
    bbox_west DECIMAL(10,6) NOT NULL,
    bbox_south DECIMAL(10,6) NOT NULL,
    bbox_east DECIMAL(10,6) NOT NULL,
    bbox_north DECIMAL(10,6) NOT NULL,
    file_size_bytes INTEGER,
    source TEXT NOT NULL DEFAULT 'cdse_processing_api',
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Unique per product + date combo (including baseline for dMIBR)
    UNIQUE(product, date_start, date_end, baseline_start, baseline_end)
);

CREATE INDEX idx_sentinel_cache_product_dates
    ON sentinel_imagery_cache (product, date_start, date_end);

-- Storage bucket for sentinel imagery files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sentinel-imagery',
    'sentinel-imagery',
    false,
    52428800,                                   -- 50 MB max per file
    ARRAY['image/webp', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: imagery cache is server-managed (service role), read-only for authenticated users
ALTER TABLE sentinel_imagery_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view imagery cache"
    ON sentinel_imagery_cache FOR SELECT
    USING (auth.role() = 'authenticated');

-- Storage policies: server uploads via service role, authenticated users can download
CREATE POLICY "Authenticated users can download sentinel imagery"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sentinel-imagery' AND auth.role() = 'authenticated');
