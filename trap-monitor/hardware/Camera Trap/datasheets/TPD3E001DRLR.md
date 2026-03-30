---
component: TPD3E001DRLR
manufacturer: Texas Instruments
category: Protection — SIM ESD
status: Active
last_verified: 2026-03-29
sources: |
  - TI product page: https://www.ti.com/product/TPD3E001 (fetched 2026-03-29)
  - Datasheet: https://www.ti.com/lit/ds/symlink/tpd3e001.pdf (fetched 2026-03-29)
  - Project BOM.csv, MODEM_INTERFACE_SPEC.md
confidence: |
  Values marked [FETCHED] were extracted from TI website/datasheet this session.
  Values marked [PROJECT-VERIFIED] are confirmed in project design docs.
  Values marked [TRAINING-DATA] are from pre-training knowledge — verify against current datasheet before use.
---

# TPD3E001DRLR — 3-Channel ESD Protection for SIM Interface

## Datasheet Links

| Document | URL |
|----------|-----|
| Product page | https://www.ti.com/product/TPD3E001 |
| Datasheet (PDF) | https://www.ti.com/lit/ds/symlink/tpd3e001.pdf |
| Application note (SIM protection) | https://www.ti.com/lit/an/slva662/slva662.pdf |

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Channels | **3** | [FETCHED] TI product page |
| ESD protection (contact) | +/-8 kV (IEC 61000-4-2 Level 4) | [FETCHED] TI product page |
| ESD protection (air) | +/-15 kV (IEC 61000-4-2) | [FETCHED] TI product page |
| Capacitance per channel | **1.5 pF** (typical) | [FETCHED] TI product page |
| Leakage current | **< 1 nA** (max) | [FETCHED] TI product page |
| Operating voltage (VCC) | 0.9 to 5.5 V | [FETCHED] TI product page |
| Clamping voltage | ~25 V | [FETCHED] TI product page |
| Peak pulse current | 5.5 A (8/20 us pulse) | [FETCHED] TI product page |
| Operating temperature | -40 to +85 degC | [FETCHED] TI product page |
| Product status | **Active** | [FETCHED] TI product page |

## Absolute Maximum Ratings

| Parameter | Value | Unit | Confidence |
|-----------|-------|------|------------|
| VCC | -0.3 to 6.0 | V | [TRAINING-DATA] verify |
| I/O pin voltage | -0.3 to VCC + 0.3 | V | [TRAINING-DATA] verify |
| ESD (IEC 61000-4-2 contact) | +/-8 | kV | [FETCHED] |
| ESD (IEC 61000-4-2 air) | +/-15 | kV | [FETCHED] |
| Storage temperature | -65 to +150 | degC | [TRAINING-DATA] verify |

## Pin Configuration

### SOT-5X3 (DRL) Package — 5 pins

| Pin | Name | Function | Confidence |
|-----|------|----------|------------|
| 1 | IO1 | Protected I/O channel 1 (SIM DATA) | [TRAINING-DATA] verify pin order |
| 2 | IO2 | Protected I/O channel 2 (SIM CLK) | [TRAINING-DATA] verify pin order |
| 3 | GND | Ground | [TRAINING-DATA] |
| 4 | VCC | Supply voltage — **MUST connect to SIM supply** | [PROJECT-VERIFIED] BOM note |
| 5 | IO3 | Protected I/O channel 3 (SIM RST) | [TRAINING-DATA] verify pin order |

### Package Options

| Package | Suffix | Pins | Dimensions | Confidence |
|---------|--------|------|------------|------------|
| SOT-5X3 | DRL | 5 | 1.6 x 1.0 x 0.55 mm | [FETCHED] |
| USON | DRY | 6 | 1.0 x 1.0 mm | [FETCHED] |
| WSON | DRS | 6 | 1.5 x 1.0 mm | [FETCHED] |

**This design uses DRL (SOT-5X3).** BOM designator: D_SIM, LCSC C128632.

## Power

### VCC Pin — CRITICAL

**The VCC pin (pin 4) MUST be connected to the SIM supply rail with a 0.1 uF bypass capacitor.** This is explicitly called out in the BOM notes and is a common design error.

The TPD3E001 is NOT self-biasing. Unlike some ESD protection devices that work with VCC floating, this device requires VCC to set the correct clamping threshold. Without VCC:
- Clamping voltage will be incorrect
- Protection may be inadequate or absent
- Leakage current increases

| Connection | Detail |
|------------|--------|
| VCC source | SIM_VDD from EG800Q-EU (1.8V or 3.0V auto) |
| Bypass cap | 0.1 uF ceramic, placed close to VCC pin |
| GND | Short trace to local ground |

### Current Consumption

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Supply current (quiescent) | < 1 uA | [TRAINING-DATA] verify |
| Leakage per I/O | < 1 nA | [FETCHED] |

## Application Notes for This Design

### SIM Card Protection

The TPD3E001DRLR protects the three SIM signal lines on the modem daughter card:

| Channel | SIM Signal | Series Resistor |
|---------|-----------|----------------|
| IO1 | SIM_DATA | 22 ohm (R10) |
| IO2 | SIM_CLK | 22 ohm (R11) |
| IO3 | SIM_RST | 22 ohm (R12) |

The series 22 ohm resistors (per Quectel recommendation) are placed between the EG800Q-EU SIM pins and the SIM holder, with the TPD3E001 connected on the SIM holder side.

### Layout

- Place as close to the nano-SIM holder as possible
- Short traces from I/O pins to SIM holder pads
- VCC bypass cap (0.1 uF) within 2 mm of VCC pin
- GND connection via short, wide trace or via to ground plane

### Protection Chain

```
EG800Q-EU SIM pins --[22R series]--+-- SIM holder
                                    |
                                TPD3E001
                                    |
                                   GND
```

## Procurement

| Source | Part Number | Notes |
|--------|-------------|-------|
| LCSC | C128632 | BOM primary source |
| DigiKey | TPD3E001DRLR | Alternative |
| Mouser | TPD3E001DRLR | Alternative |

BOM unit cost estimate: ~$0.30 AUD (per BOM.csv).

## Known Issues / Errata

1. **VCC must be connected.** This is the most common design mistake with this part. The BOM note explicitly warns: "VCC pin (pin 4) MUST connect to SIM supply rail with 0.1 uF bypass cap — not self-biasing." If VCC floats, ESD protection is unreliable.

2. **Capacitance impact on SIM.** At 1.5 pF per channel, the TPD3E001 adds minimal capacitance to the SIM interface. SIM cards typically tolerate up to ~30 pF on data lines, so this is not a concern.

3. **Pin order verification needed.** The exact mapping of IO1/IO2/IO3 to physical pin numbers should be verified against the datasheet before PCB layout. The pin assignments listed above are from training data, not directly verified this session.

4. **SOT-5X3 vs SOT-143 naming.** The BOM lists the package as "SOT-143" but the TI datasheet calls it "SOT-5X3 (DRL)". These may refer to different packages — verify footprint dimensions match before layout. SOT-5X3 is 1.6 x 1.0 mm; SOT-143 is typically 2.9 x 1.3 mm. **If these are different packages, the footprint is wrong. Check the LCSC C128632 listing for physical dimensions.**
