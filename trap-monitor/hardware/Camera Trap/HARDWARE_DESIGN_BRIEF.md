# AI Camera Trap — Hardware Design Brief

**Date:** March 2026
**Contact:** Toby Barton, Between 23° Pty Ltd

---

## 1. Product Overview

A battery-powered edge AI wildlife camera trap and trigger platform for remote tropical Australia. The unit sleeps on ~39 µA, wakes on PIR trigger, captures a 10-frame 4K burst, runs species classification on 3 frames using an on-device neural network, saves results to SD card, sends an LTE alert with thumbnail on confirmed species detection, and optionally fires an external trigger output (trap, bait, deterrent). Then sleeps.

**Primary use case:** PIR trigger → burst capture → AI classify → alert → action → sleep.

**Platform philosophy:** The camera is the brain. Modular backpacks snap onto the rear and configure it for the deployment — standard battery, field station (trigger + LoRa), li-ion solar (sealed + indefinite), or battery extender. Modular IR LED modules swap on the front. Modem daughter cards swap for connectivity upgrades. Addax AI models swap via SD card. One core body, everything else plugs in.

**Operating environment:** Outdoor IP67 enclosure, 0–50°C, remote locations, Cyclone Region C/D rated enclosure. Telstra Band 28 (700 MHz) terrestrial + future Starlink D2C (Band 7, 2600 MHz).

---

## 2. Two-Phase Approach

### Phase 1 — Prototype (current scope)

Functional boards for field testing. Optimise for speed and testability, not miniaturisation.

Phase 1 scope:
1. Schematic and PCB layout
2. Prototype fabrication and assembly — 3–5 units
3. Basic functional testing — power-on, sensor feed, AI inference, modem registration, deep sleep current

### Phase 2 — Production (future)

Fully integrated design with proper RF, antenna matching, size optimisation, DFM review, conformal coating.

### Firmware Compatibility (CRITICAL)

Same firmware binary must run on Phase 1 and Phase 2 boards. All signal names, active levels, UART assignments, power rail voltages, and I2C addresses must be identical. Pin assignments in `config.h` are authoritative.

---

## 3. System Architecture

```
PIR Sensors (2×) ──► STM32U0 Power Controller ──wake──► STM32N6 Main MCU
                                                              │
                     ┌────────────────────────────────────────┤
                     │                                        │
                     ▼                                        ▼
              Sony IMX678 ──MIPI CSI-2──► STM32N6 ISP/NPU    │
              (STARVIS 2)                  │  │  │            │
                     ▲                     │  │  │            │
                     │                     │  │  └──► SD Card (µSD SDIO)
              IR LED Module                │  │
              (4-pin JST GH)               │  └──► PSRAM 32MB (xSPI)
              Strobed via TIM1             │
                                           └──► NOR Flash (xSPI2)
                                                  16MB firmware/models
                                                  32MB metadata/config

Modem Daughter Card ◄──UART──► STM32N6
(EG800Q-EU Rev A)      │
  │                     │
  SIM / eSIM            └──UART──► u-blox MAX-M10S GPS
  u.FL antenna                      (power-gated)
```

---

## 4. Main MCU

| Parameter | Value |
|-----------|-------|
| Part | STM32N657X0H3Q (VFBGA-264, 14×14mm, 0.8mm pitch, 165 I/O) |
| Core | Cortex-M55 @ 800 MHz |
| NPU | Neural-ART accelerator, 600 GOPS INT8 |
| SRAM | 4.2 MB (fits MegaDetector v5 + AWC species classifier) |
| ISP | Hardware image signal processor |
| Codec | Hardware JPEG / H.264 encoder |
| Camera | Native MIPI CSI-2 (2-lane) |
| Memory I/F | xSPI (PSRAM), xSPI2 (NOR flash), SDMMC (SD card) |
| Debug | SWD via Tag-Connect or 10-pin header |
| Package | BGA |

---

## 5. Power Controller

| Parameter | Value |
|-----------|-------|
| Part | STM32U083KCU6 |
| Core | Cortex-M0+ (ultra-low-power) |
| Role | Sleep/wake state machine, PIR interrupt aggregation, battery monitoring, watchdog |
| Interface to N6 | SPI or I2C (TBD), dedicated wake pin, status pin, power enable |
| Deep sleep | ~2 µA (manages 7–8 µA combined MCU subsystem sleep per NE301 reference) |

Reference architecture: CamThink NE301 (open-source firmware on GitHub, same STM32N6 + STM32U0 dual-MCU pattern).

---

## 6. Image Sensor

| Parameter | Value |
|-----------|-------|
| Part | Sony IMX678 (STARVIS 2) |
| Format | 1/1.8", 8.3 MP (3856 × 2180) |
| Pixel | 2.0 µm with Quad Bayer 2×2 on-chip binning |
| Day mode | Full 4K readout, ~450 mA |
| Night mode | 2×2 binned 1080p (4.0 µm effective), ~300 mA |
| NIR response | Extended to ~1000 nm (STARVIS 2). Silicon cutoff ~1050 nm. |
| Interface | MIPI CSI-2 2-lane, direct to STM32N6 |
| Control | I2C (register config), 7-bit addr 0x1A |
| Power | **3.3V analog (AVDD)** + **1.1V digital (DVDD)** + 1.8V I/O (DOVDD) |

Lens: M12 mount, IR-cut filter (dual-band), ~100° horizontal FoV.

---

## 7. IR Illumination (Modular)

See `LED_MODULE_SPEC.md` for full daughter board specification.

4-pin JST GH connector on main PCB: VLED (5V 2A), STROBE (3.3V logic), ID (ADC), GND.

Strobe signal from STM32N6 TIM1 synced to MIPI frame-valid. 30 ms pulse per frame, 300 ms total per 10-frame burst. 80% energy reduction vs continuous.

6 module variants: 940nm standard, 940nm long range, 940nm super long range (4× SFH4726AS + 15° TIR, 30-35m), 850nm research, white flash, blank plug. Auto-detected via ID pin resistor divider at boot.

---

## 8. Modem (Daughter Card)

See `MODEM_INTERFACE_SPEC.md` for full shared interface specification.

20-pin connector shared with Trap Monitor product. Rev A: Quectel EG800Q-EU (CAT-1bis). Future: 5G D2C module.

Host provides 3.8V at 3A peak. BSS138 discrete level shifting on daughter card (3.3V ↔ 1.8V). SIM/eSIM on daughter card.

---

## 9. GPS

| Parameter | Value |
|-----------|-------|
| Part | u-blox MAX-M10S (same as Trap Monitor) |
| Output | NMEA @ 9600 baud |
| Interface | UART (USART3 on STM32N6) |
| Power | 3.3V, GPIO power-gated via BSS138 + SI2301 (same circuit as Trap Monitor) |
| Antenna | Separate u.FL → passive ceramic patch or active with LNA |

---

## 10. Memory

| Device | Part | Size | Interface | Purpose |
|--------|------|------|-----------|---------|
| PSRAM | APS256XXN-OB9-BG | 32 MB | xSPI (OCTOSPI) | Frame buffer — holds full 10-frame burst |
| NOR Flash 1 | W25Q128JV | 16 MB | xSPI2 | Firmware + AI models |
| NOR Flash 2 | W25Q256JV | 32 MB | xSPI2 (CS2) | Metadata, config, event log |
| SD Card | µSD slot (Molex 5031821852) | 128/256 GB | SDMMC 4-bit | Image storage |

---

## 11. Power System

### 11.1 Battery & Backpack System

- **12 AA NiMH** via snap-on backpack (Panasonic Eneloop Pro, 2000 mAh/cell)
- **Pack configuration: 6S2P** (6 series × 2 parallel). 7.2V nominal, 8.4V full, 6.0V empty. Capacity: 4,000 mAh.
- Camera receives power via backpack interface connector (J_BP) — sees only battery voltage
- **No solar charging on main board** — solar is self-contained in Li-ion Solar backpack

**Backpack variants:**

| Backpack | Contents | External Ports |
|---|---|---|
| **Standard** | 12 AA NiMH caddy. No charging. | None (power only) |
| **Field Station** | 12 AA NiMH + trigger jack routing + LoRa module slot | Trigger jack, LoRa SMA |
| **Li-ion Solar** | Sealed Li-ion pack + BMS + MPPT solar + trigger jack + LoRa slot. Output regulated to match NiMH range. | Trigger jack, LoRa SMA, solar connector |
| **Extender** | 12 AA NiMH spacer, pass-through | Stacks with Standard or Field Station |

Standard backpacks are cheap, pre-loadable in the office, and snap-swap in 30 seconds in the field.

### 11.2 Power Rails

| Rail | Regulator | Load | Notes |
|------|-----------|------|-------|
| 0.81V/0.89V | TPS62088 U10a (DSBGA-6) | STM32N6 VDDCORE | GPIO PF4 switches 0.81V (600MHz) / 0.89V (800MHz overdrive). Fed from 3.3V. |
| 1.1V | TPS62088 U10b (DSBGA-6) | IMX678 DVDD | Fixed output. Separate from VDDCORE — different voltages. Fed from 3.3V. |
| 1.8V | TPS7A02 | IMX678 DOVDD + PSRAM (APS256XXN-OB9, 1.8V) + VDDIO_XSPI1 | Ultra-low Iq LDO, max 200mA. Peak ~100-120mA combined. |
| 3.3V | AP63300 U11 | NOR flash, GPS, PIR, SD, RTC, STM32U0 + IMX678 AVDD (filtered) | ALWAYS ON. Vin=3.8-32V. Iq=22µA. Replaces TPS62A01. |
| 3.8V | AP63300 or shared | Modem VBAT (via daughter card connector) | 3A peak for TX burst |
| 5.0V | AP63300 (same part as modem buck) | LED module VLED rail | 2A max, only during burst. Power-gated by PB6. |

### 11.3 Deep Sleep Budget (~39 µA total)

| Component | Current |
|-----------|---------|
| STM32N6 deep sleep (VBAT + SRAM retention) | ~8 µA |
| STM32U0 standby | ~2 µA |
| PIR sensors (2× Panasonic EKMB) | 2 µA |
| LIS2DW12 accelerometer (wake-up mode) | ~1.5 µA |
| ~~MAX17048 fuel gauge~~ | REMOVED |
| AP63300 ×3 + TPS62088 ×2 + TPS7A02 quiescent | ~33 µA |
| Pull-ups, leakage, RTC | ~13 µA |
| **Total** | **~39 µA** |

Modem, GPS, sensor, PSRAM, SD card, LEDs all fully power-gated in sleep.

---

## 12. PIR Sensors

| Parameter | Value |
|-----------|-------|
| Part | Panasonic EKMB1303112K (×2) |
| Current | 1 µA each |
| Output | Digital, active HIGH on motion |
| Connected to | STM32U0 power controller (NOT directly to STM32N6) |

Two sensors for wider detection cone. STM32U0 aggregates PIR interrupts and wakes STM32N6 only on confirmed motion.

---

## 13. Status LEDs

| Colour | Function |
|--------|----------|
| Green  | Species confirmed / system OK |
| Amber  | Processing / warning |
| Red    | Error / low battery |

220Ω series resistors. Controlled by STM32N6 GPIO.

---

## 14. Accelerometer (LIS2DW12)

| Parameter | Value |
|-----------|-------|
| Part | LIS2DW12 (2×2mm LGA-12) |
| Current | 1.5 µA (low-power wake-up mode) |
| Interface | I2C to STM32U0 (PA8 SDA, PA9 SCL) |
| Interrupt | INT1 → STM32U0 PA2 (EXTI, active HIGH) |
| I2C address | 0x18 (7-bit) |

On-board accelerometer for GPS anti-theft. Connected to STM32U0 so it operates independently when N6 is powered off. When camera is in "off" state, U0 + LIS2DW12 monitor for movement. On motion: wake GPS, send SMS position report, sleep again. Also sends daily heartbeat position.

---

## 15. Bidirectional Trigger Interface

On-board TLP291 opto-coupler + input sense circuit. Two independent signal paths share J_BP pins 3-4, routed to a weatherproof 2-pin jack on Field Station and Li-ion Solar backpacks. Standard backpack: not connected (feature unlocked by backpack upgrade).

**Output (camera → external device):** PG6 drives TLP291 opto-coupler (>3.75kV isolation). AI confirms species → arms trap / fires deterrent. External device provides its own power; camera provides dry contact closure (80V/50mA max).

**Input (external device → camera):** Contact closure on J_BP pins 3-4 pulls TRIG_SENSE (U0 PA3) LOW via 100kΩ sense resistor. Cage trap fires → camera wakes, photographs, sends SMS with thumbnail.

Both modes operate simultaneously. Firmware distinguishes self-caused events (N6 driving PG6) from external triggers (U0 PA3 falling edge while N6 sleeps).

**Output configuration (via CONFIG commands):**
- Target species / class filter
- Confidence threshold (default 0.70)
- Pulse duration (default 2 seconds)
- Dual-camera confirmation (requires LoRa — wait for second camera confirmation before firing)

**Input configuration:**
- `TRIG_INPUT_ENABLED` (default 0 — disabled until configured for a deployment)
- Wake behaviour: same path as PIR (U0 wakes N6, N6 captures burst + sends alert)

---

## 16. Expansion & Backpack Interface

### Internal Expansion Headers (DNP)

| Header | Signals | Purpose |
|--------|---------|---------|
| EXP_I2C (J_EXP1) | SDA, SCL | DNP, no MCU connection (I2C3 unavailable on VFBGA-264) |
| Trigger Test (J_EXP2) | TRIG_OUT, 3V3, GND | Test point for PG6 trigger output signal. Primary routing via J_BP. |
| EXP_UART (J_EXP3) | TX, RX, 3V3, GND | LoRa module (via backpack routing) or serial sensor |

### Backpack Interface (J_BP)

8-pin spring-loaded pogo connector on rear of camera body. Mates with gold pads on backpack. Self-aligns via enclosure guide rails, IP67 sealed by backpack gasket.

| Pin | Signal | Purpose |
|-----|--------|---------|
| 1-2 | BATT+, BATT- | Battery power from backpack |
| 3-4 | TRIG_OUT, TRIG_GND | Bidirectional trigger: opto-isolated output + 100kΩ sense input. Field Station and Li-ion Solar route to weatherproof jack. |
| 5-6 | LORA_TX, LORA_RX | USART1 for LoRa module in Field Station backpack |
| 7 | 3V3 | Power for LoRa module |
| 8 | GND | Signal ground |

---

## 17. Enclosure & Mechanical

| Parameter | Value |
|-----------|-------|
| Material | IP67 polycarbonate, UV-stabilised |
| Rating | Cyclone Region C/D |
| IR window | NIR-optimised polycarbonate (e.g. Covestro Makrolon NIR, ~92% at 940nm). Appears black to human eye. **NOT Germanium** (opaque at 940nm — Ge is for LWIR 8-14µm only). |
| Visible window | Optical-grade polycarbonate |
| Mounting | Python strap slot + ¼"-20 tripod thread |
| Dimensions | Target 150 × 100 × 80 mm (excluding mount, excluding backpack) |
| Backpack attach | Rear panel, quick-release clips or thumbscrews, IP67 gasket |
| USB-C | Sealed port for firmware update / config / debug |
| Antenna (LTE) | SMA bulkhead, pigtail to u.FL on modem card |
| Antenna (GNSS) | SMA bulkhead, pigtail to u.FL on GPS module |
| LED module | Behind IR window, connected via JST GH cable |

---

## 18. Deliverables (Phase 1)

1. Schematic (PDF + source files)
2. PCB layout (Gerber + source files)
3. Bill of Materials with supplier part numbers
4. 3–5 assembled prototype boards
5. Modem daughter card (EG800Q-EU Rev A) — 3–5 units
6. LED module (940nm standard) — 3–5 units
7. Basic test report:
   - Power-on, all rails verified (1.2V, 1.8V, 3.3V, 3.8V, 5.0V)
   - IMX678 sensor feed (MIPI CSI-2 frame capture)
   - AI inference (MegaDetector on NPU)
   - Modem registration (LTE attach on Band 28)
   - GPS fix (cold start time)
   - **Deep sleep current measurement** — compare to 39µA budget. The STM32N6 deep sleep current (~8µA claimed) is estimated from preliminary datasheet values and must be validated on silicon.
   - ~~I2C1 sensor bus — verify VDDIO bank voltage compatibility (1.8V).~~ **RESOLVED:** VDDIO4 = 3.3V (shared with modem UART). BSS138 level shifters on I2C1 SDA/SCL are **required** — populate Q_I2C_SDA and Q_I2C_SCL. Sensor control pins (PC8 XCLR, PD2 PWDN) configured as open-drain with 1.8V pull-ups.
8. Confirmation that all signal names and active levels match `config.h`

All design files delivered as our property.

---

## 17. Phase 1 Strategy — Fully Populated, Firmware-Disabled

Phase 1 prototype boards are **fully populated** — all components soldered, all traces routed. Nothing is DNP except the SSD1306 OLED display (mechanical fit TBD).

The simplification is in **firmware**, not hardware. Features not needed for initial field validation are disabled via `config.h` defines. This maximises learning from each prototype board and avoids a second board spin to test deferred subsystems.

### Phase 1 Firmware State

| Component | Populated | Phase 1 Firmware | Phase 2 Firmware |
|-----------|-----------|-----------------|-----------------|
| STM32N6 + IMX678 + PSRAM | Yes | Full AI pipeline active | Same |
| STM32U0 + 2× PIR | Yes | Sleep/wake state machine active | Same |
| Modem (EG800Q-EU) | Yes | LTE alerts + SMS config commands | Same + MQTT |
| GPS (MAX-M10S) | Yes | Geotag every burst (same pipeline as Trap Monitor) | Same + anti-theft heartbeat |
| Both NOR flash | Yes | Full flash driver — firmware/models on W25Q128JV, config/logs on W25Q256JV | Same |
| SD card | Yes | Image storage active | Same |
| IR LED module | Yes | Strobed capture active | Same |
| ESP32-C3 | Yes | **Power-gated OFF** (`C3_PWR_EN = LOW`). Config via USB serial (workshop) or SMS commands (field). | BLE + WiFi AP + OLED + buttons |
| LIS2DW12 | Yes | **Disabled** (`ANTITHEFT_ENABLED = 0`). U0 skips I2C init if no ACK. | Wake-on-movement enabled |
| LoRa UART routing | Yes (traces to J_BP) | Auto-detect finds no backpack module, disables LoRa. | Backpack LoRa module installed |
| STOP2 fast trigger | N/A (software) | **Disabled** (`STOP2_FAST_TRIGGER = 0`). Deep sleep only. | Tested and tuned per field data |
| SSD1306 OLED | **DNP** (only exception) | N/A | Populated when C3 firmware ready |

### Phase 1 Field Validation Focus

The core pipeline that must work before anything else is enabled:

1. PIR trigger → STM32U0 wakes STM32N6
2. IMX678 captures 10-frame 4K burst (strobed IR)
3. AI inference on frames 2, 5, 8 (MegaDetector + species classifier)
4. Confirmed detection → modem sends LTE alert with thumbnail
5. GPS geotags burst metadata
6. Images saved to SD card, metadata/config persisted to NOR flash
7. Deep sleep (~39 µA)

Configuration uses the same `CONFIG:` command format across two channels:
- **Workshop:** USB serial (laptop connected) — bulk setup, firmware flash, diagnostics
- **Field:** SMS commands via modem — no laptop required, same syntax as Trap Monitor

Example: `CONFIG:PIR_LOCKOUT=10`, `CONFIG:AI_THRESHOLD=0.8`. Both channels write to the same `SystemConfig_t` struct persisted in NOR flash.

### PCB Layout Allowances (Phase 1)

- 4-layer PCB minimum (STM32N6 BGA requires it)
- Larger board size acceptable (target 90×70mm, up to 100×80mm OK)
- Through-hole where it reduces cost
- Modem daughter card can use 2.54mm pin header instead of board-to-board connector
- LED module can use 2-layer PCB
- Production hardening deferred (conformal coating, TVS on external inputs)

### Must NOT be changed:

- Signal names and active levels per `config.h`
- Power rails as specified (1.2V, 1.8V, 3.3V, 3.8V, 5V)
- BSS138 level translation on modem interface
- GPS power gate circuit
- MIPI CSI-2 routing (controlled impedance, length matching)
- xSPI routing to PSRAM (controlled impedance)
- Separate analog/digital ground planes under IMX678

### Pre-Layout Blockers — ALL RESOLVED

1. ~~**PF2 → SPI2 SCK**~~ ✅ Validated in CubeMX — PF2 carries SPI2_SCK AF on VFBGA-264.
2. ~~**VDDIO4 bank voltage (I2C1 vs modem UART)**~~ ✅ PC1/PH9 (I2C1) and PC10/PC11 (UART4) share VDDIO4. Bank stays at 3.3V. BSS138 level shifters required on I2C1. Sensor control pins (PC8, PD2) use open-drain + 1.8V pull-ups. See DESIGN_SPEC §4.3 for circuit detail.
