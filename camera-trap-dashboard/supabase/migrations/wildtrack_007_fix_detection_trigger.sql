-- Originally: 007_fix_detection_histories_trigger.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Fix missing updated_at trigger on detection_histories
-- ============================================================

DROP TRIGGER IF EXISTS set_updated_at ON public.detection_histories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.detection_histories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
