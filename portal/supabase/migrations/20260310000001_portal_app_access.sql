-- Originally: 001_portal_app_access.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see PROTECTED_SURFACES.md for cross-app safety rules

-- Portal schema: shared app-level access control
-- Each dashboard checks this table to verify the user has been granted access.
-- Users authenticate via shared Supabase auth, but can only enter apps they're explicitly assigned to.

create schema if not exists portal;

-- ── App registry ──
create table portal.apps (
  id text primary key,                          -- e.g. 'wildtrack', 'fire', 'trap_monitor'
  name text not null,                           -- Display name
  description text,
  url text,                                     -- Production URL for the app
  icon text,                                    -- Icon identifier
  created_at timestamptz not null default now()
);

-- Seed the three apps
insert into portal.apps (id, name, description, url, icon) values
  ('wildtrack',    'WildTrack',    'Camera trap data management and analytics',                      null, 'camera'),
  ('fire',         'Fire System',  'Savanna burn planning, fire scar mapping, and carbon methodology', null, 'flame'),
  ('trap_monitor', 'Trap Monitor', 'SMS-based animal trap monitoring with GPS tracking',              null, 'radio');

-- ── User app access ──
create table portal.app_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null references portal.apps(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'member', 'admin')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),

  unique (user_id, app_id)
);

-- Index for fast lookups
create index idx_app_access_user on portal.app_access(user_id);
create index idx_app_access_app  on portal.app_access(app_id);

-- ── User profiles (portal-managed, single source of truth for all Trackline apps) ──
create table portal.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  email text,
  avatar_url text,
  organisation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function portal.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into portal.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function portal.handle_new_user();

-- Updated_at trigger
create or replace function portal.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on portal.profiles
  for each row execute function portal.update_updated_at();

-- ── RLS ──
alter table portal.apps enable row level security;
alter table portal.app_access enable row level security;
alter table portal.profiles enable row level security;

-- Apps table: anyone can read (public listing)
create policy "apps_read_all"
  on portal.apps for select
  using (true);

-- App access: users can see their own access
create policy "app_access_read_own"
  on portal.app_access for select
  using (auth.uid() = user_id);

-- App access: only portal admins can grant access
-- (portal admin = someone with admin role on any app, or we can refine later)
create policy "app_access_insert_admin"
  on portal.app_access for insert
  with check (
    exists (
      select 1 from portal.app_access aa
      where aa.user_id = auth.uid()
        and aa.role = 'admin'
    )
  );

create policy "app_access_delete_admin"
  on portal.app_access for delete
  using (
    exists (
      select 1 from portal.app_access aa
      where aa.user_id = auth.uid()
        and aa.role = 'admin'
    )
  );

-- Profiles: users can read their own profile
-- Co-member visibility is added by downstream apps (e.g. WildTrack)
-- after they create their org_members tables.
create policy "profiles_read_own"
  on portal.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on portal.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on portal.profiles for insert
  with check (auth.uid() = id);

-- ── Helper function for dashboards to check access ──
-- Each dashboard app calls this to verify the current user has access.
-- Usage: select portal.check_app_access('wildtrack');
create or replace function portal.check_app_access(target_app_id text)
returns table (has_access boolean, user_role text)
language sql
security definer
stable
as $$
  select
    true as has_access,
    aa.role as user_role
  from portal.app_access aa
  where aa.user_id = auth.uid()
    and aa.app_id = target_app_id
  limit 1;
$$;

-- Grant usage so all authenticated users can call the function
grant usage on schema portal to authenticated;
grant select on portal.apps to authenticated;
grant select on portal.app_access to authenticated;
grant insert, update on portal.profiles to authenticated;
grant select on portal.profiles to authenticated;
grant execute on function portal.check_app_access(text) to authenticated;
