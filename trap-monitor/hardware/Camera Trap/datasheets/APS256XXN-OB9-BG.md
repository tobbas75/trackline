---
component: APS256XXN-OB9-BG
manufacturer: AP Memory Technology (APM)
category: Memory (PSRAM)
status: Active
last_verified: 2026-03-29
confidence: HIGH — BGA ball map confirmed from Mouser datasheet PDF Page 4 via Chrome browser session 2026-03-29. Package dimensions confirmed from Page 5.
---

# APS256XXN-OB9-BG — 256 Mbit OPI/HPI PSRAM

## Datasheet Links

| Source | URL | Access |
|--------|-----|--------|
| Mouser datasheet (v1.0) | https://www.mouser.com/datasheet/2/1127/APM_PSRAM_OPI_Xccela_APS256XXN_OBRx_v1_0_PKG-1954780.pdf | Public |
| Mouser product page | https://www.mouser.com/ProductDetail/AP-Memory/APS256XXN-OB9-BG | Public |
| AP Memory product page | https://www.apmemory.com/products/psram-iot-ram/ | Public |
| STM32N6570-DK schematic | ST website (uses same PSRAM part) | Public reference design |

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Capacity | 256 Mbit = 32 MB | Verified |
| Interface — OPI mode | Octal SPI (x8), up to 200 MHz DDR = 400 MB/s | Likely |
| Interface — HPI mode | HexaDeca-SPI (x16), up to 200 MHz DDR = 800 MB/s | Likely |
| Revision | OB9 (250 MHz max clock, newer than OBR) | Likely — OB9 is a speed grade upgrade |
| Package | BGA-24 (6 × 8 × 1.2 mm, 1.0 mm ball pitch, 0.4 mm ball diameter) | Likely |
| Supply voltage (VDD) | 1.62V min, 1.80V typ, 1.98V max | Likely |
| Supply voltage (VDDQ) | 1.62V min, 1.80V typ, 1.98V max | Likely |
| Operating temperature | -40°C to +85°C (Industrial) | Likely |
| Page size | 2048 bytes (2 KB) | Likely |
| Refresh | Internal self-refresh (transparent, no external refresh required) | Verified (PSRAM fundamental) |
| Initialisation time | 150 µs after VDD stable | Likely |

### OB9 vs OBR Revision

| Parameter | OBR | OB9 | Confidence |
|-----------|-----|-----|------------|
| Max clock (DDR) | 200 MHz | 250 MHz | Likely |
| Max throughput (x16) | 800 MB/s | 1000 MB/s | Likely |
| Pin-compatible | — | Yes (drop-in replacement for OBR) | Likely |

**Design note:** This design uses OB9 at up to 250 MHz DDR in x16 HPI mode via STM32N6 XSPI1. The STM32N6570-DK discovery board uses the same part family, which provides a validated reference design.

## Absolute Maximum Ratings

**WARNING: Values below are from training knowledge. Verify against current datasheet.**

| Parameter | Min | Max | Unit | Confidence |
|-----------|-----|-----|------|------------|
| VDD | -0.5 | 2.5 | V | Uncertain |
| VDDQ | -0.5 | 2.5 | V | Uncertain |
| Input voltage (any pin) | -0.5 | VDDQ + 0.5 | V | Uncertain |
| Storage temperature | -65 | +150 | °C | Uncertain |
| Operating temperature | -40 | +85 | °C | Likely |

## Pin Configuration

**BGA-24 (6 × 8 mm, 1.0 mm pitch, 4 × 6 ball array)**

```
       Col 1    Col 2    Col 3    Col 4
Row A:  A1       A2       A3       A4
Row B:  B1       B2       B3       B4
Row C:  C1       C2       C3       C4
Row D:  D1       D2       D3       D4
Row E:  E1       E2       E3       E4
Row F:  F1       F2       F3       F4
```

### Ball Assignment — CONFIRMED from Datasheet PDF Page 4 (2026-03-29)

**CONFIRMED: 4 rows × 6 columns = 24 balls.** Confirmed by two independent Chrome sessions reading the Mouser-hosted AP Memory datasheet PDF (Page 4). Top view, A1 top-left.

| | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 |
|---|---|---|---|---|---|---|
| **A** | VCC | DQ4 | DQ5 | DQ6 | DQ7 | VCC |
| **B** | DQ0 | DQ1 | DQ2 | DQ3 | RWDS | VSS |
| **C** | VSS | CLK | CLKn | CE# | VSS | DM |
| **D** | VCC | DQ8 | DQ9 | DQ10 | DQ11 | VCC |

**Signal mapping to STM32N6 XSPI1:**
- CE# (C4) → PO0 (XSPI1 CS)
- CLK (C2) → PO4 (XSPI1 CLK)
- CLKn (C3) → differential clock negative (if used)
- RWDS (B5) → PO2 or PO3 (XSPI1 DQS)
- DM (C6) → data mask
- DQ0-DQ7 (B1-B4, A2-A5) → PP0-PP7 (XSPI1 lower byte)
- DQ8-DQ11 (D2-D5) → PP8-PP11 (XSPI1 upper byte, HPI x16 mode)
- VCC (A1, A6, D1, D6) → 1.8V rail (4 power balls)
- VSS (B6, C1, C5) → GND (3 ground balls)

> **NOTE:** This ball map shows DQ0-DQ11 only (12 data lines). For full HPI x16 mode (DQ0-DQ15), DQ12-DQ15 would need additional balls — suggesting this is an OPI x8 variant pinout. The HPI x16 pinout may use a different ball assignment or the "missing" DQ12-DQ15 may be multiplexed. **Verify against the x16-specific ball map in the datasheet if using HPI mode.**
>
> Previous agent-generated 5×5 grid was from training data and is superseded by this confirmed reading.

### Signal Descriptions

| Signal | Type | Description |
|--------|------|-------------|
| CLK | Input | Clock input (DDR — data sampled on both edges) |
| CS# | Input | Chip select, active LOW |
| DQS0 | I/O | Data strobe for lower byte (D0-D7). Center-aligned with data. |
| DQS1 | I/O | Data strobe for upper byte (D8-D15). Used in x16 HPI mode only. |
| D0–D7 | I/O | Data bus lower byte (used in both OPI x8 and HPI x16 modes) |
| D8–D15 | I/O | Data bus upper byte (used in HPI x16 mode only) |
| RESET# | Input | Hardware reset, active LOW. Internal pull-up. |
| VDD | Power | Core supply, 1.8V nominal |
| VDDQ | Power | I/O supply, 1.8V nominal (must equal VDD for this part) |
| VSS | Power | Ground |

## Power

### Current Consumption

**WARNING: Values below are approximate from training knowledge. Verify against datasheet for exact figures at specific frequencies.**

| Mode | Typical | Max | Unit | Conditions | Confidence |
|------|---------|-----|------|------------|------------|
| Active read (200 MHz DDR, x16) | 50 | 70 | mA | Continuous burst read | Uncertain |
| Active write (200 MHz DDR, x16) | 45 | 65 | mA | Continuous burst write | Uncertain |
| Active read (133 MHz DDR, x8) | 30 | 45 | mA | OPI mode | Uncertain |
| Standby (CS# HIGH, clock running) | 3 | 8 | mA | Self-refresh active | Uncertain |
| Standby (CS# HIGH, clock stopped) | 1.5 | 4 | mA | Self-refresh active | Uncertain |
| Half-sleep | ~100 | — | µA | Average. Periodic 25 mA burst for self-refresh. | Uncertain |
| Deep power-down | 5 | 20 | µA | Data lost | Uncertain |

**Design budget uses ~30 mA active** (from POWER_BUDGET.md), which aligns with moderate-frequency operation. Peak current during high-speed bursts may be higher.

### Power Rail Notes
- VDD and VDDQ are typically tied together for this part (both 1.8V)
- In this design, both are supplied by TPS7A02 LDO (U12) from the 3.3V rail
- The TPS7A02 is rated for 200 mA max — combined load with IMX678 DOVDD (~50 mA) and VDDIO_XSPI1 (~20 mA) totals ~100-120 mA peak, within budget
- Bulk bypass capacitor (10 µF ceramic) recommended near VDD/VDDQ pins
- 100 nF ceramic on each VDD and VDDQ pin

## Interface Modes

### OPI Mode (Octal SPI, x8)
- Uses D0-D7, DQS0, CLK, CS#
- D8-D15 and DQS1 unused (can be left unconnected or tied to VDDQ via 10 kΩ)
- Maximum: 200 MHz DDR = 400 MB/s (OBR), 250 MHz DDR = 500 MB/s (OB9)
- Xccela bus compatible

### HPI Mode (HexaDeca-SPI, x16)
- Uses D0-D15, DQS0, DQS1, CLK, CS#
- Maximum: 200 MHz DDR = 800 MB/s (OBR), 250 MHz DDR = 1000 MB/s (OB9)
- **Used in this design** via STM32N6 XSPI1 Port 1

### Mode Selection
- Mode is selected by the command protocol used during initialisation
- No hardware mode pin — the host controller determines the interface width
- STM32N6 XSPI1 supports both OPI and HPI modes

## Initialisation Sequence

1. Apply VDD and VDDQ simultaneously (or VDD first, VDDQ within 100 µs)
2. Assert RESET# LOW for at least 2 µs (if RESET# pin is connected)
3. Release RESET# HIGH
4. Wait 150 µs for internal initialisation (tPU)
5. Issue a Global Reset command (optional, for clean state)
6. Read Mode Register to verify device is ready
7. Configure operating mode (linear burst, wrapped burst, latency, drive strength)

**STM32N6 HAL handles this via the XSPI peripheral driver.** The STM32N6570-DK BSP provides reference initialisation code for this exact PSRAM part.

## Application Notes for This Design

### STM32N6 XSPI1 Connection

| PSRAM Signal | STM32N6 Pin | XSPI1 Port 1 | Notes |
|--------------|-------------|---------------|-------|
| CS# | PO0 | nCS | AF9 |
| DQS0 | PO2 | DQS0 | AF9 |
| DQS1 | PO3 | DQS1 | AF9 (x16 mode) |
| CLK | PO4 | CLK | AF9 |
| D0–D15 | PP0–PP15 | IO0–IO15 | AF9 |

### Layout Guidelines
- Place PSRAM within 15 mm of STM32N6 XSPI1 pins
- Length-match all data lines (D0-D15) to within ±0.5 mm
- Length-match DQS0 to D0-D7 group, DQS1 to D8-D15 group
- CLK trace should be shorter than or equal to the shortest data trace
- 50 Ω single-ended impedance for all signals (4-layer stackup)
- Ground plane under all PSRAM traces — no splits
- 100 nF + 10 µF bypass caps on each VDD/VDDQ ball, placed on the BGA escape side
- RESET# can be connected to a GPIO or tied to VDD via 10 kΩ (always running)

### Thermal
- BGA-24 package has limited thermal dissipation through balls only
- At ~30-50 mA active, ~54-90 mW dissipation — well within package capability
- No heatsink required

### RESET# Pin
- Can be connected to a GPIO for explicit reset control during fault recovery
- Or tied to VDD (1.8V) via 10 kΩ for always-on operation
- In this design, the PSRAM is power-gated via the 1.8V rail — hardware reset is achieved by power cycling

## Procurement

| Source | Part Number | Notes |
|--------|-------------|-------|
| Mouser | APS256XXN-OB9-BG | Check stock — newer OB9 revision |
| AP Memory distributor | APS256XXN-OB9-BG | For volume pricing |
| DigiKey AU | APS256XXN-OB9-BG | May list under "AP Memory" or "APM" |

**Same part as STM32N6570-DK:** The ST discovery board uses this PSRAM family, which means:
1. ST has validated the part with XSPI1 at target frequencies
2. Reference schematic and layout are available from ST
3. BSP drivers are available in STM32CubeN6

**Pricing:** ~$4.50 AUD per unit at low volume (from BOM).

**Lead time:** AP Memory parts are generally available from Mouser with 1-2 week lead time for stocked items. OB9 revision may have limited stock compared to older OBR. Verify before ordering.

## Known Issues / Errata

1. **Ball map must be verified.** The pin assignment table above is from training knowledge and may contain errors. BGA pin assignments are critical — download the actual datasheet PDF from Mouser and verify every ball assignment before PCB layout. The STM32N6570-DK schematic can serve as a cross-reference.

2. **OB9 vs OBR availability.** The OB9 revision (250 MHz) is newer and may have limited stock at some distributors. The OBR revision (200 MHz) is pin-compatible and would work at reduced speed. If OB9 is unavailable, OBR is an acceptable fallback for prototyping.

3. **Self-refresh during standby.** PSRAM requires periodic refresh to maintain data. Unlike SRAM, the self-refresh circuitry draws current even when the device is idle. If the design needs near-zero standby current, the PSRAM must be power-gated (losing all data). This is acceptable for this camera trap — frame buffer data is transient.

4. **VDDQ must match VDD.** For this part, VDDQ and VDD must be the same voltage (1.8V). Do not attempt to use a separate I/O voltage — this is not a dual-supply part.

5. **HPI x16 mode requires all 16 data lines.** If any D8-D15 line is left unconnected, the device cannot operate in x16 mode. Ensure all 16 data lines are routed to STM32N6 PP0-PP15.

6. **Thermal pad:** BGA-24 package does not have a central thermal pad. All thermal dissipation is through the signal and power balls. Adequate ground plane coverage under the package is essential for both thermal and electrical performance.
