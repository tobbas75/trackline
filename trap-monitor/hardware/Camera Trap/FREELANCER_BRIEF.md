# PCB Design Job — AI Wildlife Camera Trap (Prototype)

**Company:** Between 23 Pty Ltd (Australia)
**Contact:** Toby Barton
**Location:** Remote (designer can be anywhere)

---

## Job Title

**PCB Schematic + Layout — Edge AI Camera Trap (STM32N6 BGA + MIPI CSI-2, 4-layer, prototype)**

---

## Summary

We need a PCB designer to take our completed design specification and produce manufacturing-ready schematic + layout + Gerber files. We handle fabrication and assembly separately via PCBWay (or similar) — your scope is design files only.

This is a Phase 1 prototype — optimise for testability, not miniaturisation.

The product is a battery-powered wildlife camera trap that runs on-device AI species classification. It sleeps at ~50 uA, wakes on PIR trigger, captures 10 frames at 4K, classifies species on an NPU, sends an LTE alert, then sleeps again. Deployed in remote tropical Australia (IP67, white enclosure, 0-50C).

**This is NOT a design-from-scratch job.** We provide:
- Complete pin-validated schematic netlist (every connection defined)
- CubeMX project file (STM32N657X0H3Q VFBGA-264, all pins assigned and validated)
- Full BOM with 112 line items, suppliers, and costs
- Detailed design constraints (trace widths, impedance, clearances)
- Interface specs for modular subsystems (modem daughter card, LED module)
- Power architecture with 5 rails fully specified

Your job is schematic capture, PCB layout, and production of manufacturing-ready outputs (Gerbers, drill files, pick-and-place, BOM formatted for fab house).

---

## Key Technical Details

| Parameter | Value |
|-----------|-------|
| Main MCU | STM32N657X0H3Q — VFBGA-264 (14x14mm, 0.8mm pitch BGA) |
| Image Sensor | Sony IMX678 — MIPI CSI-2 2-lane (differential, 100 ohm impedance) |
| PSRAM | 32 MB via xSPI (controlled impedance, length-matched) |
| NOR Flash | 16 MB + 32 MB on xSPI2 |
| SD Card | uSD via SDMMC2 4-bit |
| Modem | Quectel EG800Q-EU on separate 20-pin daughter card |
| GPS | u-blox MAX-M10S, UART, power-gated |
| Power Controller | STM32U083KCU6 (UFQFPN-32) — dual-MCU architecture |
| PIR Sensors | 2x Panasonic EKMB1303112K |
| Layers | 4-layer minimum (BGA fan-out + MIPI + xSPI controlled impedance) |
| Board Size | Target 90x70mm (up to 100x80mm acceptable for prototype) |
| Power Rails | 0.81V/0.89V, 1.1V, 1.8V, 3.3V, 3.8V, 5.0V (6 rails, cascaded architecture) |
| Deep Sleep | ~50 uA total system current |

### Critical Routing Requirements

1. **STM32N6 BGA fan-out** — 264-ball VFBGA, 0.8mm pitch. Requires via-in-pad or dog-bone on inner layers.
2. **MIPI CSI-2** — 2 differential pairs (clock + data lane 0 + data lane 1). 100 ohm differential impedance, pairs matched within 0.1mm.
3. **xSPI to PSRAM** — 16-bit data bus + DQS + clock. 50 ohm single-ended impedance, matched within 2mm.
4. **Sensor analog/digital ground split** — Separate ground planes under IMX678.
5. **BSS138 I2C level shifters** — 3.3V to 1.8V for sensor I2C bus. Place within 10mm of IMX678.
6. **Sensor control pins (PC8, PD2)** — Open-drain GPIO with 1.8V pull-ups (documented in design spec).

### Board Placement & Orientation

The PCB sits inside an IP67 enclosure. The enclosure has a front face (IR window + lens port) and a rear panel (backpack attachment + antenna bulkheads). Component placement must follow this orientation:

```
                    FRONT EDGE (faces IR window / lens port)
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │   IMX678 sensor          PIR sensors (2x)                │
    │   + M12 lens mount       near front corners              │
    │   + BSS138 I2C shifters                                  │
    │   + SiT8008 osc                                          │
    │                                                          │
    │          ┌────────────────────┐                           │
    │          │    STM32N6 BGA     │    PSRAM     NOR Flash    │
    │          │    (centre)        │                           │
    │          └────────────────────┘    SD card slot           │
    │                                   (accessible edge)      │
    │   Status LEDs   Accel   BATT ADC   SWD debug headers   │
    │                                                          │
    │   ── POWER REGULATORS (full width strip) ──              │
    │                                                          │
    │   Modem 20-pin     GPS module    ESP32-C3    USB-C       │
    │   connector        + u.FL        (Phase 2)   (sealed     │
    │   (daughter card                              port)      │
    │    plugs in here)                                        │
    │                                                          │
    │   LED JST GH ◄── cable routes to front, behind window   │
    │   J_BP 8-pin  ◄── pogo pads mate with backpack           │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
                    REAR EDGE (faces backpack / antenna panel)
```

**Key placement rules:**
- **IMX678 + PIR sensors:** Front edge, facing the IR window. Lens port aligns with sensor.
- **LED module JST GH connector:** Front edge area. Short cable (~100mm) routes behind the IR window to the LED daughter board.
- **Modem 20-pin connector:** Rear half of board. Daughter card sits behind/below main board, out of the optical path. u.FL pigtail routes to SMA bulkhead on enclosure rear panel.
- **GPS u.FL:** Rear edge. Pigtail routes to SMA bulkhead on enclosure rear panel.
- **J_BP backpack connector:** Rear edge. 8-pin pogo pads mate with gold pads on the backpack through the rear panel.
- **USB-C:** Board edge (rear or side). Accessible through sealed enclosure port.
- **SD card slot:** Board edge. Accessible when enclosure is opened (not user-accessible in the field).
- **SWD debug headers:** Interior, accessible when lid is removed.
- **Antenna separation:** Modem u.FL (on daughter card) and GPS u.FL should be on opposite sides or have adequate ground plane separation.

---

### Subsystems (Separate Small PCBs — same designer)

- **Modem daughter card** — Quectel EG800Q-EU + 4x BSS138 level shifters (3.3V host ↔ 1.8V modem) + nano-SIM holder + MFF2 eSIM footprint (DNP) + TPD3E001 SIM ESD protection + u.FL antenna connector + PI matching network + VBAT decoupling. 20-pin connector to host. 2-layer is fine. Full interface spec provided (`MODEM_INTERFACE_SPEC.md`). This card is shared with our Trap Monitor product — same design, same connector, both hosts provide 3.3V logic and 3.8V power.
- **IR LED module** — 4x LEDs + AL8861 driver + ID resistor. 4-pin JST GH connector. 2-layer is fine. Full spec provided (`LED_MODULE_SPEC.md`).

---

## What We Provide

You will receive a complete documentation package:

| Document | Contents |
|----------|----------|
| `DESIGN_SPEC.md` | Full schematic netlist — every pin connection, every component, every value. ~1000 lines. |
| `HARDWARE_DESIGN_BRIEF.md` | System architecture, power design, mechanical constraints, deliverables list |
| `config.h` | Pin assignments — single source of truth for all GPIO, UART, SPI, I2C, ADC assignments |
| `CameraTrap.ioc` | STM32CubeMX project file — validated pin configuration for VFBGA-264 |
| `BOM.csv` | 112-line bill of materials with part numbers, packages, suppliers, unit costs |
| `MODEM_INTERFACE_SPEC.md` | Shared modem daughter card interface (20-pin connector, signal definitions, level shifting) |
| `LED_MODULE_SPEC.md` | IR LED module daughter board (4-pin, strobed, auto-ID) |
| `POWER_BUDGET.md` | Detailed power analysis for all operating modes |

All pin assignments are CubeMX-validated. All pre-layout blockers are resolved. No design ambiguity — if something isn't specified, ask and we'll clarify same day.

---

## Deliverables

### Main Board
1. **Schematic** — PDF + editable source files (KiCad or Altium)
2. **PCB layout** — Editable source project
3. **Manufacturing outputs** — Gerbers, drill files, pick-and-place (centroid) file, stackup specification
4. **Fab-ready BOM** — Formatted for PCBWay / JLCPCB (or similar), with any approved substitutions noted
5. **Impedance report** — Calculated stackup for MIPI (100 ohm diff) and xSPI (50 ohm SE)

### Daughter Cards (same deliverable format)
6. **Modem daughter card** — Schematic + layout + manufacturing outputs
7. **IR LED module** — Schematic + layout + manufacturing outputs

### General
8. **Design review checkpoint** — Schematic review before layout starts. Layout review before Gerber generation.
9. **Design files are our property** (full IP transfer)

We handle fabrication, assembly, and component sourcing ourselves via PCBWay or similar PCBA service.

---

## Skills Required

- **Must have:** STM32 BGA (VFBGA/LFBGA) fan-out experience
- **Must have:** MIPI CSI-2 differential pair routing
- **Must have:** High-speed memory interfaces (xSPI/QSPI/OctoSPI)
- **Must have:** 4+ layer PCB with controlled impedance stackup
- **Must have:** Experience producing fab-ready outputs (Gerber, drill, pick-and-place, stackup)
- **Preferred:** Camera module / image sensor board experience
- **Preferred:** Battery-powered low-power IoT design
- **Preferred:** KiCad (our preference) or Altium

---

## What We Do NOT Need

- Circuit design — we've done it. You're implementing our netlist.
- Component selection — BOM is final (substitutions only if out of stock, with our approval).
- Fabrication or assembly — we order boards separately.
- Firmware — we write all firmware.
- Enclosure design — separate workstream.
- RF antenna design — modem antenna matching is on the daughter card, u.FL connectors route to external antennas.

---

## Timeline

- **Schematic review:** 1-2 weeks after start
- **Layout review:** 2-3 weeks after schematic approval
- **Manufacturing outputs finalized:** 1 week after layout approval
- **Total estimate:** 4-6 weeks

We're flexible on timeline — quality matters more than speed. But we do need regular progress updates (weekly minimum).

---

## Budget Guidance

This is a design-only job. No fabrication or component costs involved. Please quote fixed price for:

1. **Main board** — Schematic + layout + fab-ready outputs
2. **Modem daughter card** — Schematic + layout + fab-ready outputs
3. **IR LED module** — Schematic + layout + fab-ready outputs

Quote each separately so we can evaluate. Milestone-based payment preferred (e.g., 30% on schematic approval, 40% on layout approval, 30% on final manufacturing outputs).

Note: The modem daughter card is a shared design used by both our Camera Trap and Trap Monitor products. One design, two hosts — same 20-pin connector, same 3.3V logic, same 3.8V power rail.

---

## How to Apply

Please include:
1. **Portfolio examples** of BGA PCB designs (especially STM32, camera modules, or MIPI)
2. **Experience with 4+ layer controlled impedance boards**
3. **Your EDA tool** (KiCad preferred, Altium acceptable)
4. **Fixed price quote** for the 3 boards listed above
5. **Estimated timeline**

We'll share the full documentation package with shortlisted candidates under NDA before final selection.

---

*Between 23 Pty Ltd — Field monitoring technology for remote Australia*
