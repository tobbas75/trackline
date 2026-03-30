-- Trap Monitor org scoping (shared DB safe)
-- Uses shared public.organisations + public.org_members
-- Does NOT alter shared org_members/organisations policies.

-- Add org scoping column to trap units.
alter table public.units add column if not exists org_id uuid;
create index if not exists idx_units_org_id on public.units(org_id);

-- Ensure org_id FK points to shared organisations table, not app-local tables.
do $$
declare
  fk_name text;
  fk_target text;
begin
  select tc.constraint_name, ccu.table_name
  into fk_name, fk_target
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.constraint_schema = kcu.constraint_schema
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
   and tc.constraint_schema = ccu.constraint_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'units'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'org_id'
  limit 1;

  if fk_name is not null and fk_target <> 'organisations' then
    execute format('alter table public.units drop constraint %I', fk_name);
    fk_name := null;
  end if;

  if fk_name is null and to_regclass('public.organisations') is not null then
    alter table public.units
      add constraint units_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

-- Replace broad policies from 001 and trap-specific policies from older 002 variants.
drop policy if exists "Authenticated read units" on public.units;
drop policy if exists "Members can view org units" on public.units;
drop policy if exists "Operators can add units" on public.units;
drop policy if exists "Operators can update units" on public.units;
drop policy if exists "Admins can delete units" on public.units;

drop policy if exists "Authenticated read events" on public.events;
drop policy if exists "Service insert events" on public.events;
drop policy if exists "Members can view org events" on public.events;
drop policy if exists "Service role can insert events" on public.events;
drop policy if exists "Operators can acknowledge events" on public.events;

drop policy if exists "Service insert commands" on public.commands;
drop policy if exists "Authenticated insert commands" on public.commands;
drop policy if exists "Members can view org commands" on public.commands;
drop policy if exists "Operators can send commands" on public.commands;
drop policy if exists "Service role can update commands" on public.commands;

drop policy if exists "Members can view org notifications" on public.notifications;
drop policy if exists "Service role can manage notifications" on public.notifications;

-- Trap-specific helper functions for policy checks.
create or replace function public.trap_can_view_org(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.trap_can_edit_org(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = target_org_id
      and om.user_id = auth.uid()
      and om.role::text in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.trap_can_admin_org(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = target_org_id
      and om.user_id = auth.uid()
      and om.role::text in ('owner', 'admin')
  );
$$;

revoke all on function public.trap_can_view_org(uuid) from public;
revoke all on function public.trap_can_edit_org(uuid) from public;
revoke all on function public.trap_can_admin_org(uuid) from public;

grant execute on function public.trap_can_view_org(uuid) to authenticated;
grant execute on function public.trap_can_edit_org(uuid) to authenticated;
grant execute on function public.trap_can_admin_org(uuid) to authenticated;

-- Units policies (org scoped).
create policy "Members can view org units"
  on public.units for select
  using (
    org_id is not null
    and public.trap_can_view_org(org_id)
  );

create policy "Operators can add units"
  on public.units for insert
  with check (
    org_id is not null
    and public.trap_can_edit_org(org_id)
  );

create policy "Operators can update units"
  on public.units for update
  using (
    org_id is not null
    and public.trap_can_edit_org(org_id)
  )
  with check (
    org_id is not null
    and public.trap_can_edit_org(org_id)
  );

create policy "Admins can delete units"
  on public.units for delete
  using (
    org_id is not null
    and public.trap_can_admin_org(org_id)
  );

-- Events policies (org scoped via units).
create policy "Members can view org events"
  on public.events for select
  using (
    exists (
      select 1
      from public.units u
      where u.id = events.unit_id
        and u.org_id is not null
        and public.trap_can_view_org(u.org_id)
    )
  );

create policy "Service role can insert events"
  on public.events for insert
  with check (auth.role() = 'service_role');

create policy "Operators can acknowledge events"
  on public.events for update
  using (
    exists (
      select 1
      from public.units u
      where u.id = events.unit_id
        and u.org_id is not null
        and public.trap_can_edit_org(u.org_id)
    )
  )
  with check (
    acknowledged is not null or ack_at is not null
  );

-- Commands policies (org scoped via units).
create policy "Members can view org commands"
  on public.commands for select
  using (
    exists (
      select 1
      from public.units u
      where u.id = commands.unit_id
        and u.org_id is not null
        and public.trap_can_view_org(u.org_id)
    )
  );

create policy "Operators can send commands"
  on public.commands for insert
  with check (
    exists (
      select 1
      from public.units u
      where u.id = commands.unit_id
        and u.org_id is not null
        and public.trap_can_edit_org(u.org_id)
    )
  );

create policy "Service role can update commands"
  on public.commands for update
  using (auth.role() = 'service_role');

-- Notifications policies (org scoped via events -> units).
create policy "Members can view org notifications"
  on public.notifications for select
  using (
    exists (
      select 1
      from public.events e
      join public.units u on u.id = e.unit_id
      where e.id = notifications.event_id
        and u.org_id is not null
        and public.trap_can_view_org(u.org_id)
    )
  );

create policy "Service role can manage notifications"
  on public.notifications for all
  using (auth.role() = 'service_role');

-- Shared-org helper for app API.
create or replace function public.get_user_orgs()
returns table (
  org_id uuid,
  org_name text,
  role text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    om.org_id,
    o.name as org_name,
    om.role::text as role
  from public.org_members om
  join public.organisations o on o.id = om.org_id
  where om.user_id = auth.uid()
  order by o.name;
$$;

grant execute on function public.get_user_orgs() to authenticated;

-- Optional bootstrap: if exactly one shared organisation exists, auto-assign legacy units.
do $$
declare
  org_count int;
  single_org uuid;
begin
  if to_regclass('public.organisations') is not null then
    select count(*) into org_count from public.organisations;

    if org_count = 1 then
      select id into single_org from public.organisations limit 1;

      update public.units
      set org_id = single_org
      where org_id is null;
    end if;
  end if;
end $$;
