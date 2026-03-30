# Camera Trap — Schematic Changes V1.2

**Date:** March 2026
**Trigger:** Deep component review + internet-verified second pass (all corrections re-verified against datasheets, distributor listings, and DK board schematics)
**Status:** Pre-layout — all changes must be applied before PCB fab
**Supersedes:** SCHEMATIC_CHANGES_V1.1.md

---

## CRITICAL — Board will not function without these

### 1. PSRAM — Wrong part, replace entirely

| | Original (WRONG) | V1.1 Correction | V1.2 Final |
|---|---|---|---|
| Part | AP6404L-3SQR | APS256XXN-OBR-BG | **APS256XXN-OB9-BG** (latest revision, 250MHz, pin-compatible) |
| Capacity | 8 MB (not 32) | 32 MB | 32 MB |
| Interface | QSPI (4-bit) | HexaSPI x16 DDR 200MHz | HexaSPI x16 DDR **250MHz** (backward compat at 200) |
| Package | SOP-8 | BGA-24 | BGA-24 (6x8mm, 1.0mm pitch) |
| Voltage | 3.3V | 1.8V | **1.8V** (VDD range 1.62-1.98V) |
| Reference | — | STM32N6570-DK board | Same. OBR→OB9 is recommended upgrade per AP Memory. |

**Confidence: VERY HIGH.** Verified against Mouser listings, AP Memory datasheets, Zephyr board docs, and ST community threads. 5,217 units at Mouser.

### 2. IMX678 Power Rails — Wrong voltages

| Rail | Original (WRONG) | Corrected | Confidence |
|---|---|---|---|
| AVDD (analog) | 1.8V | **3.3V** (via ferrite + LC filter from 3.3V rail) | VERY HIGH (10 independent sources) |
| DVDD (digital) | 1.2V | **1.1V** (dedicated TPS62088 U10b) | VERY HIGH (10 independent sources) |
| DOVDD (I/O) | 1.8V | 1.8V (unchanged) | VERY HIGH |

**Power-on sequence:** DVDD (1.1V) → DOVDD (1.8V) → AVDD (3.3V), all within 200ms.

**Source via FRAMOS** (authorized Sony distributor). FSM-IMX678 module for prototyping.

### 3. STM32N6 VDDCORE — NOT 1.1V or 1.2V (V1.2 DISCOVERY)

**V1.1 said "1.1V for STM32N6 core + IMX678 DVDD" — this is WRONG on both counts.**

The STM32N6 has two separate voltage domains:
- **VDD** (I/O supply) = 1.71-3.6V, typically **3.3V** — from the 3.3V rail
- **VDDCORE** (CPU + NPU core) = **0.81V** (VOS nominal, 600 MHz) or **0.89V** (VOS overdrive, 800 MHz)

Feeding 1.1V to VDDCORE would exceed the maximum rating. The DK board uses a TPS62088 with GPIO PF4 switching between two feedback divider settings.

**Action:** Add **two** TPS62088s:
- **U10a:** 0.81V/0.89V switchable (VDDCORE) — copy DK board circuit with PF4 FET switch
- **U10b:** 1.1V fixed (IMX678 DVDD only)

**Confidence: HIGH.** Verified against AN6000, DK board schematic (mb1939-n6570-c02), and ST community overdrive mode guide.

### 4. TPS62088 Package — DSBGA, not WSON-6

**TPS62088DSGR (WSON-6) does NOT exist.** The TPS62088 only comes in:
- **TPS62088YFPT** — DSBGA-6 (1.2×0.8mm wafer-level BGA)

The BOM must be corrected from "WSON-6" to "DSBGA-6". This is a TINY BGA package — needs reflow capability and X-ray inspection.

**Confidence: HIGH.** Verified on TI product page.

### 5. IR LEDs — SFH4725S is DISCONTINUED

| | V1.1 (WRONG) | V1.2 Final |
|---|---|---|
| Part | SFH4725S | **SFH 4725AS A01** |
| Status | Discontinued | **Active production** |
| Wavelength | 950nm peak (not 940nm) | 950nm peak / 940nm nominal |
| Beam angle | 90° full | **80° full (40° half-angle)** |
| Radiant intensity | 425 mW/sr at 1A | **760 mW/sr at 1A** (80% brighter) |
| Max current | 1.0A | **1.5A** |
| Package | OSLON Black 3.85mm | OSLON Black **3.75mm** (verify pad compat) |

**Confidence: HIGH.** Verified on ams-OSRAM product page and datasheet V1.10 (Oct 2025).

### 6. TPS62A01 — REMOVED, replaced with AP63300

TPS62A01 max Vin = 5.5V. Battery is 6.0-8.4V. **Destroyed on first power-up.**

**U11 is now AP63300WU-7** at 3.3V output, directly from battery (Vin=3.8-32V). Trade-off: higher Iq (22µA vs ~15µA) and higher output ripple (~20-30mV vs ~10-15mV). IMX678 AVDD filtered via ferrite + LC.

**Confidence: HIGH.** AP63300 datasheet confirms 3.8V min input. TPS62A01 datasheet confirms 5.5V abs max.

### 7. Battery Topology — 6S2P with Schottky Protection

12 AA NiMH: 6 series × 2 parallel. 7.2V nominal, 8.4V full, 6.0V empty. 4000 mAh.

**Phase 1:** Add SS34 Schottky diodes per string to prevent reverse current between mismatched parallel strings (0.3V drop → 5.7-8.1V effective range). Production: may remove with cell matching + firmware cutoff.

### 8. MAX17048 Fuel Gauge — REMOVED (corrected reason)

**V1.1 reason was wrong:** "CELL pin max 5.5V" — actually CELL pin abs max is 12V.

**Correct reason:** ModelGauge algorithm is lithium-ion only; produces meaningless SOC readings on NiMH chemistry. Single-cell VDD range (2.5-4.5V) cannot accommodate 6S pack. ADC voltage measurement with temperature compensation is the industry standard for trail cameras.

**Confidence: HIGH.** MAX17048 datasheet confirms abs max 12V on CELL, 2.5-4.5V VDD operating range.

### 9. STM32U083KCU6 Package — UFQFPN-32, not LQFP-32

The "KCU6" suffix denotes **UFQFPN-32** (QFN, 5×5mm, 0.5mm pitch). Not LQFP-32 (QFP). Completely different footprint — PCB layout blocker if wrong.

**Confidence: HIGH.** ST part numbering convention confirmed.

---

## HIGH — Significant risk if not addressed

### 10. Modem Sleep Current — Must power-gate buck

EG800Q-EU power-off mode draws ~55µA. **PB7 (MODEM_3V8_EN) MUST be driven LOW** to disable AP63300 U13, reducing modem rail to ~1µA shutdown.

### 11. Antenna Part Numbers — Unverified

| Antenna | Old PN (not found) | Suggested replacement |
|---|---|---|
| LTE flex | Molex 2132510100 | **Molex 209142-0180** (698-4000 MHz, verified) |
| GNSS patch | Molex 2066830001 | **Molex 2066400001** (active patch with LNA, verified) |

### 12. TPS7A02 Load Capacity

Combined 1.8V load: IMX678 DOVDD (~50mA) + PSRAM active (~30-50mA) + VDDIO_XSPI1 (~20mA) = **100-120mA peak**. TPS7A02 max = 200mA. Margin is adequate but should be verified under worst-case simultaneous load.

### 13. SRAM Model Loading Strategy

4.2MB SRAM cannot hold both AI models simultaneously (~4.0MB combined). Firmware must load models sequentially from NOR flash. This adds ~50-100ms per model swap but is architecturally clean.

---

## MEDIUM — Should fix before field deployment

### 14. Oscillator Current — 3.6mA not 3.2mA
SiT8008 at 1.8V draws 3.6mA typical (datasheet), not 3.2mA. Minor power budget impact.

### 15. GPS V_BCKP — Insufficient for hot start
100nF provides milliseconds of backup. Add 0.1F supercap for multi-hour backup, or accept 24s cold starts.

### 16. MAX-M10S Lifecycle — Check with u-blox
Product page shows "no longer available". May be approaching NRND/EOL. Verify and identify replacement.

### 17. ESP32-C3 SPI Slave Speed — 10MHz max
Config.h updated from 20MHz to 10MHz (ESP32-C3 SPI slave limit = f_APB/8).

### 18. W25Q256JV LCSC — Package mismatch
LCSC C97522 = WSON-8 (W25Q256JVEIQ), not SOIC-8. Either update BOM package to WSON-8 or find correct LCSC number.

### 19. AL8861 LED Driver — Current Rating Concern
AL8861 max = 1.0A in TSOT-25 package. If driving 8 LEDs at 175mA each = 1.4A total in a series string, this **exceeds the 1.0A rating**. Either: (a) use two AL8861 drivers with parallel LED strings, (b) reduce per-LED current, or (c) use a higher-rated driver (AL8860 1.5A).

### 20. Telstra Network Approval — Unknown
EG800Q-EU has RCM certification but Telstra network type approval status is unconfirmed. Contact Quectel AU FAE.

---

## Sleep Budget Summary (V1.2)

| Component | Current |
|---|---|
| STM32N6 (VBAT + 80KB retention) | ~8 µA |
| STM32U0 standby | ~2 µA |
| PIR sensors ×2 | 2 µA |
| AP63300 U11 (3.3V, always on) | ~22 µA |
| AP63300 U13+U15 (shutdown) | ~2 µA |
| TPS62088 ×2 + TPS7A02 Iq | ~9 µA |
| Voltage divider + leakage | ~5 µA |
| **Total (anti-theft OFF)** | **~50 µA** |

Battery life: **~107 days** on 6S2P (4000 mAh). ~99 days with Phase 1 Schottky diodes.

---

## Files Modified (V1.2)

| File | V1.2 Changes |
|---|---|
| `BOM.csv` | U10a/U10b split, U10 DSBGA-6, U11→AP63300, U2 UFQFPN-32, LED→SFH 4725AS A01, PSRAM→OB9-BG, Schottky diodes, MAX17048 reason corrected |
| `firmware/config.h` | VDDCORE_VOS_PIN (PF4), power rail diagram V1.2, TPS62A01 removed |
| `DESIGN_SPEC.md` | Full power architecture rewrite, sleep budget 50µA, PSRAM→OB9-BG, all AP6404L refs removed |
| `POWER_BUDGET.md` | Sleep 50µA, battery life 107 days, regulator Iq breakdown, oscillator 3.6mA |
| `HARDWARE_DESIGN_BRIEF.md` | Power rails table V1.2, all 5 regulators listed |
| `LED_MODULE_SPEC.md` | SFH 4725AS A01, 80° beam, 950nm peak |
| `CLAUDE.md` | Hardware stack, battery life, PSRAM, LED, IMX678 voltages |
