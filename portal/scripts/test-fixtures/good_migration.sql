-- Test fixture: clean migration, should pass all checks
ALTER TABLE portal.apps ADD COLUMN status text NOT NULL DEFAULT 'active';
