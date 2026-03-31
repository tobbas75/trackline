-- portal_003_app_status
-- Adds operational status to the app registry.
-- Safe: ADD COLUMN with DEFAULT does not rewrite existing rows and does not
-- alter the portal.apps column set that downstream apps depend on (they only
-- read id, name, description, url, icon via portal.check_app_access or direct
-- selects — adding a column never breaks those queries).

ALTER TABLE portal.apps
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CONSTRAINT apps_status_check CHECK (status IN ('active', 'maintenance', 'down'));

COMMENT ON COLUMN portal.apps.status IS
  'Operational state: active | maintenance | down. Displayed on the portal dashboard.';
