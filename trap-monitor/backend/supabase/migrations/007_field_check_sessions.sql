-- Field check sessions and step-level evidence storage
-- Shared DB safe: creates Trap Monitor-owned tables only.

create table if not exists public.field_check_sessions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations(id) on delete cascade,
  unit_id        text not null references public.units(id) on delete cascade,
  started_by     uuid not null references auth.users(id) on delete restrict,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  final_result   text,
  notes          text,
  started_lat    double precision,
  started_lng    double precision,
  completed_lat  double precision,
  completed_lng  double precision,
  sync_status    text not null default 'synced',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint field_check_sessions_final_result_chk
    check (final_result is null or final_result in ('pass', 'fail', 'blocked')),
  constraint field_check_sessions_sync_status_chk
    check (sync_status in ('pending', 'synced', 'failed'))
);

create table if not exists public.field_check_steps (
  id               bigserial primary key,
  session_id       uuid not null references public.field_check_sessions(id) on delete cascade,
  step_key         text not null,
  step_status      text not null,
  evidence_source  text not null,
  evidence_ref     text,
  observed_value   jsonb,
  notes            text,
  recorded_at      timestamptz not null default now(),
  created_by       uuid not null references auth.users(id) on delete restrict,
  idempotency_key  text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint field_check_steps_status_chk
    check (step_status in ('pass', 'fail', 'skipped', 'pending')),
  constraint field_check_steps_evidence_source_chk
    check (evidence_source in ('command', 'event', 'manual')),
  constraint field_check_steps_session_idempotency_key_uniq
    unique (session_id, idempotency_key)
);

create index if not exists idx_field_check_sessions_org_started
  on public.field_check_sessions(org_id, started_at desc);

create index if not exists idx_field_check_sessions_unit_started
  on public.field_check_sessions(unit_id, started_at desc);

create index if not exists idx_field_check_steps_session_recorded
  on public.field_check_steps(session_id, recorded_at desc);

create index if not exists idx_field_check_steps_session_step_key
  on public.field_check_steps(session_id, step_key);

alter table public.field_check_sessions enable row level security;
alter table public.field_check_steps enable row level security;

-- Clear any stale policy names from previous local experiments.
drop policy if exists "Members can view org field check sessions" on public.field_check_sessions;
drop policy if exists "Operators can insert org field check sessions" on public.field_check_sessions;
drop policy if exists "Operators can update org field check sessions" on public.field_check_sessions;

drop policy if exists "Members can view org field check steps" on public.field_check_steps;
drop policy if exists "Operators can insert org field check steps" on public.field_check_steps;
drop policy if exists "Operators can update org field check steps" on public.field_check_steps;

create policy "Members can view org field check sessions"
  on public.field_check_sessions for select
  using (
    public.trap_can_view_org(org_id)
  );

create policy "Operators can insert org field check sessions"
  on public.field_check_sessions for insert
  with check (
    public.trap_can_edit_org(org_id)
    and started_by = auth.uid()
  );

create policy "Operators can update org field check sessions"
  on public.field_check_sessions for update
  using (
    public.trap_can_edit_org(org_id)
  )
  with check (
    public.trap_can_edit_org(org_id)
  );

create policy "Members can view org field check steps"
  on public.field_check_steps for select
  using (
    exists (
      select 1
      from public.field_check_sessions s
      where s.id = field_check_steps.session_id
        and public.trap_can_view_org(s.org_id)
    )
  );

create policy "Operators can insert org field check steps"
  on public.field_check_steps for insert
  with check (
    exists (
      select 1
      from public.field_check_sessions s
      where s.id = field_check_steps.session_id
        and public.trap_can_edit_org(s.org_id)
    )
    and created_by = auth.uid()
  );

create policy "Operators can update org field check steps"
  on public.field_check_steps for update
  using (
    exists (
      select 1
      from public.field_check_sessions s
      where s.id = field_check_steps.session_id
        and public.trap_can_edit_org(s.org_id)
    )
  )
  with check (
    exists (
      select 1
      from public.field_check_sessions s
      where s.id = field_check_steps.session_id
        and public.trap_can_edit_org(s.org_id)
    )
  );

grant select, insert, update on public.field_check_sessions to authenticated;
grant select, insert, update on public.field_check_steps to authenticated;
grant usage, select on sequence public.field_check_steps_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'field_check_sessions'
  ) then
    alter publication supabase_realtime add table public.field_check_sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'field_check_steps'
  ) then
    alter publication supabase_realtime add table public.field_check_steps;
  end if;
end $$;
