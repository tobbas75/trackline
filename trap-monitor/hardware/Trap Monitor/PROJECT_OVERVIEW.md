# Project Overview — Remote Trap Monitor

> One-page summary for freelance applicants. Full specs in the attached files.

---

## What It Does

A solar-powered IoT device that monitors animal traps in remote Australian bush. It sleeps on ~84µA, wakes when a trap triggers (reed switch), grabs a GPS fix, sends an SMS alert via LTE, then sleeps again. Daily health checks report battery, solar, and status.

## System Diagram

```
Reed Switch (trap) ──► ESP32-S3 ──UART──► EG800Q-EU (LTE modem) ──SMS──► Cloud/Dashboard
                           │
                           ├──UART──► u-blox M10 (GPS)
                           ├──I2C───► DS3231 (RTC)
                           └──ADC───► Battery + Solar sense

Power: 2S LiFePO4 (6.4V) ──► HT7333 LDO (3.3V → MCU/GPS/RTC)
                            └► AP63300 Buck (3.8V → Modem VBAT)
                            └► CN3767 MPPT (12V solar → battery charge)
```

## Key Components

| Component | Part | Interface | Power |
|-----------|------|-----------|-------|
| MCU | ESP32-S3-WROOM-1-N8 | USB-C, I2C, 2× UART | 3.3V |
| LTE Modem | Quectel EG800Q-EU | UART @ 115200 (via 3.3V↔1.8V level shift) | 3.8V (AP63300 buck) |
| GPS | u-blox MAX-M10S | UART @ 9600 | 3.3V (GPIO power-gated) |
| RTC | DS3231SN | I2C | 3.3V + CR2032 backup |

## What You're Designing (Phase 1)

A **carrier/integration board** that connects these components with the correct power rails, level translation, and signal routing. Dev modules on a carrier PCB are fine — we're optimising for speed and cost, not size.

**Scope:** Design files (schematic, Gerbers, BOM). Optionally, build 3–5 prototype boards — please quote separately. Production runs (Phase 2) go to a dedicated fab house.

## Critical Constraints

1. **GPIO pin map is locked** — firmware is compiled against exact pin numbers (see `config.h`)
2. **Modem VBAT must be 3.3–4.3V** — battery is 6.4V, so a buck converter is required (not LDO)
3. **Level translation required** — ESP32 is 3.3V, modem is 1.8V (4 lines)
4. **Two separate antennas** — cellular (EG800Q-EU) and GNSS (M10) on opposite board edges
5. **Deep sleep current < 100µA** — every component must be power-gated or ultra-low Iq

## Files Provided

| File | Contents |
|------|----------|
| `PCB_DESIGN_BRIEF.md` | Full design brief — pin tables, power architecture, connectors, design notes |
| `DESIGN_SPEC.md` | Detailed schematic netlist — every connection, every component, layout constraints |
| `BOM_PCB.csv` | Complete BOM with LCSC part numbers |
| `config.h` | Firmware GPIO definitions — the authoritative pin map |
| `HARDWARE_DESIGN_BRIEF.md` | Higher-level hardware overview and mechanical notes |

## Deliverables

**Design files (required):**
1. Schematic (PDF + editable source)
2. PCB layout + Gerbers
3. BOM + pick-and-place file (JLCPCB/PCBWAY format)
4. 3D render
5. Confirmation GPIO pin map matches `config.h`

**Prototype build (optional — quote separately):**
6. 3–5 assembled boards
7. Basic test (power-on, modem reg, GPS fix, deep sleep current, trigger wake)

## Phase 2 (Future)

After field testing, we'll engage for a fully integrated production PCB — proper RF, antenna matching, size optimisation, DFM. Estimated 50–100 units, fabricated by a dedicated fab house (JLCPCB/PCBWAY).
