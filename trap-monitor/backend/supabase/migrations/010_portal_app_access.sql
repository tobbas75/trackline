-- Portal schema: centralized app access control for all Trackline apps.
-- Used by Trap Monitor, WildTrack, and Fire App to gate dashboard access.

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS portal;

-- 2. Apps registry
CREATE TABLE IF NOT EXISTS portal.apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portal.apps ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see the apps list
CREATE POLICY "Authenticated users can view apps"
  ON portal.apps FOR SELECT
  TO authenticated
  USING (true);

-- 3. Per-user app access
CREATE TABLE IF NOT EXISTS portal.app_access (
  app_id TEXT REFERENCES portal.apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (app_id, user_id)
);

ALTER TABLE portal.app_access ENABLE ROW LEVEL SECURITY;

-- Users can only see their own access records
CREATE POLICY "Users see own access"
  ON portal.app_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. RPC that check-access.ts calls: check_app_access('trap_monitor')
-- Returns { has_access: true, user_role: 'admin' } or empty set (no access)
CREATE OR REPLACE FUNCTION public.check_app_access(target_app_id TEXT)
RETURNS TABLE(has_access BOOLEAN, user_role TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT true, role
  FROM portal.app_access
  WHERE app_id = target_app_id AND user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_app_access(TEXT) TO authenticated;

-- 5. Register Trap Monitor
INSERT INTO portal.apps (id, name, description, url)
VALUES ('trap_monitor', 'Trap Monitor', 'Remote wildlife trap monitoring', '/dashboard')
ON CONFLICT (id) DO NOTHING;
