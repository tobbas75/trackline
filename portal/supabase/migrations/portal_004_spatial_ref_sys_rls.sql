-- portal_004_spatial_ref_sys_rls
-- spatial_ref_sys is a PostGIS system table (read-only reference data).
-- Enable RLS and allow all authenticated users to read (it's just coordinate system definitions).

ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read spatial reference systems"
    ON public.spatial_ref_sys FOR SELECT
    USING (true);
