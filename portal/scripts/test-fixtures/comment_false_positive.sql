-- Test fixture: DROP in comment only — should NOT trigger
-- This migration does NOT drop portal.check_app_access() or portal.app_access
ALTER TABLE portal.apps ADD COLUMN status text NOT NULL DEFAULT 'active';
