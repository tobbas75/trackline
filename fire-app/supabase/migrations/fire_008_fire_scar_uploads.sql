-- Originally: 008_fire_scar_uploads.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Migration 008: Custom Fire Scar Uploads
-- Allows project members to upload their own fire scar shapefiles
-- that override the default NAFI data for a given project + year.
--
-- GeoJSON data is stored in Supabase Storage at:
--   fire-scars/{project_id}/{year}.json
-- This table tracks metadata for those uploads.

-- ─── Upload metadata ───────────────────────────────────────────────────────────

CREATE TABLE fire_scar_upload (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL CHECK (year >= 2000),
  label          TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'field_mapped' CHECK (
                   source IN ('nafi_modis', 'nafi_sentinel', 'sentinel_manual', 'field_mapped', 'landgate', 'combined')
                 ),
  feature_count  INTEGER NOT NULL DEFAULT 0,
  total_ha       DECIMAL(12,2) NOT NULL DEFAULT 0,
  eds_ha         DECIMAL(12,2) NOT NULL DEFAULT 0,
  lds_ha         DECIMAL(12,2) NOT NULL DEFAULT 0,
  storage_path   TEXT NOT NULL,
  uploaded_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT now(),

  -- Only one custom upload per project + year (latest replaces previous)
  CONSTRAINT unique_upload_per_project_year UNIQUE(project_id, year)
);

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE fire_scar_upload ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view fire scar uploads"
  ON fire_scar_upload FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_project WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert fire scar uploads"
  ON fire_scar_upload FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM user_project WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Upload owner can delete their uploads"
  ON fire_scar_upload FOR DELETE
  USING (uploaded_by = auth.uid());

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_fire_scar_upload_project_year ON fire_scar_upload(project_id, year);

-- ─── Storage bucket ────────────────────────────────────────────────────────────
-- The 'fire-scars' bucket must exist in Supabase Storage.
-- Create it via the Supabase dashboard or CLI:
--   supabase storage create fire-scars --public=false
--
-- Storage policies should allow:
--   - Authenticated users with project membership: read files under their project_id/
--   - Service role: full access (for API route reads)

-- ─── Documentation ─────────────────────────────────────────────────────────────

COMMENT ON TABLE  fire_scar_upload                    IS 'Metadata for custom fire scar uploads that override NAFI data per project+year';
COMMENT ON COLUMN fire_scar_upload.storage_path       IS 'Path in fire-scars Storage bucket, e.g. {project_id}/{year}.json';
COMMENT ON COLUMN fire_scar_upload.source             IS 'Data provenance: field_mapped, nafi_modis, combined, etc.';
