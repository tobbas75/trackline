-- Originally: 002_admin_policies.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see PROTECTED_SURFACES.md for cross-app safety rules

-- Admin RLS policies: allow users with any admin role to read all profiles and all app_access rows.
-- This is required for the portal admin UI to list users and manage access.

-- Security-definer function to check admin status without triggering RLS on app_access
-- (avoids infinite recursion when app_access policies query app_access).
create or replace function portal.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from portal.app_access
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function portal.is_admin() to authenticated;

-- Admins can read all profiles (for the user management UI)
create policy "profiles_read_admin"
  on portal.profiles for select
  using (portal.is_admin());

-- Admins can read all app_access rows (to see who has access to what)
create policy "app_access_read_admin"
  on portal.app_access for select
  using (portal.is_admin());

-- Admins can insert app_access rows (grant access)
create policy "app_access_insert_admin"
  on portal.app_access for insert
  with check (portal.is_admin());

-- Admins can delete app_access rows (revoke access)
create policy "app_access_delete_admin"
  on portal.app_access for delete
  using (portal.is_admin());

-- Admins can update app_access rows (change roles)
create policy "app_access_update_admin"
  on portal.app_access for update
  using (portal.is_admin());
