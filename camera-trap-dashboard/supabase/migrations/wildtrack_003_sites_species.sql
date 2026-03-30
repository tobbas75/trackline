-- Originally: 003_phase2_sites_species.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- WildTrack Phase 2: Sites, Species, CSV Uploads, Column Mapping Templates
-- ============================================================

-- ============================================================
-- UPLOAD TYPE ENUM
-- ============================================================
CREATE TYPE upload_type AS ENUM ('observations', 'deployments', 'detection_history', 'generic');
CREATE TYPE upload_status AS ENUM ('pending', 'mapping', 'processing', 'completed', 'failed');

-- ============================================================
-- SITES (camera stations / sampling locations)
-- ============================================================
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  date_deployed DATE,
  date_end DATE,
  covariates JSONB NOT NULL DEFAULT '{}',
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, site_name)
);

CREATE INDEX idx_sites_project ON public.sites(project_id);
CREATE INDEX idx_sites_covariates ON public.sites USING GIN (covariates);

-- ============================================================
-- SPECIES (per-project species registry)
-- ============================================================
CREATE TABLE public.species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  species_group TEXT,
  individual_id_label TEXT,
  ala_guid TEXT,
  conservation_status JSONB,
  ala_image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, common_name)
);

CREATE INDEX idx_species_project ON public.species(project_id);
CREATE INDEX idx_species_ala_guid ON public.species(ala_guid) WHERE ala_guid IS NOT NULL;

-- ============================================================
-- CSV UPLOADS (import audit trail)
-- ============================================================
CREATE TABLE public.csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES portal.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  upload_type upload_type NOT NULL DEFAULT 'generic',
  status upload_status NOT NULL DEFAULT 'pending',
  source_columns TEXT[],
  column_mapping JSONB,
  extra_columns_mapping JSONB,
  parse_config JSONB,
  row_count INTEGER,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csv_uploads_project ON public.csv_uploads(project_id);

-- ============================================================
-- COLUMN MAPPING TEMPLATES (reusable saved mappings)
-- ============================================================
CREATE TABLE public.column_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  upload_type upload_type NOT NULL,
  column_mapping JSONB NOT NULL,
  extra_columns_mapping JSONB,
  parse_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- SITES
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sites visible to org members or if project published"
  ON public.sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (p.is_published = TRUE OR public.is_org_member(p.org_id, auth.uid()))
    )
  );

CREATE POLICY "Org editors can create sites"
  ON public.sites FOR INSERT
  WITH CHECK (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can update sites"
  ON public.sites FOR UPDATE
  USING (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org admins can delete sites"
  ON public.sites FOR DELETE
  USING (
    public.is_org_admin(public.project_org_id(project_id), auth.uid())
  );

-- SPECIES
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Species visible to org members or if project published"
  ON public.species FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (p.is_published = TRUE OR public.is_org_member(p.org_id, auth.uid()))
    )
  );

CREATE POLICY "Org editors can create species"
  ON public.species FOR INSERT
  WITH CHECK (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can update species"
  ON public.species FOR UPDATE
  USING (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org admins can delete species"
  ON public.species FOR DELETE
  USING (
    public.is_org_admin(public.project_org_id(project_id), auth.uid())
  );

-- CSV UPLOADS
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uploads visible to org members"
  ON public.csv_uploads FOR SELECT
  USING (
    public.is_org_member(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can create uploads"
  ON public.csv_uploads FOR INSERT
  WITH CHECK (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can update uploads"
  ON public.csv_uploads FOR UPDATE
  USING (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

-- COLUMN MAPPING TEMPLATES
ALTER TABLE public.column_mapping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visible to org members"
  ON public.column_mapping_templates FOR SELECT
  USING (
    public.is_org_member(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can create templates"
  ON public.column_mapping_templates FOR INSERT
  WITH CHECK (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org editors can update templates"
  ON public.column_mapping_templates FOR UPDATE
  USING (
    public.can_org_edit(public.project_org_id(project_id), auth.uid())
  );

CREATE POLICY "Org admins can delete templates"
  ON public.column_mapping_templates FOR DELETE
  USING (
    public.is_org_admin(public.project_org_id(project_id), auth.uid())
  );

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.species
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.csv_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
