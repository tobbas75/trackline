-- Originally: 005_phase6_detection_histories.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- WildTrack Phase 6: Detection Histories
-- ============================================================
-- Detection histories store occupancy-format detection matrices
-- (sites x occasions) used for occupancy modelling.
-- ============================================================

-- ============================================================
-- DETECTION HISTORIES (one per species per project)
-- ============================================================
CREATE TABLE public.detection_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  species_id UUID REFERENCES public.species(id) ON DELETE SET NULL,
  species_name TEXT NOT NULL,
  occasion_start DATE NOT NULL,
  occasion_end DATE NOT NULL,
  occasion_length_days INT NOT NULL DEFAULT 7,
  num_occasions INT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dh_project ON public.detection_histories(project_id);
CREATE INDEX idx_dh_species ON public.detection_histories(species_id);

-- ============================================================
-- DETECTION HISTORY ROWS (one row per site per detection history)
-- ============================================================
CREATE TABLE public.detection_history_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_history_id UUID NOT NULL REFERENCES public.detection_histories(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  site_name TEXT NOT NULL,
  -- detections stored as integer array: 1=detected, 0=not detected, -1=not surveyed (NA)
  detections INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dhr_history ON public.detection_history_rows(detection_history_id);
CREATE INDEX idx_dhr_site ON public.detection_history_rows(site_id);

-- ============================================================
-- RLS POLICIES — detection_histories
-- ============================================================
ALTER TABLE public.detection_histories ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read, plus published projects visible to all authenticated
CREATE POLICY "dh_select" ON public.detection_histories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE p.id = detection_histories.project_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = detection_histories.project_id
      AND p.is_published = TRUE
  )
);

-- INSERT: org members with editor+ role
CREATE POLICY "dh_insert" ON public.detection_histories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE p.id = detection_histories.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  )
);

-- UPDATE: org members with editor+ role
CREATE POLICY "dh_update" ON public.detection_histories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE p.id = detection_histories.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  )
);

-- DELETE: admin+ only
CREATE POLICY "dh_delete" ON public.detection_histories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE p.id = detection_histories.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- ============================================================
-- RLS POLICIES — detection_history_rows
-- ============================================================
ALTER TABLE public.detection_history_rows ENABLE ROW LEVEL SECURITY;

-- SELECT: if you can see the parent detection_history, you can see rows
CREATE POLICY "dhr_select" ON public.detection_history_rows FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.detection_histories dh
    JOIN public.projects p ON p.id = dh.project_id
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE dh.id = detection_history_rows.detection_history_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.detection_histories dh
    JOIN public.projects p ON p.id = dh.project_id
    WHERE dh.id = detection_history_rows.detection_history_id
      AND p.is_published = TRUE
  )
);

-- INSERT: editor+ in the org
CREATE POLICY "dhr_insert" ON public.detection_history_rows FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.detection_histories dh
    JOIN public.projects p ON p.id = dh.project_id
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE dh.id = detection_history_rows.detection_history_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  )
);

-- DELETE: admin+ in the org
CREATE POLICY "dhr_delete" ON public.detection_history_rows FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.detection_histories dh
    JOIN public.projects p ON p.id = dh.project_id
    JOIN public.org_members om ON om.org_id = p.org_id
    WHERE dh.id = detection_history_rows.detection_history_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detection_histories TO authenticated;
GRANT SELECT ON public.detection_histories TO anon;
GRANT SELECT, INSERT, DELETE ON public.detection_history_rows TO authenticated;
GRANT SELECT ON public.detection_history_rows TO anon;
