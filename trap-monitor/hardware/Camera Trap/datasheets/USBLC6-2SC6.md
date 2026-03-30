---
component: USBLC6-2SC6
manufacturer: STMicroelectronics
category: Protection — USB ESD
status: Active
last_verified: 2026-03-29
sources: |
  - ST product page: https://www.st.com/en/protections-and-emi-filters/usblc6-2.html
  - Datasheet: https://www.st.com/resource/en/datasheet/usblc6-2.pdf
  - Project BOM.csv, DESIGN_SPEC.md
confidence: |
  Values marked [DATASHEET] are from ST published specifications.
  Values marked [PROJECT-VERIFIED] are confirmed in project design docs.
  Values marked [TRAINING-DATA] are from pre-training knowledge — verify against current datasheet before use.
  NOTE: Web fetch timed out for ST URLs this session. All values are from training data cross-referenced with project docs. Verify critical values against the PDF datasheet.
---

# USBLC6-2SC6 — 2-Channel USB ESD Protection

## Datasheet Links

| Document | URL |
|----------|-----|
| Product page | https://www.st.com/en/protections-and-emi-filters/usblc6-2.html |
| Datasheet (PDF) | https://www.st.com/resource/en/datasheet/usblc6-2.pdf |
| Application note AN4870 | https://www.st.com/resource/en/application_note/an4870.pdf |

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Channels | 2 (differential pair) | [TRAINING-DATA] |
| USB speed | USB 2.0 High-Speed (480 Mbps) compatible | [TRAINING-DATA] |
| ESD protection (contact) | +/-8 kV (IEC 61000-4-2 Level 4) | [TRAINING-DATA] verify |
| ESD protection (air) | +/-15 kV (IEC 61000-4-2) | [TRAINING-DATA] verify |
| Line capacitance | **3.5 pF max** per line | [TRAINING-DATA] verify |
| Capacitance matching | **0.015 pF** between lines (typ) | [TRAINING-DATA] verify |
| Clamping voltage | **17 V max** (at 1 A, 8/20 us) | [TRAINING-DATA] verify |
| Leakage current | **150 nA max** (per line at working voltage) | [TRAINING-DATA] verify |
| Operating temperature | -40 to +125 degC | [TRAINING-DATA] verify |
| Product status | **Active** (long-established part, widely stocked) | [TRAINING-DATA] |

## Absolute Maximum Ratings

| Parameter | Value | Unit | Confidence |
|-----------|-------|------|------------|
| VBUS pin | -0.3 to 6.0 | V | [TRAINING-DATA] verify |
| I/O pin voltage | -6.0 to +6.0 | V | [TRAINING-DATA] verify |
| ESD (IEC 61000-4-2 contact) | +/-8 | kV | [TRAINING-DATA] |
| ESD (IEC 61000-4-2 air) | +/-15 | kV | [TRAINING-DATA] |
| Peak pulse current (8/20 us) | 5 | A | [TRAINING-DATA] verify |
| Storage temperature | -55 to +150 | degC | [TRAINING-DATA] verify |

## Pin Configuration

### SOT-23-6L Package — 6 pins

| Pin | Name | Function | Confidence |
|-----|------|----------|------------|
| 1 | I/O1 | Protected data line 1 (USB D+) | [TRAINING-DATA] verify |
| 2 | GND | Ground | [TRAINING-DATA] |
| 3 | I/O2 | Protected data line 2 (USB D-) | [TRAINING-DATA] verify |
| 4 | I/O2 | Protected data line 2 (USB D-) — second pad | [TRAINING-DATA] verify |
| 5 | VBUS | Supply reference (connect to USB VBUS) | [TRAINING-DATA] |
| 6 | I/O1 | Protected data line 1 (USB D+) — second pad | [TRAINING-DATA] verify |

**Note:** The USBLC6-2 has a flow-through pinout — I/O enters on one side and exits on the other. Each data line has two pads (in/out). This allows inline placement on the USB data traces. Verify exact pin assignment against datasheet before layout.

### Package

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Package | SOT-23-6L | [PROJECT-VERIFIED] BOM.csv |
| Dimensions | 2.9 x 1.6 x 1.1 mm (typ) | [TRAINING-DATA] verify |
| Pitch | 0.95 mm | [TRAINING-DATA] verify |
| Marking | USBLC | [TRAINING-DATA] |

## Power

### VBUS Connection

The VBUS pin (pin 5) must be connected to the USB VBUS rail (5V from USB host). This sets the reference voltage for the ESD clamping. The device draws negligible quiescent current from VBUS.

| Parameter | Value | Confidence |
|-----------|-------|------------|
| VBUS operating range | 0 to 5.5 V | [TRAINING-DATA] verify |
| Quiescent current | < 1 uA | [TRAINING-DATA] verify |

### Protection Topology

The USBLC6-2 uses back-to-back TVS diodes between each I/O line and both VBUS and GND. This provides bidirectional clamping:
- Positive ESD: clamped to VBUS + diode drop
- Negative ESD: clamped to GND - diode drop

## Application Notes for This Design

### USB-C Port Protection

The USBLC6-2SC6 (U_USB) protects the USB 2.0 data lines on the USB-C connector (J_USB).

```
USB-C Connector (J_USB)          USBLC6-2SC6 (U_USB)         ESP32-C3 / STM32N6
                                                               (via USB mux TBD)
    D+ ──────────────────── I/O1 ──── I/O1 ──────────── USB_DP
    D- ──────────────────── I/O2 ──── I/O2 ──────────── USB_DM
    VBUS ──── 5.1k CC ──── VBUS
    GND ─────────────────── GND
```

### Layout Requirements

1. **Place as close to the USB-C connector as possible.** ESD energy must be shunted to ground before reaching the MCU. Every mm of trace between the connector and the TVS adds inductance that reduces clamping effectiveness.

2. **Short GND trace.** The GND pin must have a low-impedance path to the ground plane — via directly under the pad if possible.

3. **Inline placement.** The flow-through pinout allows the device to sit directly in the USB data trace path. Route D+/D- through the device pads rather than using stubs.

4. **Trace impedance.** USB 2.0 requires 90 ohm differential impedance. Keep trace lengths matched and impedance-controlled on both sides of the TVS.

### USB-C CC Resistors

Note: The USB-C connector requires **5.1 kohm pull-down resistors on CC1 and CC2** for USB 2.0 device detection. These are separate from the USBLC6-2 and are documented in the DESIGN_SPEC. Without CC pull-downs, some USB hosts will not enumerate the device.

## Procurement

| Source | Part Number | Notes |
|--------|-------------|-------|
| LCSC | C7519 | BOM primary source |
| DigiKey | USBLC6-2SC6 | Alternative |
| Mouser | USBLC6-2SC6 | Alternative |

BOM unit cost estimate: ~$0.30 AUD (per BOM.csv).

This is a very widely stocked part — one of the most common USB ESD protection devices. No supply risk.

## Known Issues / Errata

1. **VBUS must be connected.** Without VBUS reference, the positive clamp threshold is undefined. For self-powered USB devices where VBUS may not always be present, some designers add a series Schottky diode from VBUS. In this design, USB is only active when a cable is plugged in, so VBUS is always present during use.

2. **Not for USB 3.0.** The 3.5 pF capacitance is too high for USB 3.0 SuperSpeed (5 Gbps). This design uses USB 2.0 only — not an issue.

3. **Pin numbering verification.** The exact I/O1 and I/O2 pin assignments should be verified against the SOT-23-6L datasheet drawing. The flow-through topology means pin orientation matters for correct inline routing.

4. **Capacitance matching.** The 0.015 pF typical matching between D+ and D- channels is excellent for USB 2.0 HS signal integrity. No additional matching components are needed.
