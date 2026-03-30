# IR LED Module Daughter Board Specification

**Date:** March 2026
**Applies to:** Camera Trap only
**Status:** DRAFT

---

## 1. Purpose

Define the modular IR illumination daughter board interface. The main PCB provides a standardised 4-pin connector. LED modules are field-swappable to match deployment conditions (dense scrub vs open waterhole, covert vs research, etc).

---

## 2. Connector

**Connector:** JST GH 4-pin (SM04B-GHS-TB), keyed.
**Cable:** JST GH to GH, 100 mm max.
**Location:** Main PCB edge nearest enclosure front panel.

| Pin | Signal | Type           | Description |
|-----|--------|----------------|-------------|
| 1   | VLED   | Power (5V, 2A) | Regulated supply from main board. LED board has its own current-limiting. |
| 2   | STROBE | Logic (3.3V)   | Active-HIGH strobe from STM32N6 TIM1. HIGH = LEDs on. |
| 3   | ID     | Analog (ADC)   | Resistor divider identifies module variant. Read at boot. |
| 4   | GND    | Ground         | Common ground return. |

---

## 3. Strobe Timing

The STM32N6 TIM1 (advanced timer) generates the strobe signal synchronised to IMX678 MIPI CSI-2 frame-valid.

**Timing chain:**
```
MIPI CSI-2 frame start → TIM1 triggered → STROBE pin HIGH →
  AL8861 EN goes HIGH → LED current flows →
  exposure window (30ms) →
  STROBE pin LOW → AL8861 EN goes LOW → LEDs off
```

- **Pulse width:** ~30 ms per frame (matched to sensor integration time)
- **Pulses per burst:** 10 (one per frame)
- **Total on-time per burst:** ~300 ms
- **Timing jitter:** < 100 ns (hardware timer, no software involvement)
- **No CPU load** during burst — timer runs autonomously once configured

### Comparison to continuous illumination

| Method     | On-time/burst | Current | Energy/burst (night) |
|------------|---------------|---------|----------------------|
| Continuous | 1500 ms       | 1400 mA | 0.583 mAh           |
| Strobed    | 300 ms        | 1400 mA | 0.117 mAh           |
| **Saving** |               |         | **80% reduction**    |

---

## 4. LED Driver

**IC:** Diodes AL8861 (on daughter board)
- Buck constant-current LED driver. STROBE signal drives VSET pin (HIGH = on, <0.2V = standby).
- Soft-start: ~100 µs with no external cap on VSET (0.3% of 30ms pulse — acceptable).
- Current set by sense resistor: R_sense = V_sense / I_target = 0.25V / I_target.

> **CRITICAL — V1.2 review findings:**
>
> 1. **AL8861 in TSOT-25 is rated 1.0A max.** The design requires 1.4A total. Either use **SOT89-5 package** (AL8861Y-13, rated 1.5A) or split into two drivers.
>
> 2. **LED topology must be PARALLEL, not series.** 8 series LEDs at ~2.7V Vf each = ~21.6V total. The 5V VLED rail cannot drive a series string. The AL8861 bucks 5V → ~2.7V and drives all 8 LEDs in parallel at 175mA each (1.4A total).
>
> 3. **Parallel LEDs need individual ballast resistors** (~1Ω each) for current sharing, since LEDs have Vf variation that causes uneven current distribution without ballasting.
>
> **Recommended fix:** Use **AL8861Y-13 (SOT89-5, 1.5A)** with 8 parallel LEDs + 1Ω ballast per LED. R_sense = 0.18Ω → 1.4A total. Or split into two AL8861QNT7G (TSOT-25, 1.0A) each driving 4 parallel LEDs at 700mA with R_sense = 0.36Ω.

**Fail-safe:** If STROBE stuck HIGH, AL8861 thermal shutdown protects LEDs. Thermal foldback limits maximum continuous on-time.

---

## 5. Module Identification

Each module carries a unique resistor to GND on the ID pin, forming a voltage divider with a 10kΩ pull-up to 3.3V on the main board.

| Module                        | R_ID to GND | Voltage at ADC | ADC (10-bit) | Gap to next | Status   |
|-------------------------------|-------------|----------------|--------------|-------------|----------|
| Blank plug                    | 1.2kΩ       | ~0.35V         | ~107         | —           | Phase 1  |
| 940nm Super Long *(reserved)* | 2.7kΩ       | ~0.70V         | ~213         | 106         | Future   |
| 940nm Long Range              | 5.6kΩ       | ~1.19V         | ~359         | 146         | Phase 1  |
| 940nm Standard                | 10kΩ        | ~1.65V         | ~500         | 141         | Phase 1  |
| 850nm Research *(reserved)*   | 22kΩ        | ~2.27V         | ~688         | 188         | Future   |
| White Flash                   | 47kΩ        | ~2.72V         | ~824         | 136         | Phase 1  |
| No module (open)              | ∞           | ~3.3V          | >950         | 126+        | —        |

All resistors are E24 standard values. Minimum gap between adjacent bands is 106 ADC counts (~0.35V), well above the ±50 count tolerance window. Firmware reads ADC at boot, matches to nearest band, logs module type in all image metadata. No user configuration required.

---

## 6. Module Variants

Phase 1 ships four modules. Two additional IDs are reserved for future variants — the ID resistor table (§5) is kept intact so future modules auto-detect without firmware changes.

### 6.1 Standard 940nm (default) — Phase 1

| Parameter | Value |
|-----------|-------|
| LEDs      | 8× Osram SFH 4725AS A01 |
| Drive current | 175 mA each (1.4A total) |
| Beam angle | 80° full (40° half-angle) |
| Wavelength | 950 nm peak / 940 nm nominal (covert, no visible glow) |
| Range     | 10–15 m |
| R_sense   | 0.18Ω (sets 1.4A via AL8861) |
| Use case  | Default for most deployments |

### 6.2 Long Range 940nm — Phase 1

| Parameter | Value |
|-----------|-------|
| LEDs      | 4× Osram SFH 4725AS A01 + 30° secondary optics (TIR lens) |
| Drive current | 350 mA each (1.4A total) |
| Beam angle | 30° |
| Wavelength | 940 nm |
| Range     | 15–25 m |
| R_sense   | 0.18Ω |
| Use case  | Waterholes, open country, road crossings |

### 6.3 850nm Research — RESERVED (future)

ID resistor slot reserved (R_ID = 22kΩ). Module not manufactured for Phase 1. Better sensor QE at 850nm but faint red glow visible to human eye. Build if research partners request it.

### 6.4 White Flash — Phase 1

| Parameter | Value |
|-----------|-------|
| LEDs      | 4× Cree XP-G3 |
| Drive current | 350 mA each (1.4A total) |
| Beam angle | 45° |
| Wavelength | Broadband white |
| Range     | 8–12 m |
| R_sense   | 0.18Ω |
| Use case  | Full colour photos day and night. Ear tag / marking ID. May startle animals — deployment decision. |

### 6.5 940nm Super Long Range — RESERVED (future)

ID resistor slot reserved (R_ID = 2.7kΩ). Module not manufactured for Phase 1. 4× SFH4726AS with 15° TIR optics for extreme distance (25m+). Build if field trials show long-range module insufficient.

### 6.6 Blank Plug — Phase 1

No LEDs, no driver. Just the JST GH connector with the ID resistor (1.2kΩ). For daytime-only deployments or sites with external lighting.

---

## 7. Daughter Board Mechanical

| Parameter     | Value |
|---------------|-------|
| PCB size      | 30 × 40 mm max |
| Layers        | 2-layer FR4 |
| Finish        | HASL (low cost) |
| Components    | LEDs, AL8861, sense resistor, decoupling, ID resistor, JST connector |
| Mounting      | 2× M2 holes for standoffs behind IR window |
| LED placement | Front edge, facing enclosure window |
| Cable         | JST GH 4-pin, 100 mm to main board |

---

## 8. Thermal Considerations

Strobed operation drastically reduces thermal load. At 300 ms on per 1500 ms burst cycle, duty cycle is 20%. Worst case (continuous stuck-HIGH fault) is limited by AL8861 thermal shutdown.

For the Standard 940nm module at 1.4A strobed:
- Average power dissipation during burst: ~3.5W (LED Vf × I)
- Average over full trigger cycle: ~0.7W
- Average over a day (70 triggers × 300ms): negligible
- No heatsink required on daughter board

White Flash module has higher Vf — verify thermal at 350mA × 4 LEDs under continuous fault condition.
