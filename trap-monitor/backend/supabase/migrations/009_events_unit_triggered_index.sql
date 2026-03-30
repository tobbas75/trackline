-- Add composite index for org-scoped event queries.
-- Dashboard fetches events filtered by unit_id IN (...) ordered by triggered_at DESC.
-- This index supports both the filter and the sort without a separate sort step.

CREATE INDEX IF NOT EXISTS idx_events_unit_triggered
  ON public.events (unit_id, triggered_at DESC);
