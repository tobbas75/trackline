# System Architecture — AI Camera Trap

**Date:** March 2026
**Revision:** 1.0 DRAFT

---

## 1. Overview

The Between 23° AI Camera Trap is a battery-powered edge-AI wildlife monitoring and trigger platform for remote tropical Australia. It performs on-device species classification using deep learning, eliminating manual review of thousands of empty images, and can fire external actions (traps, deterrents, bait) on confirmed AI detection. The system integrates with the WildTrack ecological monitoring platform and Addax Data Science AI models (open model architecture — any Addax model via SD card).

**Target environments:** Remote Aboriginal lands (Tiwi Islands, Arnhem Land), pastoral stations, conservation reserves across northern Australia. Cyclone Region C/D.

**Key differentiator:** On-device species classification at the edge. No cloud dependency. Real-time LTE-M alerts on confirmed species detection. Opto-isolated trigger output for external action devices. Modular ecosystem — snap-on backpacks (standard, field station, li-ion solar, extender), swappable IR LED modules, swappable modem daughter cards, swappable AI models.

**Platform philosophy:** The camera is the brain. Between 23° provides the intelligence; third parties build the action. Researchers develop traps, AI models, and deployment strategies. The camera is the central core that makes it all work.

---

## 2. Capture Pipeline

### 2.1 Detection

Two Panasonic EKMB1303112K PIR sensors provide wide-angle motion detection (1 µA each). PIR interrupts wake the STM32U0 power controller, which sequences power-up and wakes the STM32N6 main MCU. Wake-to-first-frame target: < 200 ms (~175 ms in STOP2 fast-trigger mode).

### 2.2 Burst Capture

10 frames per trigger at maximum available resolution:
- **Day:** Full 4K (3856 × 2180), ~2.5 MB JPEG per frame
- **Night:** 2×2 Quad Bayer binned 1080p (1928 × 1090), superior NIR sensitivity at 4.0 µm effective pixel pitch

Frames stream into 32 MB PSRAM via MIPI CSI-2. IR LED module strobes synchronously with each frame exposure (hardware timer, zero CPU load). Full burst completes in ~1 second at ~10 fps.

### 2.3 AI Classification

Two-stage pipeline on STM32N6 Neural-ART NPU (600 GOPS INT8):

1. **MegaDetector v5** (~2.5 MB quantised INT8) — Animal/person/vehicle bounding box detection
2. **Addax AWC Classifier** (~1.5 MB quantised INT8) — 135 Australian species identification on cropped regions

Inference runs on **3 frames** per burst (frames 2, 5, 8 — spread across early, middle, late). Highest confidence score across the 3 frames determines classification. ~350 ms per frame, ~1.05 seconds total.

**Why 3 frames:** Animals may be partially occluded, mid-stride, or at frame edge in any single image. Multi-frame inference dramatically improves detection reliability.

### 2.4 Post-Classification

Actions depend on operating mode:

| Mode | Species detected | Empty / false trigger |
|------|------------------|-----------------------|
| Validation | Save all 10 frames + AI metadata + LTE alert | Save all 10 frames + AI metadata (tagged rejected) |
| Production | Save all 10 frames + AI metadata + LTE alert | Save 1 thumbnail + metadata only |
| Research | Save all 10 frames + full AI telemetry + LTE alert | Save all 10 frames + full AI telemetry |

Confirmed species always trigger LTE-M alert: timestamp, GPS, species name, confidence, thumbnail JPEG (~150 KB).

### 2.5 AI Trigger Output

On confirmed AI detection, the camera can fire an opto-isolated trigger output via the backpack interface. The Field Station backpack routes this to a weatherproof 2-pin jack for connecting external devices — traps, bait dispensers, deterrents, gate actuators, or any device accepting a dry contact closure.

**Trigger pipeline:** PIR wake → burst capture → AI classify → species confirmed → fire trigger output → alert → sleep.

**Dual-camera confirmation (optional):** Two cameras at the same site, connected via LoRa mesh. Camera A detects feral cat → sends LoRa alert → Camera B confirms with its own detection → either camera fires trigger. Reduces false positives for lethal control applications.

The camera provides the intelligence. Third parties build the action devices. Between 23° is an open AI trigger platform, not just a camera.

### 2.6 Short Video Clips (Optional)

Firmware mode for 5-second MJPEG at 1080p on trigger detection. Uses hardware JPEG encoder on STM32N6. ~75-150 MB per clip to SD card. Enabled via BLE settings for behavioural research use cases. Not a video camera — for sustained video, see the future Alif E8-based Camera Trap Video body.

---

## 3. Hardware Architecture

### 3.1 Processing

- **STM32N657X0H3Q:** Cortex-M55 @ 800 MHz, Neural-ART NPU, 4.2 MB SRAM, hardware ISP + JPEG/H.264, native MIPI CSI-2. Runs capture pipeline + AI inference.
- **STM32U083KCU6:** Cortex-M0+ power controller. Manages sleep/wake state machine, PIR aggregation, battery monitoring, watchdog. Achieves 7–8 µA combined MCU subsystem sleep.

Inter-MCU: SPI or I2C + dedicated wake/status/power-enable GPIOs.

### 3.2 Image Sensor

Sony IMX678 (STARVIS 2). 1/1.8", 8.3 MP, 2.0 µm pixels. 2×2 on-chip binning for night mode. STARVIS 2 extends NIR response to ~1000 nm (silicon cutoff ~1050nm). AVDD=3.3V, DVDD=1.1V, DOVDD=1.8V. M12 lens mount, ~100° HFOV.

### 3.3 Modular IR Illumination

Daughter board on 4-pin JST GH: VLED (5V 2A), STROBE (3.3V), ID (ADC), GND. Field-swappable. Six variants: 940nm standard, 940nm long range, 940nm super long range (30-35m, 4× SFH4726AS + 15° TIR optics), 850nm research, white flash, blank plug. Auto-detected at boot via ID resistor.

Strobe synced to sensor exposure via TIM1. 30 ms per frame × 10 = 300 ms total (80% reduction vs 1500 ms continuous).

### 3.4 Communications

Shared modem daughter card (20-pin connector, same as Trap Monitor). Rev A: Quectel EG800Q-EU (CAT-1bis, Band 28 + Band 7). Future: 5G D2C module for full-burst uploads over satellite. BSS138 level shifting. SIM/eSIM on daughter card.

### 3.5 GPS

u-blox MAX-M10S (same as Trap Monitor). NMEA 9600 baud. Power-gated via BSS138 + SI2301 (same circuit as Trap Monitor).

### 3.6 Storage

- 32 MB PSRAM (APS256XXN-OB9-BG, 1.8V) — frame buffer via XSPI1 HexaSPI x16 DDR
- 16 MB NOR flash (W25Q128JV) — firmware + AI models via xSPI2
- 32 MB NOR flash (W25Q256JV) — metadata, config, event log via xSPI2
- µSD card (128/256 GB) — image storage via SDMMC 4-bit

SD directory: `/YYYY-MM-DD/burst_HHMMSS_NNN/` containing `frame_01.jpg` … `frame_10.jpg` + `metadata.json`.

### 3.7 Power

12 AA NiMH via snap-on backpack system. Camera receives battery voltage via backpack interface connector — doesn't know or care what's attached.

**Backpack variants:**
- **Standard:** 12 AA NiMH caddy. Cheap, pre-loadable, snap-swap in field. No charging.
- **Field Station:** 12 AA NiMH + trigger jack routing + LoRa module slot. No solar.
- **Li-ion Solar:** Sealed Li-ion pack + BMS + MPPT solar + trigger jack + LoRa slot. Weatherproof solar connector. Output regulated to match NiMH range. "Set and forget" indefinite deployment.
- **Extender:** 12 AA NiMH spacer, stacks with Standard or Field Station for added capacity.

No solar charging on main board — solar is self-contained in Li-ion Solar backpack.

| Rail | Regulator | Load |
|------|-----------|------|
| 0.81V/0.89V | TPS62088 U10a (DSBGA-6) | STM32N6 VDDCORE (PF4 VOS switch) |
| 1.1V | TPS62088 U10b (DSBGA-6) | IMX678 DVDD |
| 1.8V | TPS7A02 (LDO) | IMX678 DOVDD + PSRAM + VDDIO_XSPI1 |
| 3.3V | AP63300 U11 (ALWAYS ON) | Digital (flash, GPS, PIR, SD, U0) + IMX678 AVDD (filtered) |
| 3.8V | AP63300 U13 (PB7 gated) | Modem VBAT |
| 5.0V | AP63300 U15 (PB6 gated) | LED module VLED |

Battery: 6S2P (7.2V nom, 4000 mAh). Deep sleep: ~50 µA total. Daily budget (validation, strobed IR): ~37 mAh. Battery life: ~107 days.

---

## 4. AI Models

| Model | Size (INT8) | Purpose | Source |
|-------|-------------|---------|--------|
| MegaDetector v5 | ~2.5 MB | Animal/person/vehicle detection | Microsoft / open source |
| Addax species model | ~1.5 MB | Species classification (region-specific) | Addax Data Science |
| **Total** | **~4.0 MB** | Fits in STM32N6 4.2 MB SRAM | |

**Open model architecture.** Addax is the AI platform, not a single model. Any Addax model loads via SD card:
- **Free models:** AWC (135 Australian species, 95.2% accuracy, trained on 5M images from Parks Victoria). More regions added over time.
- **Custom models:** Pay Addax to train on your deployment data — specific threatened species, feral targets, site-specific classifiers.
- **Community models:** Every deployment generates training data that feeds back to Addax for retraining. Network effect.

Models stored in 16 MB NOR flash. Loaded to SRAM at boot. Updated via SD card drop (new `.tflite` file detected at boot) or USB. Versioned with rollback. Model version logged in all metadata.

The NPU (600 GOPS) can handle models significantly larger than the current 135-class classifier. A 500-class or 1,000-class model fits within inference time budgets at INT8.

---

## 5. Platform Migration

| Timeline | Platform | Status |
|----------|----------|--------|
| 2026 | STM32N6 | Production-ready, ship first units |
| Q3–Q4 2026 | Alif E8 dev kit | Request and evaluate when available |
| 2027 | Alif E8 production | If E8 delivers: same enclosure, same LED module, same modem card, new main board |

E8 advantages: dual MIPI CSI-2 (visible + thermal), Ethos-U85 (transformer support, 454 GOPS), integrated aiPM, 1.3 µA STOP, 9.75 MB SRAM. Eliminates IR illumination entirely with thermal trigger.

---

## 6. WildTrack Integration

Camera registers with WildTrack backend on first connection. Alerts via MQTT. Dashboard shows camera status, recent detections, species tallies, battery/storage levels. Rangers receive push notifications on priority species.

Same API as Trap Monitor — different `device_type` and `event_type`, same schema. Both products appear on the same map.
