# PCB Design Brief — Remote Trap Monitor

> D2C prototype addendum: see `D2C_PCB_PROTOTYPE_ADDENDUM.md` for modem swap strategy, AU rollout constraints, and SIM/eSIM implementation notes.

## March 2026 Update - Read First (Freelance Engineer)

Please include the following in your Phase 1 prototype quote and implementation plan:

1. Keep **EG800Q-EU** as the Rev A baseline modem.
2. Preserve firmware pin lock exactly (`MODEM_TX=GPIO17`, `MODEM_RX=GPIO18`, `PWRKEY=GPIO5`, `RESET_N=GPIO7`).
3. Keep modem rail at **3.8V** with TX burst headroom (>=3A path design).
4. Add optional **MFF2 eSIM footprint (DNP)** while keeping nano-SIM populated for bring-up.
5. Add 0R strap options on modem UART/control nets for later module swap without full reroute.
6. Keep swap path practical for likely Cat-1/Cat-1bis candidates (Telit/Quectel class), preferably via baseboard + modem sub-board strategy in future spins.
7. Add field-debug test points for modem control/data and SIM path in addition to existing rail test points.
8. Optional but recommended: add a physical setup trigger input (button or magnetic trigger, DNP acceptable) reserved for setup-mode/BLE provisioning in a future firmware update.
9. Rev A acceptance is SMS-first. Packet-data/HTTP modem validation is optional scope and should be quoted separately if included.

If any item above is not feasible in Phase 1, call it out clearly in your proposal with an alternative.

## Project Summary

Custom IoT PCB for a remote animal trap monitoring system. The board wakes from deep sleep when a trap triggers, sends an SMS alert via LTE CAT-1bis cellular, then returns to sleep. Designed for outdoor deployment in weatherproof enclosure with solar charging. Intended for use on the Starlink D2C satellite network (Band 7) alongside standard Telstra terrestrial coverage (Band 28) in Australia.

## Two-Phase Development Approach

### Phase 1 — Dev/Test Boards (current scope)

The priority is to get functional test boards as quickly and cheaply as possible for field testing and customer demonstration in Australia. The Starlink D2C satellite network is very new here — there is currently only one known example of anyone in Australia using this system, and we are working with Telstra to get access to the D2C service. Rev A is locked to EG800Q-EU for firmware compatibility; any later modem-family change is a separate variation with firmware/validation scope. This is why we need cheap test units first — to prove the concept and demonstrate it before committing to a production design.

**We are open to using off-the-shelf dev modules** (ESP32-S3 DevKit, EG800Q breakout, u-blox M10 breakout) on a carrier/integration PCB if this reduces cost and lead time. Phase 1 does not need to be miniaturised or production-polished — it needs to work.

**Phase 1 quantity:** 3–5 assembled boards.

### Phase 2 — Production Prototype (future)

Fully integrated custom PCB with proper RF layout, antenna matching, size optimisation, and DFM review. Engaged after Phase 1 field testing validates the concept.

**Phase 2 quantity:** 50–100 units (estimated).

### Firmware Compatibility (CRITICAL)

**The same firmware binary must run on both Phase 1 and Phase 2 boards.** All GPIO pin assignments, UART configurations, power rail voltages, and logic levels must be identical across both phases. The pin map in this document is the authoritative source — any deviations require discussion. See the "Phase 1 Simplifications" section at the end of this document for what can and cannot be changed.

This fixed-binary requirement applies to the EG800Q-EU baseline architecture. If the modem family changes, treat that as a separate, explicitly quoted firmware/validation variation.

---

## Board Requirements

| Parameter | Value |
|---|---|
| Layers | 2 (minimum) — 4 if needed for RF routing |
| Board size | ~60mm × 80mm (flexible ±10mm) |
| Mounting | 4× M3 corner holes (3.2mm dia) |
| Operating temp | -20°C to +60°C |
| Finish | HASL lead-free |
| Solder mask | Green (standard) |
| Silkscreen | White (both sides) |
| PCB thickness | 1.6mm standard |
| Copper weight | 1oz (35um) — 2oz on power traces if possible |

---

## Key ICs and Modules

### 1. MCU — ESP32-S3-WROOM-1-N8 (or N8R2)
- WiFi/BLE module with integrated antenna
- 3.3V logic, powered from LDO
- Native USB-C for programming
- Deep sleep ~10uA

### 2. Cellular Modem — Quectel EG800Q-EU
- LTE CAT-1bis (QCX216 chipset), Band 28 (700 MHz AU) + Band 7 (2600 MHz D2C satellite)
- **NO integrated GNSS** — GPS is provided by separate u-blox M10 module (see below)
- **CRITICAL: VBAT range is 3.3–4.3V only** — needs dedicated 3.8V buck converter (AP63300WU-7, 3A sync) from battery pack. LDO was rejected due to thermal failure (2W dissipation in SOT-23 at 7.2V input).
- Peak TX current: ~1A burst — buck handles 3A continuous with no thermal concern. Place 100uF electrolytic + 10uF ceramic bypass as close as possible to VBAT pin. Buck inductor (4.7µH) placed close to U5.
- 1.8V logic levels — needs level translator to ESP32 (3.3V)
- **Single u.FL antenna connector** (cellular only)
- RESET_N pin — active LOW hardware reset, driven from ESP32 GPIO 7 via level shifter
- Nano-SIM card holder required

### 2b. GPS Module — u-blox MAX-M10S (separate module)
- Standalone GNSS receiver on Serial2 (not part of modem)
- Standard NMEA output at 9600 baud, parsed by TinyGPS++ library
- ESP32 GPIO 15 (TX to M10 RXD), GPIO 16 (RX from M10 TXD)
- Power gated via GPIO 6 → BSS138 N-FET inverter → SI2301 P-FET → M10 VCC (3.3V)
  Firmware drives GPIO HIGH = powered (BSS138 inverts for P-FET gate logic).
  **Alternative (simpler):** Replace P-FET + inverter with active-HIGH LDO enable (e.g., MIC5219-3.3)
- Own u.FL antenna connector for GNSS ceramic patch antenna
- 3.3V logic — no level shifting required

### 3. RTC — DS3231SN (SOIC-16)
- I2C temperature-compensated real-time clock
- CR2032 backup battery holder
- Provides accurate wake scheduling

### 4. Level Translator — BSS138 Discrete (Rev A Standard)
- 3.3V (ESP32) ↔ 1.8V (EG800Q-EU)
- 4 channels: UART TX, UART RX, PWRKEY, RESET_N
- Use discrete BSS138 channels with pull-ups on both sides for modem UART/control nets.
- Do not use auto-direction translators (for example TXB0104) on modem UART/control nets in Rev A.
- **PWRKEY: add 10kΩ pull-down on 1.8V side** to prevent spurious modem power toggle during ESP32 boot/reset

---

## Power Architecture

```
Solar Panel (12V 2W) ──► MPPT Buck Charger (CN3767, U9)
                              │  Input: ~10V under load
                              ▼  Output: 7.2V LiFePO4 2S charge
                      Battery Pack (2S LiFePO4 = 6.4V nom, 7.2V full)
                              │
                              ├──► 1MΩ/470kΩ divider ──► ESP32 ADC (battery sense, 4.9µA bleed)
                              │
                              ├──► 3.3V LDO (HT7333-A, Iq 2.5µA) ──► ESP32 + RTC + LEDs
                              │                                    │
                              │                                    └──► GPIO 6 power gate (SI2301 P-FET)
                              │                                              └──► u-blox M10 VCC
                              │
                              └──► 3.8V Buck (AP63300WU-7, Iq 22µA, 3A) ──► EG800Q-EU VBAT
```

**Solar sense circuit:** 0.1Ω shunt in charge path, voltage measured on ESP32 ADC.

**Pack D variant (no solar):** 3× D-cell L91 primary batteries (4.5V nom, 4.8V fresh). Uses the same HT7333 + AP63300 power path as rechargeable packs, but solar charger (U9 CN3767) is DNP. Board supports both configurations via DNP pads. **Note:** AP63300 buck Vin min = 3.8V, so Pack D modem operation ceases below ~4.0V pack voltage (firmware sets empty threshold to 4.0V, not cell end-of-life 2.7V). L91 cells have a flat discharge curve at ~4.5V for most of their life, so >90% of usable capacity remains available. **Pack B (1S LiFePO4) is incompatible** — its full-charge voltage (3.6V) is below the AP63300 minimum input (3.8V).

---

## Complete Pin Assignment — ESP32-S3

| GPIO | Function | Connected To | Type | Notes |
|---|---|---|---|---|
| 1 | SOLAR_SENSE | Solar current sense circuit | ADC input | 0–3.3V, guard traces |
| 2 | BATT_SENSE | Battery voltage divider midpoint | ADC input | 0–3.3V, 100nF filter cap |
| 4 | TRAP_TRIGGER | Reed switch connector (NC to GND) | Digital input | 100k pull-up, 100nF debounce, EXT0 wake on HIGH (switch open = triggered) |
| 5 | MODEM_PWRKEY | EG800Q-EU PWRKEY via level shift | Digital output | Active HIGH pulse to toggle modem power |
| 6 | GPS_PWR | u-blox M10 power gate (MOSFET/LDO EN) | Digital output | HIGH = M10 powered, LOW = off (deep sleep) |
| 7 | MODEM_RST | EG800Q-EU RESET_N via level shift | Digital output | Active LOW hardware reset |
| 8 | RTC_SDA | DS3231 SDA | I2C | 4.7k pull-up to 3.3V |
| 9 | RTC_SCL | DS3231 SCL | I2C | 4.7k pull-up to 3.3V |
| 10 | EXP_ANALOG | Expansion header (analogue sensor) | ADC input | DNP header, 0–3.3V |
| 11 | EXP_DIGITAL_1 | Expansion header (2nd trigger) | Digital input | DNP header, 10k pull-up |
| 12 | EXP_DIGITAL_2 | Expansion header (pulse counter) | Digital input | DNP header |
| 13 | EXP_UART_TX | Expansion header (serial sensor) | UART TX | DNP header |
| 14 | EXP_UART_RX | Expansion header (serial sensor) | UART RX | DNP header |
| 15 | GPS_TX | u-blox M10 RXD (Serial2 TX) | UART TX | 9600 baud, config commands to M10 |
| 16 | GPS_RX | u-blox M10 TXD (Serial2 RX) | UART RX | 9600 baud, NMEA data from M10 |
| 17 | MODEM_TX | EG800Q-EU RXD via level shift | UART TX | 115200 baud (Serial1) |
| 18 | MODEM_RX | EG800Q-EU TXD via level shift | UART RX | 115200 baud (Serial1) |
| 38 | LED_GREEN | Green LED (3mm TH) | Digital output | 220Ω series to GND |
| 39 | LED_AMBER | Amber LED (3mm TH) | Digital output | 220Ω series to GND |
| 40 | LED_RED | Red LED (3mm TH) | Digital output | 220Ω series to GND |
| 41 | EXP_I2C_SDA | Expansion header (I2C sensors) | I2C | DNP header, 4.7k pull-up DNP |
| 42 | EXP_I2C_SCL | Expansion header (I2C sensors) | I2C | DNP header, 4.7k pull-up DNP |
| 43 | EXP_ONEWIRE | Expansion header (DS18B20 probe) | OneWire | DNP header, 4.7k pull-up DNP |
| EN | RESET | 10k pull-up + 100nF to GND | — | RC reset circuit |
| USB D+/D- | USB-C connector | Programming/debug | USB 2.0 | USBLC6-2SC6 ESD protection |

---

## Connectors Required

| Label | Type | Pins | Function | Populated |
|---|---|---|---|---|
| J1 | JST-PH 2.0mm | 2 | Battery pack | Yes |
| J2 | JST-PH 2.0mm | 4 | Expansion I2C (SDA, SCL, 3V3, GND) | No (DNP) |
| J3 | JST-PH 2.0mm | 3 | Expansion Analog + OneWire + GND | No (DNP) |
| J4 | JST-PH 2.0mm | 3 | Expansion Digital 1 + Digital 2 + GND | No (DNP) |
| J5 | JST-PH 2.0mm | 4 | Expansion UART (TX, RX, 3V3, GND) | No (DNP) |
| J6 | JST-PH 2.0mm | 2 | Solar panel | Yes |
| J7 | JST-PH 2.0mm | 2 | Reed switch (trap trigger) | Yes |
| J8 | Nano-SIM holder | 6+2 | SIM card (push-push) | Yes |
| J9 | u.FL / IPEX | 1 | EG800Q-EU cellular antenna | Yes |
| J10 | u.FL / IPEX | 1 | u-blox M10 GNSS antenna | Yes |
| J11 | USB-C 16-pin | — | Programming / debug (USB 2.0) | Yes |
| BT1 | CR2032 holder | 2 | RTC backup battery | Yes |

---

## Critical Design Notes

1. **EG800Q-EU VBAT must be 3.3–4.3V** — the battery pack is 6.4V nom / 7.2V full (2S LiFePO4). **AP63300WU-7** (3.8V, 3A sync buck, Iq 22µA, Vin 3.8–32V) steps battery down to modem VBAT. Feedback resistors 160kΩ/30kΩ set output to 3.80V. 4.7µH inductor + 22µF output cap + 100nF bootstrap. 100µF + 10µF bypass caps at VBAT pin provide additional TX burst reservoir.

2. **Level translation required** — EG800Q-EU uses 1.8V logic. ESP32-S3 uses 3.3V. Use discrete BSS138 level shifting on UART TX, UART RX, PWRKEY, and RESET_N lines (4 channels total).

3. **RF antenna routing** — Both cellular (EG800Q-EU) and GNSS (u-blox M10) u.FL connectors need 50Ω controlled impedance traces. Keep 15mm ground clearance around antenna feed points. No copper pour in antenna keepout zones. Place antennas on opposite board edges for isolation. The two u.FL connectors serve different modules: J9 for EG800Q-EU cellular, J10 for u-blox M10 GNSS.

4. **GPS power gate** — The u-blox M10 GPS module is powered from the 3.3V rail via a P-channel MOSFET (SI2301) controlled by GPIO 6. This allows the GPS to be fully powered off during deep sleep. An N-FET inverter (BSS138) is needed so firmware GPIO HIGH = M10 powered.

5. **Deep sleep current ~84µA** — Budget: ESP32 10µA + RTC 3.5µA + modem off 8µA + HT7333 Iq 2.5µA + AP63300 Iq 22µA + divider bleed 4.9µA + reed switch pull-up 33µA + GPS off 0µA. Buck EN pin can be GPIO-controlled for ~63µA total if needed.

6. **ADC guard traces** — GPIO 1 and GPIO 2 are analogue inputs for battery and solar sensing. Route these away from digital switching noise. Consider a ground guard ring around ADC traces.

7. **Expansion headers are DNP** — Place footprints and pads for all expansion connectors (J2–J5) and their associated pull-up resistors, but do not populate. Users will solder these as needed.

8. **Outdoor enclosure** — Target board fits Hammond 1591XXBFL (IP65, 113×63mm internal). LEDs should be at board edge for visibility. External connectors (JST, u.FL) at board edges.

9. **u-blox M10 GPS placement** — Place the M10 module on the opposite side of the board from the EG800Q-EU modem for antenna separation. The M10 operates at 3.3V logic (same as ESP32) so no level shifting is needed on its UART or power pin.

10. **USB-C CC resistors** — Place 5.1kΩ pull-down resistors on CC1 and CC2 pins of the USB-C connector to GND. Required for USB 2.0 device detection — without these, some USB hosts will not enumerate the ESP32-S3.

11. **Solar charge controller** — CN3767 MPPT buck charger (U9) between 12V solar panel input (J6) and 2S LiFePO4 battery pack (7.2V charge target). Charge voltage set via FBVR resistor divider for LiFePO4 chemistry. Mark as DNP for Pack D (primary cells, no solar). Place near J6 and J1 connectors.

12. **SIM ESD protection** — Use a 3-channel TVS diode array (TPD3E001DRLR) to protect all three SIM data lines (DATA, CLK, RST) simultaneously. A single-channel TVS is insufficient.

---

## Test Points Required

| Label | Net | Purpose |
|---|---|---|
| TP1 | VCC_3V3 | Verify 3.3V rail |
| TP2 | MODEM_VCC | Verify 3.8V modem supply |
| TP3 | BATT_SENSE | Battery ADC midpoint |
| TP4 | SOLAR_SENSE | Solar current sense |
| TP5 | GND | Ground reference |
| TP6 | MODEM_TX | Debug modem UART (ESP32 side) |
| TP7 | MODEM_RX | Debug modem UART (ESP32 side) |
| TP8 | GPS_VCC | Verify GPS power gate output |
| TP9 | GPS_TX | Debug GPS UART (ESP32 → M10) |
| TP10 | GPS_RX | Debug GPS UART (M10 → ESP32) |

---

## Deliverables Requested (Phase 1)

1. **Schematic** (PDF + editable source in EasyEDA/KiCad/Altium)
2. **PCB layout** (editable source)
3. **Gerber files** (RS-274X)
4. **BOM** in JLCPCB assembly format
5. **Pick-and-place / centroid file** (for PCBA)
6. **3D render** (top + bottom views)
7. **Design review notes** — any changes made to the spec, questions, or recommendations
8. **Confirmation that GPIO pin map matches `config.h` exactly** (firmware compatibility)

---

## Phase 1 Simplifications

The following simplifications are acceptable for Phase 1 to reduce cost and lead time:

| Area | Simplification | Notes |
|------|---------------|-------|
| Modules | Use off-the-shelf ESP32-S3, EG800Q, M10 breakout boards on a carrier PCB | Provided carrier routes signals to match GPIO pin map exactly |
| Layer count | 2-layer acceptable | 4-layer deferred to Phase 2 if RF performance is sufficient |
| Components | Through-hole acceptable | Reduces hand-assembly cost |
| Board size | No size constraint | Don't optimise — just fit the enclosure roughly |
| Expansion headers | Place footprints/pads (DNP) | Keep the option open for future sensor additions |
| Production hardening | Defer conformal coating, NTC, TVS protection | Phase 2 concern |

The following **must not be simplified** — they affect firmware compatibility or core function:

- All GPIO pin assignments (see pin table + `config.h`)
- Power rails: 3.3V (MCU/GPS/RTC) and 3.8V (modem VBAT)
- BSS138 level translation on modem UART/control (3.3V ↔ 1.8V, 4 channels)
- Reed switch circuit (GPIO 4, 100kΩ pull-up, ext0 wake on HIGH)
- GPS power gating (GPIO 6 HIGH = powered)
- Battery ADC voltage divider (1MΩ/470kΩ on GPIO 2)
- USB-C for firmware flashing
- SIM card holder
- Both u.FL antenna connectors (cellular + GNSS)
- Expansion header footprints/pads (DNP — for future sensor use)

---

## Attached Reference Files

- `DESIGN_SPEC.md` — Full technical specification with schematics, netlist, layout constraints
- `BOM_PCB.csv` — Component list with suggested LCSC part numbers
- `config.h` — Firmware pin definitions (source of truth for all GPIO assignments)

---

## Contact

Please reach out with any questions before starting layout. The pin assignments in `config.h` are the authoritative source — the firmware is already compiled and tested against these exact GPIO numbers, so pin changes require discussion.

This is Phase 1 — we're optimising for speed and cost. Once field testing is complete, we'll engage for a fully integrated Phase 2 production design.
