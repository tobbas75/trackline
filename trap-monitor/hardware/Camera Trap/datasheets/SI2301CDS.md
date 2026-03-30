---
component: SI2301CDS-T1-GE3
manufacturer: Vishay Siliconix
category: Power — P-Channel MOSFET (Power Gating)
status: Active
last_verified: 2026-03-29
confidence: LIKELY — specs sourced from training data and LCSC listing (C10487). Partial data confirmed from LCSC (Vds=20V, Id=3.1A, SOT-23). Detailed Rds(on), Vgs(th), and timing specs from training data — verify against Vishay datasheet before design sign-off.
---

# SI2301CDS — P-Channel 20V 2.3A MOSFET, SOT-23

## Datasheet Links

- Vishay datasheet: https://www.vishay.com/docs/68741/si2301cd.pdf
- LCSC: https://www.lcsc.com/product-detail/C10487.html (SI2301CDS-T1-GE3)

## Key Specifications

| Parameter | Value | Conditions | Notes |
|-----------|-------|------------|-------|
| Drain-Source voltage (Vds) | -20V max | | P-channel — voltages are negative convention |
| Gate-Source voltage (Vgs) | +/-12V max | | VERIFY — some variants are +/-8V |
| Continuous drain current (Id) | -2.3A | at Ta=25C | LCSC lists 3.1A — VERIFY which spec applies (may be pulsed or different temp) |
| Pulsed drain current | -9A | 10us pulse | VERIFY |
| Rds(on) at Vgs = -4.5V | 80 mohm typical | Id = -2.3A | 110 mohm max. VERIFY. |
| Rds(on) at Vgs = -2.5V | 142 mohm typical | Id = -1.5A | 200 mohm max. VERIFY. |
| Rds(on) at Vgs = -1.8V | ~250 mohm typical | Id = -1.0A | VERIFY — marginal gate drive from 1.8V logic |
| Gate threshold (Vgs(th)) | -1.0V typical | Vds = Vgs, Id = -250uA | -0.4V min, -1.5V max. VERIFY. |
| Total gate charge (Qg) | ~8.5 nC | Vgs = -4.5V | VERIFY |
| Input capacitance (Ciss) | ~700 pF | Vds = -10V, Vgs = 0V | VERIFY |
| Output capacitance (Coss) | ~300 pF | | VERIFY |
| Reverse transfer cap (Crss) | ~150 pF | | VERIFY |
| Turn-on delay (td(on)) | ~10 ns | | VERIFY |
| Rise time (tr) | ~15 ns | | VERIFY |
| Turn-off delay (td(off)) | ~50 ns | | VERIFY |
| Fall time (tf) | ~20 ns | | VERIFY |
| Power dissipation | 1.6W max | SOT-23, Ta=25C | Derate above 25C |
| Thermal resistance (theta-JA) | ~75 C/W | SOT-23, mounted on PCB | VERIFY |
| Body diode Vf | ~0.8V | Is = -1A | Intrinsic body diode |

## Absolute Maximum Ratings

| Parameter | Value | Notes |
|-----------|-------|-------|
| Vds | -20V | |
| Vgs | +/-12V | VERIFY |
| Id (continuous, Ta=25C) | -2.3A | Derated at higher temp |
| Id (pulsed) | -9A | VERIFY pulse width |
| Pd (Ta=25C) | 1.6W | SOT-23 |
| Tj max | 150C | |
| Storage temp | -55C to +150C | |

**WARNING: All values from training data. Verify against Vishay datasheet.**

## Pin Configuration — SOT-23

```
     _______
  G 1|       |3 S
     |SI2301 |
     |_______|
         |
         2 D
```

| Pin | Name | Function |
|-----|------|----------|
| 1 | Gate (G) | Gate drive input |
| 2 | Drain (D) | Drain — connects to load (downstream) |
| 3 | Source (S) | Source — connects to supply (upstream, higher voltage) |

**P-channel high-side switch topology:** Source connects to the supply rail (e.g., 3.3V). Drain connects to the load. Gate is pulled to Source (OFF) or pulled to GND (ON).

**VERIFY pin assignment against datasheet. SOT-23 MOSFET pinouts vary between manufacturers.**

## Power — High-Side P-FET Switch with BSS138 Inverter

### Circuit Topology (Used for GPS and ESP32-C3 Power Gates)

```
3.3V Rail ─────┬──── Source (pin 3)
               │
           [10k pull-up]
               │
               ├──── Gate (pin 1)
               │
          BSS138 Drain
               │
          BSS138 Gate ◄── GPIO (PB5 for GPS, PG7 for C3)
               │
          BSS138 Source ── GND
               │
         Drain (pin 2) ──── Load (GPS VCC or C3 VCC)
```

**Operation:**
- GPIO HIGH: BSS138 turns on, pulls SI2301 gate to GND. Vgs = -3.3V. SI2301 turns fully on. Load powered.
- GPIO LOW: BSS138 off, 10k pull-up pulls SI2301 gate to Source (3.3V). Vgs = 0V. SI2301 off. Load unpowered.

**Logic: GPIO HIGH = load powered. GPIO LOW = load off.** This matches the convention in config.h.

### Gate Drive Analysis

| GPIO State | BSS138 Gate | BSS138 | SI2301 Gate | SI2301 Vgs | SI2301 State | Rds(on) |
|-----------|-------------|--------|-------------|------------|--------------|---------|
| LOW (0V) | 0V | OFF | 3.3V (pull-up) | 0V | OFF | Open |
| HIGH (3.3V) | 3.3V | ON | ~0V (BSS138 pulls low) | -3.3V | ON | ~100 mohm |

At Vgs = -3.3V:
- Rds(on) is between the -2.5V spec (142 mohm) and -4.5V spec (80 mohm)
- Estimated: ~100 mohm at Vgs = -3.3V
- For GPS (25mA): Vdrop = 25mA x 0.1ohm = 2.5mV. Negligible.
- For ESP32-C3 (500mA peak): Vdrop = 500mA x 0.1ohm = 50mV. Acceptable (3.3V - 0.05V = 3.25V).

### Power Dissipation in Switch

- GPS: P = (25mA)^2 x 0.1ohm = 0.06mW. Negligible.
- ESP32-C3: P = (500mA)^2 x 0.1ohm = 25mW. No thermal concern.
- Worst case (3A through SI2301): P = 9A^2 x 0.1 = 0.9W. Would require derating — but 3A exceeds our load.

### Turn-On/Off Timing

The BSS138 gate inverter introduces delay:
- BSS138 turn-on: ~5ns (fast — Ciss is small)
- SI2301 Vgs swing through 10k pull-up: RC time constant = 10k x 700pF = 7us to pull gate low
- SI2301 turn-on: ~10us total from GPIO assertion

For power gating (GPS/C3), 10us turn-on is irrelevant. These subsystems need 10-100ms to boot after power is applied.

Turn-off is faster (BSS138 off, 10k pull-up charges SI2301 Ciss): ~7us.

## Application Notes for This Design

### Q3 — GPS Power Gate

- Source: 3.3V rail (AP63300 U11 output)
- Drain: u-blox MAX-M10S VCC
- Gate: Driven by BSS138 (Q4), controlled by GPIO PB5
- Load: ~25mA (GPS active), 0A (off)
- Voltage drop: ~2.5mV at 25mA — GPS sees 3.297V, within spec

### Q_C3 — ESP32-C3 Power Gate

- Source: 3.3V rail
- Drain: ESP32-C3-MINI-1U VCC
- Gate: Driven by BSS138, controlled by GPIO PG7
- Load: 120-500mA (WiFi/BLE active), 0A (off)
- Voltage drop: ~12-50mV — ESP32-C3 sees 3.25-3.29V, within spec
- Phase 1: C3 is powered OFF (PG7 = LOW, PHASE1_C3_ENABLED = 0)

### Gate Pull-Up Resistor

The 10k pull-up from gate to source ensures the P-FET is OFF when:
- The MCU is in reset (GPIOs floating)
- The BSS138 gate drive is not yet established
- Power is first applied

**CRITICAL: Without this pull-up, the SI2301 could turn on uncontrolled during power-up, potentially causing inrush current or powering subsystems before the MCU is ready.**

### Off-State Leakage

When the SI2301 is off (Vgs = 0V):
- Drain-source leakage: ~1uA max at Vds = -20V, ~100nA at Vds = -3.3V (our case)
- This leakage is negligible in the sleep budget

## Procurement

| Source | Part Number | Package | LCSC | Notes |
|--------|-------------|---------|------|-------|
| LCSC | SI2301CDS-T1-GE3 | SOT-23 | C10487 | **Primary source** |
| DigiKey | SI2301CDS-T1-GE3 | SOT-23 | — | Alternative |
| Mouser | SI2301CDS-T1-GE3 | SOT-23 | — | Alternative |

**Quantity:** 2 per board (Q3 for GPS, Q_C3 for ESP32-C3).

**Alternatives:** Many P-channel MOSFETs with similar specs exist (AO3401, DMP2035U, etc.). The SI2301CDS was chosen for:
- Low Rds(on) at -2.5V gate drive (works with 3.3V logic via BSS138 inverter)
- Low Vgs(th) ensures full enhancement at -3.3V Vgs
- Ubiquitous availability at LCSC
- Proven in Trap Monitor design (shared circuit)

## Known Issues / Errata

1. **Vgs(th) spread.** The -0.4V to -1.5V threshold range is wide. At Vgs = -1.8V (if driven from a 1.8V rail), some units might not fully enhance. In this design, Vgs = -3.3V via BSS138 inverter, so this is not a concern. Do NOT use SI2301 with direct 1.8V gate drive.

2. **Body diode.** The intrinsic body diode conducts from drain to source when the FET is off and the drain is more negative than the source. In the high-side P-FET configuration, the source is at 3.3V and the drain goes to the load — the body diode is reverse-biased during normal off-state. No concern.

3. **Inrush current.** When the FET turns on, the load's bypass capacitors charge through Rds(on). For the ESP32-C3 module (~10uF total capacitance on its VCC), inrush = 3.3V / 0.1ohm = 33A peak (limited by SI2301 pulsed current rating of ~9A). In practice, the BSS138's ~7us gate drive slew rate limits di/dt. Consider adding a small series resistor (1-10ohm) in the drain path to limit inrush if the C3 module has large bulk capacitors.

4. **Current rating discrepancy.** LCSC lists 3.1A continuous, Vishay datasheet likely lists 2.3A at Ta=25C. The 3.1A figure may be at Tc=25C (case temperature) or a different derating. Our loads (25mA GPS, 500mA C3) are well within either limit.

5. **SOT-23 orientation.** SOT-23 has multiple possible pinouts depending on manufacturer. ALWAYS verify against the Vishay SI2301CDS datasheet, not generic SOT-23 assumptions. Incorrect gate/drain/source assignment causes either no switching or direct short circuit.
