---
component: TPS7A0218DBVR
manufacturer: Texas Instruments
category: Power — Ultra-Low-Iq LDO Regulator
status: Active
last_verified: 2026-03-29
confidence: HIGH for specs fetched from TI product page (Iq, Vout, Iout, dropout, PSRR, noise, package); LIKELY for pinout details and absolute max ratings sourced from training data — verify against datasheet before PCB layout.
---

# TPS7A02 — 200mA Ultra-Low-Iq LDO, 25nA Quiescent

## Datasheet Links

- Product page: https://www.ti.com/product/TPS7A02
- Datasheet PDF: https://www.ti.com/lit/ds/symlink/tps7a02.pdf
- Application report: TI SLVA868 — Noise and PSRR of LDOs

## Key Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Input voltage range | 1.1V to 6.0V | Operating range per TI product page (1.5V to 6.0V listed elsewhere — VERIFY) |
| Output voltage | 0.8V to 5.0V (fixed, 50mV steps) | "18" suffix = 1.8V fixed |
| Max output current | 200mA | |
| Quiescent current (Iq) | 25 nA typical | Even maintained in dropout condition |
| Shutdown current | 3 nA typical | EN pin driven LOW |
| Output voltage accuracy | +/-1.5% | Over temperature |
| Dropout voltage | 205 mV typical at 200mA | 270 mV max at 200mA (Vout=3.3V) |
| PSRR at 100 kHz | 35 dB | |
| Output noise | 130 uVrms | Integrated, 10Hz to 100kHz |
| Load transient response | <10 us settling | 100mV undershoot for 1mA to 50mA step |
| Start-up time | Likely 50-200 us | VERIFY from datasheet |
| Output capacitor | >= 1 uF | Stable with 1uF or larger ceramic |
| Enable pin | Yes | With smart pulldown |
| Active output discharge | Yes | Internal pulldown when disabled |
| Thermal resistance (theta-JA) | 179.1 C/W | SOT-23-5 (DBV) package |
| Operating temperature | -40C to +125C | |
| Thermal shutdown | Yes | VERIFY threshold from datasheet |

## Absolute Maximum Ratings

| Parameter | Value | Notes |
|-----------|-------|-------|
| Input voltage (VIN) | 6.5V | VERIFY — likely abs max is above 6.0V operating max |
| Output current | Internally limited | VERIFY current limit value |
| Junction temperature | 150C | VERIFY |
| ESD (HBM) | 2 kV | VERIFY |

**WARNING: Absolute maximum ratings are from training data. Verify against datasheet.**

## Pin Configuration — SOT-23-5 (DBV Package)

```
        ___________
  IN  1|           |5  EN
       |  TPS7A02  |
  GND 2|           |4  NC
       |___________|
            |
            3 OUT
```

| Pin | Name | Function |
|-----|------|----------|
| 1 | IN | Power input |
| 2 | GND | Ground |
| 3 | OUT | Regulated output |
| 4 | NC | No connect |
| 5 | EN | Enable (active HIGH, internal pulldown) |

**VERIFY this pinout against the datasheet. Incorrect pinout on an LDO causes immediate damage.**

### Other Package Options

| Package | Designator | Size | Pins | Notes |
|---------|-----------|------|------|-------|
| SOT-23-5 | DBV | 2.9 x 1.6 mm | 5 | **Used in this design** |
| X2SON | DQN | 1.0 x 1.0 mm | 4 | Ultra-small, no NC pin |
| DSBGA | YCH | 0.64 x 0.64 mm | 4 | Wafer-level BGA |

## Output Voltage Variants — Part Number Convention

The TPS7A02 uses a two-digit suffix to indicate fixed output voltage:

| Suffix | Vout | Full Part Number (SOT-23-5) |
|--------|------|----------------------------|
| 08 | 0.8V | TPS7A0208DBVR |
| 10 | 1.0V | TPS7A0210DBVR |
| 11 | 1.1V | TPS7A0211DBVR |
| 12 | 1.2V | TPS7A0212DBVR |
| 15 | 1.5V | TPS7A0215DBVR |
| 18 | 1.8V | **TPS7A0218DBVR** (this design) |
| 25 | 2.5V | TPS7A0225DBVR |
| 30 | 3.0V | TPS7A0230DBVR |
| 33 | 3.3V | TPS7A0233DBVR |
| 50 | 5.0V | TPS7A0250DBVR |

Suffix "R" = reel. "T" = tape. VERIFY exact suffixes from TI ordering guide.

**For this design: TPS7A0218DBVR — 1.8V fixed output, SOT-23-5, reel.**

## Power

### Dropout Voltage

| Load Current | Dropout (typ) | Dropout (max) | Notes |
|-------------|---------------|---------------|-------|
| 1 mA | ~10 mV | ~20 mV | VERIFY from datasheet |
| 10 mA | ~20 mV | ~40 mV | VERIFY |
| 50 mA | ~50 mV | ~80 mV | VERIFY |
| 100 mA | ~100 mV | ~140 mV | VERIFY |
| 200 mA | 205 mV | 270 mV | From TI product page |

At 3.3V input, 1.8V output: headroom = 1.5V. Dropout is not a concern in normal operation. Even if the 3.3V rail sags to 2.5V under heavy load (unlikely), headroom = 0.7V — still well above dropout.

### PSRR Performance

| Frequency | PSRR (typical) | Notes |
|-----------|----------------|-------|
| 100 Hz | ~60 dB | VERIFY from datasheet |
| 1 kHz | ~55 dB | VERIFY |
| 10 kHz | ~45 dB | VERIFY |
| 100 kHz | 35 dB | From TI product page |
| 1 MHz | ~20 dB | VERIFY — rolls off above 100kHz |

**For this design:** The 1.8V rail powers the IMX678 DOVDD (digital I/O) and PSRAM. DOVDD is not the analog supply — AVDD (3.3V) is the noise-sensitive rail for the image sensor. PSRR at 100kHz = 35dB is adequate for digital I/O.

**MIPI CSI-2 frequency consideration:** MIPI CSI-2 operates at hundreds of MHz to GHz. At these frequencies, the LDO provides essentially no PSRR — supply filtering depends on local decoupling capacitors on the IMX678 DOVDD pins. Place 100nF + 10uF ceramic capacitors as close as possible to the sensor DOVDD pins.

### Efficiency and Power Dissipation

LDO efficiency = Vout / Vin = 1.8 / 3.3 = 54.5%

Power dissipated in the LDO = (Vin - Vout) x Iload = 1.5V x Iload

| Load | Power Dissipated | Junction Rise (179.1 C/W) |
|------|-----------------|--------------------------|
| 10 mA | 15 mW | 2.7C |
| 50 mA | 75 mW | 13.4C |
| 100 mA | 150 mW | 26.9C |
| 120 mA | 180 mW | 32.3C |
| 200 mA | 300 mW | 53.8C |

At 52C ambient (tropical enclosure) + 120mA load: Tj = 52 + 32.3 = 84.3C. Well within 125C operating limit.

At 200mA (absolute worst case): Tj = 52 + 53.8 = 105.8C. Still within limits but getting warm.

### Why LDO Instead of Buck for 1.8V?

The TPS7A02 was chosen over a buck converter for the 1.8V rail because:

1. **Ultra-low noise** (130 uVrms) — important for image sensor I/O
2. **25nA Iq** — effectively zero sleep current (vs. 4uA for another TPS62088)
3. **Small load** — peak ~120mA, so the 54.5% efficiency penalty is only ~180mW absolute
4. **Simplicity** — no inductor, no switching noise, two capacitors total
5. **The load is only active during capture** — ~1.5 seconds per trigger, 70 triggers/day = ~105 seconds/day of LDO waste = negligible energy impact

## Application Notes for This Design

### Load Analysis — Is 200mA Sufficient?

| Consumer | Peak Current | Duty | Notes |
|----------|-------------|------|-------|
| IMX678 DOVDD (1.8V I/O) | ~50 mA | During capture | MIPI CSI-2 output drivers |
| APS256XXN PSRAM | 30-50 mA | During capture + AI | HexaSPI x16 DDR at 250MHz |
| STM32N6 VDDIO_XSPI1 | ~20 mA | During PSRAM access | I/O bank power for xSPI1 |
| **Total peak** | **100-120 mA** | | **Within 200mA limit** |

**Margin:** 200mA - 120mA = 80mA (40% margin). Adequate but not generous. If PSRAM or MIPI drivers draw more than expected, headroom shrinks.

**Recommendation:** Monitor actual current draw on the prototype. If peak exceeds 150mA, consider:
- Upgrading to TPS7A20 (500mA) or similar
- Adding local bulk capacitance (100uF) to handle transient peaks

### Power Sequencing

The TPS7A02 EN pin controls the 1.8V rail. In the power-up sequence:

1. 3.3V rail established (AP63300 U11, always on)
2. U10b TPS62088 EN asserted: 1.1V DVDD rises (IMX678 digital core)
3. **U12 TPS7A02 EN asserted: 1.8V DOVDD rises** (IMX678 I/O + PSRAM)
4. AVDD filter path: 3.3V filtered for IMX678 analog (last)

All within 200ms per IMX678 power-on spec.

### Sleep Behavior

When EN = LOW:
- Output discharged via internal pulldown (smart enable)
- Shutdown current: 3nA — effectively zero
- The 25nA operating Iq is only relevant when EN = HIGH with no load

In the sleep budget, this contributes ~0nA (disabled) or ~25nA (enabled, no load) — negligible either way.

### Input/Output Capacitors

- **Input:** >= 1uF ceramic, X5R or X7R, placed close to IN pin
- **Output:** >= 1uF ceramic, X5R or X7R, placed close to OUT pin
- **Additional output decoupling:** 10-100nF ceramics at each load (IMX678 DOVDD pins, PSRAM VDD pins, VDDIO_XSPI1)

No stability concerns with large output capacitance — the TPS7A02 is stable with any capacitor >= 1uF.

## Procurement

| Source | Part Number | Package | Notes |
|--------|-------------|---------|-------|
| DigiKey | TPS7A0218DBVR | SOT-23-5 | Reel |
| Mouser | TPS7A0218DBVR | SOT-23-5 | Reel |
| DigiKey | TPS7A0218DBVT | SOT-23-5 | Cut tape |

**Availability:** Generally good stock. SOT-23-5 is a standard package, no assembly concerns.

## Known Issues / Errata

1. **Output noise at very light load.** The 130uVrms spec is at a defined load (likely 10-50mA). At near-zero load, noise may be higher. Not a concern for this design — load is either ~100mA (active) or 0mA (rail disabled).

2. **No adjustable variant.** The TPS7A02 is fixed-output only. If the 1.8V rail voltage needs to change, a different suffix part must be used — or switch to TPS7A03 (adjustable variant, higher Iq).

3. **Thermal resistance is high** (179.1 C/W) for SOT-23-5. At 200mA continuous, junction temperature rise is 54C. In a 52C enclosure, this reaches 106C — within limits but hot. Our design peaks at ~120mA for <2 seconds, so thermal is not a concern.

4. **Enable pin has internal pulldown** (smart enable). If EN is left floating, the device is OFF. This is desirable — the 1.8V rail is off by default until explicitly enabled.

5. **Input voltage range discrepancy.** TI product page lists both "1.1V to 6.0V" and "1.5V to 6.0V" in different places. The minimum input for a 1.8V output is Vout + Vdropout = 1.8V + 0.27V = 2.07V at full load. At 3.3V input, this is not a concern. VERIFY the absolute minimum VIN from the datasheet.
