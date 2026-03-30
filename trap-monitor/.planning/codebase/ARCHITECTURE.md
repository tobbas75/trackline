# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Layered system with clear firmware → backend → frontend separation. Three independently deployable tiers: embedded device (C++ state machine), cloud backend (Deno Edge Functions + PostgreSQL), and web dashboard (Next.js App Router).

**Key Characteristics:**
- Minimal coupling: firmware communicates only via SMS; backend is stateless; frontend depends on Supabase realtime
- Battery-first design: firmware defaults to deep sleep, wakes only for trap triggers, RTC health checks, or retries
- Multi-tenant architecture: shared Supabase database with organization-scoped units, events, commands
- Explicit contracts: SMS format spec is the firmware↔backend contract; TypeScript interfaces define frontend↔API contracts

## Layers

**Firmware Layer (Embedded, ESP32-S3):**
- Purpose: Trap detection and alert transmission; GPS positioning; power management
- Location: `firmware/src/`
- Contains: State machine (`main.cpp`), hardware abstraction layer (`hal/`), SMS composition, command parsing
- Depends on: PlatformIO libraries, modem driver, RTC, GPS, ADC sensors
- Used by: Telstra/Twilio SMS gateway (receives SMS from devices)

**Backend Layer (Cloud, Supabase):**
- Purpose: Webhook ingestion, SMS parsing, event persistence, RLS-enforced data access
- Location: `backend/supabase/`
- Contains: Edge Function (`ingest-sms`), database schema (PostgreSQL + PostGIS), RLS policies, migrations
- Depends on: Supabase runtime (Deno), Telstra/Twilio webhook delivery
- Used by: Frontend queries (via Supabase JS client), realtime subscriptions

**Frontend Layer (Web, Next.js):**
- Purpose: Dashboard visualization, unit management, command dispatch, organization management
- Location: `frontend/src/`
- Contains: App Router pages, API routes, React components, Supabase client library
- Depends on: Supabase (auth, realtime), Leaflet (mapping)
- Used by: Browser clients (authenticated via Supabase Auth)

## Data Flow

**Inbound (Device → Dashboard):**

1. Device (ESP32-S3) wakes from deep sleep (trap trigger, RTC health check, or message retry)
2. Composes SMS message (e.g., "TRAP #TRAP_001 | CAUGHT | 14/03/26 06:42")
3. Sends via modem to Telstra LTE or Starlink D2C
4. Telstra/Twilio webhook POSTs to `https://[project].supabase.co/functions/v1/ingest-sms`
5. Edge Function `ingest-sms` parses SMS → extracts unit ID, event type, GPS, battery, timestamp
6. Upserts `units` table (latest state) and inserts `events` row (append-only history)
7. Supabase realtime publishes changes to subscribed clients
8. Dashboard React components receive updates and re-render

**Outbound (Dashboard → Device):**

1. Operator clicks command button in dashboard (e.g., "STATUS", "ARM", "GPS")
2. Dashboard POSTs to `/api/command` with `{unitId, command}`
3. API route validates command, retrieves unit's phone number, constructs SMS with PIN prefix
4. POSTs to Telstra Messaging API with auth token (`TELSTRA_API_TOKEN`)
5. Telstra delivers SMS to device via LTE/satellite
6. Device firmware receives SMS in `CMD_LISTEN` state, validates PIN, executes command, sends response
7. Response SMS goes through webhook → database → realtime → dashboard

**State Management:**

- **Firmware state:** Persisted in RTC RAM (survives deep sleep) and LittleFS (message queue, config)
- **Cloud state:** Authoritative in Supabase (units, events, commands, notifications)
- **Frontend state:** React hooks + Supabase realtime subscriptions; no local API

## Key Abstractions

**Hardware Abstraction Layer (HAL):**
- Purpose: Isolate modem-specific code; allow swapping modems without changing firmware logic
- Examples: `firmware/src/hal/IModem.h` (interface), `firmware/src/hal/modems/EG800Q.h` (active implementation)
- Pattern: Abstract base class with pure virtual methods (init, sendSMS, checkIncomingSMS, getRSSI, getNetworkInfo); ModemFactory returns concrete driver based on `MODEM_MODEL` config

**EventMessage (Firmware):**
- Purpose: Unifies all message types (TRAP, HEALTH, ALERT) and tracks retry state
- Pattern: C++ struct with type, unitId, timestamp, GPS, battery, retry counter; reused in storage queue

**Unit (Frontend):**
- Purpose: Current state snapshot of a trap device
- TypeScript interface: `id`, `name`, `org_id`, `phone_id`, `last_lat`, `last_lng`, `last_seen`, `battery_pct`, `solar_ok`, `armed`
- Location: `frontend/src/lib/types.ts`

**TrapEvent (Frontend):**
- Purpose: Historical record of a device event
- TypeScript interface: `id`, `unit_id`, `event_type` (TRAP/HEALTH/ALERT), `triggered_at`, `trap_caught`, `battery_pct`, `acknowledged`
- Location: `frontend/src/lib/types.ts`

**Organization (Multitenancy):**
- Purpose: Scopes units, events, commands to org owners and members
- Schema: Shared `public.organisations` (owned by WildTrack), org_id FK on units/events/commands/notifications
- RLS functions: `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()` (SECURITY DEFINER)
- Location: `backend/supabase/migrations/002_organizations_and_multitenancy.sql`

## Entry Points

**Device Firmware:**
- Location: `firmware/src/main.cpp`
- Triggers: Power-on, deep sleep wake (trap interrupt, RTC alarm, retry timer)
- Responsibilities: State machine orchestration, wake reason determination, message composition, retry queueing

**Edge Function (SMS Webhook):**
- Location: `backend/supabase/functions/ingest-sms/index.ts`
- Triggers: HTTPS POST from Telstra/Twilio webhook
- Responsibilities: Parse SMS, extract fields, upsert unit state, insert event, publish realtime

**Dashboard (Web):**
- Location: `frontend/src/app/dashboard/page.tsx`
- Triggers: Browser navigation to `/dashboard` (authenticated)
- Responsibilities: List units, subscribe to realtime changes, render map with markers, dispatch commands

**API Routes:**
- `/api/command` → send SMS command to device via Telstra API
- `/api/orgs` (GET) → list user's organizations; (POST) → create new org + units
- `/api/orgs/[orgId]/units` (GET) → list org's units; (POST) → create unit in org
- `/api/notifications` (GET/POST) → push notification subscription

## Error Handling

**Strategy:** Fail-safe defaults; prefer no communication over false certainty.

**Patterns:**

*Firmware:*
- Invalid GPS fix (timeout after 5 min) → send SMS without coordinates
- Modem init failure (e.g., no network) → queue message to LittleFS, retry every 5 min, max 5 retries per message
- Critical battery (< 10%) → send last-gasp alert, force shutdown (no command listen)
- Unrecognized SMS command → silently ignore (no response SMS)

*Backend:*
- Malformed SMS (parser returns null) → store as raw event with raw_sms field (don't reject)
- Timezone parse error → default to UTC
- Supabase insert failure → return 500 error to webhook (Telstra will retry)

*Frontend:*
- Realtime subscription loss → continue showing stale data; show "offline" indicator; attempt to reconnect
- API route failure → show error toast, log to console
- Auth check failure → redirect to `/login`

## Cross-Cutting Concerns

**Logging:**
- Firmware: `Serial.printf()` to UART (line-by-line output, prefixed with [MARKER] tags for test parsing)
- Backend: Deno.env logs (Edge Function output in Supabase logs)
- Frontend: `console.log()` in browser dev tools; no external logging service

**Validation:**
- SMS format: Regex-based in `ingest-sms/index.ts` (matches TRAP/HEALTH/ALERT patterns)
- API inputs: Next.js request validation in each route (schema checks)
- Command authorization: PIN prefix check in firmware (`commands.h`); role-based in frontend RLS functions

**Authentication:**
- Firmware: PIN-based (4-digit prefix on SMS commands; hardcoded in `config.h`)
- Backend: Supabase service role (Edge Functions use service key, never exposed to client)
- Frontend: Supabase Auth with OAuth (magic link or Google); RLS policies checked server-side via `auth.uid()`

---

*Architecture analysis: 2026-03-23*
