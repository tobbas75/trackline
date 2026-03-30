# Trap Monitor — Hardware Design Brief

**Date:** March 2026
**Contact:** Toby Barton

---

## 1. Product Overview

A remote, solar-powered animal trap monitoring unit for deployment in the Australian bush. The unit spends most of its time in deep sleep, waking on a trigger event (reed switch interrupt) or a daily RTC alarm to send a single SMS alert via LTE, then returning to sleep.

**Primary use case:** Detect trap trigger → send SMS → sleep.

**Operating environment:** Outdoor, IP-rated enclosure, temperature range 0–50°C, remote locations with limited cellular coverage (Telstra Band 28, 700 MHz). Intended for use on the Starlink D2C satellite network (Band 7, 2600 MHz) alongside standard Telstra terrestrial coverage.

---

## 2. Two-Phase Approach

### Phase 1 — Dev/Test Boards (current scope)

The goal is to get functional boards in our hands as quickly and cost-effectively as possible for field testing and demonstration in Australia. The Starlink D2C satellite network is very new here — there is currently only one known example of anyone in Australia using this system, and we are in the process of getting Telstra to grant us access to the D2C service. Rev A is locked to EG800Q-EU for firmware compatibility; any later modem-family change is a separate variation with firmware/validation scope. This is why we need cheap test units to start with — we need to prove the concept and demonstrate it to Telstra before committing to a production design.

**We are open to using off-the-shelf dev modules** (e.g. ESP32-S3 DevKit, EG800Q breakout board, u-blox M10 breakout) mounted on a carrier/integration PCB if this significantly reduces cost and lead time versus a fully integrated design. The priority is speed and low cost, not miniaturisation or polish.

Phase 1 scope:
1. **Schematic and PCB layout** for a carrier/integration board
2. **Prototype fabrication and assembly** — 3–5 units
3. **Basic functional testing** — power-on, modem registration, GPS fix, deep sleep current draw, trigger wake

### Phase 2 — Production Prototype (future)

Once field testing validates the concept and confirms the final modem choice, we will engage for a fully integrated custom PCB — proper RF layout, antenna matching, size optimisation, and DFM review. Phase 2 will be a larger engagement.

### Firmware Compatibility Requirement (CRITICAL)

**The same firmware binary must run on both Phase 1 and Phase 2 boards without modification.** This means:

- **GPIO pin assignments must be identical** — see Section 10 for the complete pin map. These are compiled into the firmware and cannot change between phases.
- **UART baud rates and bus assignments must match** — Serial1 (modem, 115200), Serial2 (GPS, 9600), I2C (RTC)
- **Power rail voltages must be the same** — 3.3V for MCU/GPS/RTC, 3.8V for modem VBAT
- **Logic levels must be preserved** — 3.3V on ESP32 side, 1.8V on modem side (level shifted), 3.3V on GPS side (no shift needed)
- **Wake behaviour must be identical** — GPIO 4 (reed switch) triggers ext0 wake from deep sleep on HIGH

If using dev modules in Phase 1, the carrier board must route signals to match the pin map exactly. Any deviations require discussion before implementation.

This fixed-binary requirement applies to the EG800Q-EU baseline architecture. If the modem family changes, treat that as a separate, explicitly quoted firmware/validation variation.

Firmware is complete and will be provided as a compiled binary for flashing during testing.

---

## 3. MCU

| Parameter | Value |
|-----------|-------|
| Part | ESP32-S3-WROOM-1-N8 |
| Flash | 8 MB |
| Interface | Native USB-C (programming + debug) |
| Operating mode | Deep sleep default, wake on GPIO interrupt or RTC alarm |

---

## 4. LTE Modem

| Parameter | Value |
|-----------|-------|
| Part | Quectel EG800Q-EU |
| Category | LTE CAT-1bis |
| Chipset | QCX216 |
| Bands | Band 28 (700 MHz, AU terrestrial) + Band 7 (D2C satellite) |
| Antenna | Single — one U.FL or SMA connector (no diversity) |
| GNSS | None integrated — standalone GPS module required |
| Interface | UART (115200 baud) |
| Control | PWRKEY (active HIGH pulse), RESET_N (active LOW) |

**ESP32-S3 pin assignments:**

| Signal | GPIO | Direction |
|--------|------|-----------|
| Modem TXD (ESP → modem RXD) | 17 | Output |
| Modem RXD (modem TXD → ESP) | 18 | Input |
| PWRKEY | 5 | Output |
| RESET_N | 7 | Output |

**Power note:** The modem requires a dedicated buck converter. We've specified the AP63300 (Vin 3.8–32V, 3A). The modem's peak current draw during TX bursts can reach 2A.

---

## 5. GPS Module

| Parameter | Value |
|-----------|-------|
| Part | u-blox M10 (standalone module) |
| Output | NMEA @ 9600 baud |
| Interface | UART (Serial2 on ESP32-S3) |
| Power | GPIO-controlled LDO — power gated during deep sleep |

**ESP32-S3 pin assignments:**

| Signal | GPIO | Direction |
|--------|------|-----------|
| GPS TXD (ESP → M10 RXD) | 15 | Output |
| GPS RXD (M10 TXD → ESP) | 16 | Input |
| GPS power enable | 6 | Output (HIGH = on) |

---

## 6. Real-Time Clock

| Parameter | Value |
|-----------|-------|
| Part | DS3231SN |
| Interface | I2C |
| Backup | CR2032 coin cell holder |
| Purpose | Periodic wake alarm (survives deep sleep) |

**ESP32-S3 pin assignments:**

| Signal | GPIO |
|--------|------|
| SDA | 8 |
| SCL | 9 |

---

## 7. Power System

### 7.1 Primary Configuration (default)

- **Battery:** LiFePO4 2S (6.4V nominal, 7.2V full, 5.6V cutoff)
- **Capacity:** 6000 mAh
- **Solar charging:** On-board CN3767 MPPT buck charger (U9) from 12V panel to 2S pack; charge status is also monitored via ADC current-sense.

### 7.2 Alternative Pack Options (same PCB, component swap)

| Pack | Chemistry | Voltage Range | Solar | Notes |
|------|-----------|---------------|-------|-------|
| A (default) | LiFePO4 2S | 5.6–7.2V | Yes | |
| C | Li-ion 18650 2S | 6.0–8.4V | Yes | |
| D | 3× D-cell primary (Energizer L91) | 4.0–4.8V | No | Field-swap only, no recharge |

**Note:** Pack B (1S LiFePO4, 3.2V nom) is incompatible — full charge voltage (3.6V) is below the AP63300 buck converter minimum input (3.8V).

### 7.3 ADC Sensing

| Signal | GPIO | Purpose |
|--------|------|---------|
| Battery voltage | 2 | Via voltage divider (1MΩ + 470kΩ, ratio 3.128) — max 7.2V → 2.30V at ADC |
| Solar current | 1 | Current-sense ADC (threshold >100 counts = charging) |

**Test point:** TP3 on BATT_SENSE net for per-board ADC calibration with multimeter.

### 7.4 Deep Sleep Target

The primary design goal is minimal deep sleep current. All peripherals (modem, GPS, LEDs) must be fully power-gated or in lowest power state during sleep. Current architecture budget is ~84 µA total board draw in deep sleep. A stretch target of ~63 µA is available if AP63300 EN is GPIO-controlled for sleep shutdown.

---

## 8. Inputs

### 8.1 Trap Trigger (primary)

| Parameter | Value |
|-----------|-------|
| Type | Reed switch, normally closed (NC) |
| GPIO | 4 |
| Behaviour | GPIO interrupt wakes ESP32-S3 from deep sleep |
| Pull | Internal pull-up (3.3V) |

### 8.2 Status LEDs

| Colour | GPIO | Notes |
|--------|------|-------|
| Green | 38 | Status OK / send success |
| Amber | 39 | Boot / warning |
| Red | 40 | Error / failure |

---

## 9. Expansion Headers

Reserved on PCB, **unpopulated by default**. Standard 2.54mm pin headers.

| Header | GPIO(s) | Type | Purpose |
|--------|---------|------|---------|
| EXP_I2C | SDA: 41, SCL: 42 | I2C (separate bus from RTC) | Temp/humidity sensor (BME280/SHT31) |
| EXP_1WIRE | 43 | 1-Wire | DS18B20 waterproof probe |
| EXP_ANALOG | 10 | ADC1 CH9 | Soil moisture / water level |
| EXP_DIGITAL_1 | 11 | Digital input (NC, 3.3V pull-up) | Secondary trap trigger |
| EXP_DIGITAL_2 | 12 | Digital input (pulse count) | Rain gauge / flow meter |
| EXP_UART | TX: 13, RX: 14 | UART | Serial sensor (ultrasonic etc.) |

---

## 10. Complete GPIO Summary

| GPIO | Function | Direction |
|------|----------|-----------|
| 1 | Solar ADC (current sense) | ADC input |
| 2 | Battery ADC (voltage divider) | ADC input |
| 4 | Trap trigger (reed switch, NC) | Input, interrupt |
| 5 | Modem PWRKEY | Output |
| 6 | GPS power enable | Output |
| 7 | Modem RESET_N | Output |
| 8 | RTC I2C SDA | I2C |
| 9 | RTC I2C SCL | I2C |
| 10 | EXP_ANALOG | ADC input |
| 11 | EXP_DIGITAL_1 | Input |
| 12 | EXP_DIGITAL_2 | Input |
| 13 | EXP_UART TX | Output |
| 14 | EXP_UART RX | Input |
| 15 | GPS TX (ESP → M10) | Output |
| 16 | GPS RX (M10 → ESP) | Input |
| 17 | Modem TX (ESP → EG800Q) | Output |
| 18 | Modem RX (EG800Q → ESP) | Input |
| 38 | LED Green | Output |
| 39 | LED Amber | Output |
| 40 | LED Red | Output |
| 41 | EXP_I2C SDA | I2C |
| 42 | EXP_I2C SCL | I2C |
| 43 | EXP_1WIRE | 1-Wire |

---

## 11. RF Considerations

- **LTE antenna:** Single antenna for EG800Q-EU. Must cover Band 28 (700 MHz) and Band 7 (2600 MHz). Matching network required. U.FL or SMA connector.
- **GPS antenna:** Separate antenna for u-blox M10. Passive ceramic patch or active antenna with LNA.
- **Separation:** LTE and GPS antennas need adequate isolation on the PCB.
- **Regulatory:** Must comply with ACMA (Australian) requirements for deployment in Australia.

---

## 12. Mechanical / Enclosure Notes

- PCB to fit within a weatherproof enclosure (IP65 minimum)
- External antenna connectors (U.FL pigtail to SMA bulkhead, or PCB-edge SMA)
- USB-C accessible for programming (can be sealed with a gland or flap)
- Battery connector (JST or XT30 depending on pack)
- Solar panel input connector (2-pin, polarity protected)
- Mounting holes for enclosure standoffs

---

## 13. Deliverables Expected (Phase 1)

1. Schematic (PDF + source files)
2. PCB layout (Gerber + source files)
3. Bill of Materials with supplier part numbers
4. 3–5 assembled prototype boards
5. Basic test report (power-on, modem registration, GPS fix, deep sleep current, trigger wake)
6. Confirmation that GPIO pin map matches Section 10 exactly (firmware compatibility)

All design files to be delivered as our property.

---

## 14. Notes for Phase 1 Simplifications

The following simplifications are acceptable for Phase 1 dev/test boards to reduce cost:

- **Dev modules on carrier board** — Using off-the-shelf ESP32-S3, EG800Q, and u-blox M10 breakout boards is acceptable, provided the carrier PCB routes all signals to match the GPIO pin map in Section 10
- **2-layer PCB** — Acceptable for Phase 1 if RF performance is sufficient for testing. 4-layer deferred to Phase 2
- **Through-hole components** — Acceptable where it reduces assembly cost
- **Larger board size** — No size constraint for Phase 1. Fit the enclosure roughly, but don't optimise
- **Expansion headers** — Footprints and pads should still be placed (unpopulated/DNP) so the option remains for future sensor additions
- **Production hardening** — Conformal coating, NTC thermistor, TVS protection on solar/reed inputs all deferred to Phase 2

The following **must not be simplified** (affects firmware compatibility or core function):

- GPIO pin assignments — must match exactly
- Power rails — 3.3V and 3.8V as specified
- BSS138 level translation on modem UART/control (3.3V ↔ 1.8V, 4 channels)
- Reed switch circuit (GPIO 4, 100kΩ pull-up, ext0 wake on HIGH)
- GPS power gating (GPIO 6 HIGH = powered)
- Battery ADC voltage divider (1MΩ/470kΩ on GPIO 2)
- USB-C for firmware flashing
- SIM card holder
- Both antenna connectors (cellular + GNSS)
