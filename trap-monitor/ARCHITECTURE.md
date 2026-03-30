# System Architecture — Trap Monitor

This document describes the structure of the system.

Agents must respect this architecture.

# Core Principles

- clear separation of responsibilities (firmware / backend / frontend)
- predictable data flow: device SMS → webhook → database → realtime dashboard
- minimal coupling between layers — each is independently deployable
- explicit validation at boundaries (SMS parsing, API inputs, command authentication)
- battery-first firmware design — deep sleep is the default state

# System Layers

```
┌──────────────────────────────────────────────────────────────┐
│  ESP32-S3 Firmware (C++ / PlatformIO)                        │
│  State machine: WAKE → COMPOSE → GPS → MODEM → SEND → SLEEP │
│  Sends/receives SMS via EG800Q-EU modem (LTE CAT-1bis)       │
│  GPS via standalone u-blox M10 on Serial2 (NMEA)             │
└────────────────────────┬─────────────────────────────────────┘
                         │ SMS (Telstra LTE CAT-1bis / Starlink D2C)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Telstra Messaging API / Twilio                              │
│  Webhook forwards inbound SMS to Edge Function               │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase Edge Function (Deno / TypeScript)                  │
│  ingest-sms: parses SMS → upserts unit → inserts event       │
└────────────────────────┬─────────────────────────────────────┘
                         │ PostgreSQL + PostGIS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase Database (PostgreSQL)                              │
│  Tables: units, events, commands, notifications              │
│  RLS enforced, realtime subscriptions enabled                │
└────────────────────────┬─────────────────────────────────────┘
                         │ Supabase Realtime
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js Frontend (React / Tailwind / Leaflet)               │
│  Dashboard: unit list + event feed + interactive map         │
│  Sends commands via /api/command → Telstra API → SMS to unit │
└──────────────────────────────────────────────────────────────┘
```

# Firmware Architecture

## State Machine (8 states)

```
WAKE_ASSESS → COMPOSE_MSG → GPS_CHECK → MODEM_INIT → SEND_MSG → CMD_LISTEN → MODEM_OFF → DEEP_SLEEP
```

- Wake reasons: trap trigger (reed switch GPIO interrupt), RTC health check, retry, boot
- Each state has clear entry/exit conditions
- Failure in any state → queue message for retry → sleep

## Hardware Abstraction Layer (HAL)

```
firmware/src/hal/
├── IModem.h           — Interface all modem drivers implement
├── ModemFactory.h     — Returns correct driver based on MODEM_MODEL config
└── modems/
    ├── EG800Q.h       — Active: Quectel EG800Q-EU (LTE CAT-1bis, QCX216, D2C approved)
    ├── SIM7080G.h     — Legacy reference: NB-IoT / LTE-M (not D2C compatible)
    ├── BG95.h         — Stub: Quectel BG95
    └── RedCap5G.h     — Stub: Future 5G RedCap
```

GPS is **not** integrated in the modem. A standalone u-blox M10 module on Serial2
provides NMEA positioning, power-gated via GPIO for deep sleep current savings.

To swap modem hardware: change `MODEM_MODEL` in `config.h` — no other code changes needed.

## Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `main.cpp` | State machine orchestration | All modules |
| `config.h` | All tunable parameters | None |
| `messages.h` | SMS composition + formatting | `config.h`, `power.h`, `gps.h` |
| `modem.h` / HAL | AT command communication | `config.h` |
| `gps.h` | u-blox M10 NMEA fix + movement detection (Serial2) | `config.h` |
| `power.h` | Battery ADC + solar sensing | `config.h` |
| `storage.h` | LittleFS config + message queue | `config.h` |
| `commands.h` | Inbound SMS command parser | `config.h`, `storage.h` |
| `leds.h` | LED status patterns | `config.h` |

# Backend Architecture

## Edge Function: `ingest-sms`
- Stateless POST handler
- Parses SMS body → extracts unit ID, event type, GPS, battery, solar
- Upserts `units` table with latest device state
- Inserts `events` row for history
- Returns `{ ok, eventId }` or error

## Database Schema (PostGIS)

| Table | Purpose |
|-------|---------|
| `units` | Current state of each trap unit (last seen, battery, GPS, armed status) |
| `events` | Full event history (trap alerts, health checks, battery warnings) |
| `commands` | Log of commands sent to units via SMS |
| `notifications` | Delivery tracking for alerts sent to operators |

RLS policies: service role can INSERT, authenticated users can SELECT + INSERT commands.

# Frontend Architecture

## App Router Structure

```
frontend/src/
├── app/
│   ├── dashboard/page.tsx    — Main dashboard (sidebar + map split)
│   └── api/command/route.ts  — API route: send command via Telstra SMS API
└── components/
    └── map/MapView.tsx       — Leaflet map with trap markers + popups
```

## Data Flow
- Supabase realtime subscriptions push unit + event changes
- Dashboard re-renders on subscription events
- Commands: UI → `/api/command` → Telstra API → SMS → device

# Shared Surfaces

Changes here require impact scanning:

- `firmware/src/config.h` — affects all firmware modules
- `firmware/src/hal/IModem.h` — affects all modem drivers
- SMS format strings in `messages.h` — must match parser in `ingest-sms/index.ts`
- Database schema (`001_initial_schema.sql`) — affects Edge Function + frontend queries
- TypeScript interfaces in `dashboard/page.tsx` (Unit, TrapEvent types)

# Integration Points

| Integration | Protocol | Notes |
|-------------|----------|-------|
| Device → Telstra | LTE CAT-1bis SMS | Band 28 (700MHz AU) + Band 7 (D2C satellite), APN: telstra.m2m |
| Telstra → Supabase | HTTPS webhook | POST to Edge Function URL |
| Frontend → Supabase | HTTPS + WebSocket | Supabase JS client + realtime |
| Frontend → Telstra | HTTPS via API route | POST to Telstra Messaging API |
