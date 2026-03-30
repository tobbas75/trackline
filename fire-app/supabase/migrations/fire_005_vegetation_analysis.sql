-- Originally: 005_vegetation_analysis.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Vegetation analysis: Sentinel-2 scene metadata and saved analysis results
-- Supports NDVI, NBR, BAI, Fuel Moisture Content, and change detection indices

CREATE TYPE vegetation_index_type AS ENUM (
    'ndvi', 'nbr', 'dnbr', 'bai', 'fmc', 'true_colour', 'false_colour', 'fire_enhanced'
);

CREATE TYPE vegetation_source AS ENUM (
    'dea_ows', 'cdse_sentinel_hub'
);

-- Sentinel-2 scene metadata (cached from STAC searches)
CREATE TABLE sentinel_scene (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    scene_id TEXT NOT NULL,
    satellite TEXT NOT NULL,                     -- e.g. "Sentinel-2A", "Sentinel-2B", "Sentinel-2C"
    acquired_at TIMESTAMPTZ NOT NULL,
    cloud_cover_pct DECIMAL(5,2),
    bbox GEOMETRY(Polygon, 4326),
    thumbnail_url TEXT,
    source vegetation_source NOT NULL DEFAULT 'cdse_sentinel_hub',
    stac_properties JSONB,                      -- Full STAC metadata for reference
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, scene_id)
);

CREATE INDEX idx_sentinel_scene_geom ON sentinel_scene USING GIST (bbox);
CREATE INDEX idx_sentinel_scene_project_time ON sentinel_scene (project_id, acquired_at DESC);

-- Saved vegetation analysis results
CREATE TABLE vegetation_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES analysis_zone(id) ON DELETE SET NULL,
    scene_id UUID REFERENCES sentinel_scene(id) ON DELETE SET NULL,
    index_type vegetation_index_type NOT NULL,
    source vegetation_source NOT NULL DEFAULT 'dea_ows',
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    -- Summary statistics (computed from the imagery)
    mean_value DECIMAL(6,4),
    min_value DECIMAL(6,4),
    max_value DECIMAL(6,4),
    std_dev DECIMAL(6,4),
    area_above_threshold_ha DECIMAL(12,2),      -- e.g. area with NDVI > 0.3
    threshold_value DECIMAL(6,4),
    -- WMS parameters to recreate the tile layer visualisation
    wms_params JSONB NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_veg_analysis_project ON vegetation_analysis (project_id, created_at DESC);
CREATE INDEX idx_veg_analysis_zone ON vegetation_analysis (zone_id) WHERE zone_id IS NOT NULL;

-- RLS
ALTER TABLE sentinel_scene ENABLE ROW LEVEL SECURITY;
ALTER TABLE vegetation_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view sentinel scenes"
    ON sentinel_scene FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = sentinel_scene.project_id
            AND up.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage sentinel scenes"
    ON sentinel_scene FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = sentinel_scene.project_id
            AND up.user_id = auth.uid()
            AND up.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Project members can view vegetation analyses"
    ON vegetation_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = vegetation_analysis.project_id
            AND up.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage vegetation analyses"
    ON vegetation_analysis FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = vegetation_analysis.project_id
            AND up.user_id = auth.uid()
            AND up.role IN ('admin', 'manager')
        )
    );
