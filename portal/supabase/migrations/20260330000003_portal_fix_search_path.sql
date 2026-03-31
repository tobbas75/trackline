-- portal_005_fix_search_path
-- Set immutable search_path on portal functions to prevent search_path injection.

ALTER FUNCTION portal.is_admin() SET search_path = '';
ALTER FUNCTION portal.update_updated_at() SET search_path = '';
ALTER FUNCTION portal.check_app_access(text) SET search_path = '';
