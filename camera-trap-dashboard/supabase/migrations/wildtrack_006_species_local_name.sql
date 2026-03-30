-- Originally: 006_add_species_local_name.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Add local_name column to species for Indigenous/vernacular names
-- ============================================================

ALTER TABLE public.species ADD COLUMN IF NOT EXISTS local_name TEXT;

CREATE INDEX IF NOT EXISTS idx_species_local_name ON public.species(local_name)
  WHERE local_name IS NOT NULL;
