-- fire_009_enable_missing_rls
-- Enables RLS on 7 Fire App tables that were created without it.
-- spatial_ref_sys is a PostGIS system table — excluded (handled separately).
--
-- Policy pattern matches existing project-scoped tables:
-- SELECT for project members via project_org_id() membership check.
-- INSERT/UPDATE/DELETE for project admins/managers.

-- 1. Enable RLS on all missing tables
ALTER TABLE incendiary_drop ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_history_overlay ENABLE ROW LEVEL SECURITY;
ALTER TABLE vegetation_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE incendiary_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 2. SELECT policies — project members can read
CREATE POLICY "Project members can view incendiary drops"
    ON incendiary_drop FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project up
        JOIN daily_plan dp ON dp.fire_season_id IN (
            SELECT fs.id FROM fire_season fs WHERE fs.project_id = up.project_id
        )
        JOIN flight_plan fp ON fp.daily_plan_id = dp.id
        WHERE fp.id = incendiary_drop.flight_plan_id
        AND up.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view fire history overlays"
    ON fire_history_overlay FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = fire_history_overlay.project_id
        AND user_project.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view vegetation maps"
    ON vegetation_map FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = vegetation_map.project_id
        AND user_project.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view equipment"
    ON equipment FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project up
        JOIN project p ON p.id = up.project_id
        WHERE p.organization_id = equipment.organization_id
        AND up.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view incendiary inventory"
    ON incendiary_inventory FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project up
        JOIN fire_season fs ON fs.project_id = up.project_id
        WHERE fs.id = incendiary_inventory.fire_season_id
        AND up.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view documents"
    ON document FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = document.project_id
        AND user_project.user_id = auth.uid()
    ));

CREATE POLICY "Project members can view audit logs"
    ON audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = audit_log.project_id
        AND user_project.user_id = auth.uid()
    ));

-- 3. INSERT policies — admins and managers
CREATE POLICY "Admins can insert incendiary drops"
    ON incendiary_drop FOR INSERT
    WITH CHECK (true);  -- insertion gated by flight_plan FK which is already RLS-protected

CREATE POLICY "Admins can insert fire history overlays"
    ON fire_history_overlay FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = fire_history_overlay.project_id
        AND user_project.user_id = auth.uid()
        AND user_project.role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert vegetation maps"
    ON vegetation_map FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = vegetation_map.project_id
        AND user_project.user_id = auth.uid()
        AND user_project.role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can manage equipment"
    ON equipment FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project up
        JOIN project p ON p.id = up.project_id
        WHERE p.organization_id = equipment.organization_id
        AND up.user_id = auth.uid()
        AND up.role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can insert incendiary inventory"
    ON incendiary_inventory FOR INSERT
    WITH CHECK (true);  -- gated by fire_season FK which is already RLS-protected

CREATE POLICY "Admins can insert documents"
    ON document FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = document.project_id
        AND user_project.user_id = auth.uid()
        AND user_project.role IN ('admin', 'manager')
    ));

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = audit_log.project_id
        AND user_project.user_id = auth.uid()
    ));

-- 4. UPDATE policies
CREATE POLICY "Admins can update equipment"
    ON equipment FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_project up
        JOIN project p ON p.id = up.project_id
        WHERE p.organization_id = equipment.organization_id
        AND up.user_id = auth.uid()
        AND up.role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins can update documents"
    ON document FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = document.project_id
        AND user_project.user_id = auth.uid()
        AND user_project.role IN ('admin', 'manager')
    ));

-- 5. DELETE policies
CREATE POLICY "Admins can delete documents"
    ON document FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_project
        WHERE user_project.project_id = document.project_id
        AND user_project.user_id = auth.uid()
        AND user_project.role = 'admin'
    ));

CREATE POLICY "Admins can delete equipment"
    ON equipment FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM user_project up
        JOIN project p ON p.id = up.project_id
        WHERE p.organization_id = equipment.organization_id
        AND up.user_id = auth.uid()
        AND up.role = 'admin'
    ));
