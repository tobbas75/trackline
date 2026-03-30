-- Test fixture: should trigger signature_change_check_app_access
CREATE OR REPLACE FUNCTION portal.check_app_access(app_name text)
RETURNS TABLE(has_access boolean, user_role text) AS $$ SELECT true, 'admin'; $$ LANGUAGE sql;
