-- Originally: 003_burn_type_ignition_lines.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Add burn type and ignition line geometry to burn_plan
-- burn_type: 'aerial' for ACB with flight lines, 'road' for ground-based ignition along roads/tracks
-- ignition_lines: MultiLineString representing the ignition pattern (flight lines or road routes)

ALTER TABLE burn_plan
  ADD COLUMN burn_type TEXT CHECK (burn_type IN ('aerial', 'road')),
  ADD COLUMN ignition_lines GEOMETRY(MultiLineString, 4326);

CREATE INDEX idx_burn_plan_ignition_lines ON burn_plan USING GIST (ignition_lines);

COMMENT ON COLUMN burn_plan.burn_type IS 'aerial = ACB with flight lines, road = ground-based ignition along roads/tracks';
COMMENT ON COLUMN burn_plan.ignition_lines IS 'LineString geometry representing the ignition pattern: flight lines (aerial) or driving routes (road)';
