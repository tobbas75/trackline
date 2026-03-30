-- Camera image storage bucket and RLS policies
-- Supports camera trap image upload/retrieval with org-scoped access control
-- Storage path convention: {org_id}/{unit_id}/{event_id}.jpg

-- =============================================================================
-- Storage Bucket
-- =============================================================================

-- Create storage bucket for camera trap images
-- Private bucket (public = false), 5MB limit, JPEG/PNG only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'camera-images',
  'camera-images',
  false,
  5242880,  -- 5MB max (JPEG images from NE301)
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Storage RLS Policies
-- =============================================================================
-- Path convention: camera-images/{org_id}/{unit_id}/{event_id}.jpg
-- storage.foldername(name) extracts path segments — [1] is org_id

-- Org members can view images in their org's folder
CREATE POLICY "Org members can view camera images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'camera-images'
    AND public.trap_can_view_org((storage.foldername(name))[1]::uuid)
  );

-- Service role can upload images (from MQTT ingestion edge function)
CREATE POLICY "Service role can upload camera images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'camera-images'
    AND auth.role() = 'service_role'
  );

-- Service role can update image metadata
CREATE POLICY "Service role can update camera images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'camera-images'
    AND auth.role() = 'service_role'
  );

-- Org admins can delete images from their org
CREATE POLICY "Org admins can delete camera images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'camera-images'
    AND public.trap_can_admin_org((storage.foldername(name))[1]::uuid)
  );
