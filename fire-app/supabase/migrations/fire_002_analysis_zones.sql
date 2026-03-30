-- Originally: 002_analysis_zones.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Analysis Zones: subdivide projects into distinct geographic areas for targeted analysis
-- E.g. Tiwi Islands → Bathurst Island + Melville Island

CREATE TABLE analysis_zone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    area_ha NUMERIC(12,2),
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, slug)
);

CREATE INDEX idx_analysis_zone_project ON analysis_zone(project_id);
CREATE INDEX idx_analysis_zone_boundary ON analysis_zone USING GIST(boundary);

-- RLS
ALTER TABLE analysis_zone ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view zones"
    ON analysis_zone FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = analysis_zone.project_id
            AND up.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage zones"
    ON analysis_zone FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_project up
            WHERE up.project_id = analysis_zone.project_id
            AND up.user_id = auth.uid()
            AND up.role IN ('admin', 'manager')
        )
    );

-- Add optional zone_id foreign key to fire_scar for zone-level analysis
ALTER TABLE fire_scar ADD COLUMN zone_id UUID REFERENCES analysis_zone(id) ON DELETE SET NULL;
CREATE INDEX idx_fire_scar_zone ON fire_scar(zone_id);

-- Add optional zone_id to burn_plan
ALTER TABLE burn_plan ADD COLUMN zone_id UUID REFERENCES analysis_zone(id) ON DELETE SET NULL;
CREATE INDEX idx_burn_plan_zone ON burn_plan(zone_id);
