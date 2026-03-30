# Trap Monitor PCB Design Specification

> **NOTE — Two-Phase Approach:** This document describes the full target design. For Phase 1 (dev/test boards), simplifications are acceptable — see `PCB_DESIGN_BRIEF.md` for what can and cannot be simplified. The critical constraint is that **all GPIO pin assignments, power rails, and logic levels must be identical** across both phases so the same firmware binary runs unchanged. Expansion header footprints/pads should be placed in Phase 1 (DNP) to preserve the option for future sensor additions.

---

## 1. Board Overview

| Parameter | Value |
|---|---|
| MCU | ESP32-S3-WROOM-1 (N8, no PSRAM) |
| Modem | Quectel EG800Q-EU (LTE CAT-1bis, QCX216) |
| GPS | u-blox MAX-M10S (separate module, NMEA on Serial2) |
| RTC | DS3231SN (I2C, battery-backed) |
| Input voltage | 6.4V nominal (2S LiFePO4 via solar MPPT) |
| MCU logic level | 3.3V |
| Modem logic level | 1.8V (requires level shift on UART + PWRKEY + RESET_N) |
| Board dimensions | Target: 60mm × 80mm (fits Hammond 1591XXBFL IP65) |
| Layers | 2-layer (top + bottom) |
| Mounting | 4× M3 corner holes, 3.2mm diameter |
| Connectors | JST-PH 2.0mm for battery, solar, reed switch |
| Operating temp | -20C to +60C (outdoor enclosure) |

---

## 2. Power Architecture

```
Solar Panel (12V 2W)
    │
    ▼
┌─────────────┐
│  CN3767     │  MPPT Buck Solar charge controller
│  (U9)       │  Input: 12V solar (Vmp ~10V under load)
│             │  Output: charges 2S LiFePO4 to 7.2V
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Battery    │  2S LiFePO4 = 6.4V nominal (Pack A default)
│  JST-PH     │  OR 3× D-cell holder (Pack D, no solar)
└──────┬──────┘
       │
       ├──► Voltage divider (1MΩ/470kΩ) ──► GPIO 2 (BATT_ADC)
       │
       ▼
┌─────────────┐
│  3.3V LDO   │  HT7333-A (Iq 2.5µA, Vin max 12V)
│  (U4)       │  Powers ESP32-S3 + RTC + LEDs + u-blox M10
└──────┬──────┘
       │
       ├──► ESP32-S3 (VDD 3.3V)
       ├──► DS3231 RTC (VCC 3.3V)
       ├──► LED circuits (3× with 220Ω series)
       ├──► GPS power gate: GPIO 6 → P-MOSFET (SI2301) → u-blox M10 VCC
       │
       ▼
┌─────────────┐
│  3.8V Buck   │  AP63300WU-7 (Iq 22µA, Vin 3.8–32V, 3A sync buck)
│  (U5)        │  4.7µH inductor + 22µF output cap
│              │  EN tied to VIN (always on) — 1µA shutdown available via EN
└──────────────┘
```

### Power Notes
- EG800Q-EU requires **VBAT 3.3–4.3V** — a 2S LiFePO4 pack (6.4V nom, 7.2V full) is too high!
  **AP63300WU-7** (3.8V, 3A synchronous buck, Iq 22µA, Vin 3.8–32V) steps battery down to modem VBAT.
  ~~RT9080-38GJ5 LDO was rejected~~ — thermal analysis showed 2.04W dissipation (SOT-23-5 max ~500mW)
  at 600mA / 7.2V input, causing guaranteed thermal shutdown. Even at 300mA average: 0.78W → +195°C rise.
  The buck converter achieves ~90% efficiency (vs LDO's 59%), reducing battery draw during TX from ~1A to ~0.67A.
  The 100µF electrolytic + 10µF ceramic bypass caps (placed at VBAT pin) still provide TX burst reservoir.
  Feedback resistors (160kΩ / 30kΩ) set Vout = 0.6V × (1 + 160k/30k) = 3.80V.
  EN pin tied to VIN — auto-enables on power up. Can be rerouted to a GPIO for deep sleep power gating if needed.
- **HT7333-A** (3.3V, 250mA, Iq 2.5µA, Vin max 12V) powers ESP32-S3 + RTC + LEDs + GPS.
  Replaces AMS1117-3.3 which had 5–11mA quiescent current — incompatible with deep sleep.
- u-blox M10 GPS is powered from 3.3V rail via a P-channel MOSFET (SI2301) gate controlled by GPIO 6.
  The BSS138 N-FET inverter (Q2) converts firmware logic (GPIO HIGH = powered) to P-FET gate logic (gate LOW = on).
  Signal chain: GPIO 6 HIGH → BSS138 pulls P-FET gate LOW → SI2301 turns ON → M10 VCC = 3.3V.
  GPIO 6 LOW → BSS138 off → P-FET gate pulled HIGH by R19 → SI2301 turns OFF → M10 unpowered.
  **Alternative (simpler):** Replace Q1 + Q2 with an active-HIGH LDO enable (e.g., MIC5219-3.3 with EN pin).
- **Deep sleep current budget (revised):**

  | Component | Current |
  |-----------|---------|
  | ESP32-S3 deep sleep | ~10µA |
  | DS3231 RTC | ~3.5µA |
  | EG800Q-EU off | ~8µA |
  | HT7333 LDO Iq | ~2.5µA |
  | AP63300 modem buck Iq | ~22µA |
  | Battery divider (1MΩ/470kΩ) | ~4.9µA |
  | Reed switch pull-up (100kΩ NC closed) | ~33µA |
  | GPS power gate (off) | 0µA |
  | **TOTAL** | **~84µA** |

  Achievable with solar recharge. Battery life without solar (Pack D): 18000mAh ÷ 0.084mA ≈ 214,000 hours (~24 years standby, limited by cell shelf life).
  Note: if EN pin is GPIO-controlled to disable buck during sleep, modem rail drops to ~1µA shutdown → total ~63µA.
- Solar sense: place a **0.1Ω shunt resistor** in the charge path, measure voltage across it on GPIO 1 (SOLAR_ADC) via op-amp or INA219.
- Solar charge controller: **CN3767** (U9) MPPT buck charger for 2S LiFePO4 (7.2V target). Input: 12V solar panel. Charge voltage set via FBVR resistor divider. DNP for Pack D (primary cells, no solar). Place near solar connector J6 and battery connector J1.
- EG800Q-EU PWRKEY: add **10kΩ pull-down** on the 1.8V side of the level shifter. This prevents the PWRKEY line from floating HIGH during ESP32 boot/reset, which could cause unintended modem power toggles.
- USB-C: **5.1kΩ pull-down resistors on CC1 and CC2** to GND are required for USB 2.0 device detection. Without these, some USB hosts will not enumerate the ESP32-S3.

---

## 3. Complete Schematic Netlist

### 3.1 ESP32-S3 Connections

| ESP32-S3 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| GPIO 1 | SOLAR_SENSE | Solar current sense circuit | ADC input, 0–3.3V |
| GPIO 2 | BATT_SENSE | Battery voltage divider midpoint | ADC input, 0–3.3V |
| GPIO 4 | TRAP_TRIG | Reed switch (to GND) | EXT0 wake on HIGH, 100k pull-up to 3.3V |
| GPIO 5 | MODEM_PWRKEY | EG800Q-EU PWRKEY (via level shift) | Active HIGH pulse |
| GPIO 6 | GPS_PWR | u-blox M10 power gate (MOSFET/LDO EN) | HIGH = powered, LOW = off |
| GPIO 7 | MODEM_RST | EG800Q-EU RESET_N (via level shift) | Active LOW reset |
| GPIO 8 | RTC_SDA | DS3231 SDA | I2C bus 1, 4.7k pull-up to 3.3V |
| GPIO 9 | RTC_SCL | DS3231 SCL | I2C bus 1, 4.7k pull-up to 3.3V |
| GPIO 10 | EXP_ANALOG | Expansion header J3 pin 1 | ADC1_CH9, 0–3.3V |
| GPIO 11 | EXP_DIG_1 | Expansion header J4 pin 1 | Digital, 10k pull-up to 3.3V |
| GPIO 12 | EXP_DIG_2 | Expansion header J4 pin 2 | Digital (pulse count) |
| GPIO 13 | EXP_UART_TX | Expansion header J5 pin 1 | UART TX |
| GPIO 14 | EXP_UART_RX | Expansion header J5 pin 2 | UART RX |
| GPIO 15 | GPS_TX | u-blox M10 RXD (Serial2 TX) | ESP32 → M10 (config cmds) |
| GPIO 16 | GPS_RX | u-blox M10 TXD (Serial2 RX) | M10 → ESP32 (NMEA data, 9600 baud) |
| GPIO 17 | MODEM_TX | EG800Q-EU RXD (via level shift) | UART to modem (Serial1) |
| GPIO 18 | MODEM_RX | EG800Q-EU TXD (via level shift) | UART from modem (Serial1) |
| GPIO 38 | LED_GREEN | Green LED anode (220Ω to GND) | Status indicator |
| GPIO 39 | LED_AMBER | Amber LED anode (220Ω to GND) | Status indicator |
| GPIO 40 | LED_RED | Red LED anode (220Ω to GND) | Status indicator |
| GPIO 41 | EXP_I2C_SDA | Expansion header J2 pin 1 | I2C bus 2, 4.7k pull-up |
| GPIO 42 | EXP_I2C_SCL | Expansion header J2 pin 2 | I2C bus 2, 4.7k pull-up |
| GPIO 43 | EXP_1WIRE | Expansion header J3 pin 2 | OneWire, 4.7k pull-up |
| 3V3 | VCC_3V3 | All 3.3V consumers | From LDO |
| GND | GND | Common ground | Star ground near MCU |
| EN | EN | 10k pull-up to 3.3V + 100nF to GND | Reset RC circuit |

### 3.2 EG800Q-EU Module Connections

| EG800Q-EU Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VBAT | MODEM_VCC | 3.8V buck output (AP63300WU-7, 3A sync) | 100uF + 10uF bypass caps at VBAT pin. Buck handles sustained 1A TX without thermal risk |
| GND | GND | Common ground | Short, wide trace |
| TXD | MODEM_RX_3V3 | Level shifter → ESP32 GPIO 18 | 1.8V → 3.3V |
| RXD | MODEM_TX_3V3 | Level shifter ← ESP32 GPIO 17 | 3.3V → 1.8V |
| PWRKEY | MODEM_PWRKEY | Level shifter ← ESP32 GPIO 5 | 3.3V → 1.8V. 10kΩ pull-down on 1.8V side to prevent spurious toggle during ESP32 boot/reset |
| RESET_N | MODEM_RST | Level shifter ← ESP32 GPIO 7 | 3.3V → 1.8V, active LOW |
| SIM_VDD | — | Internal (to SIM holder) | Decoupling: 100nF + 22pF |
| SIM_DATA | — | SIM holder C7 | Series 22Ω + ESD diode |
| SIM_CLK | — | SIM holder C3 | Series 22Ω + ESD diode |
| SIM_RST | — | SIM holder C2 | Series 22Ω + ESD diode |
| SIM_DET | — | SIM holder detect (optional) | Pull-up 10k |
| RF_ANT | RF_MAIN | u.FL to cellular antenna | 50Ω controlled impedance |
| NETLIGHT | — | Optional LED via 1k resistor | Network status |

**Note:** EG800Q-EU has a single RF antenna port (cellular only). There is NO integrated GNSS —
GNSS is provided by the separate u-blox M10 module (see section 3.8).

### 3.2b u-blox MAX-M10S GPS Module Connections

| M10 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VCC | GPS_VCC | 3.3V via power gate (SI2301 P-FET) | GPIO 6 controls gate |
| GND | GND | Common ground | |
| TXD | GPS_RX | ESP32 GPIO 16 (Serial2 RX) | NMEA output, 9600 baud |
| RXD | GPS_TX | ESP32 GPIO 15 (Serial2 TX) | UBX config commands |
| RF_IN | RF_GNSS | u.FL to GNSS patch antenna | 50Ω controlled impedance |
| V_BCKP | GPS_VBCKP | 3.3V via 100Ω + 100nF | Backup for hot start (optional) |
| TIMEPULSE | — | Not connected | (could route for PPS if needed) |
| EXTINT | — | Not connected | |

#### GPS Power Gate Circuit

```
3V3 Rail ──────────────────────────────┐
                                        │
                    GPIO 6 ──── 10k ──┤ Gate
                                        │
                                   ┌────┤ Source
                                   │    │ SI2301
                                   │    │ P-FET
                                   │    └── Drain ──── M10 VCC
                                   │                      │
                                   │                    100nF
                                   │                      │
                                   └──────────────────── GND
```

- GPIO 6 HIGH → BSS138 inverter drives P-FET gate LOW → M10 powered (VCC = 3.3V)
- GPIO 6 LOW → BSS138 off, P-FET gate pulled HIGH → M10 unpowered (deep sleep)
- This matches firmware convention: GPS_PWR_PIN HIGH = powered.
- Alternative: use an active-HIGH LDO enable (e.g., ME6211 with EN pin) instead of P-FET + inverter.

### 3.3 DS3231 RTC

| DS3231 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VCC | VCC_3V3 | 3.3V rail | 100nF bypass |
| GND | GND | Common ground | |
| SDA | RTC_SDA | ESP32 GPIO 8 | 4.7k pull-up shared |
| SCL | RTC_SCL | ESP32 GPIO 9 | 4.7k pull-up shared |
| SQW/INT | — | Not connected | (could route to GPIO for alarm wake) |
| 32K | — | Not connected | |
| VBAT | VBAT_RTC | CR2032 holder + | Backup battery |

### 3.4 Battery Voltage Divider

```
BATT+ ──── R1 (1MΩ) ──┬── R2 (470kΩ) ──── GND
                        │
                        └── GPIO 2 (BATT_SENSE)
                        │
                        └── C1 (100nF) ──── GND  (filter cap)
```

Divider ratio = 3.128 (1M+470k / 470k) → ADC safe for all pack configs:
- Pack A full charge (7.2V) → ADC sees 2.30V → safe (max 3.3V)
- Pack A nominal (6.4V) → ADC sees 2.04V
- Pack A empty (5.6V) → ADC sees 1.79V → good resolution
- Pack D full (4.8V) → ADC sees 1.53V → safe
- Pack D empty (4.0V, AP63300 floor + margin) → ADC sees 1.28V → readable
- Note: Pack D true cell end-of-life is 2.7V, but modem buck drops out at 3.8V.
  Firmware sets Pack D empty = 4.0V so critical alerts fire while modem can still TX.
- Bleed current: 7.2V / 1.47MΩ = **4.9µA** (vs 32µA with 100k/100k)

**ADC Accuracy Notes (high-impedance divider):**
- Thevenin source impedance: ~320kΩ — high for ESP32-S3 SAR ADC (S/H cap ~5pF)
- RC time constant without filter cap: 320kΩ × 5pF = 1.6µs — risks incomplete S/H charge
- **C1 (100nF filter cap) is critical** — provides low-impedance charge reservoir for S/H cap.
  With C1: effective source impedance for ADC sampling is dominated by the 100nF, not the divider.
- ESP32-S3 ADC has known non-linearity ±2–6% across range. At our operating point (1.5–2.3V),
  non-linearity is moderate but not worst-case (worst near 0V and 3.3V).
- **Calibration required**: firmware `ADC_CAL_FACTOR` must be set per-board by measuring actual
  battery voltage with a multimeter and comparing to firmware-reported value.
- **Validation before BOM lock**: build one prototype, measure ADC noise floor and linearity
  across Pack A range (5.6V–7.2V). If >3% error persists after calibration, consider adding
  a unity-gain op-amp buffer (DNP pad, e.g., MCP6001 in SOT-23-5) between divider and ADC pin.

### 3.5 Reed Switch (Trap Trigger)

```
3V3 ──── R_PULL (100kΩ) ──┬── GPIO 4 (TRAP_TRIG)
                           │
                      Reed Switch (NC)
                           │
                          GND
```

- Normally closed = GPIO reads LOW (trap armed/set)
- Opens on trigger = GPIO reads HIGH (trap fired)
- ESP32 ext0 wake configured for **HIGH** (switch opens = trigger event)
- 100kΩ pull-up reduces sleep drain to 33µA (vs 330µA with 10kΩ)
- Add 100nF debounce cap across switch

### 3.6 LEDs

```
GPIO 38/39/40 ──── LED (anode) ──── R (220Ω) ──── GND
```

- 3× through-hole 3mm LEDs: Green, Amber, Red
- ~5mA per LED at 3.3V with 220Ω
- Route to board edge for visibility through enclosure window

### 3.7 Level Shifter (ESP32 3.3V ↔ EG800Q-EU 1.8V)

Use **BSS138** N-channel MOSFET bidirectional level shifter (4-channel minimum):
- Channel 1: MODEM_TX (GPIO 17 → EG800Q-EU RXD)
- Channel 2: MODEM_RX (EG800Q-EU TXD → GPIO 18)
- Channel 3: MODEM_PWRKEY (GPIO 5 → EG800Q-EU PWRKEY)
- Channel 4: MODEM_RST (GPIO 7 → EG800Q-EU RESET_N)

Rev A requirement: use discrete BSS138 channels for modem UART/control. Do not use auto-direction translators (for example TXB0104) on these nets.

### 3.8 UART Level Shifter Detail (BSS138)

```
           3.3V                    1.8V (from EG800Q-EU VDDIO)
            │                       │
           10k                     10k
            │                       │
ESP GPIO ───┤                       ├─── EG800Q-EU pin
            │     ┌─────────┐       │
            └─────┤ G    D  ├───────┘
                  │ BSS138  │
                  │    S    │
                  └────┬────┘
                       │
                      GND
```

**Note:** The u-blox M10 GPS module operates at 3.3V logic — same as ESP32-S3.
No level shifting is required on the GPS UART (GPIO 15, GPIO 16) or GPS power gate (GPIO 6).

---

## 4. Connectors

| Ref | Type | Pins | Function | Mating |
|---|---|---|---|---|
| J1 | JST-PH 2P | 2 | Battery pack | Red=+, Black=- |
| J2 | JST-PH 4P | 4 | Expansion I2C | SDA, SCL, 3V3, GND |
| J3 | JST-PH 3P | 3 | Expansion Analog/1Wire | ANALOG, 1WIRE, GND |
| J4 | JST-PH 3P | 3 | Expansion Digital | DIG1, DIG2, GND |
| J5 | JST-PH 4P | 4 | Expansion UART | TX, RX, 3V3, GND |
| J6 | JST-PH 2P | 2 | Solar panel | Red=+, Black=- |
| J7 | JST-PH 2P | 2 | Reed switch | NC pair |
| J8 | Nano-SIM holder | 6+2 | SIM card | Push-push type |
| J9 | u.FL | 1 | EG800Q-EU cellular antenna | 50Ω coax to external ant |
| J10 | u.FL | 1 | u-blox M10 GNSS antenna | 50Ω coax to ceramic patch ant |
| J11 | USB-C | — | Programming/debug | ESP32-S3 native USB. 5.1kΩ pull-down on CC1 + CC2 to GND (required for USB 2.0 device detection) |

---

## 5. Expansion Headers — Unpopulated by Default

All expansion connectors are placed on the PCB with footprints but **no components soldered**.
Users populate only the headers they need. Pull-up resistors for I2C/1Wire/Digital are placed
on PCB as **0402 DNP** (Do Not Populate) pads — solder as needed.

| Header | Sensors Supported | Firmware Define |
|---|---|---|
| J2 (I2C) | BME280, SHT31 | `SENSOR_TEMP_HUMIDITY` |
| J3 pin 2 (1Wire) | DS18B20 waterproof probe | `SENSOR_ONEWIRE_TEMP` |
| J3 pin 1 (Analog) | Soil moisture, water level | `SENSOR_SOIL_MOISTURE`, `SENSOR_WATER_LEVEL` |
| J4 pin 1 (Digital) | Secondary trap trigger | `SENSOR_SECONDARY_TRIGGER` |
| J4 pin 2 (Digital) | Rain gauge / flow pulse | `SENSOR_FLOW_PULSE` |
| J5 (UART) | Ultrasonic distance, etc. | `SENSOR_UART_DEVICE` |

---

## 6. Antenna Placement

### Cellular (EG800Q-EU RF_ANT — J9)
- u.FL connector at board edge, close to EG800Q-EU module
- External whip or PCB trace antenna
- **50Ω controlled impedance** trace from EG800Q-EU to u.FL
- Keep **15mm ground clearance** around antenna feed point
- No copper pour (top or bottom) within antenna keepout zone
- Band 28 (700 MHz) + Band 7 (2600 MHz) — antenna must cover both bands

### GNSS (u-blox M10 RF_IN — J10)
- u.FL connector at board edge (opposite side from cellular if possible)
- External ceramic patch antenna (25×25mm, active or passive)
- Route 50Ω trace from M10 RF_IN pad to u.FL connector
- Route with ground plane underneath
- Keep away from switching regulators, EG800Q-EU RF, and digital noise sources
- Separate the GNSS antenna as far as practical from the cellular antenna

---

## 7. Decoupling & Bypass Capacitors

| Location | Capacitor | Package | Notes |
|---|---|---|---|
| ESP32-S3 VDD (each pin) | 100nF | 0402 | Place as close as possible |
| ESP32-S3 VDD (bulk) | 10uF | 0805 | Near module |
| EG800Q-EU VBAT | 100uF electrolytic | radial | TX burst current |
| EG800Q-EU VBAT | 10uF ceramic | 0805 | High frequency bypass |
| EG800Q-EU VBAT | 100nF | 0402 | Placed at pin |
| u-blox M10 VCC | 100nF | 0402 | At VCC pin |
| u-blox M10 VCC | 10uF | 0805 | Bulk bypass near module |
| DS3231 VCC | 100nF | 0402 | At pin |
| LDO input | 10uF ceramic | 0805 | |
| LDO output | 10uF ceramic | 0805 | |
| SIM card VDD | 100nF + 22pF | 0402 | At SIM holder |

---

## 8. ESD Protection

| Net | Protection | Notes |
|---|---|---|
| USB-C D+/D- | ESD diode array (USBLC6-2SC6) | Required |
| SIM lines (DATA/CLK/RST) | 3-channel TVS array (TPD3E001DRLR) | Required — one array covers all 3 SIM data lines |
| Reed switch input (GPIO 4) | 100nF cap + series 100Ω | Debounce + ESD |
| Cellular antenna u.FL | — | ESD handled by EG800Q-EU internal |
| GNSS antenna u.FL | — | ESD handled by u-blox M10 internal |

---

## 9. Design Constraints for EasyEDA Layout

| Parameter | Value |
|---|---|
| Min trace width (signal) | 0.2mm (8mil) |
| Min trace width (power 3.3V) | 0.5mm (20mil) |
| Min trace width (VBAT to EG800Q-EU) | 1.0mm (40mil) — 1A burst |
| Min trace width (battery input) | 1.0mm (40mil) |
| RF traces (antenna) | 50Ω controlled impedance, calc for stackup |
| Via size | 0.3mm drill, 0.6mm pad |
| Clearance (signal-signal) | 0.2mm (8mil) |
| Clearance (high voltage) | 0.5mm minimum around battery traces |
| Ground plane | Solid on bottom layer, stitching vias every 5mm |
| I2C trace length | Match SDA/SCL within 5mm |
| ADC traces (GPIO 1, 2) | Guard ring around ADC pins, keep away from digital noise |
| Crystal/oscillator | N/A (ESP32-S3 module has internal) |

### Placement Priority
1. EG800Q-EU module — near board edge for antenna routing
2. SIM card holder — adjacent to EG800Q-EU (short traces)
3. ESP32-S3 module — centre of board
4. u-blox M10 GPS — opposite board edge from EG800Q-EU (antenna separation)
5. DS3231 RTC — near ESP32 (short I2C)
6. Power (LDOs, caps, GPS power gate) — near battery connector
7. LEDs — board edge (visible through enclosure)
8. Expansion headers — board edge, grouped together
9. USB-C — board edge, accessible for programming

### Ground Plane Rules
- Solid ground pour on bottom layer
- Do NOT split ground plane under EG800Q-EU or u-blox M10
- Connect all grounds with stitching vias (every 3–5mm along edges)
- Star ground point near ESP32 GND pins
- Separate analog ground section for ADC pins (GPIO 1, 2) — connect to main ground at single point

---

## 10. Mechanical

```
    ┌──────────────────────────────────────────────┐
    │ ○                                          ○ │  ← M3 mounting holes
    │                                              │
    │  [USB-C]              [ESP32-S3 Module]      │
    │                                              │
    │  [EG800Q-EU]    [DS3231]    [CR2032]         │
    │                                              │
    │  [SIM Holder]         [u-blox M10 GPS]       │
    │                                              │
    │  [u.FL Cell]                  [u.FL GNSS]    │  ← Antennas on opposite sides
    │                                              │
    │  [J1 Batt] [J6 Solar] [J7 Reed]             │  ← Power connectors
    │                                              │
    │  ● ● ●                                       │  ← LEDs (G A R)
    │  [J2] [J3] [J4] [J5]                        │  ← Expansion headers
    │                                              │
    │ ○                                          ○ │  ← M3 mounting holes
    └──────────────────────────────────────────────┘
         60mm × 80mm (fits Hammond 1591XXBFL)
```

### Enclosure
- **Hammond 1591XXBFL** — IP65 flanged ABS, 113×63×32mm internal
- Board mounts on 4× M3 brass standoffs (6mm height)
- Drill enclosure for: antenna SMA (2× — cellular for EG800Q-EU, GNSS for M10), JST pigtails (battery, solar, reed), LED light pipes
- Alternatively use cable glands (PG7) for weatherproof wire entry

---

## 11. Test Points

Add test pads (1.5mm round, plated) for:

| TP | Net | Purpose |
|---|---|---|
| TP1 | VCC_3V3 | Verify 3.3V rail |
| TP2 | MODEM_VCC | Verify 3.8V modem supply |
| TP3 | BATT_SENSE | Verify ADC reading |
| TP4 | SOLAR_SENSE | Verify solar current sense |
| TP5 | GND | Ground reference |
| TP6 | MODEM_TX | Debug modem UART |
| TP7 | MODEM_RX | Debug modem UART |
| TP8 | GPS_VCC | Verify GPS power gate output |
| TP9 | GPS_TX | Debug GPS UART (ESP32 → M10) |
| TP10 | GPS_RX | Debug GPS UART (M10 → ESP32) |

---

## 12. Tropical / Production Hardening Checklist

Items below are **not required for prototype** but should be addressed before production
deployment in humid, high-temperature, or remote environments.

### 12.1 Moisture & Corrosion

- [ ] **Conformal coating** (e.g., HumiSeal 1B73 or Dow Corning 1-2577) on populated PCB.
  Mask off connectors, u.FL, SIM holder, USB-C, and test points before application.
- [ ] **Pressure vent / breather** — Gore PolyVent or equivalent adhesive vent patch on
  enclosure wall. Equalises pressure during temperature swings without admitting water.
  Without this, thermal cycling creates condensation inside a sealed IP65 box.
- [ ] **Silicone potting** on high-impedance nodes (battery divider R1/R2/C1 area, solar sense)
  if conformal coat alone is insufficient. These nodes are most vulnerable to leakage
  currents from moisture films.
- [ ] **Stainless steel or nickel-plated brass** for all external fasteners and cable glands.
  Avoid zinc-plated steel in coastal/tropical environments.

### 12.2 Thermal

- [ ] **105°C rated capacitors** for C7 (100µF electrolytic VBAT bulk) and C13/C14 (buck
  input/output). Standard 85°C parts derate significantly above 60°C ambient + enclosure
  solar gain. Replace C7 with a 105°C rated electrolytic (e.g., Nichicon UWT or Panasonic
  EEU-FR series).
- [ ] **Thermal pad** or copper pour under AP63300 buck converter (U5) for heat spreading.
  At 90% efficiency and 1A load the dissipation is ~0.42W — manageable in TSOT-23-6 with
  adequate copper, but verify junction temperature at 60°C ambient.
- [ ] **Solar charge temperature cutoff** — CN3767 (U9) should have NTC thermistor input
  for battery temperature sensing. LiFePO4 should not be charged below 0°C or above 45°C.
  Add NTC thermistor (10kΩ B3950) on battery pack, wired to CN3767 TS pin.

### 12.3 Surge & Transient Protection

- [ ] **TVS diode on solar input (J6)** — bidirectional TVS (e.g., SMBJ18A) across solar
  connector to clamp voltage spikes from lightning-induced surges on panel wiring.
- [ ] **TVS diode on reed switch input (J7)** — the reed switch wiring can be several metres
  long in field installations, acting as an antenna for induced transients.
  Add a small TVS or Zener clamp (3.3V) at the connector, in addition to the existing
  100nF debounce cap (C18).
- [ ] **Battery reverse polarity protection** — P-FET (e.g., SI2301 or similar) in the battery
  positive path prevents damage if J1 is wired backwards. Low Rds(on) to minimise voltage drop.

### 12.4 Field Wiring

- [ ] **Strain relief** on all JST pigtails exiting the enclosure. JST-PH connectors are
  not rated for repeated flexing — secure cables inside the enclosure with adhesive
  cable ties or P-clips.
- [ ] **UV-resistant cable** for any wiring exposed to sunlight (solar panel, antenna coax).
  Standard PVC jacket degrades in direct UV within 1–2 years.
- [ ] **Antenna weatherproofing** — seal SMA-to-u.FL pigtail connections with self-amalgamating
  tape or heat-shrink with adhesive lining. Water ingress at the antenna connection is a
  common field failure mode.
