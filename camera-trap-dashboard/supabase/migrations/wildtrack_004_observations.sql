-- Originally: 004_phase3_observations.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- WildTrack Phase 3: Observations table
-- ============================================================

CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  species_id UUID REFERENCES public.species(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ,
  is_animal BOOLEAN,
  is_empty BOOLEAN,
  count INTEGER,
  individual_id TEXT,
  temperature NUMERIC(5,1),
  moon_phase TEXT,
  file_path TEXT,
  file_name TEXT,
  sequence_id TEXT,
  detection_confidence NUMERIC(4,3),
  classification_confidence NUMERIC(4,3),
  bbox JSONB,
  classified_by TEXT,
  extras JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_observations_project ON public.observations(project_id);
CREATE INDEX idx_observations_site_species ON public.observations(site_id, species_id, observed_at);
CREATE INDEX idx_observations_observed_at ON public.observations(observed_at);
CREATE INDEX idx_observations_animal ON public.observations(project_id) WHERE is_animal = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Observations visible to org members or if project published"
  ON public.observations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (p.is_published = TRUE OR public.is_org_member(p.org_id, auth.uid()))
    )
  );

CREATE POLICY "Org editors can create observations"
  ON public.observations FOR INSERT
  WITH CHECK (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can update observations"
  ON public.observations FOR UPDATE
  USING (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org admins can delete observations"
  ON public.observations FOR DELETE
  USING (
    public.is_org_admin(public.project_org_id(project_id), auth.uid())
  );

-- UPDATED_AT TRIGGER
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
