# 🪤 Trap Monitor — Start Here

## Open This Project Correctly

**Double-click `trap-monitor.code-workspace`** — this opens all four project folders
in VS Code simultaneously with the correct settings for each.

> If you just open the folder directly, PlatformIO and ESLint won't work properly.

### Key Reference Notes

- [Starlink D2C IoT modem findings (March 2026)](docs/STARLINK_D2C_IOT_MODEM_FINDINGS.md) - verified module list and hardware selection guidance.

---

## First Time Setup (do this once)

### 1. Install VS Code Extensions
When prompted *"Do you want to install the recommended extensions?"* — click **Install All**.

Must-haves:
| Extension | Purpose |
|---|---|
| PlatformIO IDE | Compile + flash firmware to ESP32 |
| Supabase | Manage database locally |
| Prettier | Auto-format code on save |
| Serial Monitor | Debug firmware over USB |

### 2. Configure Your Unit
Open **`firmware/src/config.h`** and set:
```cpp
#define DEFAULT_UNIT_ID    "TRAP_001"       // Unique name for this unit
#define DEFAULT_SMS_NUMBER "+61400000000"   // Your phone number
#define DEFAULT_CMD_PIN    "1234"           // Change from 0000!
```

### 3. Set Environment Variables
Copy `frontend/.env.example` → `frontend/.env.local` and fill in:


### 4. Link Backend to Shared Supabase
This project shares a Supabase database with WildTrack, Fire App, and other Trackline apps on the `landmanager` project:

```bash
cd backend
npx supabase link --project-ref kwmtzwglbaystskubgyt
npx supabase db push
```

This links your development environment to the shared database and applies migrations.

---

## Daily Workflow

### Building & Flashing Firmware
`Ctrl+Shift+P` → **Tasks: Run Task**

| Task | What it does |
|---|---|
| 📟 Firmware: Build | Compile only — check for errors |
| 📟 Firmware: Upload to ESP32 | Compile + flash via USB |
| 📟 Firmware: Serial Monitor | Live debug output at 115200 baud |

### Running the Dashboard
| Task | What it does |
|---|---|
| 🚀 Start Everything | Starts Supabase + Next.js in one shot |
| 🗄️ Backend: Apply DB Migrations | Run after schema changes |
| 🧪 Simulate: Send Test SMS Events | Test dashboard without hardware |

Then open: **http://localhost:3000/dashboard**

---

## Project Layout

```
trap-monitor/
│
├── trap-monitor.code-workspace   ← OPEN THIS IN VS CODE
├── START_HERE.md                 ← you are here
│
├── firmware/                     📟 ESP32-S3 firmware (PlatformIO)
│   └── src/
│       ├── config.h              ← START HERE for hardware config
│       ├── main.cpp              State machine entry point
│       ├── messages.h            SMS formatting
│       ├── storage.h             Message queue + config (LittleFS)
│       ├── commands.h            Inbound SMS command parser
│       ├── power.h               Battery ADC + solar detection
│       ├── leds.h                LED status patterns
│       ├── sensors.h             Expansion sensor reading (ifdef-guarded)
│       ├── gps.h                 u-blox M10 GPS (Serial2, NMEA)
│       └── hal/                  Hardware Abstraction Layer
│           ├── IModem.h          Interface — what every modem must do
│           ├── ModemFactory.h    ← change hardware HERE (one line)
│           └── modems/
│               ├── EG800Q.h     Current: LTE CAT-1bis (Quectel EG800Q-EU)
│               ├── SIM7080G.h   Legacy: NB-IoT/LTE-M (reference only)
│               ├── BG95.h       Stub: Quectel BG95
│               └── RedCap5G.h   Stub: 5G RedCap
│
├── backend/                      🗄️ Supabase (database + API)
│   └── supabase/
│       ├── migrations/
│       │   └── 001_initial_schema.sql   Full DB schema
│       └── functions/
│           └── ingest-sms/
│               └── index.ts     SMS webhook → database parser
│
├── frontend/                     🗺️ Next.js map dashboard
│   ├── .env.example              ← copy to .env.local and fill in
│   └── src/
│       ├── app/dashboard/        Main dashboard page
│       ├── app/api/command/      Send command via SMS API route
│       └── components/map/       Leaflet map with live trap markers
│
└── tools/
    └── simulate-sms.js           Test without hardware
```

---

## Current Hardware

| Component | Module | Notes |
|---|---|---|
| MCU | ESP32-S3-WROOM-1 | 8MB Flash, native USB-C |
| Modem | Quectel EG800Q-EU | LTE CAT-1bis, Band 28 + Band 7 (D2C), single antenna |
| GPS | u-blox M10 | Separate module on Serial2 (9600 baud NMEA), GPIO power-gated |
| RTC | DS3231SN | I2C, CR2032 backup battery |
| Network | Telstra LTE | APN: telstra.m2m |

**Key:** The EG800Q-EU has **no integrated GNSS** — GPS is a separate u-blox M10 module powered via GPIO 6. The M10 is powered off during deep sleep to save current.

## Swapping Hardware (Future-Proof)

To add a brand new modem model:
1. Create `firmware/src/hal/modems/NewChip.h`
2. Implement the ~8 methods from `IModem.h`
3. Add two lines to `ModemFactory.h`
4. Set `#define MODEM_MODEL "NEWCHIP"` in config.h

---

## SMS Quick Reference

| Received SMS | Meaning |
|---|---|
| `TRAP #TRAP_001 \| CAUGHT \| 14/03/26 06:42` | Trap fired |
| `HEALTH #TRAP_001 \| ... \| Bt:78% Sol:OK` | Daily check-in |
| `ALERT #TRAP_001 \| LOW BATT 18%` | Battery warning |

**Send a command** from your phone: `1234 STATUS #TRAP_001`

| Command | Action |
|---|---|
| `PIN STATUS #ID` | Force health report |
| `PIN GPS #ID` | Get current location |
| `PIN ARM #ID` | Enable alerts |
| `PIN DISARM #ID` | Suppress alerts (servicing) |
| `PIN RESET #ID` | Reboot unit |
| `PIN SETGPS 100 #ID` | Set movement threshold to 100m |
