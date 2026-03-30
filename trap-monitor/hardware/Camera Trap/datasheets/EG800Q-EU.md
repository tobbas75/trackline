---
component: Quectel EG800Q-EU
manufacturer: Quectel
category: Comms — LTE CAT-1bis Modem
status: Active
last_verified: 2026-03-29
sources: |
  - Quectel product page: https://www.quectel.com/product/lte-eg800q-series/
  - Mouser datasheet: https://www.mouser.com/datasheet/2/1052/Quectel_EG800Q_Series_LTE_Standard_Specification_V-3508102.pdf
  - Quectel EG800Q Hardware Design Guide (request from distributor)
  - Quectel AT Commands Manual (request from distributor)
  - Project DESIGN_SPEC.md, MODEM_INTERFACE_SPEC.md, SCHEMATIC_CHANGES_V1.1.md (Quectel FAE review)
confidence: |
  Values marked [PROJECT-VERIFIED] are confirmed in project design docs reviewed by Quectel FAE.
  Values marked [DATASHEET] are from Quectel published specs / Mouser listings.
  Values marked [TRAINING-DATA] are from pre-training knowledge — verify against current datasheet before use.
---

# Quectel EG800Q-EU — LTE CAT-1bis Modem Module

## Datasheet Links

| Document | URL |
|----------|-----|
| Product page | https://www.quectel.com/product/lte-eg800q-series/ |
| Standard Specification | https://www.mouser.com/datasheet/2/1052/Quectel_EG800Q_Series_LTE_Standard_Specification_V-3508102.pdf |
| Hardware Design Guide | Request from Quectel distributor or FAE (Xianghao Kong, ANZ team) |
| AT Commands Manual | Request from Quectel distributor |
| Quectel Forums | https://forums.quectel.com/ |

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| LTE Category | CAT-1bis (3GPP Release 14) | [PROJECT-VERIFIED] |
| Chipset | Qualcomm QCX216 | [PROJECT-VERIFIED] BOM.csv |
| Max DL speed | 10 Mbps | [DATASHEET] |
| Max UL speed | 5 Mbps | [DATASHEET] |
| Antenna ports | **1 (single antenna)** — key advantage over CAT-1 (which needs 2 for Rx diversity) | [DATASHEET] |
| GNSS | **None** — no integrated GNSS. External GPS required. | [PROJECT-VERIFIED] |
| 3GPP Release | Release 14 | [DATASHEET] |
| NTN / D2C | **Not supported** — R14 only, not R17. D2C is a future modem card swap. | [PROJECT-VERIFIED] |

### Frequency Bands (EU Variant)

| Band | Frequency | Region | Confidence |
|------|-----------|--------|------------|
| B1 | 2100 MHz | Global | [DATASHEET] |
| B3 | 1800 MHz | EU/APAC | [DATASHEET] |
| B5 | 850 MHz | Americas/APAC | [DATASHEET] |
| B7 | 2600 MHz | EU/APAC (Starlink D2C band) | [DATASHEET] |
| B8 | 900 MHz | EU/APAC | [DATASHEET] |
| B20 | 800 MHz | EU | [DATASHEET] |
| B28 | 700 MHz | APAC/AU (Telstra primary) | [DATASHEET] |

**For this design:** Band 28 (700 MHz, Telstra terrestrial) is the primary operating band. Band 7 (2600 MHz) is reserved for future Starlink D2C satellite (requires R17 modem — not this module).

### Interfaces

| Interface | Detail | Confidence |
|-----------|--------|------------|
| Main UART | 115200 baud default, configurable | [PROJECT-VERIFIED] |
| UART logic level | **1.8V** — requires level shifting from 3.3V host | [PROJECT-VERIFIED] |
| USB | USB 2.0 for firmware update / diagnostics | [DATASHEET] |
| SIM | 1.8V / 3.0V auto-detect (UICC compliant) | [DATASHEET] |

### Data Protocols

| Protocol | Support | Confidence |
|----------|---------|------------|
| TCP/UDP | Yes (AT+QIOPEN) | [TRAINING-DATA] |
| HTTP/HTTPS | Yes (AT+QHTTPURL/GET/POST) | [TRAINING-DATA] |
| MQTT | Yes (AT+QMTOPEN/CONN/PUB/SUB) | [TRAINING-DATA] |
| FTP/FTPS | Yes (AT+QFTPOPEN) | [TRAINING-DATA] |
| SSL/TLS | Yes | [TRAINING-DATA] |
| SMS | Text + PDU + concatenated (AT+CMGS / AT+QCMGS) | [PROJECT-VERIFIED] |

### SMS Support

| Feature | Detail | Confidence |
|---------|--------|------------|
| Text mode | AT+CMGF=1, then AT+CMGS | [PROJECT-VERIFIED] |
| PDU mode | AT+CMGF=0, then AT+CMGS | [TRAINING-DATA] |
| Concatenated SMS | Via AT+QCMGS (Quectel extended) or UDH in PDU mode | [TRAINING-DATA] |
| 160-char limit | Standard GSM 7-bit encoding | [PROJECT-VERIFIED] config.h |
| Read SMS | AT+CMGR / AT+CMGL | [TRAINING-DATA] |
| SMS storage | SIM + modem (AT+CPMS) | [TRAINING-DATA] |

## Absolute Maximum Ratings

| Parameter | Min | Typ | Max | Unit | Confidence |
|-----------|-----|-----|-----|------|------------|
| VBAT operating | 3.3 | 3.8 | 4.3 | V | [PROJECT-VERIFIED] DESIGN_SPEC.md |
| VBAT absolute max | — | — | **4.5** | V | [PROJECT-VERIFIED] BOM.csv D_OVP note |
| Storage temperature | -40 | — | +90 | degC | [TRAINING-DATA] |

**WARNING:** The AP63300 3.8V buck output must be protected. BOM includes SMBJ4.5A TVS diode (D_OVP) to clamp against FET failure. Exceeding 4.5V will damage the modem.

## Pin Configuration

The EG800Q-EU uses an LCC (Leadless Chip Carrier) package. Full pinout is in the Hardware Design Guide (request from distributor).

Key pins used in this design (active on daughter card):

| Pin | Function | Direction | Notes |
|-----|----------|-----------|-------|
| VBAT | Power supply | In | 3.3-4.3V, 100uF + 10uF + 100nF bypass |
| GND | Ground | — | Multiple pads, star ground |
| TXD | UART data out | Out | 1.8V logic, → BSS138 → host RX |
| RXD | UART data in | In | 1.8V logic, ← BSS138 ← host TX |
| PWRKEY | Power on/off | In | Active HIGH pulse, 10k pull-down on 1.8V side |
| RESET_N | Hard reset | In | Active LOW |
| STATUS | Modem on indicator | Out | HIGH = modem running |
| RI | Ring indicator | Out | Pulse on incoming SMS/data |
| DTR | Data terminal ready | In | Optional |
| W_DISABLE | RF disable | In | Active LOW = RF off, normally HIGH |
| SIM_VDD | SIM power | Out | 1.8V or 3.0V auto |
| SIM_DATA | SIM I/O | Bidir | Series 22 ohm + ESD protection |
| SIM_CLK | SIM clock | Out | Series 22 ohm + ESD protection |
| SIM_RST | SIM reset | Out | Series 22 ohm + ESD protection |
| RF_ANT | Antenna | — | 50 ohm to u.FL connector |
| USB_DP | USB data+ | Bidir | For firmware update |
| USB_DM | USB data- | Bidir | For firmware update |
| NETLIGHT | Network status | Out | Optional LED indicator |

## Power

### Current Consumption

| Mode | Current | Confidence | Notes |
|------|---------|------------|-------|
| Peak TX (23 dBm) | ~1.0 A | [TRAINING-DATA] verify | Burst, requires 100uF reservoir cap |
| Active (registered, idle) | ~4.5 mA | [TRAINING-DATA] verify | Connected to network, no data |
| Power-off (VBAT applied) | ~55 uA | [TRAINING-DATA] verify | **Must power-gate buck for deep sleep** |
| PSM (Power Save Mode) | ~5-8 uA | [TRAINING-DATA] verify | 3GPP PSM, modem registered but sleeping |
| eDRX average | ~1 mA | [TRAINING-DATA] verify | Periodic wake for downlink |

**Design implication:** The ~55 uA power-off current is why the 3.8V buck (AP63300 U13) is power-gated via PB7. In deep sleep, the entire modem rail is disabled. PSM mode (~5-8 uA) is available but still too high for multi-month battery targets.

### Decoupling Requirements

From Quectel Hardware Design Guide and FAE review:

| Cap | Value | Package | Purpose |
|-----|-------|---------|---------|
| C_MDM1 | 100 uF | 6.3x5.4mm electrolytic | TX burst reservoir |
| C_MDM2 | 10 uF | 0805 ceramic | Medium-frequency bypass |
| C_MDM3 | 100 nF | 0402 ceramic | HF bypass |

Place all caps as close to VBAT pins as possible. Short, wide traces to GND.

### PWRKEY Timing

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Power-on pulse width | >= 500 ms HIGH pulse | [TRAINING-DATA] verify against HW design guide |
| Power-off pulse width | >= 650 ms HIGH pulse | [TRAINING-DATA] verify |
| Boot time to AT ready | ~5-15 s | [TRAINING-DATA] verify |

## Application Notes for This Design

### Level Shifting (Daughter Card)

4x BSS138 discrete level shifters (3.3V host <-> 1.8V modem) on the daughter card:
- TXD (modem -> host)
- RXD (host -> modem)
- PWRKEY (host -> modem)
- RESET_N (host -> modem)

BSS138 was selected over TXB0104 because the Quectel FAE confirmed TXB0104 cannot drive PWRKEY — the OE pin is low during modem power-up, so PWRKEY can never be asserted. This was caught during the V1.1 schematic review. See `SCHEMATIC_CHANGES_V1.1.md` item 4.

### SIM Interface

SIM holder and ESD protection (TPD3E001DRLR) are on the daughter card. Series 22 ohm resistors on SIM_DATA, SIM_CLK, SIM_RST per Quectel recommendation.

### Buck Converter (Host Side)

AP63300WU-7 at 3.8V output. Feedback resistors: R_top = 100k, R_bottom = 27k (Vout = 0.8V x (1 + 100k/27k) = 3.76V). Corrected per Quectel FAE review — original BOM values would have output 5.07V and damaged the modem. See `SCHEMATIC_CHANGES_V1.1.md` item C1.

### OVP Protection

SMBJ4.5A TVS diode on VBAT rail clamps at 4.5V. Protects against AP63300 FET failure mode where output rises to VIN (up to 8.4V battery).

## Package

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Package type | LCC (Leadless Chip Carrier) | [DATASHEET] |
| Dimensions | 17.7 x 15.8 x 2.0 mm | [TRAINING-DATA] verify exact dims |
| Weight | ~3.6 g | [TRAINING-DATA] verify |

## Environmental

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Operating temp (standard) | -35 to +75 degC | [TRAINING-DATA] verify |
| Operating temp (extended) | -40 to +85 degC | [TRAINING-DATA] verify |
| Storage temp | -40 to +90 degC | [TRAINING-DATA] verify |
| Humidity | 5-95% RH non-condensing | [TRAINING-DATA] verify |

## Certifications

| Certification | Status | Confidence |
|---------------|--------|------------|
| RCM (Australia) | Yes | [TRAINING-DATA] verify |
| CE (Europe) | Yes | [TRAINING-DATA] verify |
| UKCA (UK) | Yes | [TRAINING-DATA] verify |
| GCF | Yes | [TRAINING-DATA] verify |
| PTCRB | Yes | [TRAINING-DATA] verify |

## Procurement

| Source | Notes |
|--------|-------|
| Quectel AU distributor | Primary — contact for samples, FAE support |
| Mouser | Stocking distributor |
| DigiKey | Stocking distributor |
| LCSC | Check availability |

BOM unit cost estimate: ~$12.00 AUD (per BOM.csv).

## Known Issues / Errata

1. **No D2C / NTN support.** This module is 3GPP R14 only. Starlink Direct-to-Cell requires R17 (5G NR-NTN). D2C capability is a future modem daughter card swap — the modular design exists specifically for this upgrade path.

2. **TXB0104 incompatibility.** Do not use TXB0104 for level shifting. OE pin is low during modem power-up, preventing PWRKEY assertion. Use BSS138 discrete shifters. Confirmed by Quectel FAE (Xianghao Kong).

3. **PWRKEY pull-down required.** 10k ohm pull-down on the 1.8V (modem) side of the PWRKEY level shifter. Prevents spurious power toggles during host MCU boot/reset.

4. **Buck output protection mandatory.** If the AP63300 output FET fails short, VIN (up to 8.4V) reaches VBAT. The SMBJ4.5A TVS clamp is not optional.

5. **Feedback resistor error in original BOM.** Original values (R25=160k, R26=30k) calculated with 0.6V reference — AP63300 reference is 0.8V. Would have output 5.07V. Corrected to R_top=100k, R_bottom=27k for 3.76V output.

6. **Buck output caps.** Quectel FAE flagged insufficient output capacitance three times. Must use 47-100 uF ceramic on buck output, plus the modem-side 100 uF electrolytic + 10 uF ceramic + 100 nF. This is the single most likely cause of field failure if omitted.
