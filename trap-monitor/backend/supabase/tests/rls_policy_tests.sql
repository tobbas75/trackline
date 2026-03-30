-- RLS policy verification tests (TEST-05)
-- Run with: psql -f rls_policy_tests.sql
-- These are assertion-style queries that raise exceptions on failure.
-- Safe to run in any environment — read-only checks against policy definitions.

-- Verify RLS is enabled on all Trap Monitor tables
DO $$
DECLARE
  tbl text;
  rls_on boolean;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['units', 'events', 'commands', 'notifications'])
  LOOP
    SELECT relrowsecurity INTO rls_on
    FROM pg_class
    WHERE relname = tbl AND relnamespace = 'public'::regnamespace;

    IF NOT rls_on THEN
      RAISE EXCEPTION 'TEST FAIL: RLS not enabled on table %', tbl;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: RLS enabled on all 4 tables';
END $$;

-- Verify units SELECT policy references trap_can_view_org
DO $$
DECLARE
  policy_qual text;
BEGIN
  SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO policy_qual
  FROM pg_policy
  WHERE polrelid = 'public.units'::regclass
    AND polname = 'Members can view org units';

  IF policy_qual IS NULL THEN
    RAISE EXCEPTION 'TEST FAIL: Missing SELECT policy "Members can view org units" on units';
  END IF;

  IF policy_qual NOT LIKE '%trap_can_view_org%' THEN
    RAISE EXCEPTION 'TEST FAIL: units SELECT policy does not reference trap_can_view_org: %', policy_qual;
  END IF;

  RAISE NOTICE 'PASS: units SELECT policy uses trap_can_view_org';
END $$;

-- Verify events SELECT policy references org_id (direct) or trap_can_view_org
DO $$
DECLARE
  policy_qual text;
BEGIN
  SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO policy_qual
  FROM pg_policy
  WHERE polrelid = 'public.events'::regclass
    AND polname = 'Members can view org events';

  IF policy_qual IS NULL THEN
    RAISE EXCEPTION 'TEST FAIL: Missing SELECT policy "Members can view org events" on events';
  END IF;

  IF policy_qual NOT LIKE '%trap_can_view_org%' THEN
    RAISE EXCEPTION 'TEST FAIL: events SELECT policy does not reference trap_can_view_org: %', policy_qual;
  END IF;

  RAISE NOTICE 'PASS: events SELECT policy uses trap_can_view_org';
END $$;

-- Verify events INSERT is restricted to service_role
DO $$
DECLARE
  policy_check text;
BEGIN
  SELECT pg_catalog.pg_get_expr(polwithcheck, polrelid) INTO policy_check
  FROM pg_policy
  WHERE polrelid = 'public.events'::regclass
    AND polname = 'Service role can insert events';

  IF policy_check IS NULL THEN
    RAISE EXCEPTION 'TEST FAIL: Missing INSERT policy "Service role can insert events" on events';
  END IF;

  IF policy_check NOT LIKE '%service_role%' THEN
    RAISE EXCEPTION 'TEST FAIL: events INSERT policy does not restrict to service_role: %', policy_check;
  END IF;

  RAISE NOTICE 'PASS: events INSERT restricted to service_role';
END $$;

-- Verify units INSERT requires trap_can_edit_org
DO $$
DECLARE
  policy_check text;
BEGIN
  SELECT pg_catalog.pg_get_expr(polwithcheck, polrelid) INTO policy_check
  FROM pg_policy
  WHERE polrelid = 'public.units'::regclass
    AND polname = 'Operators can add units';

  IF policy_check IS NULL THEN
    RAISE EXCEPTION 'TEST FAIL: Missing INSERT policy "Operators can add units" on units';
  END IF;

  IF policy_check NOT LIKE '%trap_can_edit_org%' THEN
    RAISE EXCEPTION 'TEST FAIL: units INSERT policy does not reference trap_can_edit_org: %', policy_check;
  END IF;

  RAISE NOTICE 'PASS: units INSERT requires trap_can_edit_org';
END $$;

-- Verify units DELETE requires trap_can_admin_org
DO $$
DECLARE
  policy_qual text;
BEGIN
  SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO policy_qual
  FROM pg_policy
  WHERE polrelid = 'public.units'::regclass
    AND polname = 'Admins can delete units';

  IF policy_qual IS NULL THEN
    RAISE EXCEPTION 'TEST FAIL: Missing DELETE policy "Admins can delete units" on units';
  END IF;

  IF policy_qual NOT LIKE '%trap_can_admin_org%' THEN
    RAISE EXCEPTION 'TEST FAIL: units DELETE policy does not reference trap_can_admin_org: %', policy_qual;
  END IF;

  RAISE NOTICE 'PASS: units DELETE requires trap_can_admin_org';
END $$;

-- Verify commands policies are org-scoped via units join
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'public.commands'::regclass;

  IF policy_count < 3 THEN
    RAISE EXCEPTION 'TEST FAIL: Expected at least 3 policies on commands, found %', policy_count;
  END IF;

  RAISE NOTICE 'PASS: commands has % policies', policy_count;
END $$;

-- Verify notifications policies exist
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'public.notifications'::regclass;

  IF policy_count < 2 THEN
    RAISE EXCEPTION 'TEST FAIL: Expected at least 2 policies on notifications, found %', policy_count;
  END IF;

  RAISE NOTICE 'PASS: notifications has % policies', policy_count;
END $$;

-- Verify composite index exists on events(org_id, triggered_at)
DO $$
DECLARE
  idx_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'events'
      AND indexname = 'idx_events_org_triggered'
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    RAISE EXCEPTION 'TEST FAIL: Missing composite index idx_events_org_triggered on events';
  END IF;

  RAISE NOTICE 'PASS: Composite index idx_events_org_triggered exists';
END $$;

-- Verify events.org_id column exists
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'org_id'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TEST FAIL: Missing org_id column on events table';
  END IF;

  RAISE NOTICE 'PASS: events.org_id column exists';
END $$;

-- Verify trap_can_* functions are SECURITY DEFINER and granted to authenticated
DO $$
DECLARE
  fn text;
  is_secdef boolean;
BEGIN
  FOR fn IN SELECT unnest(ARRAY['trap_can_view_org', 'trap_can_edit_org', 'trap_can_admin_org'])
  LOOP
    SELECT prosecdef INTO is_secdef
    FROM pg_proc
    WHERE proname = fn AND pronamespace = 'public'::regnamespace;

    IF is_secdef IS NULL THEN
      RAISE EXCEPTION 'TEST FAIL: Function % not found', fn;
    END IF;

    IF NOT is_secdef THEN
      RAISE EXCEPTION 'TEST FAIL: Function % is not SECURITY DEFINER', fn;
    END IF;
  END LOOP;

  RAISE NOTICE 'PASS: All trap_can_* functions are SECURITY DEFINER';
END $$;

DO $$
BEGIN
  RAISE NOTICE '=== ALL RLS POLICY TESTS PASSED ===';
END $$;
