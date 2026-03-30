# Freelancer Brief — Schematic Review & Capture

**Company:** Between 23 Pty Ltd (Australia)
**Contact:** Toby Barton
**Location:** Remote (designer can be anywhere, Australian timezone overlap preferred)

---

## Overview

We're developing a battery-powered camera device for remote outdoor deployment in tropical Australia. The unit is a compact, sealed (IP67) system built around an STM32 BGA microcontroller with a MIPI CSI-2 image sensor, cellular modem, and GPS. It sleeps at ultra-low current and wakes on motion detection.

We have a detailed draft design specification covering pin connections, component selections, and power architecture. We need an experienced hardware engineer to:

1. **Review** our design specification and component choices for errors, risks, and improvements
2. **Create** the schematic in EDA software based on the reviewed specification
3. **Produce a test/evaluation build** for validation before committing to full PCB layout

PCB layout is a separate future phase (same designer preferred, but quoted separately).

---

## What This Is NOT

- **Not a design-from-scratch job.** We have a detailed draft design. You are reviewing it, improving where needed, and implementing the agreed schematic.
- **Not a PCB layout job** (yet). Layout is Phase 2, after schematic validation.
- **Not a firmware or software job.**
- **Not component selection from scratch.** We have a draft BOM with ~112 line items, but part choices are open for review — if you identify better alternatives or flag availability/suitability issues, we want to hear it.

---

## Technical Summary

| Parameter | Value |
|-----------|-------|
| Main MCU | STM32 — VFBGA-264 BGA package (14x14mm, 0.8mm pitch) |
| Secondary MCU | STM32 — UFQFPN-32 (power management co-processor) |
| Image Sensor | MIPI CSI-2 2-lane interface, I2C control |
| Memory | 32 MB PSRAM (xSPI x16), 16+32 MB NOR flash (xSPI), microSD (SDMMC 4-bit) |
| Cellular Modem | LTE CAT-1bis on separate daughter card (20-pin interface, level-shifted) |
| GNSS | u-blox module, UART, power-gated |
| Motion Sensors | 2x digital PIR sensors |
| Power | 6 regulated rails (0.8V to 5V), cascaded buck + LDO architecture |
| Battery | NiMH pack, 7.2V nominal |
| Sleep Current | Target <50 uA total system |
| PCB | 4-layer minimum (BGA + controlled impedance) |
| Board Size | ~90x70mm (prototype, up to 100x80mm acceptable) |

### Subsystems (separate small PCBs, same job)

- **Modem daughter card** — LTE module + level shifters + SIM + ESD protection. 2-layer. Interface spec provided.
- **LED illumination module** — LED driver + LEDs + ID resistor. 2-layer. Spec provided.

---

## Phased Approach

We are deliberately staging this work to catch errors early, based on lessons from a previous product in the same family.

### Phase 1 — Design Specification Review (this job, Part A)

**Scope:** Review our written design specification and draft BOM, and flag any issues before schematic creation begins. There is no existing schematic — the specification is a text-based document describing every connection, component, and power rail.

**What you receive:**
- Draft schematic netlist document (~1000 lines, connections defined — to be validated by you)
- STM32CubeMX project file (pin assignments drafted, to be validated)
- Draft BOM (~112 components, packages, suppliers) — open for review
- Pin assignment file (firmware source of truth)
- Interface specs for daughter cards
- Datasheet reference notes for all active components
- Known corrections log (issues already caught and resolved in prior reviews)

**What you deliver:**
- Written review of the design, organised by subsystem
- Errors, warnings, or recommendations — including component substitutions if warranted
- BOM feedback: availability concerns, better alternatives, package/value issues
- Confirmation that the design is ready for schematic capture, or a list of blockers

**Review focus areas:**
- Power sequencing and rail dependencies
- BGA pin assignments vs datasheet recommendations
- Decoupling strategy (capacitor count, placement, values)
- Level shifting between voltage domains (3.3V, 1.8V, 1.1V)
- High-speed signal integrity considerations (MIPI, xSPI)
- ESD protection adequacy
- Connector pinouts and mechanical compatibility
- Sleep current path analysis
- Component suitability (temperature range, availability, lifecycle status, package fit)

### Phase 2 — Schematic Creation (this job, Part B)

**Scope:** Create the schematic in EDA software based on the reviewed and agreed specification, incorporating any changes from the Phase 1 review.

**What you deliver:**
- Schematic in KiCad (preferred) or Altium — editable source files
- PDF export of all sheets
- Updated BOM cross-referenced to schematic designators (incorporating any changes from Phase 1 review)
- Electrical rules check (ERC) clean

**Design review checkpoint:** We review the schematic together before proceeding.

### Phase 3 — Test/Evaluation Model (this job, Part C)

**Scope:** Produce a minimal test setup to validate critical subsystems before full PCB layout.

Options we're open to:
- Breakout boards for the BGA MCU + key peripherals
- Modular evaluation approach using dev boards where possible
- Minimal custom board for the subsystems that can't use dev boards

**What you deliver:**
- Test strategy recommendation (what can use dev boards, what needs custom PCB)
- Any custom breakout board files (schematic + layout + fab outputs)
- Test procedure checklist for validating each subsystem

**Goal:** Validate power rails, MIPI sensor feed, memory interfaces, and sleep current on real hardware before committing to the full integrated PCB layout.

### Phase 4 — PCB Layout (separate future quote)

Full integrated layout. Quoted and scheduled separately after Phase 3 validation.

---

## Skills Required

**Must have:**
- STM32 BGA fan-out experience (VFBGA or LFBGA, 0.8mm pitch or finer)
- MIPI CSI-2 or similar high-speed differential pair design
- Multi-rail power system design review experience
- 4+ layer PCB with controlled impedance
- KiCad or Altium proficiency

**Preferred:**
- Camera or image sensor board experience
- Battery-powered / ultra-low-power IoT
- Dual-MCU architectures
- Experience with tropical/outdoor ruggedised products

---

## What We Handle

- Circuit design (draft complete, open for expert review)
- Initial component selection (draft BOM complete, open for review)
- Firmware development
- Fabrication and assembly (via PCBA service)
- Enclosure and mechanical design
- Field testing and deployment

---

## Working Arrangements

- **Communication:** Weekly progress updates minimum. We respond to questions same day.
- **NDA:** Required before sharing full design documentation. Overview documents shared during evaluation.
- **IP ownership:** All design files produced are our property (full IP transfer on payment).
- **Payment:** Milestone-based, structured around the phases above.

---

## Budget

Please quote each phase separately:

| Phase | Scope |
|-------|-------|
| **1 — Review** | Design specification review and written report |
| **2 — Schematic** | Schematic creation in EDA (3 boards: main + modem card + LED module) |
| **3 — Test model** | Test strategy + any custom breakout boards |
| **4 — Layout** | (Future — quote indicative range only) |

---

## How to Apply

1. **Portfolio:** Examples of BGA PCB designs, especially STM32 or camera-related
2. **Review experience:** Have you reviewed someone else's design and caught significant errors? We value engineers who challenge assumptions and flag problems early.
3. **EDA tool:** KiCad preferred, Altium acceptable
4. **Phase quotes:** Fixed price per phase
5. **Availability and timeline**

We'll share the full documentation package with shortlisted candidates under NDA.

---

*Between 23 Pty Ltd — Field monitoring technology for remote Australia*
