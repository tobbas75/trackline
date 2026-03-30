# Direct-to-Cell (D2C) Research and Implementation Guide

**Last updated:** 12 March 2026
**Project:** Trap Monitor
**Purpose:** Single source of truth for Starlink/Telstra D2C research findings and implementation actions.

---

## How To Use This Document

Use this in two passes:

1. Read **Research Findings** to understand what is confirmed vs unconfirmed.
2. Execute **Implementation Plan** to move from prototype to carrier-ready deployment.

---

## Part A - Research Findings

### A1) Key Takeaways (Confirmed)

- Public, SKU-level D2C IoT module evidence is strongest from One NZ.
- One NZ has commercial Satellite IoT live and has published a certified module list.
- Published D2C-capable modules are primarily 4G Cat-1 / Cat-1 bis families.
- Telstra has confirmed Australian satellite-to-mobile testing and rollout progress (SMS first), but no public Telstra D2C IoT module list was found in this research pass.

### A2) Carrier Snapshot (Public Evidence)

| Carrier | Current Public Status | IoT Module SKU List Public? | Confidence |
|---|---|---|---|
| One NZ | Commercial Satellite IoT live; certified module documentation published | Yes | High |
| Telstra | Starlink satellite-to-mobile trials and launch path documented | No | Medium-High |
| T-Mobile | T-Satellite smartphone service and selected app data documented | No | Medium |

### A3) Confirmed D2D-Approved Embedded Modules (One NZ)

From the One NZ March 2026 certification document:

| Vendor | Model | Network Support | VoLTE | One NZ Satellite D2D |
|---|---|---|---|---|
| Quectel | EG21GGB-MINIPCIE-S | 4G Cat-1 Satellite DTD | Yes | Yes |
| Quectel | EG800Q-EU | 4G Cat-1 bis Satellite DTD | No | Yes |
| Telit | LE910C1-WWX | 4G Cat-1 Satellite DTD | Yes | Yes |
| Telit | LE910Q1 | 4G Cat-1 bis Satellite DTD | No | Yes |
| Thales | PLS-63W | 4G Cat-1 Satellite DTD | No | Yes |
| u-blox | LEXI R10011D | 4G satellite DTD | No | Yes |

### A4) In Certification / Roadmap (One NZ)

| Vendor | Model | Network Support | VoLTE | One NZ Satellite D2D |
|---|---|---|---|---|
| Quectel | EG915N-EA | 4G Cat-1 bis Satellite DTD | Yes | Yes |
| u-blox | LEXI-R10801D | 4G satellite DTD | No | TBC |

### A5) Technical Constraints Seen In Public Material

- D2C IoT support currently aligns with Cat-1 / Cat-1 bis module classes.
- Carrier-side certification is a gating requirement (not just generic modem compatibility).
- Line-of-sight and intermittent service behaviour are part of current service characteristics.
- One NZ materials indicate satellite operation tied to their certified module pathway and network terms.

### A6) Confidence Assessment

- **High confidence:** One NZ module-level data and D2D statuses.
- **Medium confidence:** Timelines and availability outside One NZ due to limited public SKU-level disclosures.

---

## Part B - Implementation Plan

### B1) Target Outcome

Deploy Trap Monitor hardware and firmware on a carrier-accepted D2C path with minimal redesign risk.

### B2) Hardware Strategy

1. Keep Cat-1/Cat-1 bis as the primary modem class for D2C readiness.
2. Maintain a module swap path on PCB (pin-compatible or adapter strategy where practical).
3. Validate required AU bands and antenna performance against target carrier certification requirements.
4. Keep power budget conservative for intermittent uplink windows and retry behaviour.

### B3) Firmware Strategy

1. Preserve and extend modem HAL abstraction (`IModem.h` + `ModemFactory.h`) for module portability.
2. Add modem capability flags in code for D2C-related behavior differences (timing/retry/profile).
3. Keep payload efficiency high (SMS-first constraints and compact telemetry framing).
4. Expand diagnostics for signal/search/attach/send latency to support field and carrier evidence.

### B4) Carrier Engagement Workflow (Australia)

1. Contact Telstra M2M hardware certification team with the target module and use case.
2. Register interest via Starlink Direct-to-Cell business channels.
3. Ask specifically for D2C IoT certification path, accepted modules, test plan, and expected timeline.
4. Prepare a concise technical dossier:
   - device purpose and deployment environment
   - modem SKU and firmware version
   - antenna details
   - expected traffic profile (message size/frequency)
   - fallback behavior when terrestrial service returns

### B5) Validation Gates

**Gate 1 - Bench**
- Attach and send reliability
- retry/backoff behavior
- power profile during worst-case send windows

**Gate 2 - Field**
- line-of-sight message success
- latency distribution by time/location
- reconnection behavior when terrestrial coverage returns

**Gate 3 - Carrier Readiness**
- certification pre-check complete
- module acceptance confirmed
- operational limits documented (fair use/capacity constraints)

### B6) Immediate Next Actions (Practical)

1. Use current EG800Q-EU path as baseline and keep Cat-1 bis focus.
2. Start Telstra certification discussion with a specific module/firmware baseline.
3. Gather 2-4 week field telemetry from current units to support certification conversations.
4. Track D2C assumptions explicitly in project docs and update when carrier guidance changes.

---

## Part C - Australia Rollout and Hardware Interface

### C1) Pathway to Get D2C IoT Working in Australia

1. Choose one primary module and lock firmware baseline for certification (current best baseline: EG800Q-EU).
2. Prove terrestrial operation first: SMS reliability, packet data sessions, APN behavior, and power profile.
3. Open Telstra pre-certification with exact device details (hardware revision, module SKU, firmware version, antenna specs, traffic profile).
4. Register with Starlink Direct-to-Cell business channels and request current Australia IoT onboarding requirements.
5. Run a controlled field pilot in mixed conditions (good terrestrial, weak terrestrial, no terrestrial) and capture attach/send/latency metrics.
6. Freeze production BOM only after module acceptance path and operational constraints are confirmed in writing.

### C2) Who to Speak To

1. Telstra M2M hardware certification: telstrawirelessm2mhardware@team.telstra.com
2. Telstra Enterprise IoT team (commercial plans, SIM/eSIM options, platform onboarding).
3. Starlink D2C business intake: https://direct.starlink.com/
4. M2M One (Telstra IoT ecosystem partner) for integration and commercial acceleration.
5. Local compliance test lab (RCM/EMC/RF) before large rollout.

### C3) Likely Hurdles

1. Public AU module-level D2C acceptance remains less explicit than NZ.
2. Carrier certification is solution-specific, not just modem capability-based.
3. D2C is line-of-sight and can be intermittent; latency and throughput are variable.
4. Power consumption rises during search/attach/retry windows and can stress battery budgets.
5. RF tuning across required AU bands is critical and often underestimated.
6. eSIM can work, but profile provisioning and acceptance depend on the carrier + module combination.
7. Fair use and capacity controls may limit telemetry burst patterns.

### C4) Board Pin Layout for Swappable Likely Modems

Use a two-board approach:

1. Baseboard with ESP32-S3, power, sensors, SIM/eSIM, and a standard modem host connector.
2. Modem daughtercards per module family (EG800Q, Telit LE910, future candidates).

Avoid trying to place one universal LCC footprint for all candidate modems on the baseboard.

#### Recommended Host Connector Signal Set

| Group | Required Signals |
|---|---|
| Power | VBAT_MODEM (multiple pins), GND (multiple pins), optional 3V3_AUX |
| Control | PWRKEY, RESET_N, STATUS, RI, DTR, W_DISABLE |
| Data | UART_TXD, UART_RXD, UART_RTS, UART_CTS |
| Service | USB_DP, USB_DM |
| SIM | SIM_VCC, SIM_CLK, SIM_IO, SIM_RST, SIM_DET |
| Optional | GNSS_TXD, GNSS_RXD, GPIO1-4, I2C_SCL, I2C_SDA, ADC_VBAT_MON |

#### Suggested 40-Pin Logical Pin Map (2x20 Mezzanine)

| Pins | Function |
|---|---|
| 1-4 | VBAT_MODEM |
| 5-8 | GND |
| 9 | UART_TXD (MCU to modem) |
| 10 | UART_RXD (modem to MCU) |
| 11 | UART_RTS |
| 12 | UART_CTS |
| 13 | PWRKEY |
| 14 | RESET_N |
| 15 | STATUS |
| 16 | RI |
| 17 | DTR |
| 18 | W_DISABLE |
| 19 | USB_DP |
| 20 | USB_DM |
| 21 | SIM_VCC |
| 22 | SIM_CLK |
| 23 | SIM_IO |
| 24 | SIM_RST |
| 25 | SIM_DET |
| 26 | I2C_SCL (optional) |
| 27 | I2C_SDA (optional) |
| 28 | GPIO1 |
| 29 | GPIO2 |
| 30 | GPIO3 |
| 31 | GPIO4 |
| 32 | GNSS_TXD (optional) |
| 33 | GNSS_RXD (optional) |
| 34 | ADC_VBAT_MON |
| 35 | ANT_SW_CTL (optional) |
| 36 | Reserved |
| 37-40 | GND |

#### Firmware/Pin Mapping Guidance for Current Trap Monitor

1. Keep current control path as baseline: TX=17, RX=18, PWRKEY=5, RESET_N=7.
2. Add 0R resistor strap options so UART/control signals can be rerouted if a new module needs different GPIO mapping.
3. Provide level-shift options for modules that require 1.8V logic.
4. Place both eSIM MFF2 footprint and physical nano-SIM fallback path where practical.

---

## Primary Contacts and Links

### Telstra Contacts

- M2M hardware certification: telstrawirelessm2mhardware@team.telstra.com
- Telstra Enterprise IoT: https://www.telstra.com.au/business-enterprise/products/internet-of-things
- Telstra M2M portal: https://telstra.m2m.com/

### Starlink D2C Channels

- Global D2C page: https://www.starlink.com/business/direct-to-cell
- Australia D2C page: https://www.starlink.com/au/business/direct-to-cell
- Direct portal: https://direct.starlink.com/

### Core Evidence Sources

- One NZ certified modules PDF: https://one.nz/iot/iot-certified-modules-and-integrated-devices.pdf
- One NZ Satellite IoT launch: https://media.one.nz/bees
- One NZ connectivity plans: https://one.nz/iot/connectivity-plans/
- One NZ IoT networks: https://one.nz/iot/networks/
- Telstra satellite-to-mobile trial update: https://www.telstra.com.au/exchange/telstra-satellite-to-mobile-connectivity--our-latest-trials-and-
- T-Mobile satellite page: https://www.t-mobile.com/coverage/satellite-phone-service

---

## Notes

- This guide merges and replaces prior split notes for D2C research and contact tracking.
- If new carrier SKU-level module disclosures appear, update Part A first, then revise Part B action steps.
