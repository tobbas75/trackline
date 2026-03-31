-- Fix search_path on all public schema functions flagged by Supabase linter
ALTER FUNCTION public.can_org_edit(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_org_member(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.is_org_admin(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.classify_burn_season(integer, integer) SET search_path = '';
ALTER FUNCTION public.project_org_id(uuid) SET search_path = '';

-- Fix permissive INSERT policy on incendiary_drop
DROP POLICY IF EXISTS "Admins can insert incendiary drops" ON incendiary_drop;
CREATE POLICY "Admins can insert incendiary drops"
    ON incendiary_drop FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM flight_plan fp
        JOIN daily_plan dp ON dp.id = fp.daily_plan_id
        JOIN fire_season fs ON fs.id = dp.fire_season_id
        JOIN user_project up ON up.project_id = fs.project_id
        WHERE fp.id = incendiary_drop.flight_plan_id
        AND up.user_id = auth.uid()
        AND up.role IN ('admin', 'manager')
    ));
