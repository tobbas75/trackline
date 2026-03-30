# Camera Trap — Datasheet Reference Library

**Created:** March 2026
**Purpose:** Centralised reference for every component in the Camera Trap BOM. Each file contains verified specs, datasheet URLs, application notes, procurement info, and design-specific gotchas.
**Maintenance:** Update individual files as specs are verified against actual PDF datasheets. Search for `VERIFY` tags to find unconfirmed values.

---

## How to Use This Library

1. **Before PCB layout:** Review every file. Confirm all values tagged `[VERIFY]` or `[TRAINING-DATA]` against the actual manufacturer PDF.
2. **Before ordering:** Check procurement section of each file for stock status and lead times.
3. **During schematic review:** Each file has an "Application Notes for This Design" section with gotchas specific to this camera trap.

---

## Processing

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [STM32N657X0H3Q.md](STM32N657X0H3Q.md) | STM32N657X0H3Q | STMicroelectronics | Main MCU — M55 800MHz, 600 GOPS NPU, VFBGA-264 |
| [STM32U083KCU6.md](STM32U083KCU6.md) | STM32U083KCU6 | STMicroelectronics | Power controller — M0+, UFQFPN-32, 2uA standby |
| [ESP32-C3-MINI-1U.md](ESP32-C3-MINI-1U.md) | ESP32-C3-MINI-1U | Espressif | WiFi/BLE comms processor, power-gated |

## Image Sensor + Oscillator

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [IMX678.md](IMX678.md) | IMX678-AAQR1-C | Sony | 8MP 4K STARVIS 2, MIPI CSI-2. **NDA required for full datasheet.** |
| [SiT8008.md](SiT8008.md) | SiT8008BI-12-18E | SiTime | 24MHz MEMS oscillator, 1.8V, sensor MCLK |

## Memory

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [APS256XXN-OB9-BG.md](APS256XXN-OB9-BG.md) | APS256XXN-OB9-BG | AP Memory | 32MB PSRAM, HexaSPI x16 DDR, 1.8V |
| [W25Q128JVSIQ.md](W25Q128JVSIQ.md) | W25Q128JVSIQ | Winbond | 16MB NOR Flash, SOIC-8, firmware + AI models |
| [W25Q256JVEIQ.md](W25Q256JVEIQ.md) | W25Q256JVEIQ | Winbond | 32MB NOR Flash, WSON-8, metadata/log |

## Communications

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [EG800Q-EU.md](EG800Q-EU.md) | EG800Q-EU | Quectel | LTE CAT-1bis modem. **Local PDFs available** (see file). |
| [MAX-M10S.md](MAX-M10S.md) | MAX-M10S-00B | u-blox | GNSS module. **Lifecycle concern — verify availability.** |

## Power Management

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [TPS62088.md](TPS62088.md) | TPS62088YFPT | Texas Instruments | VDDCORE 0.81/0.89V + IMX678 DVDD 1.1V. **DSBGA-6 only.** |
| [TPS7A02.md](TPS7A02.md) | TPS7A0218DBVR | Texas Instruments | 1.8V LDO, 25nA Iq, sensor DOVDD + PSRAM |
| [AP63300.md](AP63300.md) | AP63300WU-7 | Diodes Inc | 3.3V / 3.8V / 5.0V bucks (3 instances). **VFB needs verification.** |
| [SI2301CDS.md](SI2301CDS.md) | SI2301CDS-T1-GE3 | Vishay | P-FET power gates (GPS, ESP32-C3) |
| [BSS138.md](BSS138.md) | BSS138 | onsemi | I2C level shifter + gate inverter (8 total) |
| [SS34.md](SS34.md) | SS34 | Various | Schottky diodes, 6S2P battery string protection |

## Sensors + IR LEDs

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [EKMB1303112K.md](EKMB1303112K.md) | EKMB1303112K | Panasonic | PIR sensor, 1uA, **ACTIVE HIGH output** |
| [LIS2DW12.md](LIS2DW12.md) | LIS2DW12TR | STMicroelectronics | Accelerometer, anti-theft, 0.5uA wake-on-motion |
| [SFH4725AS_A01.md](SFH4725AS_A01.md) | SFH 4725AS A01 | ams-OSRAM | 940nm IR LED, 760 mW/sr, replaces discontinued SFH4725S |
| [AL8861.md](AL8861.md) | AL8861Y-13 | Diodes Inc | LED buck driver, **SOT89-5 for 1.5A** (not TSOT-25) |
| [Molex_5031821852.md](Molex_5031821852.md) | 5031821852 | Molex | microSD push-push connector |

## Antennas

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [Molex_209142-0180.md](Molex_209142-0180.md) | 209142-0180 | Molex | LTE flex antenna, 698-4000MHz |
| [Molex_2066400001.md](Molex_2066400001.md) | 2066400001 | Molex | Active GNSS patch, 28dB LNA |

## Protection

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [TPD3E001DRLR.md](TPD3E001DRLR.md) | TPD3E001DRLR | Texas Instruments | SIM ESD, 3-channel. **Package discrepancy flagged.** |
| [USBLC6-2SC6.md](USBLC6-2SC6.md) | USBLC6-2SC6 | STMicroelectronics | USB ESD, 2-channel |
| [TLP291.md](TLP291.md) | TLP291(GR-TP,SE) | Toshiba | Optocoupler, trigger output isolation |
| [SMBJ4.5A.md](SMBJ4.5A.md) | SMBJ4.5A | Various | TVS, modem VBAT. **May not exist as standard part!** |

## Connectors + Mechanical

| File | Component | Manufacturer | Role |
|------|-----------|-------------|------|
| [JST_GH_series.md](JST_GH_series.md) | SM04B/SM08B/SM12B-GHS-TB | JST | GH 1.25mm connectors (2,500 mating cycles) |
| [Card_Edge_Socket.md](Card_Edge_Socket.md) | MEC2-DV series | Samtec | Card-edge for Phase 2 combined front module |
| [Supercap_0.47F.md](Supercap_0.47F.md) | KR-5R5V474-R | Eaton | GPS V_BCKP backup. **Leakage concern.** |

---

## Local Datasheet PDFs (already in repo)

Files in `hardware/Trap Monitor/` — shared with Camera Trap (same modem daughter card):

| File | Contents |
|------|----------|
| `Quectel_EG800Q_Series_LTE_Standard_Specification_V1.7.pdf` | Full modem datasheet V1.7 |
| `quectel_eg800q_series_reference_design_v1-2.pdf` | Reference schematic V1.2 |
| `https-www-quectel-com-..._hardware_design_v1-3-pdf.pdf` | Hardware design guide V1.3 |
| `quectel_eg800q_series_footprintpart_v1-3.zip` | EDA footprint library |
| `quectel_eg800q_series_3d_dimensions_v1-1.zip` | 3D mechanical model |
| `quectel_eg800q_series_2d_dimensions_v1-1.zip` | 2D dimensions |

---

## Documents Requiring NDA or Login Access

| Component | What's Missing | How to Get It |
|-----------|---------------|---------------|
| **Sony IMX678** | ~~Full electrical tables~~ **RESOLVED.** Production datasheet E21Y08A29 obtained (local PDF). Register map referenced as separate Excel file (IMX678_Standard_Register_Setting) — not yet obtained. | Remaining: Register settings Excel file (for firmware development, not needed for PCB layout). |
| **ST STM32N6** | ~~Full DS14643 electrical characteristics~~ **RESOLVED** — Tables 24/44/45/65 extracted via Chrome. DK schematic (mb1939-n6570-c02) VDDCORE circuit confirmed. | Remaining: HSLV-specific threshold table (may not exist separately). |
| **Quectel EG800Q** | AT commands manual V1.1 | Already have V1.7 datasheet locally. AT manual may need Quectel portal. |

---

## Open Issues Found During Datasheet Research

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | ~~SMBJ4.5A~~ **RESOLVED.** No TVS at ≤4.3V exists (confirmed Bourns, Littelfuse SMAJ/SMDJ, Nexperia PESD, DigiKey search). Replaced with **BZT52C4V3-7-F Zener (LCSC C151003) + PTC fuse**. Zener alone can't handle 3A fault — PTC must act first. BOM updated. | ~~HIGH~~ **CLOSED** | SMBJ4.5A.md |
| 2 | ~~AP63300 VFB uncertain~~ **RESOLVED: VFB = 0.800V ±1%.** R2=30.1kΩ. R1: 93.1k (3.3V), 113k (3.8V), 158k (5.0V). | ~~HIGH~~ **CLOSED** | AP63300.md |
| 3 | ~~PSRAM ball map unverified~~ **CONFIRMED: 4×6 grid from datasheet PDF.** Note: only shows DQ0-DQ11 (may be x8 pinout). Verify x16 mapping. | ~~HIGH~~ **MOSTLY CLOSED** | APS256XXN-OB9-BG.md |
| 4 | ~~IMX678 full electrical specs need NDA~~ **RESOLVED.** Production datasheet E21Y08A29 (56 pages, Sep 2022) obtained + tentative Rev 0.1. All voltages, currents (operating + standby), abs max ratings, power-on timing, slew rates, I2C FM+, spectral response, sensitivity confirmed. Saved as local PDFs. | ~~HIGH~~ **CLOSED** | IMX678.md |
| 5 | Supercap leakage — Eaton does not specify. Estimated 3-8µA at 3.3V/25°C, but **12-32µA at 50°C tropical enclosure** (leakage doubles per 10°C). ESR=50Ω. At 50°C worst case, adds ~30µA to sleep budget — significant. **Bench-test at temperature before production. Consider MOSFET disconnect.** | **MEDIUM** | Supercap_0.47F.md |
| 6 | ~~Supercap 70°C~~ **RESOLVED: 85°C OK with derating to 3.6V max.** Our 3.3V operating voltage is within budget. | ~~MEDIUM~~ **CLOSED** | Supercap_0.47F.md |
| 7 | W25Q256JV pin 7 OTP: RESET# vs Quad IO3 | **MEDIUM** | W25Q256JVEIQ.md |
| 8 | ~~TPD3E001 package~~ **CONFIRMED: SOT-5X3 (DRL), NOT SOT-143.** BOM updated. | ~~MEDIUM~~ **CLOSED** | TPD3E001DRLR.md |
| 9 | ~~LCSC C128632 wrong part~~ **RESOLVED.** Correct LCSC PN: **C470828** (540 units in stock, $0.32 at qty 100). BOM updated. | ~~HIGH~~ **CLOSED** | TPD3E001DRLR.md |
| 10 | **STM32N6 standby/VBAT current = 37-76µA** (not 8µA). Design decision: gate VBAT off during sleep (U0 has RTC) → 0µA from N6. | **HIGH** | STM32N657X0H3Q.md |
| 11 | **DK board VDDCORE circuit CONFIRMED:** R38=56k, R29=160k, R157=422k, Q7=Si1062X, PF4 switches. | ~~HIGH~~ **CLOSED** | TPS62088.md |
| 12 | SFH 4725AS A01 footprint 0.1mm smaller than SFH4725S | **LOW** | SFH4725AS_A01.md |
| 13 | TPS62088 switching freq is 4MHz not 2.4MHz (doc correction) | **LOW** | TPS62088.md |
| 14 | JST GH is 2,500 mating cycles not 30 (changes card-edge trade-off) | **INFO** | JST_GH_series.md |
