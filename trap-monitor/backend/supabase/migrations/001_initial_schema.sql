-- ── Trap Monitoring System — Supabase Schema ─────────────────────────────────
-- Run via: npx supabase db push

-- Enable PostGIS for spatial queries
create extension if not exists postgis;

-- ── Units table ───────────────────────────────────────────────────────────────
create table if not exists units (
  id            text primary key,              -- e.g. "TRAP_001"
  name          text,                          -- Human-readable name
  phone_id      text,                          -- Phone number this unit texts from
  last_lat      double precision,
  last_lng      double precision,
  last_seen     timestamptz,
  firmware_ver  text,
  battery_pct   int,
  solar_ok      boolean default true,
  armed         boolean default true,
  created_at    timestamptz default now()
);

-- ── Events table ─────────────────────────────────────────────────────────────
create table if not exists events (
  id            bigserial primary key,
  unit_id       text references units(id),
  event_type    text not null,                 -- 'TRAP', 'HEALTH', 'ALERT'
  triggered_at  timestamptz not null,
  lat           double precision,
  lng           double precision,
  gps_stale     boolean default false,
  battery_pct   int,
  solar_ok      boolean,
  signal_rssi   int,
  fw_version    text,
  trap_caught   boolean default false,
  raw_sms       text,
  acknowledged  boolean default false,
  ack_at        timestamptz,
  created_at    timestamptz default now()
);

create index on events(unit_id);
create index on events(event_type);
create index on events(triggered_at desc);
create index on events(trap_caught) where trap_caught = true;

-- ── Commands table ────────────────────────────────────────────────────────────
create table if not exists commands (
  id          bigserial primary key,
  unit_id     text references units(id),
  command     text not null,
  sent_at     timestamptz default now(),
  response    text,
  response_at timestamptz,
  sent_by     text                             -- operator email
);

-- ── Alerts table (notifications sent) ────────────────────────────────────────
create table if not exists notifications (
  id          bigserial primary key,
  event_id    bigint references events(id),
  channel     text,                            -- 'sms', 'push', 'email'
  sent_at     timestamptz default now(),
  delivered   boolean default false,
  error_msg   text
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table units         enable row level security;
alter table events        enable row level security;
alter table commands      enable row level security;
alter table notifications enable row level security;

-- Allow authenticated users to read all data
create policy "Authenticated read units"
  on units for select using (auth.role() = 'authenticated');

create policy "Authenticated read events"
  on events for select using (auth.role() = 'authenticated');

-- Allow service role (Edge Functions) to insert
create policy "Service insert events"
  on events for insert with check (auth.role() = 'service_role');

create policy "Service insert commands"
  on commands for insert with check (auth.role() = 'service_role');

create policy "Authenticated insert commands"
  on commands for insert with check (auth.role() = 'authenticated');

-- ── Realtime ──────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table units;

-- ── Seed default units (edit as needed) ──────────────────────────────────────
insert into units (id, name) values
  ('TRAP_001', 'Trap 1 — North Paddock'),
  ('TRAP_002', 'Trap 2 — Creek Crossing'),
  ('TRAP_003', 'Trap 3 — Main Gate')
on conflict (id) do nothing;
