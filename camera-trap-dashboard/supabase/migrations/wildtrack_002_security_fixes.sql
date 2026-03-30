-- Originally: 002_security_fixes.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- WildTrack Security Fixes
-- Addresses: C-1 (org creation RLS), L-1 (profile visibility), M-2 (soft-delete)

-- ============================================================
-- C-1 FIX: Atomic org creation function (SECURITY DEFINER)
-- Creates the org AND adds the creator as owner in one transaction,
-- avoiding the SELECT RLS policy conflict on INSERT...RETURNING.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_organisation(
  p_name TEXT,
  p_slug TEXT,
  p_type org_type,
  p_description TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_org JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the organisation
  INSERT INTO public.organisations (name, slug, type, description, region, contact_email, is_public)
  VALUES (p_name, p_slug, p_type, p_description, p_region, p_contact_email, p_is_public)
  RETURNING id INTO v_org_id;

  -- Add creator as owner
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- Return the full org record
  SELECT row_to_json(o) INTO v_org
  FROM (
    SELECT * FROM public.organisations WHERE id = v_org_id
  ) o;

  RETURN v_org;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organisation TO authenticated;

-- ============================================================
-- M-2 FIX: Soft-delete for organisations
-- ============================================================

ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update SELECT policy to exclude soft-deleted orgs
DROP POLICY IF EXISTS "Public orgs visible to all" ON public.organisations;
CREATE POLICY "Public orgs visible to all"
  ON public.organisations FOR SELECT
  USING (
    deleted_at IS NULL
    AND (is_public = TRUE OR public.is_org_member(id, auth.uid()))
  );

-- Soft-delete function (replaces hard DELETE)
CREATE OR REPLACE FUNCTION public.soft_delete_organisation(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only owners can delete
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = v_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only organisation owners can delete';
  END IF;

  -- Soft-delete: set deleted_at timestamp
  UPDATE public.organisations
  SET deleted_at = now()
  WHERE id = p_org_id AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_organisation TO authenticated;

-- ============================================================
-- L-1 FIX: Profile visibility — now managed by portal schema
-- Co-member visibility policy lives in portal.profiles RLS.
-- See: portal/supabase/migrations/001_portal_app_access.sql
-- ============================================================

-- ============================================================
-- L-3 FIX: User-friendly error helper (used by app code)
-- ============================================================

-- This is handled in app code, not SQL. See lib/errors.ts.
