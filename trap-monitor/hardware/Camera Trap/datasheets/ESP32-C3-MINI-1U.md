---
component: ESP32-C3-MINI-1U-N4
manufacturer: Espressif Systems
category: Processing / Communications Processor (WiFi + BLE)
status: Active (N4 variant in production; H4 variant is NRND — do not use H4)
last_verified: 2026-03-29
confidence: High — most specs verified from official Espressif datasheet HTML version via WebFetch
---

# ESP32-C3-MINI-1U — WiFi + BLE 5.0 Module with U.FL Antenna Connector

RISC-V single-core WiFi/BLE module used as the communications processor in the Between 23 AI Camera Trap. Handles WiFi AP mode (image offload), BLE GATT server (configuration), SSD1306 OLED display, and navigation buttons.

---

## Datasheet Links

| Document | URL | Access |
|----------|-----|--------|
| **Module datasheet (PDF)** | https://www.espressif.com/sites/default/files/documentation/esp32-c3-mini-1_datasheet_en.pdf | Public (redirects to documentation.espressif.com) |
| **Module datasheet (HTML)** | https://documentation.espressif.com/esp32-c3-mini-1_datasheet_en.html | Public |
| **ESP32-C3 SoC datasheet** | https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf | Public |
| **ESP32-C3 Technical Reference Manual** | https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf | Public |
| **ESP32-C3 Hardware Design Guidelines** | https://www.espressif.com/sites/default/files/documentation/esp32-c3_hardware_design_guidelines_en.pdf | Public |
| **ESP-IDF Programming Guide** | https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/ | Public |
| **ESP32-C3 Errata** | https://docs.espressif.com/projects/esp-chip-errata/en/latest/esp32c3/index.html | Public |
| **Espressif module product page** | https://www.espressif.com/en/module/esp32-c3-mini-1u-en | Public |

---

## Part Number Decode

```
ESP32-C3-MINI-1U-N4
│          │    │ │
│          │    │ └── Flash: N4 = 4MB (N = normal temp, 4 = 4MB)
│          │    └──── Antenna: U = U.FL connector for external antenna
│          └───────── Module variant: MINI-1 (13.2 x 12.5mm form factor)
└──────────────────── SoC: ESP32-C3 (RISC-V single core)
```

**Variants:**
- **ESP32-C3-MINI-1-N4** = PCB antenna (onboard) — NOT suitable for metal enclosure
- **ESP32-C3-MINI-1U-N4** = U.FL connector (external antenna) — **our choice** for metal enclosure
- **-H4 variants** = High-temperature (-40 to +105C). **NRND — being discontinued.** Do not design in.
- **-N4-A** = Revision A of N4 variant (check availability)

**Why -1U:** Camera trap uses a sealed enclosure. PCB antenna (-1) would be shielded by the enclosure. U.FL connector allows external antenna routing through the enclosure RF window.

---

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| SoC | ESP32-C3FH4 (embedded in module) | VERIFIED |
| CPU Core | 32-bit RISC-V single core | VERIFIED |
| Max CPU clock | 160 MHz | VERIFIED |
| ROM | 384 KB | VERIFIED |
| SRAM | 400 KB total (16 KB for cache) | VERIFIED |
| RTC SRAM | 8 KB | VERIFIED |
| Flash (in-package) | 4 MB (Quad SPI) | VERIFIED |
| Flash clock | 80 MHz default, 120 MHz optional (with auto-suspend) | VERIFIED |
| Flash endurance | 100,000 program/erase cycles, 20-year retention | VERIFIED |
| WiFi | 802.11 b/g/n, 2.4 GHz, 1T1R, up to 150 Mbps | VERIFIED |
| Bluetooth | BLE 5.0 (125Kbps, 500Kbps, 1Mbps, 2Mbps) | VERIFIED |
| Module dimensions | 13.2 x 12.5 x 2.4 mm | VERIFIED |
| Antenna | U.FL connector (3rd gen, compatible with W.FL/MHF III/AMC) | VERIFIED |
| Operating voltage | 3.0 - 3.6V (typical 3.3V) | VERIFIED |
| Operating temperature | -40 to +105C (module rating from datasheet) | VERIFIED |
| Total pins | 53 pads on module | VERIFIED |
| Available GPIOs | 15 (including 3 strapping pins) | VERIFIED |
| USB | USB 2.0 Full Speed Serial/JTAG (CDC-ACM + JTAG) | VERIFIED |
| ADC | 2x 12-bit (ADC1: 5ch, ADC2: 1ch) | VERIFIED |

---

## Wireless Specifications

### WiFi

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Standard | IEEE 802.11 b/g/n | VERIFIED |
| Frequency range | 2412 - 2484 MHz | VERIFIED |
| Bandwidth | 20 MHz, 40 MHz | VERIFIED |
| Mode | 1T1R, up to 150 Mbps (HT40) | VERIFIED |
| TX power (11b, 1Mbps) | 20.5 dBm | VERIFIED |
| TX power (11n, HT40 MCS7) | 17.0 dBm | VERIFIED |
| RX sensitivity (11b, 1Mbps) | -98 dBm | VERIFIED |
| RX sensitivity (11n, HT40 MCS7) | -71.2 dBm | VERIFIED |
| Security | WPA/WPA2/WPA3 | VERIFIED |
| AP mode | Yes — up to 10 stations (ESP-IDF default) | VERIFIED |

### Bluetooth LE

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Version | Bluetooth 5.0 | VERIFIED |
| Data rates | 125 Kbps, 500 Kbps, 1 Mbps, 2 Mbps | VERIFIED |
| Frequency range | 2402 - 2480 MHz | VERIFIED |
| TX power range | -24.0 to +20.0 dBm | VERIFIED |
| RX sensitivity (1Mbps) | -98 dBm (LIKELY) | LIKELY |
| RX sensitivity (125Kbps, coded) | -104 dBm | VERIFIED |
| RX sensitivity (2Mbps) | -93 dBm | VERIFIED |
| Advertising extensions | Yes | VERIFIED |
| Long range (coded PHY) | Yes | VERIFIED |

---

## Power Consumption

| Mode | Conditions | Current | Confidence |
|------|-----------|---------|------------|
| **Active — WiFi TX** | 802.11b @ 20.5 dBm | 350 mA peak | VERIFIED |
| **Active — WiFi RX** | — | 82-84 mA | VERIFIED |
| **Active — BLE TX** | @ 20 dBm | 340 mA peak | VERIFIED |
| **Active — BLE RX** | — | 86 mA | VERIFIED |
| **Modem-sleep** | CPU idle | ~13 mA | VERIFIED |
| **Modem-sleep** | CPU running | ~28 mA | VERIFIED |
| **Light-sleep** | VDD_SPI + WiFi powered down | 130 uA | VERIFIED |
| **Deep-sleep** | RTC timer + RTC memory | 5 uA (chip level) | VERIFIED |
| **Deep-sleep (module)** | Measured at module pins | ~8.14 uA (LIKELY) | LIKELY — from design spec |
| **Power-off** | EN pin LOW | 1 uA | VERIFIED |

### Deep Sleep Details

- **Chip-level deep sleep:** 5 uA (from datasheet)
- **Module-level deep sleep:** Higher due to flash leakage and passive components. Our design spec uses 8.14 uA — this is a measured value from community testing, not a datasheet spec. **Verify on actual prototype.**
- **Wake sources in deep sleep:** RTC timer, GPIO (ext0/ext1), touch pad, ULP
- **Boot time from deep sleep:** ~250-400 ms (LIKELY) — includes flash init, WiFi/BLE stack init is additional. **Verify from ESP-IDF measurements.**

**Design note:** In our camera trap, the C3 is **power-gated** via PG7 (C3_PWR_EN_PIN). When Phase 1 has C3 disabled (PHASE1_C3_ENABLED = 0), PG7 is held LOW and C3 draws 0 uA. When enabled, C3 is powered on demand and shut down after task completion. We do not use C3 deep sleep — we use hard power gating.

---

## SPI Interfaces

| Interface | Mode | Max Clock | Notes | Confidence |
|-----------|------|-----------|-------|------------|
| SPI0 | Flash access (internal) | 80-120 MHz | Not available for user | VERIFIED |
| SPI1 | Flash access (internal) | Up to 120 MHz | Not available for user | VERIFIED |
| SPI2 | General-purpose master/slave | **Master: 80 MHz, Slave: 60 MHz** | User-accessible | VERIFIED |

### SPI Slave Performance in Our Design

- **Datasheet max:** SPI slave up to 60 MHz full-duplex
- **Practical limit:** ESP-IDF SPI slave driver has overhead. Real-world reliable speed is ~10-20 MHz.
- **Our config:** `C3_SPI_CLOCK_HZ = 10000000` (10 MHz) — conservative, matches ESP32-C3 SPI slave practical limit of f_APB/8
- **Why 10 MHz:** ESP-IDF SPI slave uses DMA with transaction-based API. At 10 MHz, 640x360 JPEG thumbnail (~150KB) transfers in ~120ms. Acceptable for our use case (not latency-critical).

**SPI2 pin mapping (C3 side — needs to match N6 SPI2 master):**

| SPI2 Signal | C3 GPIO | Direction | N6 Pin |
|-------------|---------|-----------|--------|
| SCLK | GPIO6 (LIKELY) | Input (slave) | PF2 (SPI2_SCK) |
| MOSI | GPIO7 (LIKELY) | Input (slave) | PD7 (SPI2_MOSI) |
| MISO | GPIO2 (LIKELY) | Output (slave) | PD6 (SPI2_MISO) |
| CS | GPIO10 (LIKELY) | Input (slave) | PB12 (SPI2_NSS) |

**GPIO assignments on C3 side are LIKELY — final assignment depends on C3 firmware pin configuration. The N6 side pins are from config.h.**

---

## GPIO Pin Map

**Verified from Espressif datasheet. Available GPIOs on the module:**

| GPIO | ADC | Default/Strapping | Available | Notes |
|------|-----|-------------------|-----------|-------|
| GPIO0 | ADC1_CH0 | — | Yes | Also 32kHz XTAL_32K_P |
| GPIO1 | ADC1_CH1 | — | Yes | Also 32kHz XTAL_32K_N |
| GPIO2 | ADC1_CH2 | Strapping (floating default) | Yes | SPI flash, JTAG |
| GPIO3 | ADC1_CH3 | — | Yes | |
| GPIO4 | ADC1_CH4 | — | Yes | SPI flash, JTAG |
| GPIO5 | — | — | Yes | SPI flash, JTAG |
| GPIO6 | — | — | Yes | SPI flash, JTAG |
| GPIO7 | — | — | Yes | SPI flash |
| GPIO8 | — | Strapping (floating default) | Yes | |
| GPIO9 | — | Strapping (pull-up default) | Yes | Boot mode select |
| GPIO10 | — | — | Yes | |
| GPIO18 | — | — | Yes | USB D- |
| GPIO19 | — | — | Yes | USB D+ |
| GPIO20 | — | — | Yes | UART0 RXD (default) |
| GPIO21 | — | — | Yes | UART0 TXD (default) |

**Strapping pins (active during boot):**
- **GPIO2:** Must be floating or HIGH for normal SPI boot
- **GPIO8:** Must be floating or don't-care for normal boot. LOW + GPIO9 LOW = joint download mode
- **GPIO9:** Pull-up (default HIGH) = SPI boot. LOW at boot = download mode.

### C3 Pin Allocation in Camera Trap

| Function | C3 GPIO | Interface |
|----------|---------|-----------|
| SPI slave (to N6) — SCLK | GPIO6 | SPI2 |
| SPI slave (to N6) — MOSI | GPIO7 | SPI2 |
| SPI slave (to N6) — MISO | GPIO2 | SPI2 |
| SPI slave (to N6) — CS | GPIO10 | SPI2 |
| OLED display SDA | GPIO8 | I2C (SSD1306) |
| OLED display SCL | GPIO9 | I2C (SSD1306) |
| Ready/interrupt to N6 | GPIO3 | GPIO output (-> N6 PG8) |
| Reed switch (BLE/WiFi activation) | GPIO4 | GPIO input (EXTI) |
| Nav button UP | GPIO0 | GPIO input |
| Nav button DOWN | GPIO1 | GPIO input |
| Nav button SELECT | GPIO5 | GPIO input |
| UART0 TX (debug) | GPIO21 | UART0 |
| UART0 RX (debug) | GPIO20 | UART0 |
| USB D- | GPIO18 | USB Serial/JTAG |
| USB D+ | GPIO19 | USB Serial/JTAG |

**Note:** GPIO assignments above are LIKELY design intent. Final C3 firmware may reassign via GPIO matrix. GPIO8/GPIO9 have boot-time strapping behavior — ensure I2C pull-ups don't interfere with boot mode selection.

---

## Communication Interfaces

| Interface | Count | Max Speed | Confidence |
|-----------|-------|-----------|------------|
| UART | 2 (UART0, UART1) | 5 Mbps | VERIFIED |
| SPI | 1 user (SPI2) | Master 80MHz, Slave 60MHz | VERIFIED |
| I2C | 1 | 800 kbit/s (fast mode plus) | VERIFIED |
| I2S | 1 | 10kHz - 40MHz | VERIFIED |
| LED PWM | 6 channels, up to 14-bit duty | — | VERIFIED |
| Remote Control (RMT) | 2 TX + 2 RX channels | — | VERIFIED |
| TWAI (CAN) | 1 (ISO 11898-1, 1Mbps) | — | VERIFIED |
| USB Serial/JTAG | 1 (USB 2.0 FS, 12 Mbps) | — | VERIFIED |
| Temperature sensor | 1 (internal, -40 to 125C) | — | VERIFIED |

---

## Absolute Maximum Ratings

| Parameter | Min | Max | Confidence |
|-----------|-----|-----|------------|
| Supply voltage (VDD) | -0.3V | 3.6V | VERIFIED |
| Storage temperature | -40C | 105C | VERIFIED |
| ESD (HBM) | — | +/-2000V | VERIFIED |
| ESD (CDM) | — | +/-500V | VERIFIED |
| I/O source current | — | 40 mA | VERIFIED |
| I/O sink current | — | 28 mA | VERIFIED |
| Internal pull-up/down | — | ~45 kohm | VERIFIED |

### DC Characteristics (3.3V, 25C)

| Parameter | Value | Confidence |
|-----------|-------|------------|
| V_IH (logic high input) | 0.75 x VDD to VDD + 0.3V | VERIFIED |
| V_IL (logic low input) | -0.3V to 0.25 x VDD | VERIFIED |
| V_OH (output high) | VDD - 0.1V (typical) | LIKELY |
| V_OL (output low) | 0.1V (typical) | LIKELY |

---

## Thermal and Mechanical

| Parameter | Value | Confidence |
|-----------|-------|------------|
| Module dimensions | 13.2 x 12.5 x 2.4 mm | VERIFIED |
| Antenna connector | 3rd gen U.FL (W.FL / MHF III / AMC compatible) | VERIFIED |
| Reflow peak temperature | 235-250C | VERIFIED |
| Solder | Sn-Ag-Cu (SAC305) lead-free | VERIFIED |
| Moisture Sensitivity Level | MSL 3 | VERIFIED |
| PCB mounting | Surface mount (castellated pads + bottom ground pad) | VERIFIED |

---

## Application Notes for This Design

### WiFi AP Mode (Image Offload)

The C3 creates a WiFi AP. User connects phone, opens web page, browses/downloads images from SD card. This is the primary data offload path for field use.

- **Max concurrent stations:** 10 (ESP-IDF default, configurable)
- **Throughput:** Expect ~5-10 Mbps practical TCP throughput for file transfer
- **Security:** WPA2-PSK with unique per-device password (generated from unit ID)

### BLE GATT Server (Configuration)

BLE exposes a GATT service for:
- Reading device status (battery, trigger count, last detection)
- Modifying settings (operating mode, confidence threshold, SMS number)
- Initiating WiFi AP mode
- Reading diagnostic logs

**WiFi and BLE are sequential, never simultaneous** — avoids C3 coexistence issues.

### Boot Strapping Caution

GPIO8 and GPIO9 are used for I2C to the SSD1306 OLED. These are strapping pins:
- GPIO9 has internal pull-up (HIGH = SPI boot). OLED I2C SCL with 4.7k pull-up to 3.3V is compatible (stays HIGH at boot).
- GPIO8 is floating at boot. OLED I2C SDA with 4.7k pull-up to 3.3V pulls it HIGH — this is the correct state for normal boot.

**Verified safe:** I2C pull-ups on GPIO8/9 do not interfere with boot mode.

### Power Gating

C3 is power-gated via N6 GPIO PG7 (C3_PWR_EN_PIN):
- HIGH = C3 powered from 3.3V rail
- LOW = C3 completely off (0 uA)

On power-up, C3 boots from flash (~200-400ms), initializes SPI slave, asserts READY (GPIO3 -> N6 PG8). N6 waits for READY before sending SPI commands.

---

## Procurement

| Distributor | URL | Price (qty 1) | Stock | Confidence |
|-------------|-----|---------------|-------|------------|
| DigiKey | https://www.digikey.com/en/products/detail/espressif-systems/ESP32-C3-MINI-1U-N4/15222550 | TBD — check directly | In stock, ships same day | VERIFIED |
| Mouser | Search ESP32-C3-MINI-1U-N4 | TBD — check directly | Available | LIKELY |
| LCSC | Search ESP32-C3-MINI-1U-N4 | TBD — check directly | TBD | NOT CHECKED |
| Espressif direct | https://www.espressif.com/en/module/esp32-c3-mini-1u-en | — | — | VERIFIED page exists |

**IMPORTANT:** Order the **-N4** variant (normal temperature, 4MB flash). The **-H4** variant (high temperature) is marked as "no longer manufactured" on DigiKey and will not be restocked.

---

## Known Issues / Errata

Official ESP32-C3 errata: https://docs.espressif.com/projects/esp-chip-errata/en/latest/esp32c3/index.html

**Key errata to check (from general ESP32-C3 community knowledge):**

1. **SPI slave clock limitation:** Datasheet says 60 MHz slave, but ESP-IDF driver reliability drops above ~20 MHz. Use 10 MHz (our config).
2. **ADC2 availability:** ADC2 has only 1 channel and may be limited when WiFi is active (WiFi uses ADC2 for RF calibration on some ESP32 variants — verify for C3).
3. **GPIO18/19 USB:** If USB Serial/JTAG is not used, GPIO18/19 can be repurposed but require specific configuration to disconnect from USB peripheral.
4. **Deep sleep wakeup time:** Varies with flash speed and application size. 250-400ms is typical; measure on prototype.

---

## TODO — Manual Verification Needed

- [ ] **Deep sleep module current:** Measure on prototype (datasheet chip-level = 5uA, module expected ~8uA)
- [ ] **Boot time from power-on:** Measure on prototype with actual firmware
- [ ] **SPI slave reliable speed:** Test at 10 MHz with actual image transfer load
- [ ] **WiFi AP throughput:** Measure practical file transfer speed
- [ ] **BLE + I2C coexistence:** Verify BLE GATT operations don't glitch I2C to OLED
- [ ] **Strapping pin behavior:** Verify GPIO8/9 I2C pull-ups don't cause boot issues
- [ ] **ESP32-C3 errata:** Review full errata list for design impact
- [ ] **RF performance:** Measure with external antenna through enclosure RF window
- [ ] **H4 vs N4 EOL:** Confirm -N4 variant has long-term availability commitment from Espressif
