# AI Camera Trap — Design Review Guide

**For:** External engineer review before PCB layout handoff
**Date:** March 2026 (V1.2 — post deep review)
**Contact:** Toby Barton, Between 23 Pty Ltd

---

## What This Is

Battery-powered edge AI wildlife camera trap. PIR trigger -> 10-frame 4K burst -> on-device species classification (STM32N6 NPU) -> LTE alert -> deep sleep (~50 uA). Remote tropical Australia, IP67, white enclosure, 0-50C ambient.

Design has been through two rounds of internet-verified component review. All critical errors identified in the review have been corrected. We need a second pair of eyes before PCB layout.

**Start with `SCHEMATIC_CHANGES_V1.2.md`** — this documents every correction from the review and why. Then read the design files in the order below.

---

## Reading Order

| # | File | What It Covers | ~Time |
|---|------|----------------|-------|
| 0 | `SCHEMATIC_CHANGES_V1.2.md` | **Read first.** All corrections from the V1.1/V1.2 review with rationale. | 10 min |
| 1 | `HARDWARE_DESIGN_BRIEF.md` | System architecture, components, power, mechanical | 15 min |
| 2 | `DESIGN_SPEC.md` | Full schematic netlist — every pin, component, value | 30 min |
| 3 | `firmware/config.h` | Pin assignments (authoritative — overrides docs if they conflict) | 10 min |
| 4 | `BOM.csv` | BOM with part numbers, packages, suppliers, review notes | 5 min |
| 5 | `MODEM_INTERFACE_SPEC.md` | Shared modem daughter card (20-pin, BSS138 level shifting) | 10 min |
| 6 | `LED_MODULE_SPEC.md` | Modular IR LED board (4 variants, auto-ID resistor) | 10 min |
| 7 | `POWER_BUDGET.md` | Daily energy budget, 3 operating modes | 5 min |
| 8 | `firmware/CameraTrap.ioc` | STM32CubeMX project — pin validation for VFBGA-264 | 5 min |

SVGs (open in browser): `main_board_layout.svg`, `modem_daughter_layout.svg`, `led_module_layout.svg`

---

## Design Decisions (Locked for Phase 1)

We're looking for implementation mistakes and missed edge cases, not alternative part suggestions. But if something is fundamentally wrong, we'd rather hear it now.

### MCU: STM32N657X0H3Q (VFBGA-264)

Requirement: on-device AI inference on 4K frames, battery-powered, ~50 uA sleep. Needs NPU + MIPI CSI-2 + HW ISP + JPEG in one chip.

| | STM32N6 (chosen) | Alif E8 | NXP i.MX 95 | Renesas RA8P1 |
|---|---|---|---|---|
| NPU | 600 GOPS | ~4 TOPS + 2x Ethos-U55 | 2 eTOPS | Ethos-U55 |
| MIPI CSI-2 | 2-lane | Dual | 4-lane | 2-lane |
| HW ISP + JPEG | Both | Both | Both | Neither |
| Deep sleep | ~8 uA | ~1.3 uA | mA-class (MPU) | ~5 uA |
| Available | Now | Late 2026 est. | Now (but needs DDR/Linux) | Now |

**Bottom line:** STM32N6 is the only option available now that meets all constraints. Alif E8 is the future upgrade path — modular design means only the main board changes.

### Image Sensor: Sony IMX678 (STARVIS 2)

8MP 4K, 2x2 binning for night mode, NIR to ~1000nm (good for 940nm covert IR). MIPI CSI-2 direct to STM32N6. **Power rails: AVDD = 3.3V, DVDD = 1.1V, DOVDD = 1.8V** (verified against 10 independent sources). Power-on sequence: DVDD -> DOVDD -> AVDD within 200ms. BSS138 level shifting on I2C1 (VDDIO4 = 3.3V, sensor DOVDD = 1.8V).

### Dual-MCU (STM32N6 + STM32U0)

U0 (STM32U083KCU6, **UFQFPN-32**, Cortex-M0+, ~2 uA standby) handles sleep/wake: PIR aggregation, battery ADC, power control. N6 is fully off between triggers — not sleeping, *off*. Pattern from CamThink NE301 open-source reference design.

### Power Architecture: Cascaded 6 Rails

**Battery (6S2P NiMH, 6.0-8.4V) feeds AP63300 bucks ONLY.** Sub-5.5V regulators are downstream of the 3.3V rail.

| Rail | Part | Why Separate |
|------|------|-------------|
| **0.81V / 0.89V** | TPS62088 U10a (**DSBGA-6**, 1.2x0.8mm) | STM32N6 VDDCORE. GPIO PF4 switches between VOS nominal (600MHz) and overdrive (800MHz for full NPU). **Not 1.1V or 1.2V.** Copy DK board circuit. |
| **1.1V** | TPS62088 U10b (DSBGA-6) | IMX678 DVDD only. Cannot share VDDCORE — different voltage. |
| **1.8V** | TPS7A02 (**LDO**, 25nA Iq) | IMX678 DOVDD + PSRAM VDD/VDDQ + VDDIO_XSPI1. LDO for low noise. Max 200mA — verify peak load ~100-120mA. |
| **3.3V** | AP63300 U11 (ALWAYS ON) | Main digital rail. Directly from battery (Vin=3.8-32V). Iq=22uA dominates sleep budget. Also feeds IMX678 AVDD via ferrite+LC filter. |
| **3.8V** | AP63300 U13 (power-gated PB7) | Modem VBAT. Same part as Trap Monitor. 3A peak for TX bursts. |
| **5.0V** | AP63300 U15 (power-gated PB6) | LED VLED. 2A max, burst only. |

> **TPS62A01 was REMOVED** — max Vin=5.5V, destroyed by 6S2P battery (8.4V).
> **MAX17048 fuel gauge was REMOVED** — ModelGauge algorithm is lithium-only, incompatible with NiMH. SOC via ADC voltage thresholds.

### Battery: 6S2P Backpack Interface

12 AA NiMH, 6 series x 2 parallel. 7.2V nominal, 8.4V full, 6.0V empty. 4000 mAh.

- Phase 1: SS34 Schottky diodes per parallel string (prevents reverse current)
- At ~50 uA sleep + 70 triggers/day = ~37 mAh/day -> **~107 days on 6S2P**
- With Extender backpack: ~214 days. Li-ion Solar: indefinite.

### IR LEDs: SFH 4725AS A01 (940nm, PARALLEL from 5V)

8x LEDs in **PARALLEL** (not series — 8 series at ~2.7V Vf = 21.6V, impossible from 5V). AL8861 in **SOT89-5** (1.5A max — TSOT-25 is only 1A, insufficient for 1.4A total). Individual 1-ohm ballast resistors per LED for current sharing. Strobed via VSET pin, ~100us turn-on.

### PSRAM: APS256XXN-OB9-BG (32MB, 1.8V)

HexaSPI x16 DDR, 250MHz capable (backward compatible at 200MHz). Same part family as STM32N6570-DK. OB9 revision recommended by AP Memory (OBR may be going NRND). **1.8V supply** — shares TPS7A02 rail with IMX678 DOVDD and VDDIO_XSPI1.

### Enclosure: WHITE IP67 Polycarbonate

**Must be white or light grey** — black = 70C internal in tropical sun (kills PIR at 50C, exceeds modem at 75C). White = ~52C internal. Conformal coat main board (Phase 1). Desiccant sachet. 316 SS external hardware. NIR window: 1.5mm NIR polycarbonate (85-90% at 940nm).

---

## What We'd Like You to Check

1. **Power cascade** — AP63300 (3.3V) -> TPS62088 (0.81V/0.89V) cascade efficiency? VDDCORE PF4 feedback switching circuit — copy DK schematic or validate independently? TPS7A02 load capacity for PSRAM + DOVDD + VDDIO_XSPI1 combined?
2. **VDDCORE** — Is 0.81V/0.89V correct for STM32N657X0H3Q? We derived this from AN6000 and the DK board schematic but cannot read the full DS14643 electrical tables. Please verify against the datasheet.
3. **TPS62088 DSBGA-6** — This is a 1.2x0.8mm wafer-level BGA. Any assembly concerns at JLCPCB? Pad layout and solder paste stencil recommendations?
4. **IMX678 power sequencing** — DVDD (1.1V) -> DOVDD (1.8V) -> AVDD (3.3V) within 200ms. With separate regulators and no sequencing IC, how do we guarantee order? Regulator enable pin daisy-chain? RC delays?
5. **LED module topology** — 8 parallel LEDs from a buck driver (AL8861Y-13, SOT89-5). Are 1-ohm ballast resistors sufficient for current sharing? Any thermal concerns at 1.4A in 300ms bursts?
6. **Sensor interface** — MIPI CSI-2 signal integrity at 2-lane? BSS138 I2C at 400 kHz with 1.8V gate drive? Open-drain + 1.8V pull-up for XCLR/PWDN?
7. **VDDIO domains** — VDDIO2 (GPIOO/P) at 1.8V for PSRAM. VDDIO4 at 3.3V for modem UART + sensor I2C (BSS138 shifted). Confirm no conflicts.
8. **Sleep budget** — 50 uA total, dominated by AP63300 U11 Iq (22 uA). Any leakage paths we've missed? GPIO states during N6 standby?
9. **6S2P battery** — Schottky diodes per parallel string (Phase 1). Voltage divider R1=2M, R2=1M with MOSFET switch recommended. Under-voltage lockout at 6.0V.
10. **Thermal** — White enclosure ~52C internal in tropical sun. PIR sensors rated -20 to +60C. Modem rated to 75C. Any marginal components we've missed?

---

## Known Open Items (Not Blocking Layout)

- [ ] Telstra network type approval for EG800Q-EU — contact Quectel AU FAE
- [ ] MAX-M10S lifecycle status — verify with u-blox (may be approaching NRND)
- [ ] Exact SiTime ordering code for SiT8008BI-12-18E-24.000000 — may be build-to-order
- [ ] STM32N6 errata ES0620 — review for layout-relevant silicon bugs
- [ ] HSLV_VDDIO2 OTP fuse for 1.8V high-speed XSPI1 operation — required at first boot
- [ ] Active GNSS antenna LNA config — set MAX-M10S internal LNA to bypass mode
- [ ] PIR warm-up blanking — 30 seconds minimum in firmware after power-up
- [ ] Conformal coating specification — HumiSeal 1B31 or equivalent acrylic

---

## Out of Scope

Alternative MCU/sensor suggestions, firmware review, enclosure tooling, cost optimisation (Phase 2).

---

## Attached Files

```
SCHEMATIC_CHANGES_V1.2.md      ** READ FIRST ** All corrections from design review
REVIEW_GUIDE.md                You are here
HARDWARE_DESIGN_BRIEF.md       System overview
DESIGN_SPEC.md                 Full schematic netlist
MODEM_INTERFACE_SPEC.md        Modem daughter card
LED_MODULE_SPEC.md             LED module
POWER_BUDGET.md                Energy budget
BOM.csv                        Bill of materials
firmware/config.h              Pin assignments
firmware/CameraTrap.ioc        CubeMX project
main_board_layout.svg          Board zone diagram
modem_daughter_layout.svg      Daughter card diagram
led_module_layout.svg          LED module diagram
```

---

*Between 23 Pty Ltd -- Field monitoring technology for remote Australia*
