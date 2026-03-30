---
component: u-blox MAX-M10S-00B
manufacturer: u-blox
category: Comms — GNSS Receiver Module
status: Active (verify — see Lifecycle Concern below)
last_verified: 2026-03-29
sources: |
  - Datasheet: https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf
  - Integration Manual: https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf
  - Product page: https://www.u-blox.com/en/product/max-m10-series
  - Project DESIGN_SPEC.md, SCHEMATIC_CHANGES_V1.1.md (Quectel FAE review caught V_IO issue)
confidence: |
  Values marked [PROJECT-VERIFIED] are confirmed in project design docs or caught during FAE review.
  Values marked [DATASHEET] are from u-blox published specifications.
  Values marked [TRAINING-DATA] are from pre-training knowledge — verify against current datasheet before use.
---

# u-blox MAX-M10S-00B — GNSS Receiver Module

## Datasheet Links

| Document | URL |
|----------|-----|
| Datasheet | https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf |
| Integration Manual | https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf |
| Product page | https://www.u-blox.com/en/product/max-m10-series |
| u-blox M10 ROM FW release notes | Available on u-blox portal |

## Lifecycle Concern

**CHECK BEFORE ORDERING:** The u-blox product page may show the MAX-M10S as "no longer available" or NRND. As of last check, availability was uncertain.

- **MAX-M10S-00B** — ROM-based, no flash. Current design target.
- **MAX-M10M** — Flash-based variant. Potential replacement if M10S goes EOL.
- Both are pin-compatible within the MAX-M10 family.

**Action required:** Check Mouser/DigiKey stock and u-blox product page before PCB fab. If M10S is unavailable, M10M is a drop-in replacement (same pinout, adds flash for FW updates).

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Constellations | GPS, GLONASS, Galileo, BeiDou, QZSS, SBAS (concurrent) | [DATASHEET] |
| Max concurrent GNSS | 4 | [DATASHEET] |
| Tracking channels | 72 | [TRAINING-DATA] verify |
| TTFF cold start | 24 s (typical) | [DATASHEET] |
| TTFF warm start | 2 s (typical) | [TRAINING-DATA] verify |
| TTFF hot start | 1 s (typical) | [DATASHEET] |
| Position accuracy (CEP) | 1.5 m | [DATASHEET] |
| Update rate | 1 Hz (default), up to 5 Hz | [TRAINING-DATA] verify |
| Sensitivity (tracking) | -167 dBm | [TRAINING-DATA] verify |
| Sensitivity (acquisition) | -148 dBm (cold), -160 dBm (hot) | [TRAINING-DATA] verify |
| Internal LNA | Yes — with SAW filter | [DATASHEET] |
| Active antenna support | Yes — via VCC_RF pin and CFG-HW-RF_LNA_MODE | [DATASHEET] |

## Absolute Maximum Ratings

| Parameter | Min | Max | Unit | Confidence |
|-----------|-----|-----|------|------------|
| VCC supply | -0.5 | 3.6 | V | [DATASHEET] |
| V_BCKP supply | -0.5 | 3.6 | V | [DATASHEET] |
| V_IO supply | -0.5 | 3.6 | V | [TRAINING-DATA] verify |
| VCC_RF | -0.5 | 3.6 | V | [TRAINING-DATA] verify |
| Any I/O pin | -0.5 | VCC + 0.5 | V | [TRAINING-DATA] verify |
| Storage temperature | -40 | +85 | degC | [DATASHEET] |
| ESD (HBM) | — | 1000 | V | [TRAINING-DATA] verify |

## Pin Configuration

LCC package, 12 pins. Pinout from datasheet:

| Pin | Name | Type | Description | Confidence |
|-----|------|------|-------------|------------|
| 1 | VCC_RF | Power out | Active antenna supply (filtered from VCC) | [DATASHEET] |
| 2 | RF_IN | Input | RF antenna input (50 ohm) | [DATASHEET] |
| 3 | GND | Ground | Ground | [DATASHEET] |
| 4 | Reserved | — | Leave unconnected | [TRAINING-DATA] |
| 5 | TXD | Output | UART transmit (NMEA output) | [PROJECT-VERIFIED] |
| 6 | RXD | Input | UART receive (UBX config commands) | [PROJECT-VERIFIED] |
| 7 | V_IO | Power in | I/O voltage reference (1.71-3.6V) | [PROJECT-VERIFIED] |
| 8 | Reserved | — | Leave unconnected | [TRAINING-DATA] |
| 9 | SDA | Bidir | I2C data | [DATASHEET] |
| 10 | SCL | Input | I2C clock | [DATASHEET] |
| 11 | EXTINT | Input | External interrupt (time mark) | [DATASHEET] |
| 12 | TIMEPULSE | Output | 1PPS time pulse | [DATASHEET] |
| 13 | V_BCKP | Power in | Backup supply (for RTC + RAM retention) | [DATASHEET] |
| 14 | VCC | Power in | Main supply | [DATASHEET] |
| 15 | VIO_SEL | Input | I/O voltage select (leave open for V_IO mode) | [PROJECT-VERIFIED] |
| GND PAD | GND | Ground | Exposed ground pad (center) | [DATASHEET] |

**Note:** Pin numbering above is approximate — verify against datasheet pin map. The MAX-M10S has evolved between revisions.

### Critical Pin Notes

- **V_IO (pin 7) MUST be connected to 3.3V.** This was caught as a missing connection during the Quectel FAE / schematic review. V_IO powers all digital I/O including UART TX/RX. GPS UART will not work without it. See `SCHEMATIC_CHANGES_V1.1.md` item C3.
- **VIO_SEL (pin 15) must be left open/unconnected** to select V_IO reference mode (3.3V I/O). Do not tie to VCC or GND.
- **V_BCKP (pin 13)** — connect to backup supply for hot-start capability.

## Power

### Supply Voltages

| Rail | Parameter | Min | Typ | Max | Unit | Confidence |
|------|-----------|-----|-----|-----|------|------------|
| VCC | Main supply | 1.71 | 3.3 | 3.6 | V | [DATASHEET] |
| V_BCKP | Backup supply | 1.65 | 3.3 | 3.6 | V | [DATASHEET] |
| V_IO | I/O reference | 1.71 | 3.3 | 3.6 | V | [TRAINING-DATA] verify |

### Current Consumption

| Mode | Current / Power | Confidence | Notes |
|------|----------------|------------|-------|
| Acquisition | ~25 mA at 3.3V | [TRAINING-DATA] verify | Cold start, all constellations |
| Continuous tracking | <25 mW (~7.5 mA at 3.3V) | [DATASHEET] | Steady-state navigation |
| Super-E mode (power optimized) | ~6 mW (~1.8 mA at 3.3V) | [TRAINING-DATA] verify | Reduced update rate |
| V_BCKP (backup current) | **28 uA** | [DATASHEET] | RTC + RAM retention only |
| VCC removed, V_BCKP only | 28 uA | [DATASHEET] | Critical for supercap sizing |

### Supercap Sizing (This Design)

From BOM.csv: C_BCKP = 0.47F 5.5V supercapacitor for GPS hot-start backup.

| Parameter | Value |
|-----------|-------|
| Supercap | 0.47 F, 5.5V rated |
| Charge source | 3.3V via 100 ohm series resistor |
| Backup current | 28 uA |
| Charge time to 3.3V | ~47 s (RC = 0.47F x 100R = 47s) |
| Hot-start duration | V_BCKP min 1.65V, from 3.3V: t = C x dV / I = 0.47 x 1.65 / 28e-6 = ~27,700 s = **~7.7 hours** |

This allows hot-start (1s TTFF) for up to ~7-8 hours after main power is removed. Adequate for overnight sleep cycles.

### Power Gating (This Design)

GPS is power-gated via BSS138 + SI2301 P-FET circuit:
- GPIO HIGH -> BSS138 pulls SI2301 gate LOW -> GPS VCC = 3.3V (powered)
- GPIO LOW -> BSS138 off, SI2301 gate pulled HIGH by 10k -> GPS unpowered
- V_BCKP remains connected via supercap (not gated)

**FET orientation verified** during FAE review. SI2301 SOT-23: Pin1=Gate, Pin2=Source, Pin3=Drain. Source to 3.3V, Drain to GPS VCC load. See `SCHEMATIC_CHANGES_V1.1.md` item C4.

## Interfaces

### UART

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Default baud rate | 9600 | [PROJECT-VERIFIED] |
| Default protocol | NMEA 0183 | [PROJECT-VERIFIED] |
| Logic levels | V_IO referenced (3.3V in this design) | [PROJECT-VERIFIED] |
| UBX binary protocol | Available (configuration) | [DATASHEET] |
| RTCM | Not supported on M10S | [TRAINING-DATA] verify |

### I2C (DDC)

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Address | 0x42 | [DATASHEET] |
| Speed | Standard (100 kHz) / Fast (400 kHz) | [DATASHEET] |
| Pull-ups | Required externally (4.7k ohm to V_IO) | [DATASHEET] |

**This design uses UART, not I2C.** I2C address documented for reference only.

### SPI

SPI is NOT available on the MAX-M10S (LCC package). SPI is only on the MAX-M10C (ceramic chip antenna variant).

## Package

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Package type | LCC (Leadless Chip Carrier) | [DATASHEET] |
| Dimensions | 9.7 x 10.1 x 2.4 mm | [DATASHEET] |
| Weight | ~1.5 g | [TRAINING-DATA] verify |
| Pad pitch | 1.1 mm | [TRAINING-DATA] verify |
| Solder | Standard reflow (lead-free) | [DATASHEET] |

## Environmental

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Operating temperature | -40 to +85 degC | [DATASHEET] |
| Storage temperature | -40 to +85 degC | [DATASHEET] |
| Humidity | MSL 3 (168 hours / 30 degC / 60% RH) | [TRAINING-DATA] verify |

## Antenna Requirements

### Passive Antenna
- 50 ohm impedance
- Ceramic patch or helical
- Internal LNA + SAW filter handles gain
- Place RF_IN trace as short as possible, 50 ohm controlled impedance

### Active Antenna
- Powered via VCC_RF pin
- Configure CFG-HW-RF_LNA_MODE to bypass internal LNA when external LNA is present
- Typical active antenna current: 10-20 mA from VCC_RF
- Short circuit protection recommended (series resistor or LDO)

**This design:** u.FL connector to external antenna. BOM specifies Molex 2066400001 active GNSS patch antenna (verify PN at distributor — original PN 2066830001 was not found).

## Application Notes for This Design

1. **V_IO connection is mandatory.** The original schematic left V_IO unconnected. This was caught during the Quectel FAE review and is documented as Critical item C3 in `SCHEMATIC_CHANGES_V1.1.md`. Without V_IO, UART TX/RX pins have no reference voltage and GPS communication fails completely.

2. **100 nF decoupling on V_IO** placed close to pin — added per FAE review fix.

3. **Same module as Trap Monitor.** Both products use MAX-M10S with identical UART interface (9600 baud NMEA), power gate circuit (BSS138 + SI2301), and supercap backup. Firmware GPS HAL is portable between ESP32-S3 and STM32N6.

4. **GPS timeout.** `config.h` sets GPS_TIMEOUT_S = 300 (5 minutes). Cold start is 24s typical, but poor sky view in dense canopy can exceed this.

5. **Hot-start strategy.** The 0.47F supercap on V_BCKP provides ~7-8 hours of backup. Overnight sleep cycles preserve GPS almanac/ephemeris for 1s hot-start on next wake.

## Procurement

| Source | Notes |
|--------|-------|
| Mouser | Primary — verify stock and lifecycle status |
| DigiKey | Alternative |
| u-blox distribution | For volume or lifecycle questions |

BOM unit cost estimate: ~$12.00 AUD (per BOM.csv).

**Before ordering:** Check product page lifecycle status. If MAX-M10S-00B shows as NRND or EOL, substitute MAX-M10M (flash variant, pin-compatible).

## Known Issues / Errata

1. **V_IO must be connected.** Not self-biased from VCC. This caused a non-functional GPS in the original schematic. Fixed in V1.1 review.

2. **VIO_SEL must float.** Tying VIO_SEL to VCC or GND selects different I/O modes. Leave unconnected for external V_IO reference mode.

3. **FET orientation matters.** SI2301 SOT-23 pinout must be verified against schematic symbol. The FAE review found potential drain/source reversal in the power gate. Verify: Source = 3.3V supply, Drain = GPS VCC load.

4. **Lifecycle risk.** The MAX-M10S may be approaching end-of-life. The MAX-M10M (with flash) is the likely successor. Pin-compatible but verify datasheet before substitution.

5. **No SPI on LCC package.** SPI is only available on the ceramic chip antenna variant (MAX-M10C). This design uses UART — not an issue, but relevant if considering interface changes.

6. **Antenna PN uncertainty.** BOM lists Molex 2066400001 for GNSS patch antenna, but original PN 2066830001 was not found at distributors. Verify correct PN with Molex before ordering.
