# Remote Trap Monitoring System

SMS-based animal trap alert system with GPS, solar power, and Telstra LTE CAT-1bis network.

---

## Project Structure

```
trap-monitor/
├── firmware/          # ESP32-S3 Arduino firmware (PlatformIO)
│   ├── src/
│   │   ├── main.cpp       # State machine — entry point
│   │   ├── config.h       # All tunable parameters
│   │   ├── messages.h     # SMS composition + formatting
│   │   ├── gps.h          # u-blox M10 GPS (Serial2, NMEA)
│   │   ├── power.h        # Battery ADC + solar detection
│   │   ├── storage.h      # LittleFS config + message queue
│   │   ├── commands.h     # Inbound SMS command parser
│   │   ├── sensors.h      # Expansion sensor reading (ifdef-guarded)
│   │   ├── leds.h         # LED status indicators
│   │   └── hal/           # Hardware Abstraction Layer
│   │       ├── IModem.h       # Interface
│   │       ├── ModemFactory.h # Modem selection (one line)
│   │       └── modems/
│   │           ├── EG800Q.h   # Current: LTE CAT-1bis
│   │           └── SIM7080G.h # Legacy: NB-IoT (reference)
│   └── platformio.ini     # Build config + library deps
│
├── hardware/              # PCB design package for JLCPCB
│   ├── PCB_DESIGN_SPEC.md
│   ├── BOM_JLCPCB.csv
│   └── PCB_DESIGN_BRIEF.md
│
├── backend/
│   └── supabase/
│       ├── migrations/
│       │   └── 001_initial_schema.sql   # Full DB schema
│       └── functions/
│           └── ingest-sms/
│               └── index.ts             # SMS webhook → database
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/page.tsx       # Main dashboard
│       │   └── api/command/route.ts     # Send command API
│       └── components/
│           └── map/MapView.tsx          # Leaflet map component
│
├── tools/
│   └── simulate-sms.js    # Test SMS ingestion without hardware
│
└── archive/               # Superseded spec documents
```

---

## Hardware

| Component | Module | Interface | Notes |
|---|---|---|---|
| MCU | ESP32-S3-WROOM-1-N8 | — | 8MB Flash, native USB-C |
| Modem | Quectel EG800Q-EU | UART (Serial1) | LTE CAT-1bis, Band 28 + Band 7 (D2C), single antenna |
| GPS | u-blox M10 | UART (Serial2) | Separate module, NMEA @ 9600 baud, GPIO power-gated |
| RTC | DS3231SN | I2C | CR2032 backup battery |
| Battery | LiFePO4 2S (Pack A) | ADC | 6.4V nom + solar MPPT charger |

---

## Hardware Wiring

| ESP32-S3 Pin | Connected To |
|---|---|
| GPIO 4  | Reed switch (NC) — one end. Other end to GND |
| GPIO 17 | EG800Q-EU UART RXD |
| GPIO 18 | EG800Q-EU UART TXD |
| GPIO 5  | EG800Q-EU PWRKEY |
| GPIO 7  | EG800Q-EU RESET_N (active LOW) |
| GPIO 15 | u-blox M10 RXD (ESP32 TX) |
| GPIO 16 | u-blox M10 TXD (ESP32 RX) |
| GPIO 6  | u-blox M10 VCC enable (HIGH = powered) |
| GPIO 1  | Solar sense ADC (via current sense resistor) |
| GPIO 2  | Battery ADC (via 100k/100k voltage divider) |
| GPIO 8  | RTC DS3231 SDA |
| GPIO 9  | RTC DS3231 SCL |
| GPIO 38 | LED Green (+ 220R to GND) |
| GPIO 39 | LED Amber (+ 220R to GND) |
| GPIO 40 | LED Red (+ 220R to GND) |

---

## Quick Start

### 1. Install Recommended Extensions

Open the project in VS Code — you'll be prompted to install recommended extensions. Accept all.

Key extensions:
- **PlatformIO IDE** — firmware build + upload
- **Supabase** — database management
- **Prettier** — code formatting
- **Serial Monitor** — debug firmware via USB

---

### 2. Firmware Setup

```bash
cd firmware

# Install PlatformIO CLI if not already installed
pip install platformio

# Install library dependencies
pio lib install

# Edit src/config.h — set your unit ID, SMS number, etc.
```

**Edit `firmware/src/config.h`:**
- Set `DEFAULT_UNIT_ID` — unique name for this unit (e.g. `"TRAP_001"`)
- Set `DEFAULT_SMS_NUMBER` — your phone number with country code
- Set `DEFAULT_CMD_PIN` — 4-digit PIN for inbound commands (change from 0000!)

**Build and upload:**

Use VS Code Tasks (`Ctrl+Shift+P` → `Tasks: Run Task`):
- `Firmware: Build (PlatformIO)` — compile only
- `Firmware: Upload to ESP32` — compile + flash
- `Firmware: Serial Monitor` — open serial console at 115200 baud

Or via terminal:
```bash
cd firmware
pio run --target upload
pio device monitor --baud 115200
```

---

### 3. Backend Setup (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

cd backend

# Start local Supabase instance (requires Docker)
npx supabase start

# Apply database schema
npx supabase db push

# Deploy Edge Function
npx supabase functions deploy ingest-sms
```

**Configure Telstra Messaging API webhook:**

Set the inbound SMS webhook URL in your Telstra portal to:
```
https://[your-project].supabase.co/functions/v1/ingest-sms
```

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env.local

# Start dev server (runs on port 3002)
npm run dev
```

Open `http://localhost:3002/dashboard`

**Authentication:** The frontend uses Supabase Auth with the shared Trackline project. Users must have `trap_monitor` app access granted via the portal. The dashboard automatically:
- Redirects to `/login` if not authenticated
- Checks `portal.check_app_access('trap_monitor')` RPC
- Redirects to `/no-access` if access denied

**Required environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — shared Trackline Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only)
- `NEXT_PUBLIC_APP_URL` — app base URL (http://localhost:3002 for dev)
- `TELSTRA_API_TOKEN`, `TELSTRA_CLIENT_ID`, `TELSTRA_CLIENT_SECRET` — Telstra API credentials
- `DEFAULT_CMD_PIN` — matches firmware PIN for command validation

---

### 5. Test Without Hardware

```bash
# Simulate incoming trap SMS events
node tools/simulate-sms.js
```

This sends realistic test messages to your local Edge Function so you can develop
the dashboard without needing physical hardware.

---

## SMS Format Reference

| Message | Format |
|---|---|
| Trap alert | `TRAP #UNIT_ID \| CAUGHT \| DD/MM/YY HH:MM` |
| Trap + GPS | `TRAP #UNIT_ID \| CAUGHT \| timestamp \| GPS lat,lng` |
| Daily health | `HEALTH #UNIT_ID \| timestamp \| Bt:NN% Sol:OK FW:x.x \| EMPTY/CAUGHT` |
| Low battery | `ALERT #UNIT_ID \| LOW BATT NN% \| Solar:OK \| timestamp` |
| Critical | `ALERT #UNIT_ID \| CRIT BATT NN% SHUTTING DOWN \| timestamp` |

---

## Two-Way Commands

Send from your phone: `PIN COMMAND #UNIT_ID`

| Command | Example | Action |
|---|---|---|
| STATUS | `1234 STATUS #TRAP_001` | Force health report |
| GPS | `1234 GPS #TRAP_001` | Get current GPS fix |
| ARM | `1234 ARM #TRAP_001` | Enable trap alerts |
| DISARM | `1234 DISARM #TRAP_001` | Suppress alerts |
| RESET | `1234 RESET #TRAP_001` | Reboot MCU |
| SETGPS 100 | `1234 SETGPS 100 #TRAP_001` | Set GPS threshold to 100m |
| SETHOUR 18 | `1234 SETHOUR 18 #TRAP_001` | Set health check to 6pm |
| QUEUE | `1234 QUEUE #TRAP_001` | Check unsent message count |
| VERSION | `1234 VERSION #TRAP_001` | Get firmware version |

---

## Network Configuration

**Telstra LTE SIM setup:**
- APN: `telstra.m2m`
- Band: 28 (700MHz) + Band 7 (D2C satellite)
- Mode: LTE CAT-1bis (Quectel EG800Q-EU)

**For international deployments:**
- Replace Telstra SIM with Eseye or 1NCE multi-network IoT SIM
- Same hardware — no changes required

---

## Deployment Checklist

- [ ] Select battery pack in config.h (`BATTERY_PACK_A`-`D`) — Pack A default, Pack D for primary cells (no solar)
- [ ] Set unique `DEFAULT_UNIT_ID` in config.h for each unit
- [ ] Set `DEFAULT_SMS_NUMBER` to your alert recipient
- [ ] Change `DEFAULT_CMD_PIN` from 0000 to something secure
- [ ] Confirm LTE registration on serial monitor before sealing enclosure
- [ ] Test two-way comms: send `PIN STATUS #UNIT_ID` from your phone
- [ ] Verify daily health check time is correct for your timezone
- [ ] Confirm GPS fix acquired (trigger `GPS` command)
- [ ] Check battery% reads correctly on first health check

---

## AI Development Instructions

AI agents (Claude Code, GitHub Copilot) should read these files before making changes:

- `CLAUDE.md` — project working instructions and critical security rules
- `ARCHITECTURE.md` — system structure and layer boundaries
- `DOMAIN_RULES.md` — business invariants, SMS formats, state machine rules
- `REPO_MAP.md` — folder layout and sensitive areas

Global behaviour rules: `C:\Users\tobyw\OneDrive\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

---

## Contributing

This is a working prototype specification. All modules are designed to be
extended independently — the firmware, backend, and frontend are fully decoupled.

Pull requests welcome. Test with `node tools/simulate-sms.js` before submitting.
