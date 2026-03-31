-- fire_enable_missing_rls (corrected)
-- Enables RLS + policies on 7 Fire App tables.

-- 1. Enable RLS (idempotent)
ALTER TABLE incendiary_drop ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_history_overlay ENABLE ROW LEVEL SECURITY;
ALTER TABLE vegetation_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE incendiary_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop any partially-created policies from failed run
DROP POLICY IF EXISTS "Project members can view incendiary drops" ON incendiary_drop;
DROP POLICY IF EXISTS "Project members can view fire history overlays" ON fire_history_overlay;
DROP POLICY IF EXISTS "Project members can view vegetation maps" ON vegetation_map;
DROP POLICY IF EXISTS "Project members can view equipment" ON equipment;
DROP POLICY IF EXISTS "Project members can view incendiary inventory" ON incendiary_inventory;
DROP POLICY IF EXISTS "Project members can view documents" ON document;
DROP POLICY IF EXISTS "Project members can view audit logs" ON audit_log;

-- 3. SELECT — project members can read
CREATE POLICY "Project members can view incendiary drops"
    ON incendiary_drop FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM flight_plan fp
        JOIN daily_plan dp ON dp.id = fp.daily_plan_id
        JOIN fire_season fs ON fs.id = dp.fire_season_id
        JOIN user_project up ON up.project_id = fs.project_id
        WHERE fp.id = incendiary_drop.flight_plan_id AND up.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view fire history overlays"
    ON fire_history_overlay FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = fire_history_overlay.project_id AND user_id = auth.uid()
    ));

CREATE POLICY "Project members can view vegetation maps"
    ON vegetation_map FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = vegetation_map.project_id AND user_id = auth.uid()
    ));

CREATE POLICY "Project members can view equipment"
    ON equipment FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = equipment.project_id AND user_id = auth.uid()
    ));

CREATE POLICY "Project members can view incendiary inventory"
    ON incendiary_inventory FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = incendiary_inventory.project_id AND user_id = auth.uid()
    ));

CREATE POLICY "Project members can view documents"
    ON document FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = document.project_id AND user_id = auth.uid()
    ));

CREATE POLICY "Project members can view audit logs"
    ON audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = audit_log.project_id AND user_id = auth.uid()
    ));

-- 4. INSERT — admins/managers
CREATE POLICY "Admins can insert fire history overlays"
    ON fire_history_overlay FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = fire_history_overlay.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert vegetation maps"
    ON vegetation_map FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = vegetation_map.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can manage equipment"
    ON equipment FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = equipment.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert incendiary inventory"
    ON incendiary_inventory FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = incendiary_inventory.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert documents"
    ON document FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = document.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert incendiary drops"
    ON incendiary_drop FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = audit_log.project_id AND user_id = auth.uid()
    ));

-- 5. UPDATE
CREATE POLICY "Admins can update equipment"
    ON equipment FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = equipment.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can update documents"
    ON document FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = document.project_id AND user_id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- 6. DELETE
CREATE POLICY "Admins can delete documents"
    ON document FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = document.project_id AND user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete equipment"
    ON equipment FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_project WHERE project_id = equipment.project_id AND user_id = auth.uid() AND role = 'admin'
    ));
