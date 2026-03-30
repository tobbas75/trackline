-- Shared DB hotfix: remove recursive org_members policies and restore canonical set
-- Safe for shared database used by Portal, WildTrack, Fire, and Trap Monitor.

begin;

-- 1) Remove Trap-specific recursive artifacts.
drop policy if exists "Members can view org members" on public.org_members;
drop policy if exists "Owners/admins can manage members" on public.org_members;
drop function if exists public.trap_is_org_member(uuid);
drop function if exists public.trap_has_org_role(uuid, text[]);

-- 2) Ensure shared helper functions exist with canonical behavior.
create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.org_members
    where org_id = p_org_id
      and user_id = p_user_id
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.org_members
    where org_id = p_org_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

-- 3) Recreate canonical org_members policies (shared-safe).
alter table public.org_members enable row level security;

drop policy if exists "Org members can view fellow members" on public.org_members;
drop policy if exists "Org admins can manage members" on public.org_members;
drop policy if exists "Org admins can update member roles" on public.org_members;
drop policy if exists "Org admins can remove members" on public.org_members;

create policy "Org members can view fellow members"
  on public.org_members for select
  using (public.is_org_member(org_id, auth.uid()));

create policy "Org admins can manage members"
  on public.org_members for insert
  with check (public.is_org_admin(org_id, auth.uid()));

create policy "Org admins can update member roles"
  on public.org_members for update
  using (public.is_org_admin(org_id, auth.uid()));

create policy "Org admins can remove members"
  on public.org_members for delete
  using (
    public.is_org_admin(org_id, auth.uid())
    or user_id = auth.uid()
  );

commit;

-- Optional sanity check output
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'org_members'
order by policyname;
