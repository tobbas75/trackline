# Freelance Job Post — PCB Design for IoT Trap Monitor

> Copy/paste the sections below into your freelance platform of choice (Upwork, Freelancer, PCBWay, etc.). Adjust tone and length to suit the platform.

---

## Job Title

Custom PCB Design — IoT Animal Trap Monitor (ESP32-S3 + LTE Modem + GPS)

---

## Short Description (for listing summary)

Looking for an experienced PCB designer to create a carrier/integration board for a solar-powered IoT trap monitoring device. The board integrates an ESP32-S3, Quectel EG800Q-EU LTE CAT-1bis modem, u-blox M10 GPS module, RTC, and power management. Phase 1 is a dev/test board design — we're open to using off-the-shelf breakout modules on a carrier PCB to keep costs low. Optional: build 3–5 prototype boards. Production fabrication (Phase 2, 50–100 units) will be handled by a dedicated fab house. Full production design follows after field testing.

---

## Full Job Description

### 
controlled impedance)
- Power supply design (LDO + buck converter)
- Level translation (3.3V ↔ 1.8V)
- Low-power / battery-operated IoT design
- Familiarity with JLCPCB or PCBWAY assembly

### Nice to Have

- Experience with Quectel EG800Q or similar CAT-1bis modems
- Experience with u-blox GNSS modules
- Experience with solar charge controllers (CN3767 or similar)
- Australian PCB assembly sourcing knowledge

### Budget

Please quote separately for:
1. **Design files** — schematic, layout, Gerbers, BOM (required)
2. **Prototype build** — 3–5 assembled boards + basic test (optional)
3. **Optional scope items** — packet-data/HTTP validation and any non-EG800Q modem support

Phase 2 production design will be scoped separately after field testing.

### Timeline

We need boards in hand as soon as practical. Phase 1 is not a complex design — the spec is complete and the BOM is ready. We're looking for someone who can move quickly.

---

## Tags / Keywords

`PCB Design` `IoT` `ESP32` `LTE CAT-1` `Quectel` `GPS` `u-blox` `Solar` `Battery` `Low Power` `Deep Sleep` `EasyEDA` `KiCad` `Altium` `JLCPCB` `PCBWAY` `Prototype` `Schematic` `Gerber`

---

## Attachments to Include

When posting, attach these files from the `hardware/` directory:

1. **PCB_DESIGN_BRIEF.md** — Full design brief with pin tables, power architecture, all requirements
2. **DESIGN_SPEC.md** — Detailed schematic netlist, circuit descriptions, layout constraints
3. **BOM_PCB.csv** — Component list with LCSC part numbers
4. **config.h** — Firmware pin definitions (authoritative source for GPIO assignments)
5. **HARDWARE_DESIGN_BRIEF.md** — Higher-level hardware overview and mechanical notes
6. **D2C_PCB_PROTOTYPE_ADDENDUM.md** — D2C-focused modem selection, swap interface, AU pathway, and SIM/eSIM constraints
