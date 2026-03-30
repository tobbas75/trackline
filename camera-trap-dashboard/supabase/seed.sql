-- Seed data for local development
-- Creates test users, organisations, and sample projects

-- ============================================================
-- TEST USER: test@wildtrack.dev / password123
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_super_admin, is_sso_user
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'test@wildtrack.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Toby Barton"}',
  now(), now(), now(),
  '', '', '',
  '', '', '', '',
  '', false, false
);

INSERT INTO auth.identities (
  user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  jsonb_build_object(
    'sub', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email', 'test@wildtrack.dev',
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
);

-- Profile auto-created by trigger — update display_name
UPDATE public.profiles
SET display_name = 'Toby Barton', email = 'test@wildtrack.dev'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ============================================================
-- SECOND TEST USER: ranger@wildtrack.dev / password123
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_super_admin, is_sso_user
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'ranger@wildtrack.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Jane Ranger"}',
  now(), now(), now(),
  '', '', '',
  '', '', '', '',
  '', false, false
);

INSERT INTO auth.identities (
  user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  jsonb_build_object(
    'sub', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'email', 'ranger@wildtrack.dev',
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
);

UPDATE public.profiles
SET display_name = 'Jane Ranger', email = 'ranger@wildtrack.dev'
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- ============================================================
-- ORGANISATION: Tiwi Islands Rangers
-- ============================================================
INSERT INTO public.organisations (
  id, name, slug, type, description, region, contact_email, is_public
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Tiwi Islands Rangers',
  'tiwi-islands-rangers',
  'ranger_team',
  'Tiwi Land Council ranger team managing camera trap monitoring across Melville and Bathurst Islands.',
  'Northern Territory',
  'rangers@tiwi.org.au',
  true
);

-- Toby = owner
INSERT INTO public.org_members (org_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'owner');

-- Jane = member
INSERT INTO public.org_members (org_id, user_id, role, invited_by) VALUES
  ('11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'member', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ============================================================
-- ORGANISATION: Kakadu National Park
-- ============================================================
INSERT INTO public.organisations (
  id, name, slug, type, description, region, is_public
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Kakadu National Park',
  'kakadu-national-park',
  'national_park',
  'Camera trap monitoring program for Kakadu National Park wildlife surveys.',
  'Northern Territory',
  true
);

INSERT INTO public.org_members (org_id, user_id, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin');

-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO public.projects (
  id, org_id, created_by, name, slug, description, location_name,
  is_published, tags
) VALUES
  (
    'aaaa1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Andranangoo Baseline Survey 2024',
    'andranangoo-baseline-2024',
    'Baseline camera trap survey across 65 sites on Melville Island, monitoring feral cats, brush-tailed possums, and other species.',
    'Melville Island, Northern Territory',
    false,
    ARRAY['baseline', 'feral-cat', 'possum', '2024']
  ),
  (
    'aaaa2222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Bathurst Island Wet Season 2025',
    'bathurst-wet-season-2025',
    'Wet season monitoring on Bathurst Island. Focused on quoll population recovery.',
    'Bathurst Island, Northern Territory',
    false,
    ARRAY['wet-season', 'quoll', '2025']
  ),
  (
    'aaaa3333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Yellow Water Floodplain Survey',
    'yellow-water-floodplain',
    'Long-term monitoring of wildlife on the Yellow Water floodplain.',
    'Kakadu, Northern Territory',
    true,
    ARRAY['floodplain', 'long-term', 'published']
  );
