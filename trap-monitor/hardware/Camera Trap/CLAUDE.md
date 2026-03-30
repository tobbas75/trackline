# Between 23° AI Camera Trap

## What This Is

Edge AI wildlife camera trap for remote tropical Australia. Captures 10-frame 4K bursts on PIR trigger, runs on-device species classification (MegaDetector v5 + Addax AWC 135 Australian species), sends LTE-M alerts with thumbnail on confirmed detection. Designed for deployment on Aboriginal lands (Tiwi Islands, Arnhem Land), pastoral stations, and conservation reserves.

Part of the Between 23° field monitoring platform. The other product in the family is the **Trap Monitor** (separate repo) — a simpler IoT device that detects trap triggers and sends SMS alerts. The two products share a modem daughter card interface, GPS module, firmware comms layer, and WildTrack backend API. They do NOT share an enclosure — different deployment contexts require different form factors.

## Hardware Stack

| Component | Part | Role |
|-----------|------|------|
| Main MCU | STM32N657X0H3Q | Cortex-M55 @ 800MHz, 600 GOPS NPU, HW ISP/JPEG, MIPI CSI-2 |
| Power Controller | STM32U083KCU6 | Cortex-M0+, sleep/wake state machine, PIR aggregation |
| Image Sensor | Sony IMX678 (STARVIS 2) | 8MP 4K, 2×2 binning for night, NIR to ~1000nm. AVDD=3.3V, DVDD=1.1V, DOVDD=1.8V. |
| PSRAM | APS256XXN-OB9-BG (32MB, **1.8V**) | Frame buffer via XSPI1 HexaSPI x16 DDR 250MHz. Same part family as STM32N6570-DK. |
| NOR Flash | W25Q128JV (16MB) + W25Q256JV (32MB) | Firmware/models + metadata/config |
| SD Card | µSD via SDMMC 4-bit | 128/256 GB image storage |
| Modem | Quectel EG800Q-EU on daughter card | CAT-1bis, shared interface with Trap Monitor |
| GPS | u-blox MAX-M10S | Same module as Trap Monitor, power-gated |
| PIR | 2× Panasonic EKMB1303112K | 1µA each, digital output to STM32U0 |
| IR LEDs | Modular daughter board (JST GH 4-pin), SFH 4725AS A01 940nm | Strobed sync to sensor exposure, field-swappable. 950nm peak/940nm nominal covert (no glow). 80° beam, 760 mW/sr at 1A. |
| Comms Processor | ESP32-C3-MINI-1U | WiFi AP (image offload) + BLE (config) + display + buttons |
| Display | SSD1306 0.96" OLED 128×64 (DNP Rev A) | Settings/status display, owned by C3 via I2C |
| Battery | 12 AA NiMH (6S2P, 7.2V nom, 4000mAh) via snap-on backpack | Standard / Field Station / Li-ion Solar / Extender backpacks. No solar on main board. |

## Key Design Decisions

- **STM32N6 now, Alif E8 later.** E8 (dual MIPI CSI-2, Ethos-U85, 1.3µA STOP) ships when available (est. late 2026). Same modem card, same LED module, new main board only.
- **Always capture at 4K.** ISP downscales thumbnail for AI. Full 4K in PSRAM awaiting AI verdict.
- **3-frame inference** (frames 2, 5, 8) for robustness. Highest confidence across 3 frames determines classification.
- **Strobed IR** via hardware timer (TIM1) gated to MIPI frame-valid. 300ms on-time vs 1500ms continuous = 80% energy reduction.
- **Modular LED daughter board.** 4 Phase 1 variants (940nm std, 940nm long range, white flash, blank) + 2 reserved IDs (850nm research, 940nm super long). Auto-detected via ID resistor at boot.
- **Shared modem daughter card** with Trap Monitor. Same 20-pin connector, same EG800Q-EU, same BSS138 level shifting. 5G D2C upgrade is a card swap.
- **Three operating modes:** Validation (store everything, build trust), Production (species only + audit trail), Research (everything + full AI telemetry for Addax retraining).
- **Enclosure is purpose-built for camera deployment** — tree/post mount, IR window, lens port, python strap. NOT the same enclosure as the Trap Monitor.

## Directory Structure

```
hardware/Camera Trap/
├── CLAUDE.md                      ← You are here
├── REVIEW_GUIDE.md                # START HERE for external reviewers
├── SCHEMATIC_CHANGES_V1.2.md      # All corrections from V1.1/V1.2 hardware review
├── DESIGN_SPEC.md                 # Full schematic netlist — every pin, every value
├── HARDWARE_DESIGN_BRIEF.md       # PCB designer handoff — system overview
├── BOM.csv                        # Complete BOM with verified part numbers
├── POWER_BUDGET.md                # Daily energy budget, all 3 operating modes
├── POWER_SYSTEM_REVIEW.md         # Deep dive on power architecture philosophy
├── LED_MODULE_SPEC.md             # IR illumination daughter board
├── MODEM_INTERFACE_SPEC.md        # Shared modem daughter card (both products)
├── COMMS_ARCHITECTURE.md          # Cellular, WiFi, BLE, QR registration
├── COMPETITIVE_BENCHMARK.md       # Market analysis (business-sensitive)
├── DEVELOPMENT_COSTS.md           # Cost analysis (business-sensitive)
├── FREELANCER_BRIEF.md            # PCB contractor brief (business-sensitive)
├── dashboard.html                 # Interactive business dashboard
│
├── datasheets/                    # ** COMPONENT REFERENCE LIBRARY **
│   ├── INDEX.md                   # Master index — start here. Links to all files + open issues.
│   ├── STM32N657X0H3Q.md          # Main MCU (368 lines)
│   ├── STM32U083KCU6.md           # Power controller MCU
│   ├── ESP32-C3-MINI-1U.md        # WiFi/BLE comms processor
│   ├── IMX678.md                  # Image sensor (NDA required for full specs)
│   ├── SiT8008.md                 # 24MHz MEMS oscillator
│   ├── APS256XXN-OB9-BG.md        # 32MB PSRAM
│   ├── W25Q128JVSIQ.md            # 16MB NOR flash
│   ├── W25Q256JVEIQ.md            # 32MB NOR flash
│   ├── EG800Q-EU.md               # LTE modem (local PDFs in hardware/Trap Monitor/)
│   ├── MAX-M10S.md                # GNSS module
│   ├── TPS62088.md                # VDDCORE + DVDD buck converter
│   ├── TPS7A02.md                 # 1.8V LDO
│   ├── AP63300.md                 # 3.3V/3.8V/5.0V buck (3 instances)
│   ├── SI2301CDS.md               # P-FET power gates
│   ├── BSS138.md                  # I2C level shifter + gate inverter
│   ├── SS34.md                    # Schottky diodes (6S2P protection)
│   ├── EKMB1303112K.md            # PIR sensors
│   ├── LIS2DW12.md                # Accelerometer
│   ├── SFH4725AS_A01.md           # 940nm IR LEDs
│   ├── AL8861.md                  # LED buck driver
│   ├── Molex_5031821852.md        # microSD connector
│   ├── Molex_209142-0180.md       # LTE antenna
│   ├── Molex_2066400001.md        # GNSS antenna
│   ├── TPD3E001DRLR.md            # SIM ESD protection
│   ├── USBLC6-2SC6.md             # USB ESD protection
│   ├── TLP291.md                  # Optocoupler (trigger isolation)
│   ├── SMBJ4.5A.md                # TVS diode (CONFIRMED: does not exist. Replaced with Zener+PTC)
│   ├── JST_GH_series.md           # Connectors
│   ├── Card_Edge_Socket.md        # Phase 2 front module interface
│   └── Supercap_0.47F.md          # GPS backup capacitor
│
├── firmware/
│   ├── config.h                   # Pin definitions + constants (SINGLE SOURCE OF TRUTH)
│   └── CameraTrap.ioc             # STM32CubeMX project file
│
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md     # Full technical overview
│   └── PLATFORM_ALIGNMENT.md      # Shared interfaces with Trap Monitor
│
├── concept_sketch.svg             # Product concept illustration
├── block_diagram.svg              # System block diagram
├── main_board_layout.svg          # Main PCB zone diagram
├── led_module_layout.svg          # LED daughter board layout
├── modem_daughter_layout.svg      # Modem card layout
│
└── archive/                       # Superseded documents
    └── SCHEMATIC_CHANGES_V1.1.md  # Superseded by V1.2
```

## Datasheet Library

The `datasheets/` folder contains a verified reference file for **every active component** in the BOM. Start with `datasheets/INDEX.md` — it links to all 29 component files, lists open issues, and flags which specs still need PDF verification.

**Key conventions in the datasheet files:**
- `[VERIFIED]` — confirmed from manufacturer source this session
- `[DATASHEET]` — from published specs, high confidence
- `[TRAINING-DATA]` — from AI knowledge, needs manual PDF check before PCB fab
- `[VERIFY]` — specific value that must be confirmed (search for these before layout)

**Local Quectel PDFs** are in `hardware/Trap Monitor/` (shared modem daughter card):
- `Quectel_EG800Q_Series_LTE_Standard_Specification_V1.7.pdf`
- `quectel_eg800q_series_reference_design_v1-2.pdf`
- `...hardware_design_v1-3-pdf.pdf`
- Footprint, 3D model, and 2D dimension ZIPs

## Working Conventions

- **`firmware/config.h` is authoritative** for all pin assignments, constants, and thresholds. If it disagrees with a doc, config.h wins.
- **Signal names and active levels are locked.** Exact STM32N6 pin numbers TBD in CubeMX — placeholders are 0 in config.h. Do not assign final pin numbers without CubeMX validation.
- **BSS138 discrete level shifting** is the standard across both products (not TXB0104).
- **Modem HAL must be portable** — same API on ESP32-S3 (Trap Monitor) and STM32N6 (Camera Trap). UART abstraction underneath.
- **Metric units throughout.** Temperatures °C. Current mA/µA. Voltage V/mV.
- **Australian sourcing:** DigiKey AU, Mouser, element14 AU, LCSC for passives. Quectel via AU distributor. Sony IMX678 via Sony distributor.

## Platform Family Rules

Things that MUST stay aligned with Trap Monitor:
- Modem daughter card connector pinout and signal definitions
- BSS138 level shifting standard
- GPS power gate circuit (BSS138 + SI2301, HIGH = powered)
- WildTrack API event schema (same top-level structure, different event_type/payload)
- Firmware comms HAL API (AT commands, SMS, MQTT, GPS, retry logic)

Things that are deliberately different:
- MCU (ESP32-S3 vs STM32N6+U0)
- Battery chemistry and pack config
- Power rail count (2 vs 5)
- Enclosure form factor and mounting
- Storage (internal flash vs µSD)
- PCB complexity (2-layer vs 4-layer minimum)

## Quick Reference — Power Budget (Strobed IR, 70 triggers/day)

| Mode | Daily draw | 6S2P life (4000mAh) | SD usage/day |
|------|-----------|---------------------|--------------|
| Validation | ~37 mAh | ~107 days | 1.75 GB |
| Production | ~35 mAh | ~114 days | 0.19 GB |
| Research | ~37 mAh | ~107 days | 1.84 GB |

6S2P: 12 AA NiMH, 6 series × 2 parallel. 7.2V nom, 4000 mAh. Sleep ~50µA (dominated by AP63300 Iq). With Extender backpack (+12 AA): ~214 days. With Phase 1 Schottky diodes: ~99 days (0.3V drop reduces usable range).

## Trap Monitor Cross-Reference

The Trap Monitor repo (`Trap Monitor/hardware/`) contains:
- `DESIGN_SPEC.md` — Full schematic netlist (reference for shared circuits)
- `config.h` — ESP32-S3 pin map (reference for modem UART/GPS conventions)
- `D2C_PCB_PROTOTYPE_ADDENDUM.md` — Modem strategy and D2C pathway
- `MARCH_2026_CHANGE_SUMMARY.md` — BSS138 standardisation, SMS-first scope
- `BOM_PCB.csv` — Shared component reference (BSS138, SI2301, EG800Q-EU, MAX-M10S, etc.)
