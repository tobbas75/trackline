# Power System Design Review — AI Camera Trap

**Date:** March 2026 (V1.2)
**Purpose:** Explain the power architecture philosophy, every design trade-off made to minimise consumption, and where the remaining budget goes.

---

## 1. The Challenge

Run a full edge AI pipeline — PIR wake, 10-frame 4K burst capture, on-device neural network inference, LTE alert with thumbnail — from 12 AA NiMH batteries, 70 times a day, for 3+ months in tropical Australia. Sleep current must be low enough that the system spends >99.8% of its energy on useful work, not idling.

**Target:** <100 µA total system sleep. Achieved: **~50 µA.**

---

## 2. Architecture Philosophy: "Everything Off Except What's Listening"

The fundamental principle is **aggressive power gating**. In sleep, only three things are powered:

1. **STM32U0** (2 µA) — the watchman. Listens to PIR sensors, monitors battery, keeps RTC.
2. **PIR sensors** (2 µA total) — the ears. Detect motion and wake the system.
3. **Regulators** (always-on 3.3V rail) — the life support. Keeps the watchman and sensors alive.

Everything else — the STM32N6 main MCU, NPU, image sensor, PSRAM, NOR flash, SD card, modem, GPS, ESP32-C3, IR LEDs — is **completely unpowered**. Not sleeping. Not in standby. Off. Zero current.

This is a dual-MCU architecture borrowed from the CamThink NE301 open-source reference design. The STM32U0 (Cortex-M0+, 2 µA standby) acts as a power controller. When a PIR fires, the U0 wakes, enables the N6's power rails, waits for boot, then hands off. When the N6 finishes its work, it signals the U0, which shuts everything down again.

**Why not just use the N6's low-power modes?** Because the STM32N6 is an 800 MHz Cortex-M55 with a 600 GOPS NPU — it's a thoroughbred, not a watchdog. Even in its deepest sleep (VBAT mode), it draws ~8 µA with only 80KB SRAM retained. The U0 does the same job for 2 µA and keeps full context in its 256KB flash. The N6's power is only worth paying for when there's actual AI work to do.

---

## 3. Power Rail Cascade — Why This Topology

### The Problem

12 AA NiMH cells in 6S2P produce 6.0–8.4V. Several of our regulators (TPS62088, TPS7A02) have maximum input voltages of 5.5V and 6.0V respectively. They cannot connect directly to the battery.

### The Solution: Two-Stage Cascade

```
Battery (6.0–8.4V)
  │
  ├── SS34 Schottky diodes (one per parallel string)
  │
  ├──► AP63300 U11 → 3.3V  [ALWAYS ON — Iq 22µA]
  │     ├──► TPS62088 U10a → 0.81V/0.89V  [VDDCORE — PF4 switched]
  │     ├──► TPS62088 U10b → 1.1V          [IMX678 DVDD]
  │     ├──► TPS7A02 U12   → 1.8V          [IMX678 DOVDD + PSRAM]
  │     └──► Ferrite+LC    → 3.3V filtered  [IMX678 AVDD]
  │
  ├──► AP63300 U13 → 3.8V  [Modem VBAT — PB7 gated, Iq 1µA shutdown]
  │
  └──► AP63300 U15 → 5.0V  [LED VLED — PB6 gated, Iq 1µA shutdown]
```

### Trade-offs Made

| Decision | Cost | Benefit |
|----------|------|---------|
| AP63300 for 3.3V rail (replaces TPS62A01) | +7 µA Iq (22 vs ~15 µA) | Survives battery voltage. TPS62A01 max 5.5V — destroyed by 8.4V battery. |
| Two-stage cascade (3.3V → sub-1V) | ~5% efficiency loss vs single stage | TPS62088 max Vin 5.5V. No single-stage buck exists at this voltage ratio in this package. |
| LDO for 1.8V (TPS7A02, not a buck) | ~50% efficiency at 3.3V→1.8V (wastes ~1.5V × load) | Ultra-low noise for image sensor analog. Switching ripple degrades STARVIS 2 image quality at high gain. The load is small (~100mA peak, ~0mA in sleep), so the absolute waste is minimal. |
| Two separate TPS62088 (VDDCORE + DVDD) | Extra $1.50 + board space | STM32N6 VDDCORE is 0.81V/0.89V. IMX678 DVDD is 1.1V. Cannot share — feeding 1.1V to VDDCORE exceeds the STM32N6 maximum rating. |
| 6S2P battery topology (not 12S) | Lower voltage (needs AP63300 for 3.3V) | 2x capacity (4000 vs 2000 mAh). Same 12 cells, same energy, double the runtime. |

---

## 4. Sleep Budget Breakdown — Where Every Microamp Goes

**Total: ~50 µA.** Every component has been scrutinised.

| Component | Current | % of Budget | Why It's There | Can It Be Reduced? |
|-----------|---------|-------------|----------------|-------------------|
| AP63300 U11 (3.3V, always on) | 22 µA | 44% | Only regulator that survives 8.4V battery AND can supply 3A for active loads. Must stay on for U0 + PIR. | **No.** This is the cost of using AP63300. A lower-Iq buck (TPS62A01, ~15µA) can't survive the battery voltage. PMIC could consolidate rails but none fits our exact combination. Revisit for Phase 2. |
| TPS62088 × 2 quiescent | ~8 µA | 16% | STM32N6 VDDCORE and IMX678 DVDD must be present for controlled power-up sequencing. | **Possibly.** Could power-gate U10a/U10b via EN pins during sleep if N6 doesn't need VDDCORE retention. Saves ~8µA but adds startup delay (~1ms). Worth testing. |
| STM32N6 (VBAT mode) | ~8 µA | 16% | Maintains RTC, backup registers, and 80KB SRAM1 (enough for wake context, not AI models). | **Minimal.** Could reduce to ~3µA by disabling SRAM1 retention, but then firmware must reload all context on wake — adds ~50ms. Not worth the trade. |
| Voltage divider (R1=2MΩ, R2=1MΩ) | 2.8 µA | 6% | Battery voltage monitoring. Continuous bleed through resistors. | **Yes — add MOSFET switch.** BSS138 on low side, U0 GPIO controlled. Energise divider only during ADC sample (~1ms). Reduces to ~0µA. Saves 2.8µA. Phase 2 optimisation. |
| STM32U0 standby | 2 µA | 4% | The watchman. Monitors PIR, drives power enables, keeps RTC. | **No.** This is the lowest-power MCU in our design. 2µA for always-on supervision is excellent. |
| PIR sensors (2× EKMB) | 2 µA | 4% | Motion detection. The system's ears. Must be always-on to trigger wake. | **No.** Panasonic EKMB at 1µA each is already the lowest-power digital PIR available. |
| AP63300 U13 + U15 (shutdown) | 2 µA | 4% | Modem and LED bucks in shutdown mode (EN=LOW). | **No.** 1µA each is the shutdown floor for AP63300. |
| Pull-ups, leakage, crystal | 2 µA | 4% | I2C pull-ups (high-value), GPIO leakage, 32kHz crystal. | **Marginal.** Could increase pull-up values or use internal LSI (±5% drift). Saves <1µA. |
| LIS2DW12 (Phase 1 disabled) | 0 µA | 0% | Anti-theft accelerometer. Firmware-disabled in Phase 1. When enabled: +0.5µA. | N/A for Phase 1. |

### The Dominant Cost

The AP63300 3.3V always-on rail at 22 µA accounts for **44% of the entire sleep budget**. This is the single largest design compromise. Every other component has been squeezed to single-digit microamps.

**Phase 2 mitigation options:**
1. **PMIC** — A multi-output PMIC (e.g., STPMIC2 as used on the STM32N6570-DK) could consolidate 3.3V + sub-1V rails with lower combined Iq. But no off-the-shelf PMIC matches our exact combination (3.3V always-on + 0.81V/0.89V switchable + 1.1V + 1.8V LDO + 3.8V 3A + 5.0V 2A, all independently gated).
2. **Separate ultra-low-Iq 3.3V LDO for sleep** — Run a TPS7A02 (25nA Iq) at 3.3V from battery to power only the U0 + PIR during sleep (~5mA max). Switch to AP63300 when the N6 wakes and needs 3A. Saves ~22µA during sleep, adds a FET + LDO (~$0.90). This is the most promising Phase 2 optimisation — could cut sleep budget to ~28µA and extend battery life to ~140 days.

---

## 5. Active Power — How We Keep Each Trigger Cheap

A single trigger event (PIR wake → burst capture → AI inference → LTE alert → sleep) costs **~0.53 mAh** (day) or **~0.65 mAh** (night, with IR). At 70 triggers/day, active consumption is ~37 mAh/day — and sleep adds only 1.2 mAh/day (3.2% of total).

### 5.1 Strobed IR — The Biggest Single Saving

Traditional trail cameras run IR LEDs continuously during the entire capture window (1.5+ seconds). We strobe the LEDs for only the 30ms sensor exposure window per frame, synchronised by hardware timer (TIM1) gated to MIPI CSI-2 frame-valid.

| Approach | On-time per burst | Current | Energy per night trigger |
|----------|-------------------|---------|------------------------|
| Continuous | 1500 ms | 1400 mA | 0.583 mAh |
| **Strobed (ours)** | **300 ms** (10 × 30ms) | **1400 mA** | **0.117 mAh** |
| **Saving** | | | **80% reduction** |

Over 35 night triggers/day, strobing saves **16.3 mAh/day** — more than the entire sleep budget for 13 days. This is the single highest-impact power design decision in the system.

**Why nobody else does this:** It requires hardware timer synchronisation to the sensor's MIPI frame timing, which means custom firmware and a timer peripheral dedicated to IR control. Most trail cameras use a simple "PIR fires → turn on LEDs → turn on sensor → wait → turn off" sequence. Our TIM1 approach is more complex but the energy savings are enormous.

### 5.2 Hardware ISP + JPEG — Avoiding Software Processing

The STM32N6 has a hardware ISP (Image Signal Processor) and hardware JPEG encoder in the DCMIPP peripheral. This means:

- **Demosaicing** (raw Bayer → RGB): hardware, not CPU
- **Auto-exposure, white balance, gamma**: hardware pipeline
- **JPEG compression**: hardware codec, up to 8176×8176 pixels

Software ISP on Cortex-M55 would cost ~500mA for ~500ms per frame. Hardware ISP costs ~200mA for ~100ms. For 10 frames:

| Approach | Time | Current | Energy |
|----------|------|---------|--------|
| Software ISP | 5000 ms | 500 mA | 0.694 mAh |
| **Hardware ISP** | **1000 ms** | **200 mA** | **0.056 mAh** |
| **Saving** | | | **92% reduction** |

### 5.3 NPU Inference — Hardware Acceleration vs CPU

The Neural-ART NPU runs at 600 GOPS INT8 — purpose-built silicon for neural network inference. Running the same models on the Cortex-M55 CPU (even with Helium SIMD) would be ~10-20× slower.

| Approach | Time per frame | Current | Energy (3 frames) |
|----------|---------------|---------|-------------------|
| CPU (M55 Helium) | ~3500 ms | 400 mA | 1.167 mAh |
| **NPU (Neural-ART)** | **350 ms** | **450 mA** | **0.131 mAh** |
| **Saving** | | | **89% reduction** |

The NPU draws slightly more instantaneous current (450 vs 400 mA) but finishes 10× faster. Time is the dominant factor in energy consumption for burst operations.

### 5.4 VDDCORE Voltage Scaling — Run Slow When You Can

The STM32N6 supports two voltage/frequency modes controlled by GPIO PF4:

| Mode | VDDCORE | CPU Clock | NPU Clock | Use Case |
|------|---------|-----------|-----------|----------|
| VOS Nominal | 0.81V | 600 MHz | 600 MHz | Boot, I/O, housekeeping |
| VOS Overdrive | 0.89V | 800 MHz | 1 GHz | AI inference, ISP burst |

Firmware switches to overdrive only during the capture+inference window (~3 seconds), then drops back to nominal for LTE transmission and housekeeping. The 0.08V difference at ~300mA load saves ~24mW during non-inference operations. Small per-event, but it adds up over 70 daily triggers.

### 5.5 Sequential Model Loading — Trade Latency for SRAM Power

The STM32N6 has 4.2MB SRAM. The two AI models (MegaDetector ~2.5MB + species classifier ~1.5MB) would fill 4.0MB — leaving only 200KB for everything else. Keeping both loaded requires Stop mode during sleep (~hundreds of µA for full SRAM retention).

Instead, we use **Standby mode** (8 µA, only 80KB retained) and reload models from NOR flash on each wake. This costs ~80ms per model load (from Quad SPI at ~50 MB/s) but saves hundreds of microamps in sleep current.

| Approach | Sleep current | Wake overhead | Battery impact |
|----------|-------------|---------------|----------------|
| Full SRAM retention (Stop mode) | ~200+ µA | 0 ms (models ready) | ~48 days |
| **Standby + reload (ours)** | **~8 µA** | **~160 ms** (load 2 models) | **~107 days** |

The 160ms reload penalty is invisible to the user — it happens during the PIR blanking window before the first frame is captured.

---

## 6. Power Gating Strategy — What Gets Switched and How

| Subsystem | Gate Method | Control Pin | Off Current | On Current | Why This Method |
|-----------|-----------|-------------|-------------|------------|-----------------|
| STM32N6 (all rails) | Regulator EN pins (U10a, U10b, U12) | U0 PB3 | 0 µA (regs disabled) | 50-450 mA | U0 controls N6 power-up sequence |
| Modem (3.8V rail) | AP63300 EN pin | N6 PB7 → U0 | 1 µA (buck shutdown) | 300-1000 mA | Must be firmware-gated — modem power-off mode alone is 55µA |
| GPS | SI2301 P-FET via BSS138 | N6 PB5 | 0 µA (FET off) | 25 mA | Hard power gate — GPS has no useful sleep mode |
| ESP32-C3 | SI2301 P-FET via BSS138 | N6 PG7 | 0 µA (FET off) | 120-500 mA | Only needed for WiFi config sessions |
| IR LEDs (5V rail) | AP63300 EN pin | N6 PB6 | 1 µA (buck shutdown) | 1400 mA | Hard gate — no reason to keep 5V alive in sleep |
| SD card | N6 SDMMC2 peripheral + card detect | N6 PN12 (CD) | ~0 µA (clock stopped) | 50-100 mA | Clock gating sufficient — no hard power gate needed |
| Image sensor | Regulator EN + PWDN pin | N6 PD2 (PWDN) | 0 µA (regs disabled) | 300-450 mA | Shares 1.1V + 1.8V rails with N6 subsystem |
| PSRAM | Shares 1.8V rail with sensor | (follows sensor power) | 0 µA (rail off) | 30-50 mA | No independent gate — PSRAM only needed when sensor is active |

**Key insight:** We use three different gating strategies depending on the subsystem:
1. **Regulator EN pin** — for subsystems with dedicated power rails (modem, LEDs, N6 core)
2. **P-FET hard switch** — for subsystems sharing a rail but needing independent control (GPS, C3)
3. **Clock/peripheral gating** — for subsystems where the rail must stay on (SD card on 3.3V rail)

---

## 7. Battery Topology Decision — Why 6S2P

| Topology | Voltage | Capacity | Days at 37mAh/day | Regulator Compat |
|----------|---------|----------|-------------------|-----------------|
| 12S1P | 14.4V | 2000 mAh | 54 | AP63300 OK, TPS62088 FAIL |
| 8S1.5P | 9.6V | 3000 mAh | 81 | AP63300 OK, TPS62088 FAIL |
| **6S2P** | **7.2V** | **4000 mAh** | **107** | **AP63300 OK, TPS62088 via cascade** |
| 4S3P | 4.8V | 6000 mAh | 162 | AP63300 marginal (Vin min 3.8V, empty battery 4.0V — 200mV margin) |
| 3S4P | 3.6V | 8000 mAh | 216 | AP63300 FAIL (Vin min 3.8V > 3.0V empty) |

**6S2P is the sweet spot:** Doubles capacity vs 12S (same cells), voltage high enough for AP63300 (6.0V empty >> 3.8V minimum), low enough that the two-stage cascade is efficient (~85% overall). Lower voltage also means lower resistive losses and lower voltage divider bleed current.

**Phase 1 Schottky diodes (SS34):** Each parallel string gets a series Schottky diode to prevent reverse current if one string depletes faster. 0.3V drop reduces effective range to 5.7-8.1V — still above AP63300 minimum. For production, cell-matching + firmware under-voltage cutoff replaces the diodes (recovers 0.3V = ~300mAh usable capacity).

---

## 8. Thermal Considerations for Power

In a sealed IP67 white enclosure in tropical sun (~52C internal):

- **Regulators:** All rated to 125C junction. At our duty cycle (<1% active), thermal rise is negligible.
- **Modem TX burst:** 1A at 3.8V for ~5 seconds. AP63300 dissipates ~(8.4-3.8) × 1A × η_loss = ~0.5W for 5 seconds. With SOT-23 thermal resistance of ~150C/W, junction rises ~75C above ambient — potentially 127C at 52C ambient. **This is marginal.** Adequate thermal pad and copper pour under U13 is critical. The burst is short (5s) so steady-state is not reached.
- **IR LED burst:** 1.4A at 5V for 300ms. AP63300 U15 dissipates ~(8.4-5.0) × 1.4A × η_loss = ~0.7W for 0.3s. Transient — no thermal concern.
- **NPU inference:** 450mA at 0.89V = 0.4W for 1.05 seconds. BGA thermal resistance ~25C/W. Junction rise ~10C. No concern.

---

## 9. Comparison to Competition

| Camera | Sleep Current | Battery Life | IR Approach | Edge AI Power |
|--------|-------------|--------------|-------------|---------------|
| Reconyx HyperFire 4K | ~20-30 µA (est.) | ~2 years (12 AA alk) | Continuous | None |
| SpyPoint Flex G-36 | ~50-100 µA (est.) | ~11 months | Continuous | None |
| Tactacam Reveal Ultra | Not published | ~3.6 months | Continuous | None |
| Swift Enduro 4G | Not published | "Months" | Continuous | Cloud only |
| Behold Cam-1 | Not published | "Weeks" | Continuous | On-device (ARM) |
| **Between 23** | **~50 µA** | **~107 days (214 w/Ext)** | **Strobed 30ms** | **NPU 600 GOPS** |

Our battery life is shorter than Reconyx (~2 years) because we're doing vastly more work per trigger — AI inference, JPEG encoding, LTE transmission. Reconyx captures a photo, writes to SD card, and goes back to sleep. We capture, process, classify, compress, transmit, and then sleep.

The fair comparison is **energy per useful outcome**: we deliver a species-classified, thumbnail-transmitted alert for ~0.65 mAh. Reconyx delivers an unclassified photo on an SD card for ~0.05 mAh, but a human must physically visit the camera, retrieve the card, and manually review every image. The total system energy (including human travel to site) is incomparably higher.

---

## 10. Future Optimisation Roadmap

| Optimisation | Saving | Complexity | Phase |
|-------------|--------|-----------|-------|
| Sleep-only LDO (TPS7A02 3.3V for U0+PIR, bypass AP63300) | ~22 µA (→ ~28µA total sleep) | Low — add one LDO + FET | Phase 2 |
| MOSFET-switched voltage divider | ~2.8 µA | Trivial — one BSS138 + GPIO | Phase 2 |
| Power-gate TPS62088 EN pins in sleep | ~8 µA | Low — U0 GPIO, adds ~1ms wake time | Phase 2 |
| Alif E8 MCU (1.3µA STOP, dual Ethos-U85) | ~6 µA MCU saving + faster inference | High — new main board | Phase 3 |
| Remove Phase 1 Schottky diodes | +300 mAh usable capacity | Requires cell-matching QC | Production |
| Reduce trigger rate (firmware) | Linear scaling | Zero — config change | Any time |

**Phase 2 total potential:** Sleep budget from ~50µA down to **~17µA**. Battery life from ~107 days to **~190 days** on the same 12 AA cells. This approaches Reconyx territory while delivering full AI capability.

---

*Between 23 Pty Ltd — Every microamp counts when you're 500km from the nearest power point.*
