-- Originally: 001_foundation.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- WildTrack Foundation Schema
-- Phase 1: Profiles, Organisations, Members, Projects

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE org_type AS ENUM (
  'ranger_team', 'national_park', 'research_group',
  'ngo', 'private_landholder', 'government', 'other'
);

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE project_role AS ENUM ('owner', 'editor', 'viewer');

-- ============================================================
-- PROFILES — owned by portal.profiles (single source of truth)
-- The portal schema manages user profiles for all Trackline apps.
-- See: portal/supabase/migrations/001_portal_app_access.sql
-- Fields: id, full_name, display_name, email, avatar_url, organisation
-- Auto-created on auth.users signup via portal.handle_new_user() trigger.
-- ============================================================

-- ============================================================
-- ORGANISATIONS
-- ============================================================
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type org_type NOT NULL DEFAULT 'other',
  description TEXT,
  logo_url TEXT,
  website TEXT,
  contact_email TEXT,
  region TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organisations_slug ON public.organisations(slug);
CREATE INDEX idx_organisations_public ON public.organisations(is_public) WHERE is_public = TRUE;

-- ============================================================
-- ORG MEMBERS
-- ============================================================
CREATE TABLE public.org_members (
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portal.profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES portal.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.org_members(user_id);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES portal.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  bbox_north NUMERIC(9,6),
  bbox_south NUMERIC(9,6),
  bbox_east NUMERIC(10,6),
  bbox_west NUMERIC(10,6),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_projects_org ON public.projects(org_id);
CREATE INDEX idx_projects_published ON public.projects(is_published) WHERE is_published = TRUE;

-- ============================================================
-- PROJECT MEMBERS (optional per-project overrides)
-- ============================================================
CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portal.profiles(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if user is a member of an org (any role)
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
$$;

-- Check if user has org admin+ role
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  );
$$;

-- Check if user can edit in an org (member+)
CREATE OR REPLACE FUNCTION public.can_org_edit(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role IN ('owner', 'admin', 'member')
  );
$$;

-- Get the org_id for a project
CREATE OR REPLACE FUNCTION public.project_org_id(p_project_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT org_id FROM public.projects WHERE id = p_project_id;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES — extend portal.profiles RLS for org co-member visibility
-- Portal ships with a simple "read own" policy. Now that org_members exists,
-- we drop it and replace with a policy that also allows co-member reads.
DROP POLICY IF EXISTS "profiles_read_own" ON portal.profiles;
CREATE POLICY "profiles_read_own_or_comembers"
  ON portal.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.org_members a
      JOIN public.org_members b ON a.org_id = b.org_id
      WHERE a.user_id = auth.uid() AND b.user_id = portal.profiles.id
    )
  );

-- ORGANISATIONS
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public orgs visible to all"
  ON public.organisations FOR SELECT
  USING (
    is_public = TRUE
    OR public.is_org_member(id, auth.uid())
  );

CREATE POLICY "Auth users can create orgs"
  ON public.organisations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can update"
  ON public.organisations FOR UPDATE
  USING (public.is_org_admin(id, auth.uid()));

CREATE POLICY "Org owners can delete"
  ON public.organisations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- ORG MEMBERS
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view fellow members"
  ON public.org_members FOR SELECT
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org admins can manage members"
  ON public.org_members FOR INSERT
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

CREATE POLICY "Org admins can update member roles"
  ON public.org_members FOR UPDATE
  USING (public.is_org_admin(org_id, auth.uid()));

CREATE POLICY "Org admins can remove members"
  ON public.org_members FOR DELETE
  USING (
    public.is_org_admin(org_id, auth.uid())
    OR user_id = auth.uid()  -- members can leave
  );

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published projects visible to all"
  ON public.projects FOR SELECT
  USING (
    is_published = TRUE
    OR public.is_org_member(org_id, auth.uid())
  );

CREATE POLICY "Org editors can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.can_org_edit(org_id, auth.uid()));

CREATE POLICY "Org editors can update projects"
  ON public.projects FOR UPDATE
  USING (public.can_org_edit(org_id, auth.uid()));

CREATE POLICY "Org admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_org_admin(org_id, auth.uid()));

-- PROJECT MEMBERS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members visible to org members"
  ON public.project_members FOR SELECT
  USING (
    public.is_org_member(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org admins can manage project members"
  ON public.project_members FOR ALL
  USING (
    public.is_org_admin(public.project_org_id(project_id), auth.uid())
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- profiles updated_at trigger managed by portal schema

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
