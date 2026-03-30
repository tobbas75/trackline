# Power Budget — AI Camera Trap

**Date:** March 2026
**Config:** STM32N6 + IMX678, Strobed IR, 3-Frame AI Inference
**Assumptions:** 70 triggers/day (35 day, 35 night), 10% species hit rate, 7 LTE alerts/day

---

## 1. System Sleep

| Component | Current |
|-----------|---------|
| STM32N6 deep sleep (VBAT + 80KB SRAM1 retention) | ~8 µA |
| STM32U0 power controller standby (RTC on) | ~2 µA |
| PIR sensors (2× Panasonic EKMB) | 2 µA |
| AP63300 U11 (3.3V, always on) | ~22 µA |
| AP63300 U13 (3.8V modem, EN=LOW shutdown) | ~1 µA |
| AP63300 U15 (5.0V LED, EN=LOW shutdown) | ~1 µA |
| TPS62088 ×2 + TPS7A02 quiescent | ~9 µA |
| Voltage divider bleed (R1=2MΩ, R2=1MΩ at 8.4V) | ~2.8 µA |
| Pull-ups, leakage, RTC crystal | ~2 µA |
| **Subtotal (anti-theft OFF)** | **~50 µA** |
| LIS2DW12 accelerometer (low-power wake-up) | ~1.5 µA |
| **Subtotal (anti-theft ON)** | **~52 µA** |

Phase 1 uses anti-theft OFF (50 µA). Budget tables below use 50 µA.

> **NOTE (March 2026 V1.2 review):** Major sleep budget revision. AP63300 U11 (3.3V, always on) dominates at 22 µA Iq — this is the cost of using AP63300 instead of TPS62A01 (which cannot survive battery voltage). MAX17048 removed (ModelGauge algorithm is lithium-only, incompatible with NiMH). TPS62A01 replaced with AP63300. Two TPS62088s needed (VDDCORE 0.81V/0.89V + IMX678 DVDD 1.1V).

Daily sleep energy: 50 µA × 24h = **1.20 mAh/day**

---

## 2. Per-Trigger Energy

### Sensor capture (10-frame burst)

| Parameter | Day (4K) | Night (binned) |
|-----------|----------|----------------|
| Sensor current | 450 mA | 300 mA |
| Startup | 50 ms | 50 ms |
| Frame readout | 150 ms × 10 | 150 ms × 10 |
| Total sensor time | 1550 ms | 1550 ms |
| Sensor energy | 0.194 mAh | 0.129 mAh |

### MCU + PSRAM + Clock during capture

| Component | Current | Time | Energy |
|-----------|---------|------|--------|
| STM32N6 idle (M55 running, NPU idle) | 50 mA | 1550 ms | 0.022 mAh |
| PSRAM active (32MB buffer) | 30 mA | 1550 ms | 0.013 mAh |
| Sensor clock oscillator (Y2, SiT8008) | 3.6 mA | 1550 ms | 0.002 mAh |

### ISP + JPEG encode (10 frames)

STM32N6 hardware ISP + JPEG: ~200 mA for 100 ms per frame = 1000 ms total = **0.056 mAh**

### AI inference (3 frames)

NPU + M55 full load: ~450 mA for 350 ms per frame = 1050 ms total = **0.131 mAh**

### IR LEDs — STROBED (night only)

8× Osram SFH 4725AS A01 at 175 mA each = 1400 mA total.
Strobed: 30 ms per frame × 10 frames = 300 ms total.
Energy: 1400 mA × 0.300s / 3600 = **0.117 mAh per night trigger**

For comparison, continuous (1500 ms): 0.583 mAh — **5× more**.

### SD card write

| Mode | Data written | Write time | Energy |
|------|-------------|------------|--------|
| Full burst (10 × 2.5 MB) | 25 MB | 1.25 s | 0.035 mAh |
| Thumbnail only (150 KB) | 0.15 MB | 7.5 ms | 0.0002 mAh |

### LTE-M alert

Quectel EG800Q-EU at ~300 mA for 5 seconds = **0.417 mAh per alert**

---

## 3. Daily Budget by Operating Mode

All values in mAh/day.

| Component | Validation | Production | Research |
|-----------|-----------|------------|----------|
| Deep sleep (24h @ 50µA) | 1.20 | 1.20 | 1.20 |
| IMX678 sensor (35 day + 35 night) | 11.30 | 11.30 | 11.30 |
| MCU capture (70 triggers) | 1.51 | 1.51 | 1.51 |
| PSRAM buffer (70 triggers) | 0.91 | 0.91 | 0.91 |
| ISP + JPEG (70 × 10 frames) | 3.89 | 3.89 | 3.89 |
| AI inference (70 × 3 frames) | 9.19 | 9.19 | 9.19 |
| IR LEDs strobed (35 night triggers) | 4.08 | 4.08 | 4.08 |
| SD card write | 2.43 | 0.26 | 2.43 |
| LTE-M alerts (7/day) | 2.92 | 2.92 | 2.92 |
| **TOTAL** | **37.0** | **34.8** | **37.0** |

### Without strobe (comparison)

Continuous IR at 1500 ms: 20.42 mAh/day → total 53.4 mAh/day.
**Strobing saves 16.3 mAh/day (80% IR reduction, 30% total reduction).**

---

## 4. Battery Life

| Metric | Validation | Production | Research |
|--------|-----------|------------|----------|
| Daily draw | 37.4 mAh | 35.2 mAh | 37.4 mAh |
| **6S2P (4,000 mAh)** | **~107 days** | **~114 days** | **~107 days** |
| 6S2P + Extender (8,000 mAh) | ~214 days | ~227 days | ~214 days |
| 6S2P with Schottky diodes (3,700 mAh effective) | **~99 days** | **~105 days** | **~99 days** |

> **Battery topology: 6S2P** (March 2026 review). 12 × AA NiMH: 6 series × 2 parallel. 7.2V nominal, 8.4V full, 6.0V empty. Capacity: 4,000 mAh. Energy: 28.8 Wh.
>
> Previous design used 12S (all series) which gave only 2,000 mAh — just 54 days. The headline "647 days" in the original doc was based on an erroneous 24,000 mAh capacity figure (which would require 12 cells in parallel at 1.2V, not series at 14.4V).
>
> With Extender backpack (+12 AA in matching 6S2P), total capacity doubles to 8,000 mAh (~216 days). Li-ion Solar backpack provides indefinite operation with solar recharge.

---

## 5. SD Card Life

| Metric | Validation | Production | Research |
|--------|-----------|------------|----------|
| Daily storage | 1.75 GB | 0.19 GB | 1.84 GB |
| 128 GB card | 73 days | 674 days | 70 days |
| 256 GB card | 146 days | 1347 days | 139 days |

Validation and research modes are storage-limited before battery-limited. Production mode: storage is effectively unlimited.

---

## 6. Energy Distribution (Validation Mode, Strobed)

| Component | mAh/day | % of total |
|-----------|---------|------------|
| AI inference | 9.19 | 24.8% |
| Sensor | 11.30 | 30.5% |
| IR LEDs (strobed) | 4.08 | 11.0% |
| ISP + JPEG | 3.89 | 10.5% |
| LTE-M | 2.92 | 7.9% |
| SD card | 2.43 | 6.6% |
| MCU + PSRAM | 2.42 | 6.5% |
| Sleep | 1.20 | 3.2% |

With strobed IR, the budget is well-balanced — no single component dominates. The largest consumers are the sensor readout and AI inference, which are both doing useful work.

---

## 7. Levers for Extending Battery Life

1. **Reduce trigger rate** — 50 triggers/day instead of 70 saves ~30% active energy.
2. **Day-only deployment** — No IR at all. Saves 4.08 mAh/day (11%).
3. **Production mode** — 6% less SD write energy vs validation.
4. **Solar panel** — 12V 2W panel with CN3767 MPPT charger. In Darwin wet season (~5 peak sun hours), expect ~1.5W usable → ~250 mA at 6V → ~1250 mAh/day recharge. Effectively unlimited battery life.
5. **Reduce AI frames** — 1 frame instead of 3 saves ~6 mAh/day (16%) but reduces detection reliability.
6. **Skip IR on bright nights** — Would need ambient light sensing (rejected for reliability risk).
