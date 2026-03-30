-- Fix search_path security warning on public.check_app_access.
-- Supabase linter: function_search_path_mutable
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

CREATE OR REPLACE FUNCTION public.check_app_access(target_app_id TEXT)
RETURNS TABLE(has_access BOOLEAN, user_role TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT true, role
  FROM portal.app_access
  WHERE app_id = target_app_id AND user_id = auth.uid()
  LIMIT 1;
$$;
