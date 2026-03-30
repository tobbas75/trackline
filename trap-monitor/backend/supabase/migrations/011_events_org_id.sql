-- Add org_id to events for direct org-scoped queries and realtime filtering.
-- Previously events were scoped indirectly through units.unit_id → units.org_id.
-- Direct org_id on events enables:
--   ISO-01: Realtime subscription filter at DB level (not in-memory)
--   ISO-02: Event queries scoped by org_id before ordering/limiting
--   ISO-03: Composite index on (org_id, triggered_at)

-- Step 1: Add the column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS org_id uuid;

-- Step 2: Backfill from units table
UPDATE public.events e
SET org_id = u.org_id
FROM public.units u
WHERE e.unit_id = u.id
  AND e.org_id IS NULL
  AND u.org_id IS NOT NULL;

-- Step 3: Composite index for org-scoped event queries (ISO-03)
CREATE INDEX IF NOT EXISTS idx_events_org_triggered
  ON public.events (org_id, triggered_at DESC);

-- Step 4: Update events RLS policies to use direct org_id where available.
-- Keep the join-based fallback for events without org_id (UNKNOWN events with null unit_id).
DROP POLICY IF EXISTS "Members can view org events" ON public.events;
CREATE POLICY "Members can view org events"
  ON public.events FOR SELECT
  USING (
    (org_id IS NOT NULL AND public.trap_can_view_org(org_id))
    OR
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = events.unit_id
        AND u.org_id IS NOT NULL
        AND public.trap_can_view_org(u.org_id)
    ))
  );

DROP POLICY IF EXISTS "Operators can acknowledge events" ON public.events;
CREATE POLICY "Operators can acknowledge events"
  ON public.events FOR UPDATE
  USING (
    (org_id IS NOT NULL AND public.trap_can_edit_org(org_id))
    OR
    (org_id IS NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = events.unit_id
        AND u.org_id IS NOT NULL
        AND public.trap_can_edit_org(u.org_id)
    ))
  )
  WITH CHECK (
    acknowledged IS NOT NULL OR ack_at IS NOT NULL
  );
