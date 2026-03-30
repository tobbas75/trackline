# Repository Map — Trap Monitor

This file gives AI agents a quick map of the repository layout.

# Root Directories

- `firmware/` — ESP32-S3 microcontroller firmware (C++ / PlatformIO)
- `backend/` — Supabase database schema + Edge Functions (TypeScript / Deno)
- `frontend/` — Next.js dashboard with map view (React / Tailwind / Leaflet)
- `tools/` — Development utilities (SMS simulator)
- `.vscode/` — Editor config, tasks, launch configs

# Firmware Layout

```
firmware/
├── platformio.ini              Build config + library dependencies
└── src/
    ├── main.cpp                State machine entry point (8 states)
    ├── config.h                All tunable parameters + pin assignments
    ├── messages.h              SMS composition + formatting
    ├── commands.h              Inbound SMS command parser (PIN + 9 commands)
    ├── gps.h                   GNSS fix + movement detection
    ├── power.h                 Battery ADC + solar charge detection
    ├── storage.h               LittleFS config persistence + message queue
    ├── leds.h                  LED status patterns (3 LEDs)
    └── hal/                    Hardware Abstraction Layer
        ├── IModem.h            Interface — all modem drivers implement this
        ├── ModemFactory.h      Returns driver based on MODEM_MODEL config
        └── modems/
            ├── EG800Q.h        Active: Quectel EG800Q-EU LTE CAT-1bis (D2C)
            ├── SIM7080G.h      Legacy: NB-IoT/LTE-M (reference only)
            ├── BG95.h          Stub: Quectel BG95 (not implemented)
            └── RedCap5G.h      Future: 5G RedCap stub
```

# Backend Layout

```
backend/
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql    Full DB schema (units, events, commands, notifications)
    └── functions/
        └── ingest-sms/
            └── index.ts              SMS webhook → parse → upsert unit → insert event
```

# Frontend Layout

```
frontend/
├── .env.example                      Copy to .env.local — Supabase keys + Telstra token
└── src/
    ├── app/
    │   ├── dashboard/page.tsx        Main dashboard (sidebar + map split view)
    │   └── api/command/route.ts      API route: send command via Telstra SMS API
    └── components/
        └── map/MapView.tsx           Leaflet map with colored trap markers + popups
```

# Tools

```
tools/
└── simulate-sms.js                   Send test SMS payloads to local Edge Function
```

# Sensitive Areas

Changes here require extra care and impact scanning:

- **`firmware/src/config.h`** — all firmware modules depend on this
- **`firmware/src/hal/IModem.h`** — interface contract for all modem drivers
- **SMS format strings** (`messages.h` ↔ `ingest-sms/index.ts`) — must stay in sync
- **Database schema** (`001_initial_schema.sql`) — affects Edge Function + frontend queries
- **RLS policies** in schema — security boundary for data access
- **`frontend/src/app/api/command/route.ts`** — sends SMS commands, handles Telstra API auth
- **PIN validation** (`commands.h`) — security gate for all inbound commands

# Entry Points

| Task | Start Here |
|------|-----------|
| Firmware development | `firmware/src/main.cpp` + `config.h` |
| Add new modem driver | `firmware/src/hal/IModem.h` → create `modems/NewChip.h` → update `ModemFactory.h` |
| Modify SMS format | `firmware/src/messages.h` AND `backend/supabase/functions/ingest-sms/index.ts` |
| Database changes | `backend/supabase/migrations/` (create new migration file) |
| Dashboard features | `frontend/src/app/dashboard/page.tsx` |
| Map changes | `frontend/src/components/map/MapView.tsx` |
| Add API route | `frontend/src/app/api/` |
| Test without hardware | `tools/simulate-sms.js` |

# Common Edit Paths

- **New SMS message type** → `messages.h` (compose) + `ingest-sms/index.ts` (parse) + `dashboard/page.tsx` (display) + migration (if new columns)
- **New command** → `commands.h` (parse + execute) + `dashboard/page.tsx` (UI button) + `DOMAIN_RULES.md` (document)
- **New modem** → create `hal/modems/NewChip.h` implementing `IModem.h` + add to `ModemFactory.h` + add model to `config.h`
- **Dashboard bug** → `dashboard/page.tsx` + `MapView.tsx` + check Supabase subscription setup
- **SMS parsing bug** → `ingest-sms/index.ts` + test with `simulate-sms.js`
- **Power/battery issue** → `power.h` + `config.h` thresholds + `messages.h` (alert formatting)
