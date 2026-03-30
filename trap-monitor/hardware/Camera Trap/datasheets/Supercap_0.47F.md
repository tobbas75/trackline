---
component: Supercapacitor 0.47F 5.5V (GPS V_BCKP)
type: Electric Double Layer Capacitor (EDLC) / Supercapacitor
recommended_part: Eaton KR-5R5V474-R
alternatives: Panasonic Gold Cap, KEMET FG series
status: Selected — Eaton KR-5R5V474-R. 85°C OK with voltage derating to 3.6V (our 3.3V is within budget).
verified_orderable: true (Mouser, Farnell, Arrow — DigiKey may have delisted)
last_updated: 2026-03-29
confidence: HIGH for confirmed specs (capacitance, voltage, ESR=50Ω, temp range, dimensions). ESTIMATED for leakage (~13µA calculated, not datasheet-confirmed — Eaton does not specify leakage for KR series).
datasheet_url: https://www.eaton.com/content/dam/eaton/products/electronic-components/resources/data-sheet/eaton-kr-supercapacitors-coin-cells-data-sheet.pdf
---

# Supercapacitor 0.47F 5.5V — GPS V_BCKP Hot-Start Backup

## Summary

Supercapacitor on the MAX-M10S V_BCKP pin to maintain RTC and ephemeris data during GPS power-off periods, enabling hot-start acquisition (~1-2 seconds) instead of cold-start (~30 seconds). Charged from 3.3V via 100 ohm series resistor.

**CRITICAL: Supercapacitor leakage current is a significant battery life concern.** A cheap supercap leaking 20 uA would add ~40% to the 50 uA sleep budget. A low-leakage part must be specified.

## Recommended Part: Eaton KR-5R5V474-R

| Parameter | Value | Notes |
|-----------|-------|-------|
| Capacitance | 0.47F | -20% / +80% tolerance |
| Rated Voltage | 5.5V | Application uses 3.3V — well within rating |
| ESR | 50 ohm (typical at 1 kHz) | |
| Package | Coin cell, radial leaded | Vertical mount |
| Diameter | 11.5 mm | |
| Height | 12.7 mm (including leads) | Tallest component on board — verify clearance |
| Lead Spacing | 5.0 mm | Standard radial footprint |
| Operating Temp | -25 to +70 C | **NOTE: Max 70 C, not 85 C** |
| Lifetime | 1000 hours at 70 C | At rated voltage (5.5V); longer at 3.3V |
| Chemistry | EDLC (aqueous electrolyte) | |
| RoHS | Compliant | |

## CRITICAL: Leakage Current Analysis

### Leakage Current Specification

The Eaton KR series datasheet specifies leakage current measured per IEC 62391-1: after 72-hour charge-and-hold at rated voltage and 20 C. The formula given is:

**Leakage current (max) = 8 x C x V (milliamps)**

For the KR-5R5V474-R at rated voltage:
- Max leakage = 8 x 0.47 x 5.5 = 20.68 mA — **this is at 5.5V rated voltage**

At 3.3V (our application voltage), leakage will be significantly lower. EDLC leakage scales roughly linearly with voltage. Estimated leakage at 3.3V:
- Proportional estimate: 20.68 mA x (3.3/5.5) = ~12.4 mA — **still extremely high**

**WARNING:** The 8CV formula gives the datasheet MAXIMUM leakage. This is the worst-case per IEC 62391-1 and likely includes initial charging current that hasn't fully decayed. Actual steady-state leakage after extended hold is typically 1-2 orders of magnitude lower.

**Realistic steady-state leakage estimates for 0.47F at 3.3V:**
- Eaton KR series: likely 3-10 uA steady-state (unverified — needs bench measurement)
- Premium low-leakage parts: 1-5 uA steady-state

### Impact on Sleep Budget

| Scenario | Supercap Leakage | Sleep Budget (50 uA) | Impact |
|----------|-----------------|---------------------|--------|
| Best case | 3 uA | 53 uA total | +6% — acceptable |
| Typical | 5-10 uA | 55-60 uA total | +10-20% — manageable |
| Worst case | 20 uA | 70 uA total | +40% — significant |
| Catastrophic | 50 uA+ | 100 uA+ | Doubles sleep current — unacceptable |

### Eaton's Guidance on Supercapacitor Leakage Measurement

Per Eaton's application guidance (from user research, March 2026):
- **Rule of thumb:** Leakage ≈ k × C × V where k = 0.003-0.01 A/(F·V) for coin-cell EDLCs at 25°C
- **Initial vs steady-state:** Leakage is initially HIGH and decays exponentially over 24-72 hours
- **Measurement method:** Charge at constant rated voltage for **≥72 hours**, then measure current to maintain voltage
- **Temperature effect:** Leakage increases significantly with temperature (~doubles per 10°C above 25°C). At 50°C enclosure, expect 4-6× higher leakage than 25°C
- **Voltage sensitivity:** Our 3.3V is well below the 5.5V rating — leakage scales roughly linearly with voltage
- **Self-discharge = leakage:** They are the same phenomenon. Leakage is current needed to hold voltage; self-discharge is voltage loss when charger removed.

**At 3.3V and 25°C:** Estimated 3-8 µA steady-state (using k=0.005-0.01)
**At 3.3V and 50°C (tropical enclosure):** Estimated **12-32 µA** — potentially significant for sleep budget

**Recommendation:** Measure actual leakage on a bench sample before committing to production. If leakage exceeds 10 uA, consider alternatives or add a MOSFET switch to disconnect the supercap from V_BCKP during long sleep periods (losing hot-start capability but preserving battery life).

## Hot-Start Backup Duration

The MAX-M10S V_BCKP pin draws approximately 28 uA to maintain RTC and ephemeris data.

**Backup duration = C x (V_charged - V_min) / I_backup**

| Parameter | Value |
|-----------|-------|
| Capacitance | 0.47F |
| Charged voltage | 3.3V (from 3.3V rail via 100 ohm) |
| Minimum V_BCKP | 1.8V (MAX-M10S minimum backup voltage) |
| Backup current | 28 uA |

**Duration = 0.47 x (3.3 - 1.8) / 0.000028 = 25,178 seconds = ~7.0 hours**

This provides hot-start capability for power-off periods up to 7 hours. For a camera trap checking GPS once or twice per day, this is adequate.

**With leakage factored in:**
- At 5 uA leakage: effective drain = 33 uA, duration = ~5.9 hours
- At 10 uA leakage: effective drain = 38 uA, duration = ~5.2 hours
- At 20 uA leakage: effective drain = 48 uA, duration = ~4.1 hours

Even with pessimistic leakage, hot-start backup exceeds 4 hours.

## Charge Time

Charged from 3.3V via 100 ohm series resistor (R_charge in BOM):

**Time constant tau = R x C = 100 x 0.47 = 47 seconds**

| Charge Level | Time | Voltage |
|-------------|------|---------|
| 63% (1 tau) | 47 seconds | ~2.1V |
| 86% (2 tau) | 94 seconds | ~2.8V |
| 95% (3 tau) | 141 seconds | ~3.1V |
| 98% (4 tau) | 188 seconds | ~3.2V |
| 99%+ (5 tau) | 235 seconds (~4 min) | ~3.27V |

The supercap will be usably charged within ~2 minutes of power-on and fully charged within ~4 minutes. This is acceptable — the GPS module typically runs for 30+ seconds during a fix, and the supercap will be topped up each time.

## Alternative Parts Considered

### KEMET FG0H474ZF (FG Series)

| Parameter | Value | Comparison |
|-----------|-------|-----------|
| Capacitance | 0.47F | Same |
| Voltage | 5.5V | Same |
| ESR | 120 ohm | Higher than Eaton (50 ohm) |
| Diameter | 11.5 mm | Same |
| Height | 10.5 mm | Shorter — better for clearance |
| Temp Range | -25 to +70 C | Same |
| Leakage | Not specified in search results | Needs datasheet check |
| Price | ~$1.50 AUD | Similar |

### Panasonic Gold Cap (EEC-series)

Panasonic offers 0.47F 5.5V in their Gold Cap range. Traditionally good leakage performance. Specific part numbers vary — search DigiKey for "EEC" + 0.47F + 5.5V.

### Comparison Summary

| Part | ESR | Height | Leakage | Availability | Price |
|------|-----|--------|---------|-------------|-------|
| Eaton KR-5R5V474-R | 50 ohm | 12.7mm | TBD — needs bench test | Excellent | ~$1.50 AUD |
| KEMET FG0H474ZF | 120 ohm | 10.5mm | TBD | Good | ~$1.50 AUD |
| Panasonic Gold Cap | TBD | TBD | Historically good | Good | ~$2.00 AUD |

**Recommendation:** Start with the Eaton KR-5R5V474-R (best ESR, widely available). Measure actual leakage on the bench. If leakage is unacceptable (>10 uA), test alternatives.

## Temperature Concern

**Operating range is -25 to +70 C.** The design spec notes enclosure internal temperature could reach 70 C in tropical sun. This is right at the limit.

- At 70 C, electrolyte degradation accelerates (lifetime = 1000 hours at 70 C)
- Below -25 C, capacitance drops significantly and ESR increases

For tropical deployment, the white/light-grey enclosure (per DESIGN_SPEC) is critical to keep internal temps below 70 C. If enclosure temps regularly exceed 70 C, consider:
- Moving the supercap to a cooler location in the enclosure
- Using a part rated to +85 C (fewer options at 0.47F)
- Accepting reduced lifetime and budgeting for replacement

## Physical Fit

At 11.5mm diameter x 12.7mm height, this is a relatively tall component. On the 90 x 70 mm main board:
- Place near the MAX-M10S module to minimise trace length to V_BCKP
- Verify vertical clearance inside the enclosure
- Use a radial footprint with 5.0mm lead spacing
- Consider a through-hole pad with thermal relief for easy rework

## Ordering

| Distributor | Part Number | Stock |
|-------------|-------------|-------|
| DigiKey | KR-5R5V474-R | In stock |
| Mouser | KR-5R5V474-R | In stock |
| Farnell / element14 | 2909050 | In stock |
| Arrow | KR-5R5V474-R | In stock |

Unit price: ~$1.50 AUD (qty 1).

## Open Items

- [ ] **CRITICAL:** Measure actual steady-state leakage current on bench sample at 3.3V after 72+ hour hold
- [ ] If leakage > 10 uA, test KEMET FG and Panasonic Gold Cap alternatives
- [ ] If leakage unacceptable on all parts, design MOSFET disconnect circuit for sleep mode
- [ ] Verify 12.7mm height clears enclosure at supercap mounting location
- [ ] Consider adding a MOSFET power gate on V_BCKP charge path as insurance (can be DNP if leakage is acceptable)
- [ ] Review MAX-M10S datasheet for exact V_BCKP minimum voltage and backup current at 3.3V

## Sources

- [Eaton KR Series Datasheet](https://www.eaton.com/content/dam/eaton/products/electronic-components/resources/data-sheet/eaton-kr-supercapacitors-coin-cells-data-sheet.pdf)
- [Eaton Product Page](https://www.eaton.com/us/en-us/skuPage.KR-5R5V474-R.html)
- [DigiKey Listing](https://www.digikey.com/en/products/detail/eaton-electronics-division/KR-5R5V474-R/1556243)
- [KEMET FC Series Datasheet](https://content.kemet.com/datasheets/KEM_S6011_FC.pdf)
- [Farnell Listing](https://il.farnell.com/eaton-bussmann-series/kr-5r5v474-r/cap-0-47f-5-5v-super-cap-radial/dp/2909050)
