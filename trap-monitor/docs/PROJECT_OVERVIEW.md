# Trap Monitor — Project Overview

**Version:** 1.0.0
**Date:** March 2026
**Status:** Working prototype — firmware functional, backend and dashboard operational

---

## What It Does

A remote animal trap monitoring system for the Australian bush. Solar-powered trap units send SMS alerts when triggered, report daily health status, and accept remote commands — all viewable on a real-time web dashboard with mapping.

---

## Hardware Platform

For current satellite modem research and verified D2C-compatible module options, see [STARLINK_D2C_IOT_MODEM_FINDINGS.md](STARLINK_D2C_IOT_MODEM_FINDINGS.md).

| Component | Part | Notes |
|-----------|------|-------|
| MCU | ESP32-S3-WROOM-1-N8 | 8MB Flash, USB-C, deep sleep capable |
| Modem | Quectel EG800Q-EU | LTE CAT-1bis, Band 28 (700 MHz AU) + Band 7 (D2C satellite) |
| GPS | u-blox M10 | Standalone, NMEA @ 9600 baud, power-gated |
| RTC | DS3231SN | I2C, CR2032 backup, survives deep sleep |
| Battery | LiFePO4 2S (6.4V nominal) | 4 pack profiles supported (LiFePO4, Li-ion, primary cells) |
| Solar | Charging via current-sense ADC | Detects charge state, reported in health SMS |
| Trigger | Reed switch (NC) on GPIO 4 | Interrupt wakes from deep sleep |
| LEDs | 3× status (green, amber, red) | Boot, network, trap, error patterns |

**Optional expansion headers** (all compile-time gated, disabled by default):
- I2C temp/humidity (BME280)
- 1-Wire temperature (DS18B20)
- Analog: soil moisture, water level, flow pulse
- Secondary trigger, UART device

---

## Firmware (C++ / PlatformIO) — ~85% Complete

### State Machine

```
WAKE_ASSESS → COMPOSE_MSG → GPS_CHECK → MODEM_INIT → SEND_MSG → CMD_LISTEN → MODEM_OFF → DEEP_SLEEP
```

Every wake cycle runs through these states and returns to deep sleep. Battery life is the primary design constraint.

### Wake Reasons

| Reason | Trigger |
|--------|---------|
| WAKE_TRAP | Reed switch GPIO interrupt (highest priority) |
| WAKE_RTC_HEALTH | RTC alarm at configured daily hour |
| WAKE_RTC_RETRY | Queued messages pending (5-min retry interval) |
| WAKE_BOOT | Power-on / reset |

### Key Modules

| File | Purpose |
|------|---------|
| `main.cpp` | State machine orchestration (~487 lines) |
| `config.h` | All tunable parameters — pin assignments, thresholds, timing, battery profiles |
| `messages.h` | SMS composition — TRAP, HEALTH, ALERT formats (160-char limit enforced) |
| `commands.h` | Inbound SMS command parser — 9 commands with 4-digit PIN security |
| `storage.h` | LittleFS persistence — config + message queue (max 50, 5 retries each) |
| `power.h` | Battery SOC (pack-level linear model) + solar detection |
| `gps.h` | u-blox M10 driver — fix acquisition, haversine distance, stale marking |
| `leds.h` | Visual status patterns (blocking) |
| `sensors.h` | Optional expansion sensor reads (ifdef-gated) |

### Modem Hardware Abstraction Layer

All drivers implement `IModem.h` interface. `ModemFactory.h` selects the active driver — no modem-specific code in the main loop.

| Driver | Status |
|--------|--------|
| `EG800Q.h` | **Production-ready** — full AT command implementation |
| `SIM7080G.h` | Stub (NB-IoT/LTE-M, ready to implement) |
| `BG95.h` | Stub (Quectel BG95-M3, ready to implement) |
| `RedCap5G.h` | Future stub (est. 2026–2028) |

### SMS Formats

```
TRAP:   TRAP #UNIT | CAUGHT | DD/MM/YY HH:MM [| GPS lat,lng]
HEALTH: HEALTH #UNIT | DD/MM/YY HH:MM | Bt:NN% Sol:OK FW:x.x | EMPTY/CAUGHT
ALERT:  ALERT #UNIT | LOW BATT NN% | Solar:OK | timestamp
```

### Remote Commands (PIN-protected)

STATUS, GPS, ARM, DISARM, RESET, SETGPS, SETHOUR, SETPIN, QUEUE, VERSION

---

## Backend (Supabase / Deno) — ~90% Complete

### Database Tables

| Table | Purpose |
|-------|---------|
| `units` | Current state per trap unit (upserted on every inbound SMS) |
| `events` | Append-only event history (never updated/deleted — audit trail) |
| `commands` | Outbound command log |
| `notifications` | Alert delivery tracking |

- PostGIS enabled for spatial queries
- Row-Level Security enforced on all tables
- Realtime subscriptions enabled on `events` and `units`

### Edge Function: `ingest-sms`

Stateless webhook handler (199 lines, TypeScript/Deno):
1. Receives POST from Telstra Messaging API or Twilio
2. Parses SMS text via regex into structured data
3. Upserts unit state + inserts event row
4. Unknown formats logged as raw events (no data loss)

---

## Frontend (Next.js 15 / React 18 / Tailwind / Leaflet) — ~75% Complete

### Dashboard

Split-view layout: unit list sidebar + interactive Leaflet map.

**Features implemented:**
- Realtime updates via Supabase WebSocket subscriptions
- Map markers with status-coloured icons (red=caught, green=normal, gray=offline, amber=low battery, purple=disarmed)
- Unit selection → map pan + popup
- Command buttons (STATUS, GPS, ARM, DISARM)
- Event acknowledgment for caught traps
- Relative time formatting
- Dark theme (Tailwind)

### Command API

Server-side route (`/api/command`) constructs PIN-prefixed SMS and sends via Telstra Messaging API.

---

## Data Flow

### Device → Dashboard
```
Trap wakes → SMS via EG800Q → Telstra LTE → Webhook → Edge Function → Supabase → Realtime → Dashboard
```

### Dashboard → Device
```
User clicks command → POST /api/command → Telstra SMS API → Device receives during CMD_LISTEN window
```

---

## What's Not Yet Done

### Firmware
- Other modem drivers (SIM7080G, BG95) are stubs only
- Sensor expansion defined but not enabled
- No OTA firmware update mechanism
- No multi-unit coordination

### Backend
- No async notification system (email/push alerts to operators)
- No operator profiles or access control beyond Supabase auth

### Frontend
- No multi-unit filters or bulk operations
- No historical analytics or charts
- No operator audit log
- No mobile-responsive layout optimisation

---

## Key Design Decisions

1. **SMS as primary transport** — works everywhere with cellular coverage, no IP stack needed, 160-char single-part messages
2. **Deep sleep default** — all cycles return to sleep, power-gated peripherals, battery-first design
3. **Modem HAL** — swap modem hardware by changing one config constant and recompiling
4. **Append-only events** — full audit trail, raw SMS preserved for debugging
5. **All config in one file** — `config.h` holds every tunable parameter, no scattered magic numbers
6. **LittleFS persistence** — config + message queue survive deep sleep and power loss

---

## Repository Structure

```
firmware/           ESP32 PlatformIO project
  src/
    main.cpp        State machine
    config.h        All parameters
    messages.h      SMS composition
    commands.h      Command parser
    storage.h       LittleFS persistence
    power.h         Battery + solar
    gps.h           GNSS driver
    leds.h          Status LEDs
    sensors.h       Expansion sensors
    hal/
      IModem.h      Modem interface
      ModemFactory.h  Driver selection
      modems/       EG800Q, SIM7080G, BG95, RedCap5G

backend/            Supabase project
  supabase/
    migrations/     Schema SQL
    functions/
      ingest-sms/   Webhook handler

frontend/           Next.js 15 app
  src/
    app/
      dashboard/    Main dashboard page
      api/command/  SMS command route
    components/
      map/          Leaflet map component
```

---

## Git History

| Commit | Description |
|--------|-------------|
| `a6a4e6a` | Initial commit — full project bootstrap |
| `11d632f` | Harden firmware retries and add debug markers |
