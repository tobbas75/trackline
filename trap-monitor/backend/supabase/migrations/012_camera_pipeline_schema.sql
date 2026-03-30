-- ── Camera Pipeline Schema ────────────────────────────────────────────────────
-- Migration 012: Camera trap tables, species registry, units extensions
-- Depends on: 001 (units), 002 (organisations, trap_can_* functions)
-- Run via: npx supabase db push

-- ── Section 1: Species Registry ──────────────────────────────────────────────
-- Global registry of species for AI detection classification.
-- Not org-scoped — shared across all organisations.

CREATE TABLE IF NOT EXISTS public.trap_species (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  common_name     text NOT NULL,
  scientific_name text,
  category        text NOT NULL CHECK (category IN ('mammal', 'bird', 'reptile', 'amphibian', 'insect', 'other')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trap_species_name ON public.trap_species(name);
CREATE INDEX IF NOT EXISTS idx_trap_species_category ON public.trap_species(category);

ALTER TABLE public.trap_species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read species"
  ON public.trap_species FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manage species"
  ON public.trap_species FOR ALL
  USING (auth.role() = 'service_role');

-- Seed common Australian wildlife matching likely NE301 detection classes.
INSERT INTO public.trap_species (name, common_name, scientific_name, category) VALUES
  ('kangaroo', 'Kangaroo', 'Macropus spp.', 'mammal'),
  ('wallaby', 'Wallaby', 'Notamacropus spp.', 'mammal'),
  ('wombat', 'Common Wombat', 'Vombatus ursinus', 'mammal'),
  ('koala', 'Koala', 'Phascolarctos cinereus', 'mammal'),
  ('possum', 'Common Brushtail Possum', 'Trichosurus vulpecula', 'mammal'),
  ('echidna', 'Short-beaked Echidna', 'Tachyglossus aculeatus', 'mammal'),
  ('platypus', 'Platypus', 'Ornithorhynchus anatinus', 'mammal'),
  ('fox', 'Red Fox', 'Vulpes vulpes', 'mammal'),
  ('cat', 'Feral Cat', 'Felis catus', 'mammal'),
  ('rabbit', 'European Rabbit', 'Oryctolagus cuniculus', 'mammal'),
  ('deer', 'Sambar Deer', 'Rusa unicolor', 'mammal'),
  ('pig', 'Feral Pig', 'Sus scrofa', 'mammal'),
  ('quoll', 'Eastern Quoll', 'Dasyurus viverrinus', 'mammal'),
  ('bandicoot', 'Southern Brown Bandicoot', 'Isoodon obesulus', 'mammal'),
  ('glider', 'Sugar Glider', 'Petaurus breviceps', 'mammal'),
  ('emu', 'Emu', 'Dromaius novaehollandiae', 'bird'),
  ('magpie', 'Australian Magpie', 'Gymnorhina tibicen', 'bird'),
  ('kookaburra', 'Laughing Kookaburra', 'Dacelo novaeguineae', 'bird'),
  ('cockatoo', 'Sulphur-crested Cockatoo', 'Cacatua galerita', 'bird'),
  ('goanna', 'Lace Monitor', 'Varanus varius', 'reptile'),
  ('snake', 'Eastern Brown Snake', 'Pseudonaja textilis', 'reptile'),
  ('human', 'Human', 'Homo sapiens', 'other'),
  ('vehicle', 'Vehicle', NULL, 'other'),
  ('empty', 'Empty (no detection)', NULL, 'other')
ON CONFLICT (name) DO NOTHING;

-- ── Section 2: Units Table Extensions ────────────────────────────────────────
-- Add device type and connectivity method to support camera traps alongside
-- existing trap monitors. Defaults preserve all existing rows.

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'trap_monitor'
    CHECK (device_type IN ('trap_monitor', 'camera_trap'));

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS connectivity_method text NOT NULL DEFAULT 'sms'
    CHECK (connectivity_method IN ('sms', 'mqtt'));

-- ── Section 3: Camera Events Table ───────────────────────────────────────────
-- Stores each camera capture event with metadata from NE301 MQTT payload.
-- org_id is denormalised (same pattern as events table migration 011) for
-- efficient RLS policy evaluation without joining through units.

CREATE TABLE IF NOT EXISTS public.t_camera_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id             text NOT NULL REFERENCES public.units(id),
  org_id              uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  captured_at         timestamptz NOT NULL,
  image_path          text,
  image_width         int,
  image_height        int,
  model_name          text,
  inference_time_ms   int,
  battery_percent     int,
  communication_type  text,
  detection_count     int NOT NULL DEFAULT 0,
  mqtt_topic          text,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_t_camera_events_org_captured
  ON public.t_camera_events (org_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_camera_events_unit
  ON public.t_camera_events (unit_id);

ALTER TABLE public.t_camera_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org camera events"
  ON public.t_camera_events FOR SELECT
  USING (public.trap_can_view_org(org_id));

CREATE POLICY "Service role can insert camera events"
  ON public.t_camera_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update camera events"
  ON public.t_camera_events FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can delete camera events"
  ON public.t_camera_events FOR DELETE
  USING (public.trap_can_admin_org(org_id));

-- ── Section 4: Camera Detections Table ───────────────────────────────────────
-- Stores individual AI detections within a camera event.
-- Bounding box coordinates are normalised 0-1 matching NE301 output format.

CREATE TABLE IF NOT EXISTS public.t_camera_detections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_event_id     uuid NOT NULL REFERENCES public.t_camera_events(id) ON DELETE CASCADE,
  species_id          uuid REFERENCES public.trap_species(id),
  class_name          text NOT NULL,
  confidence          real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  x                   real NOT NULL CHECK (x >= 0 AND x <= 1),
  y                   real NOT NULL CHECK (y >= 0 AND y <= 1),
  width               real NOT NULL CHECK (width >= 0 AND width <= 1),
  height              real NOT NULL CHECK (height >= 0 AND height <= 1),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_t_camera_detections_event
  ON public.t_camera_detections (camera_event_id);
CREATE INDEX IF NOT EXISTS idx_t_camera_detections_trap_species
  ON public.t_camera_detections (species_id);
CREATE INDEX IF NOT EXISTS idx_t_camera_detections_confidence
  ON public.t_camera_detections (confidence DESC);

ALTER TABLE public.t_camera_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org camera detections"
  ON public.t_camera_detections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.t_camera_events ce
      WHERE ce.id = t_camera_detections.camera_event_id
        AND public.trap_can_view_org(ce.org_id)
    )
  );

CREATE POLICY "Service role can insert camera detections"
  ON public.t_camera_detections FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete camera detections"
  ON public.t_camera_detections FOR DELETE
  USING (auth.role() = 'service_role');

-- ── Section 5: Realtime Subscriptions ────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE t_camera_events;
