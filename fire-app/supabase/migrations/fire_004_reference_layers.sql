-- Originally: 004_reference_layers.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Reference layers: user-uploaded GeoJSON data for planning context
-- e.g. road networks, vegetation boundaries, firebreaks, tracks, landing sites

CREATE TABLE reference_layer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    geojson_data JSONB NOT NULL,
    geometry_type TEXT NOT NULL CHECK (geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'Mixed')),
    feature_count INTEGER DEFAULT 0,
    color TEXT DEFAULT '#6b7280',
    visible BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reference_layer_project ON reference_layer(project_id);

-- RLS
ALTER TABLE reference_layer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view reference layers"
    ON reference_layer FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = reference_layer.project_id
            AND up.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage reference layers"
    ON reference_layer FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = reference_layer.project_id
            AND up.user_id = auth.uid()
            AND up.role IN ('admin', 'manager')
        )
    );
