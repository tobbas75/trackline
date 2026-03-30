# AI Camera Trap — PCB Design Specification

> **NOTE — Two-Phase Approach:** This document describes the full target design. Phase 1 prototype boards are **fully populated** — all components soldered, all traces routed (only exception: SSD1306 OLED display DNP). Features not needed for initial field validation are disabled in firmware, not omitted from hardware. See `HARDWARE_DESIGN_BRIEF.md` §17 for the Phase 1 firmware state table and PCB layout allowances. The critical constraint is that **all signal names, active levels, UART assignments, power rail voltages, and I2C addresses must be identical** across both phases so the same firmware binary runs unchanged.

---

## 1. Board Overview

| Parameter | Value |
|---|---|
| Main MCU | STM32N657X0H3Q (Cortex-M55 @ 800 MHz, Neural-ART NPU, native MIPI CSI-2, VFBGA-264) |
| Power MCU | STM32U083KCU6 (Cortex-M0+, sleep/wake state machine) |
| Image Sensor | Sony IMX678 (STARVIS 2, 8MP 4K, MIPI CSI-2 2-lane) |
| PSRAM | APS256XXN-OB9-BG (32 MB, HexaSPI x16 DDR, **1.8V**) |
| NOR Flash | W25Q128JV (16 MB) + W25Q256JV (32 MB) on xSPI2 |
| SD Card | µSD via SDMMC2 4-bit |
| Modem | Quectel EG800Q-EU (LTE CAT-1bis) on shared daughter card |
| GPS | u-blox MAX-M10S (NMEA 9600 baud, power-gated) |
| IR Illumination | Modular LED daughter board (4-pin JST GH, strobed via TIM1) |
| PIR Sensors | 2× Panasonic EKMB1303112K (to STM32U0, NOT STM32N6) |
| MCU logic level | 3.3V (STM32N6 I/O) |
| Modem logic level | 1.8V (BSS138 level shift on daughter card) |
| Board layers | 4-layer minimum (BGA + MIPI CSI-2 + xSPI controlled impedance) |
| Board dimensions | Target: 90 × 70 mm (fits custom IP67 enclosure) |
| Mounting | 4× M3 corner holes, 3.2 mm diameter |
| Operating temp | 0°C to +50°C (IP67 enclosure, tropical) |

---

## 2. Power Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKPACK (snap-on rear module)                                 │
│                                                                 │
│  Standard: 12 AA NiMH caddy only. No charging. Any AA safe.    │
│  Field Station: 12 AA NiMH + trigger jack + LoRa slot.         │
│    No solar charging. Any AA safe.                              │
│  Li-ion Solar: Sealed Li-ion pack (3S/4S 18650/21700) + BMS    │
│    + MPPT solar charge controller + trigger jack + LoRa slot.   │
│    Output voltage regulated to match NiMH range.                │
│  Extender: 12 AA spacer, stacks with Standard or Field Station │
│    only (not Li-ion Solar).                                     │
│                                                                 │
│  Solar charging (Li-ion Solar only): MPPT charger + BMS +      │
│  sealed pack — camera sees only regulated battery voltage.      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
              Backpack Interface Connector
              (power + trigger + LoRa UART + GND)
                       │
                       ▼
┌─────────────────┐
│  Battery Input  │  JST PH 2P on main board
│                 │  Camera sees only battery voltage — doesn't know backpack type
└────────┬────────┘
         │
         ├──► Voltage divider (1MΩ/470kΩ) ──► PA1 (BATT_ADC)
         │
         ▼
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    ▼                                                 ▼
                  FIRST STAGE (from battery bus, Vin 6.0-8.4V)
┌──────────────┐                    ┌──────────────┐  ┌──────────────┐
│ 3.3V Buck    │                    │ 3.8V Buck    │  │ 5.0V Buck    │
│ AP63300      │                    │ AP63300      │  │ AP63300      │
│ (U11)        │                    │ (U13)        │  │ (U15)        │
│ ALWAYS ON    │                    │ PB7 gated    │  │ PB6 gated    │
└──────┬───────┘                    └──────┬───────┘  └──────┬───────┘
       │                                   │                 │
       │    SECOND STAGE (from 3.3V)       ▼                 ▼
       │                              Modem VBAT       LED Module
       ├──► ┌──────────────┐          (daughter card)  VLED rail
       │    │ 0.81V/0.89V  │                           (2A burst)
       │    │ TPS62088     │
       │    │ (U10a)       │ ◄── GPIO PF4 switches feedback divider
       │    └──────┬───────┘     for VOS nominal (600MHz) / overdrive (800MHz)
       │           │
       │           ▼
       │       STM32N6
       │       VDDCORE
       │
       ├──► ┌──────────────┐
       │    │ 1.1V Buck    │
       │    │ TPS62088     │
       │    │ (U10b)       │
       │    └──────┬───────┘
       │           │
       │           ▼
       │       IMX678 DVDD
       │       (digital core)
       │
       ├──► ┌──────────────┐
       │    │ 1.8V LDO     │
       │    │ TPS7A02      │
       │    │ (U12)        │
       │    └──────┬───────┘
       │           │
       │           ▼
       │       IMX678 DOVDD + PSRAM VDD + VDDIO_XSPI1
       │
       ├──► Ferrite+LC filter ──► IMX678 AVDD (3.3V analog)
       │
       ▼
   NOR flash, GPS, PIR, SD, RTC, STM32U0, ESP32-C3 (power-gated)
```

### Power Notes

- **AP63300 (3.3V, U11)** — Main digital rail. Vin=3.8-32V, handles 6.0-8.4V battery directly. ALWAYS ON (Iq=22µA). Powers NOR flash, GPS, PIR, SD, RTC, STM32U0, ESP32-C3. Also feeds IMX678 AVDD via ferrite bead + LC filter (3.3V analog). Replaces TPS62A01 (max Vin=5.5V, destroyed by battery voltage).
- **TPS62088 #1 (U10a, 0.81V/0.89V)** — STM32N6 VDDCORE. GPIO PF4 switches feedback divider between 0.81V (VOS nominal, 600 MHz) and 0.89V (VOS overdrive, 800 MHz for full NPU). Copy DK board circuit (TPS62088YFP + FET switch). **DSBGA-6 (1.2×0.8mm) wafer-level BGA — NOT WSON-6.** Max Vin=5.5V, fed from 3.3V rail.
- **TPS62088 #2 (U10b, 1.1V)** — IMX678 DVDD (digital core). Fixed output. Same DSBGA-6 package. Cannot share VDDCORE rail — STM32N6 needs 0.81V/0.89V which is out of spec for IMX678 (needs 1.1V). Max Vin=5.5V, fed from 3.3V rail.
- **TPS7A02 (1.8V, U12)** — IMX678 DOVDD + PSRAM VDD/VDDQ + STM32N6 VDDIO_XSPI1. Low noise critical for image quality. Max 200mA — verify combined load (PSRAM active ~30-50mA + IMX678 DOVDD ~50mA + VDDIO_XSPI1 ~20mA = ~100-120mA peak). Input from 3.3V rail.
- **AP63300WU-7 (3.8V, 3A)** — Modem VBAT via daughter card connector pin 1. Same part as Trap Monitor. Handles sustained 1A TX bursts. 100µF + 10µF + 100nF bypass at VBAT (on daughter card).
- **AP63300WU-7 (5.0V, 3A)** — LED module VLED rail. Same part as modem buck (U13), different feedback resistors for 5V output. 2A max load, only active during burst capture. Power-gated by PB6 (LED_5V_EN). Input range 3.8–32V covers full battery window (12.0–16.8V) with margin. Always a step-down (buck) from battery bus — no boost needed.
- **Solar charging** — NOT on main board. Only available in the Li-ion Solar backpack (sealed Li-ion pack + BMS + MPPT controller). Camera sees only regulated battery voltage via JST PH 2P. Standard and Field Station backpacks have no charge circuitry. This simplifies the main board and reduces base BOM.
- **Power gating:** Modem, GPS, sensor, PSRAM, SD card, and LEDs are all power-gated in deep sleep. Only STM32N6 (VBAT + SRAM retention), STM32U0 (standby), PIR sensors, LIS2DW12 accelerometer, and regulator quiescent currents draw in sleep. **Modem 3.8V buck EN (PB7) MUST be driven LOW in sleep** — modem power-off mode alone draws ~55 µA; disabling the buck reduces this to ~0 µA.

### Deep Sleep Budget (~50 µA total) — REVISED March 2026 V1.2

| Component | Current | Notes |
|---|---|---|
| STM32N6 deep sleep (VBAT + 80KB SRAM1 retention) | ~8 µA | Models reload from NOR flash on wake |
| STM32U0 standby (RTC on) | ~2 µA | |
| PIR sensors (2× Panasonic EKMB) | 2 µA | |
| LIS2DW12 accelerometer (wake-up mode) | ~1.5 µA | Phase 1 firmware-disabled |
| AP63300 #1 (3.3V, always on) | ~22 µA | Iq. Dominates sleep budget. |
| AP63300 #2 (3.8V modem, EN=LOW) | ~1 µA | Shutdown via PB7 |
| AP63300 #3 (5.0V LED, EN=LOW) | ~1 µA | Shutdown via PB6 |
| TPS62088 ×2 + TPS7A02 quiescent | ~9 µA | ~4µA each TPS62088 + ~0.5µA TPS7A02 |
| Voltage divider bleed (R1=2MΩ, R2=1MΩ) | ~2.8 µA | At 8.4V full charge |
| ESP32-C3 (power-gated OFF) | 0 µA |
| Reed switch pull-up leakage | <1 µA |
| Pull-ups, leakage, RTC crystal | ~13 µA |
| **Total** | **~39 µA** |

---

## 3. Peripheral Pin Assignment Summary

All assignments validated against STM32N657X0H3Q VFBGA-264 package (14×14mm, 0.8mm pitch, 165 I/O). Same part as STM32N6570-DK discovery board. CSI-2 lanes are dedicated PHY pads (not GPIO-muxed). xSPI1 and xSPI2 use separate GPIO ports. No conflicts detected.

| Peripheral | Instance | Pins | AF | GPIO Port |
|---|---|---|---|---|
| MIPI CSI-2 (2-lane) | CSI/DCMIPP | Dedicated D-PHY pads | N/A | Dedicated |
| PSRAM (32 MB) | XSPI1 (Port 1) | CLK=PO4, DQS0=PO2, DQS1=PO3, CS=PO0, D0–D15=PP0–PP15 | AF9 | GPIOO, GPIOP |
| NOR Flash (16+32 MB) | XSPI2 (Port 2) | CLK=PN6, DQS=PN0, CS1=PN1, D0–D3=PN2–PN5, D4–D7=PN8–PN11 | AF9 | GPION |
| SD Card (4-bit) | SDMMC2 | CLK=PC2, CMD=PC3, D0=PC4, D1=PC5, D2=PC0, D3=PE4 | AF11 | GPIOC, GPIOE |
| Modem UART | UART4 | TX=PC10, RX=PC11 | AF8 | GPIOC |
| GPS UART | USART3 | TX=PD8, RX=PD9 | AF7 | GPIOD |
| Sensor I2C | I2C1 | SCL=PH9, SDA=PC1 | AF4 | GPIOH, GPIOC |
| Fuel Gauge I2C | I2C2 | SCL=PD14, SDA=PD4 | AF4 | GPIOD |
| LED Strobe | TIM1 CH1 | PA8 | AF1 | GPIOA |
| Inter-MCU SPI | SPI1 | NSS=PA4 (GPIO), SCK=PA5, MISO=PA6, MOSI=PA7 | AF5 (NSS=SW) | GPIOA |
| ADC (LED ID) | ADC1 CH0 | PA0 | Analog | GPIOA |
| ADC (Battery) | ADC1 CH1 | PA1 | Analog | GPIOA |
| ESP32-C3 SPI | SPI2 | NSS=PB12, SCK=PF2, MISO=PD6, MOSI=PD7 | AF | GPIOB, GPIOD, GPIOF |
| ESP32-C3 Power Enable | GPIO | PG7 | Output | GPIOG |
| ESP32-C3 Ready/IRQ | GPIO | PG8 | Input (EXTI) | GPIOG |
| Reed Switch | GPIO | PG9 | Input (EXTI) | GPIOG |
| Camera Reset | GPIO | PC8 | Output (open-drain) | GPIOC (VDDIO4) |
| Camera Enable | GPIO | PD2 | Output (open-drain) | GPIOD (VDD) |
| SD Card Detect | GPIO | PN12 | Input (EXTI) | GPION |

**Notes:**
- All pin assignments validated in CubeMX against STM32N657X0H3Q VFBGA-264 package.
- **VDDIO4 bank verification (March 2026):** PC1 and PH9 (I2C1) share VDDIO4 with PC10/PC11 (modem UART). VDDIO4 stays at 3.3V to preserve shared modem interface. I2C1 uses BSS138 level shifters (3.3V ↔ 1.8V). Sensor control pins PC8 and PD2 use open-drain outputs with 1.8V pull-ups to avoid driving 3.3V into 1.8V sensor inputs.
- USART2 TX/RX (PD5/PF6) not available on this package — modem uses UART4 (PC10/PC11).
- SPI1 NSS (PA4) uses software GPIO chip select — hardware NSS AF not available on PA4 for this package.
- I2C3 has no valid pin mapping on VFBGA-264 — expansion I2C header removed.
- Sensor MCLK uses dedicated external 24 MHz oscillator — MCO1 has no usable pin when HSE crystal is on PH0/PH1.
- HSE crystal: PH0 (OSC_IN) + PH1 (OSC_OUT), Crystal/Ceramic Resonator mode.

---

## 4. Complete Schematic Netlist

### 4.1 STM32N657X0H3Q Main MCU Connections

| STM32N6 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| PA0 | LED_MODULE_ID | LED module ID resistor divider | ADC1 CH0, analog input. 10kΩ pull-up to 3.3V on main board |
| PA1 | BATT_SENSE | Battery voltage divider midpoint | ADC1 CH1, 0–3.3V. 1MΩ/470kΩ divider |
| PA4 | U0_SPI_NSS | STM32U0 SPI NSS (chip select) | SPI1 NSS, GPIO software chip select, active LOW |
| PA5 | U0_SPI_SCK | STM32U0 SPI clock | SPI1 SCK |
| PA6 | U0_SPI_MISO | STM32U0 SPI data (U0 → N6) | SPI1 MISO |
| PA7 | U0_SPI_MOSI | STM32U0 SPI data (N6 → U0) | SPI1 MOSI |
| PA8 | LED_STROBE | IR LED module STROBE pin (JST GH pin 2) | TIM1 CH1, active HIGH. 30 ms pulse synced to MIPI frame-valid |
| PC0 | SD_D2 | µSD card DAT2 | SDMMC2, AF11 |
| PC1 | SENSOR_SDA | IMX678 I2C data | I2C1 SDA, 4.7kΩ pull-up to 1.8V |
| PC2 | SD_CLK | µSD card CLK | SDMMC2, AF11 |
| PC3 | SD_CMD | µSD card CMD | SDMMC2, AF11, 47kΩ pull-up |
| PC4 | SD_D0 | µSD card DAT0 | SDMMC2, AF11 |
| PC5 | SD_D1 | µSD card DAT1 | SDMMC2, AF11 |
| PC8 | SENSOR_RESET | IMX678 XCLR (reset) | **Open-drain** output, 10kΩ pull-up to 1.8V. VDDIO4=3.3V — open-drain prevents 3.3V drive into 1.8V sensor input. |
| PD2 | SENSOR_PWDN | IMX678 power-down | **Open-drain** output, 10kΩ pull-up to 1.8V. VDD=3.3V — open-drain prevents 3.3V drive into 1.8V sensor input. Active HIGH (pull-up = standby on boot, firmware drives LOW to activate). |
| PD4 | FUEL_SDA | MAX17048 I2C data | I2C2 SDA, 4.7kΩ pull-up to 3.3V |
| PC10 | MODEM_TX | Modem daughter card pin 4 (UART_TXD) | UART4 TX, 115200 baud |
| PD8 | GPS_TX | u-blox M10 RXD | USART3 TX, 9600 baud |
| PD9 | GPS_RX | u-blox M10 TXD | USART3 RX, 9600 baud (NMEA data) |
| PD14 | FUEL_SCL | MAX17048 I2C clock | I2C2 SCL, 4.7kΩ pull-up to 3.3V |
| PE4 | SD_D3 | µSD card DAT3 | SDMMC2, AF11 |
| PC11 | MODEM_RX | Modem daughter card pin 5 (UART_RXD) | UART4 RX, 115200 baud |
| PH9 | SENSOR_SCL | IMX678 I2C clock | I2C1 SCL, 4.7kΩ pull-up to 1.8V |
| PB0 | MODEM_PWRKEY | Modem daughter card pin 8 (PWRKEY) | GPIO output, active HIGH pulse |
| PB1 | MODEM_RST | Modem daughter card pin 9 (RESET_N) | GPIO output, active LOW |
| PB2 | MODEM_STATUS | Modem daughter card pin 10 (STATUS) | GPIO input, HIGH = modem on |
| PB3 | MODEM_RI | Modem daughter card pin 11 (RI) | GPIO input (EXTI), ring indicator pulse |
| PB4 | MODEM_DTR | Modem daughter card pin 12 (DTR) | GPIO output, optional |
| PB5 | GPS_PWR | GPS power gate (BSS138 → SI2301 → M10 VCC) | GPIO output, HIGH = powered |
| PB6 | LED_5V_EN | 5V LED VLED buck enable (AP63300 U15) | GPIO output, HIGH = enabled. Only during burst. |
| PB7 | MODEM_3V8_EN | AP63300 3.8V buck EN pin | GPIO output, HIGH = enabled. Optional sleep gating. |
| PG0 | LED_STATUS_GREEN | Green LED anode (220Ω to GND) | GPIO output |
| PG1 | LED_STATUS_AMBER | Amber LED anode (220Ω to GND) | GPIO output |
| PG2 | LED_STATUS_RED | Red LED anode (220Ω to GND) | GPIO output |
| PG3 | U0_WAKE | STM32U0 → STM32N6 wake signal | GPIO input (EXTI), rising edge |
| PG4 | U0_STATUS | STM32N6 → STM32U0 busy/done | GPIO output |
| PG5 | U0_PWRCTRL | STM32U0 controls N6 power enable | GPIO input |
| PG6 | TRIG_OUT | TLP291 opto-coupler drive (trigger output) | GPIO output, active HIGH. Drives on-board TLP291 via 220Ω. Output routed to J_BP pins 3-4. |
| PH0 | RCC_OSC_IN | HSE crystal input | 25 MHz crystal, Crystal/Ceramic Resonator mode |
| PH1 | RCC_OSC_OUT | HSE crystal output | Paired with PH0 |
| PN0 | FLASH_DQS | NOR flash DQS | XSPI2, AF9 |
| PN1 | FLASH_CS1 | W25Q128JV chip select | XSPI2 CS1, AF9 |
| PN2–PN5 | FLASH_D0–D3 | NOR flash data low nibble | XSPI2, AF9 |
| PN6 | FLASH_CLK | NOR flash clock | XSPI2, AF9 |
| PN8–PN11 | FLASH_D4–D7 | NOR flash data high nibble | XSPI2, AF9 |
| PN12 | SD_DETECT | µSD card detect switch | GPIO input (EXTI), active LOW, 10kΩ pull-up |
| PO0 | PSRAM_CS | APS256XXN chip select | XSPI1 CS, AF9 |
| PO2 | PSRAM_DQS0 | APS256XXN DQS0 | XSPI1, AF9 |
| PO3 | PSRAM_DQS1 | APS256XXN DQS1 | XSPI1, AF9 |
| PO4 | PSRAM_CLK | APS256XXN clock | XSPI1, AF9 |
| PP0–PP15 | PSRAM_D0–D15 | APS256XXN 16-bit data bus | XSPI1, AF9 |
| CSI D-PHY | CSI_CLKP/N | MIPI CSI-2 clock lane (differential) | Dedicated PHY pads |
| CSI D-PHY | CSI_D0P/N | MIPI CSI-2 data lane 0 (differential) | Dedicated PHY pads |
| CSI D-PHY | CSI_D1P/N | MIPI CSI-2 data lane 1 (differential) | Dedicated PHY pads |
| 3V3 | VDD_IO | All 3.3V I/O banks | From AP63300 U11 |
| VDDCORE | VDD | Core supply (0.81V/0.89V) | From TPS62088 U10a |
| GND | GND | Common ground | Star ground near MCU |

### 4.2 STM32U083KCU6 Power Controller Connections

| STM32U0 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| PA0 | PIR_1 | Panasonic EKMB #1 output | GPIO input (EXTI), active HIGH on motion |
| PA1 | PIR_2 | Panasonic EKMB #2 output | GPIO input (EXTI), active HIGH on motion |
| PA4 | U0_SPI_NSS | STM32N6 PA4 | SPI slave NSS |
| PA5 | U0_SPI_SCK | STM32N6 PA5 | SPI slave SCK |
| PA6 | U0_SPI_MISO | STM32N6 PA6 | SPI slave MISO (U0 → N6) |
| PA7 | U0_SPI_MOSI | STM32N6 PA7 | SPI slave MOSI (N6 → U0) |
| PB0 | N6_WAKE | STM32N6 PG3 (U0_WAKE) | GPIO output, rising edge wakes N6 |
| PB1 | N6_STATUS | STM32N6 PG4 (U0_STATUS) | GPIO input, N6 signals busy/done |
| PB2 | FUEL_ALERT | MAX17048 ALRT output | GPIO input (EXTI), active LOW. Critical battery → U0 shuts down N6. |
| PB3 | N6_PWR_EN | STM32N6 PG5 (U0_PWRCTRL) + regulator enable | GPIO output, controls N6 power rail enable |
| PB4 | BATT_ADC_U0 | Battery voltage divider (optional) | ADC input for U0 battery monitoring |
| PB5 | WDG_OUT | External watchdog kick (optional) | GPIO output, toggles to feed watchdog |
| PA2 | ACCEL_INT | LIS2DW12 INT1 output | GPIO input (EXTI), active HIGH. Wake-on-movement for anti-theft. |
| PA3 | TRIG_SENSE | J_BP trigger input sense | GPIO input (EXTI), active LOW. External device contact closure wakes camera. 100kΩ series + 10kΩ pull-up + TVS. |
| PA8 | ACCEL_SDA | LIS2DW12 I2C SDA | I2C1 SDA (AF4 on U0), 4.7kΩ pull-up to 3.3V |
| PA9 | ACCEL_SCL | LIS2DW12 I2C SCL | I2C1 SCL (AF4 on U0), 4.7kΩ pull-up to 3.3V |
| VDD | VDD_3V3 | 3.3V rail | From AP63300 U11, 100nF bypass |
| GND | GND | Common ground | |

### 4.3 Sony IMX678 Image Sensor Connections

| IMX678 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| MIPI CSI CLK+/- | CSI_CLKP/N | STM32N6 CSI D-PHY clock | Differential pair, 100Ω termination |
| MIPI CSI D0+/- | CSI_D0P/N | STM32N6 CSI D-PHY data 0 | Differential pair, 100Ω termination |
| MIPI CSI D1+/- | CSI_D1P/N | STM32N6 CSI D-PHY data 1 | Differential pair, 100Ω termination |
| XCLR | SENSOR_RESET | STM32N6 PC8 | **Open-drain** GPIO, 10kΩ pull-up to 1.8V (DOVDD). PC8 is on VDDIO4=3.3V — open-drain ensures XCLR never exceeds DOVDD+0.3V. |
| INCK | SENSOR_MCLK | Y2 output (SiT8008, 24 MHz) | Dedicated 1.8V MEMS oscillator. VDD from 1.8V sensor rail (power-gated). 100nF bypass. See §4.3.1. |
| SDA | SENSOR_SDA | STM32N6 PC1 (I2C1) | 4.7kΩ pull-up to 1.8V |
| SCL | SENSOR_SCL | STM32N6 PH9 (I2C1) | 4.7kΩ pull-up to 1.8V |
| AVDD | SENSOR_AVDD | **3.3V** rail (from AP63300 U11 via ferrite bead + LC filter) | 100nF + 10µF bypass, clean analog supply. **NOT 1.8V — Sony specifies 3.3V for AVDD.** |
| DVDD | SENSOR_DVDD | **1.1V** rail (TPS62088, feedback adjusted) | 100nF + 10µF bypass. **NOT 1.2V — Sony specifies 1.1V for DVDD.** |
| DOVDD | SENSOR_DOVDD | 1.8V rail (TPS7A02) | Digital I/O voltage. Powers I2C, XCLR pull-ups, oscillator. |
| GND | GND | Common ground | Separate analog/digital ground planes under sensor |

**I2C voltage compatibility — RESOLVED (March 2026):** PC1 (I2C1_SDA) and PH9 (I2C1_SCL) are both on the VDDIO4 domain (SDMMC1 pin group). VDDIO4 **cannot** be set to 1.8V because PC10/PC11 (modem UART4) share the same domain and must remain at 3.3V per the shared modem daughter card interface spec. Therefore: **BSS138 level shifters are required** on I2C1 SDA and SCL.

**BSS138 I2C level shifter circuit (Q_I2C_SDA, Q_I2C_SCL):**
- 2× BSS138 N-FET (SOT-23) placed within 10 mm of IMX678
- Gate tied to 1.8V (SENSOR_DOVDD rail)
- Source side (sensor): 4.7kΩ pull-up to 1.8V (existing R_SDA_18, R_SCL_18)
- Drain side (MCU): 4.7kΩ pull-up to 3.3V (new R_SDA_33, R_SCL_33)
- Supports 400 kHz I2C (BSS138 adds ~10 pF, rise time well within I2C spec)
- When sensor 1.8V rail is off: gate = 0V → FET off → no leakage into unpowered sensor

#### 4.3.1 Sensor Clock Oscillator (Y2 — SiT8008BI)

| Y2 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VDD | SENSOR_DOVDD | 1.8V rail (TPS7A02) | Power-gated with sensor rail. 100nF bypass at pin. |
| GND | GND | Common ground | |
| OUT | SENSOR_MCLK | IMX678 INCK pin | 24.000 MHz, ±50 ppm, LVCMOS 1.8V output |
| OE | VDD (tied HIGH) | 1.8V rail | Always enabled when powered. No MCU control needed. |

- **SiT8008BI-33-25E-24.000000G** — MEMS oscillator, SOT-23-5 (2.5×2.0mm)
- 3.2 mA typical at 24 MHz / 1.8V. Zero current when sensor rail is off.
- Startup: <5 ms (sensor needs >10 ms post-reset before I2C — oscillator is stable first)
- Place within 10 mm of IMX678 INCK pin. Short trace, no length matching needed.
- MCO1 (RCC clock output) has no usable AF on VFBGA-264 with HSE on PH0/PH1 — external oscillator is the standard approach for camera sensor clocks.

### 4.4 Modem Daughter Card Connector (20-pin)

See `MODEM_INTERFACE_SPEC.md` for full shared interface specification. Same connector and pinout as Trap Monitor.

| Connector Pin | Signal | STM32N6 Pin | Notes |
|---|---|---|---|
| 1 | VBAT_MODEM | — | 3.8V from AP63300 (U13), 3A peak |
| 2 | GND | — | Power ground return |
| 3 | GND | — | Power ground return (parallel) |
| 4 | UART_TXD | PC10 (UART4 TX) | Host TX → modem RXD, 3.3V logic |
| 5 | UART_RXD | PC11 (UART4 RX) | Modem TXD → host RX, 3.3V logic |
| 6 | UART_RTS | — | DNP, 0R strap to enable |
| 7 | UART_CTS | — | DNP, 0R strap to enable |
| 8 | PWRKEY | PB0 | Active HIGH pulse, 3.3V |
| 9 | RESET_N | PB1 | Active LOW reset, 3.3V |
| 10 | STATUS | PB2 | Modem status output, HIGH = on |
| 11 | RI | PB3 | Ring indicator pulse |
| 12 | DTR | PB4 | Data terminal ready, optional |
| 13 | W_DISABLE | — | Tied HIGH via 10kΩ (RF enabled) |
| 14 | USB_DP | USB_DP | USB 2.0 data positive (for modem FW update) |
| 15 | USB_DM | USB_DM | USB 2.0 data negative |
| 16–19 | SIM_VCC/DATA/CLK/RST | — | Routed on daughter card only |
| 20 | GND | — | Signal ground return |

**Level shifting (on daughter card):** 4× BSS138 channels shift TXD, RXD, PWRKEY, RESET_N between 3.3V host and 1.8V modem. Same circuit as Trap Monitor (March 2026 standardisation). 10kΩ pull-down on PWRKEY (1.8V side) prevents spurious toggle during host boot.

**Modem VBAT overvoltage protection (on daughter card):** Zener diode (BZT52C4V3-7-F, 4.3V) + PTC fuse on VBAT_MODEM (pin 1). Zener clamps at ~4.3V; PTC fuse (e.g., 500mA) blows before Zener is destroyed if AP63300 fails high. **SMBJ4.5A does not exist** — no standard TVS clamps at ≤4.3V.

**Modem power sequencing:** Firmware must wait ≥100ms after enabling the 3.8V rail (PB7 HIGH) before pulsing PWRKEY (PB0). The AP63300 internal soft-start (~1ms) handles inrush to the 100µF + 10µF bypass caps. The 100ms delay is standard Quectel practice and provides margin for output settling.

### 4.5 u-blox MAX-M10S GPS Module Connections

Same module and power gate circuit as Trap Monitor.

| M10 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VCC | GPS_VCC | 3.3V via power gate (SI2301 P-FET) | PB5 controls gate |
| GND | GND | Common ground | |
| TXD | GPS_RX | STM32N6 PD9 (USART3 RX) | NMEA output, 9600 baud |
| RXD | GPS_TX | STM32N6 PD8 (USART3 TX) | UBX config commands |
| RF_IN | RF_GNSS | u.FL to GNSS patch antenna | 50Ω controlled impedance |
| V_BCKP | GPS_VBCKP | 3.3V via 100Ω + 100nF | Backup for hot start |
| TIMEPULSE | — | Not connected | |
| EXTINT | — | Not connected | |

#### GPS Power Gate Circuit (identical to Trap Monitor)

```
3V3 Rail ──────────────────────────────┐
                                        │
                                       R19 (10kΩ)
                                        │
                    PB5 ──── 10k ──┤ Gate
                         (GPS_PWR)      │
                                   ┌────┤ Source
                                   │    │ SI2301 (Q3)
                                   │    │ P-FET
                                   │    └── Drain ──── M10 VCC
                                   │                      │
                                   │                    100nF
                                   │                      │
                                   └──────────────────── GND

    (BSS138 inverter Q4 between PB5 and SI2301 gate)
```

- PB5 HIGH → BSS138 (Q4) pulls P-FET gate LOW → SI2301 (Q3) ON → M10 powered
- PB5 LOW → BSS138 off → P-FET gate pulled HIGH by R19 → SI2301 OFF → M10 unpowered
- Matches firmware convention: `GPS_PWR_PIN` HIGH = powered

### 4.6 ~~MAX17048 Fuel Gauge~~ — REMOVED (March 2026 Review)

> **REMOVED.** The MAX17048 has an absolute maximum CELL pin voltage of 5.5V. With a 6S2P NiMH pack (6.0–8.4V), connecting CELL to BATT+ would destroy the IC on first power-up. A voltage divider approach is not viable because the MAX17048's built-in Li-ion ModelGauge algorithm would give incorrect SOC readings for NiMH chemistry.
>
> **Replacement:** Battery SOC estimation uses the existing BATT_SENSE voltage divider (PA1, ADC1 CH1). NiMH has a predictable OCV-to-SOC curve. Voltage thresholds in firmware provide adequate 20%/10% low/critical warnings. This is the standard approach for trail cameras.
>
> **Freed resources:** I2C2 (PD4/PD14) and STM32U0 PB2 are now available for future use. U0 PB2 can be repurposed as a general-purpose EXTI input.

### 4.7 IR LED Module Interface (4-pin JST GH)

See `LED_MODULE_SPEC.md` for full daughter board specification.

| JST GH Pin | Signal | Connected To | Notes |
|---|---|---|---|
| 1 | VLED | 5V buck output (U15, AP63300) | 2A max, power-gated by PB6 (LED_5V_EN) |
| 2 | STROBE | STM32N6 PA8 (TIM1 CH1) | Active HIGH, 30 ms pulse per frame |
| 3 | ID | STM32N6 PA0 (ADC1 CH0) | Module ID resistor divider. 10kΩ pull-up to 3.3V on main board |
| 4 | GND | Common ground | |

#### Module ID Detection

| Module | R_ID to GND | Voltage at ADC | ADC (10-bit) | Gap to next |
|---|---|---|---|---|
| Blank plug | 1.2kΩ | ~0.35V | ~107 | — |
| 940nm Super Long Range | 2.7kΩ | ~0.70V | ~213 | 106 |
| 940nm Long Range | 5.6kΩ | ~1.19V | ~359 | 146 |
| 940nm Standard | 10kΩ | ~1.65V | ~500 | 141 |
| 850nm Research | 22kΩ | ~2.27V | ~688 | 188 |
| White Flash | 47kΩ | ~2.72V | ~824 | 136 |
| No module (open) | ∞ | ~3.3V | >950 | 126+ |

All E24 standard resistors. Minimum gap 106 ADC counts (~0.35V), well above ±50 count tolerance. Firmware reads ADC at boot, matches to nearest band, logs module type in all metadata.

### 4.8 Battery Voltage Divider

```
BATT+ ──── R1 (2MΩ) ──┬── R2 (1MΩ) ──── GND
                        │
                        └── PA1 (BATT_SENSE, ADC1 CH1)
                        │
                        └── C1 (100nF) ──── GND  (filter cap)
```

**Battery topology: 6S2P.** 12 × AA NiMH: 6 in series, 2 parallel strings. 7.2V nominal, 8.4V full charge (1.4V/cell), 6.0V discharged (1.0V/cell). Capacity: 4000 mAh (2 × 2000 mAh). Energy: 28.8 Wh. Li-ion Solar backpack regulates output to match this range.

> **NOTE (March 2026 review):** Previous design used 12S (all series) which gave only 2000 mAh at 14.4V — just 54 days at 37 mAh/day. 6S2P doubles capacity to 4000 mAh (108 days) with the same 12 cells and same total energy. Lower voltage (8.4V max vs 16.8V) also simplifies the power cascade and reduces voltage divider bleed current.

Divider ratio = R2 / (R1 + R2) = 1M / 3M = **0.333** (divider factor 3.0).

| Battery state | Pack voltage | ADC voltage | Notes |
|---|---|---|---|
| Full charge (1.4V/cell) | 8.4V | 2.80V | Safe (0.50V margin below 3.3V ref) |
| Nominal (1.2V/cell) | 7.2V | 2.40V | Mid-range |
| Low (1.1V/cell) | 6.6V | 2.20V | Low battery warning |
| Discharged (1.0V/cell) | 6.0V | 2.00V | Critical — shutdown |

- **NOT the same divider as Trap Monitor** — Trap Monitor uses 1MΩ/470kΩ for lower battery voltage.
- Bleed current: 8.4V / 3MΩ = **2.8 µA** — included in sleep budget "pull-ups/leakage" line. Consider adding a MOSFET switch (BSS138 on low side, U0 GPIO controlled) to reduce to ~0 µA during sleep.
- 100nF filter cap (C1) is critical — provides low-impedance charge reservoir for SAR ADC S/H cap.
- ADC resolution at 10-bit, 3.3V ref: ~3.2 mV/count → ~9.6 mV/count at battery → ~0.010V per cell resolution. Sufficient for NiMH SOC estimation (replaces removed MAX17048 fuel gauge).

### 4.9 PIR Sensors (to STM32U0)

```
PIR #1 (EKMB1303112K) ──── VCC (3.3V), GND, OUT → STM32U0 PA0
PIR #2 (EKMB1303112K) ──── VCC (3.3V), GND, OUT → STM32U0 PA1
```

- 1 µA each in standby
- Digital output, active HIGH on motion
- PIR interrupts go to **STM32U0 only** — U0 aggregates and wakes STM32N6 via PB0 (N6_WAKE)
- Two sensors for wider detection cone (~180° combined)
- 100nF bypass on each VCC pin

### 4.10 Status LEDs

```
PG0/PG1/PG2 ──── LED (anode) ──── R (220Ω) ──── GND
```

- 3× through-hole 3mm LEDs: Green (PG0), Amber (PG1), Red (PG2)
- ~5 mA per LED at 3.3V with 220Ω
- Route to board edge for visibility through enclosure window

### 4.11 PSRAM (APS256XXN-OB9-BG, 32 MB) — CORRECTED March 2026

> **NOTE:** Original BOM listed AP6404L-3SQR — this is only 8MB QSPI SOP-8, completely wrong for this application. Replaced with APS256XXN-OB9-BG (same part as STM32N6570-DK discovery board). 32MB, BGA-24, HexaDeca-SPI x16 DDR at 200 MHz, **1.8V supply**.

| APS256XXN Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| CLK | PSRAM_CLK | STM32N6 PO4 (XSPI1) | Controlled impedance, length-matched |
| CS# | PSRAM_CS | STM32N6 PO0 (XSPI1) | Active LOW |
| DQS0 | PSRAM_DQS0 | STM32N6 PO2 (XSPI1) | |
| DQS1 | PSRAM_DQS1 | STM32N6 PO3 (XSPI1) | |
| D0–D15 | PSRAM_D0–D15 | STM32N6 PP0–PP15 (XSPI1) | 16-bit bus, controlled impedance |
| VDD | VCC_1V8 | **1.8V rail (TPS7A02)** | 100nF × 2 + 10µF bypass. **NOT 3.3V.** |
| VDDQ | VCC_1V8 | **1.8V rail (TPS7A02)** | I/O voltage, must match XSPI1 VDDIO |
| GND | GND | Common ground | |

**Layout critical:** xSPI bus signals must be length-matched within ±2 mm. Route on inner layer with continuous ground plane reference. Target 50Ω single-ended impedance.

**Bandwidth:** 200 MHz DDR × 16 bits = 800 MB/s — more than sufficient for 4K frame buffering (25 MB burst in ~31 µs theoretical, ~100 µs practical).

### 4.12 NOR Flash (W25Q128JV + W25Q256JV)

Both flash ICs share xSPI2 bus with separate chip selects.

| Signal | W25Q128JV (U5, 16 MB) | W25Q256JV (U6, 32 MB) | STM32N6 Pin |
|---|---|---|---|
| CS# | CS1 (active) | CS2 (directly wired to GPIO) | PN1 (CS1), PB8 or similar (CS2) |
| CLK | FLASH_CLK | FLASH_CLK (shared) | PN6 |
| DI/IO0 | FLASH_D0 | FLASH_D0 (shared) | PN2 |
| DO/IO1 | FLASH_D1 | FLASH_D1 (shared) | PN3 |
| WP/IO2 | FLASH_D2 | FLASH_D2 (shared) | PN4 |
| HOLD/IO3 | FLASH_D3 | FLASH_D3 (shared) | PN5 |
| VCC | VCC_3V3 | VCC_3V3 | 100nF bypass each |
| GND | GND | GND | |

**Note:** W25Q128JV and W25Q256JV are standard SPI/Quad SPI, not octo-SPI. xSPI2 runs in quad-SPI mode using D0–D3 only. D4–D7 (PN8–PN11) left unconnected for these parts but footprints available for future octo-SPI NOR upgrade.

### 4.13 µSD Card Slot (Molex 5031821852)

| SD Pin | Net Name | STM32N6 Pin | Notes |
|---|---|---|---|
| CLK | SD_CLK | PC2 (SDMMC2) | |
| CMD | SD_CMD | PC3 (SDMMC2) | 47kΩ pull-up to 3.3V |
| DAT0 | SD_D0 | PC4 (SDMMC2) | |
| DAT1 | SD_D1 | PC5 (SDMMC2) | |
| DAT2 | SD_D2 | PC0 (SDMMC2) | |
| DAT3 | SD_D3 | PE4 (SDMMC2) | |
| VDD | VCC_3V3 | 3.3V rail | 100nF + 10µF bypass, power-gated via FET if needed |
| CD | SD_DETECT | PN12 | Active LOW, 10kΩ pull-up |
| GND | GND | Common ground | |

### 4.14 ESP32-C3-MINI-1U Comms Processor

WiFi + BLE + local UI processor. Handles image offload (WiFi AP), device config (BLE GATT), settings display (OLED), and button input. Connected to STM32N6 via SPI2 for high-bandwidth image streaming (~20 MHz, 25 MB in ~1.6s). BLE and WiFi run sequentially, never simultaneously.

#### STM32N6 ↔ ESP32-C3 Interface

| STM32N6 Pin | Net Name | ESP32-C3 Pin | Notes |
|---|---|---|---|
| PB12 | C3_SPI_NSS | GPIO10 (SPI CS) | SPI2 NSS, active LOW |
| PF2 | C3_SPI_SCK | GPIO5 (SPI CLK) | SPI2 SCK, 20 MHz |
| PD6 | C3_SPI_MISO | GPIO7 (SPI MOSI) | C3 → N6 data |
| PD7 | C3_SPI_MOSI | GPIO6 (SPI MISO) | N6 → C3 data (image chunks) |
| PG7 | C3_PWR_EN | EN pin (via FET) | HIGH = C3 powered. P-FET gate drive. |
| PG8 | C3_READY | GPIO2 | C3 signals N6: ready for data / transfer active |
| PG9 | REED_SW | GPIO19 + N6 (shared) | Magnetic reed switch. Wakes C3 directly, also interrupts N6. |

#### ESP32-C3 Local Peripherals (not connected to N6)

| ESP32-C3 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| GPIO8 | OLED_SDA | SSD1306 I2C SDA | 4.7kΩ pull-up to 3.3V. DNP Rev A. |
| GPIO9 | OLED_SCL | SSD1306 I2C SCL | 4.7kΩ pull-up to 3.3V. DNP Rev A. |
| GPIO3 | BTN_UP | Tactile button (SW2) to GND | 10kΩ pull-up, active LOW. DNP Rev A. |
| GPIO4 | BTN_DOWN | Tactile button (SW3) to GND | 10kΩ pull-up, active LOW. DNP Rev A. |
| GPIO18 | BTN_SELECT | Tactile button (SW4) to GND | 10kΩ pull-up, active LOW. DNP Rev A. |
| GPIO19 | REED_SW | Magnetic reed switch (SW5) to GND | 10kΩ pull-up, active LOW. Shared with N6 PG9. |
| U.FL pad | C3_ANT | u.FL connector (J_C3_ANT) | 50Ω pigtail to 2.4 GHz antenna (internal flex or external SMA) |
| VDD | VCC_3V3 | 3.3V rail (via PG7 power gate) | 500 mA peak for WiFi TX. 100nF + 10µF bypass. |
| GND | GND | Common ground | |

#### ESP32-C3 Power Gate

```
3V3 Rail ───────────────────────────┐
                                     │
                                    R (10kΩ)
                                     │
                 PG7 ──── 10k ──┤ Gate
                    (C3_PWR_EN)      │
                                ┌────┤ Source
                                │    │ SI2301 (Q_C3)
                                │    │ P-FET
                                │    └── Drain ──── C3 VDD (3.3V)
                                │                      │
                                │                   100nF + 10µF
                                │                      │
                                └──────────────────── GND
```

- PG7 HIGH → C3 powered (same gate topology as GPS)
- PG7 LOW → C3 unpowered (zero current in sleep)
- C3 deep sleep (~5 µA) is an alternative to hard power gating for faster wake

**Phase 1 note:** C3 is fully populated but power-gated OFF (`PHASE1_C3_ENABLED = 0`). Configuration uses the same `CONFIG:` command format via two channels: USB serial in the workshop, SMS commands in the field. Both write to `SystemConfig_t` in NOR flash. C3 firmware (BLE GATT, WiFi AP, OLED, buttons) is developed in parallel and enabled for Phase 2.

#### WiFi / BLE Connection Flow (sequential, not simultaneous)

```
Reed switch (magnet) → C3 wakes
  → BLE advertising ON
  → Phone connects via BLE, exchanges WiFi AP credentials
  → BLE STOPS → WiFi AP STARTS
  → Phone joins WiFi AP
  → N6 wakes, reads SD, streams JPEG chunks to C3 via SPI2
  → C3 forwards chunks to phone over WiFi (HTTPS, 64KB buffers)
  → Transfer complete → WiFi stops → C3 sleeps/powers off
```

### 4.15 Expansion Headers (DNP)

| Header | Ref | Pins | Signals | STM32N6 Pins | Notes |
|---|---|---|---|---|---|
| I2C Expansion | J_EXP1 | 4 | SDA, SCL, 3V3, GND | **REMOVED** — I2C3 has no valid pins on VFBGA-264 | Header footprint retained DNP, no MCU connection |
| Trigger Test | J_EXP2 | 3 | TRIG_OUT, 3V3, GND | PG6 (TRIG_OUT) | Test point for trigger output signal. Primary routing via J_BP pins 3-4. |
| UART Expansion | J_EXP3 | 4 | TX, RX, 3V3, GND | PE5 (USART1 TX), PE6 (USART1 RX) | Serial sensor |

### 4.16 Bidirectional Trigger Interface (On-Board)

The camera has a bidirectional trigger interface on the main board. The external connection is routed via J_BP (backpack connector) pins 3-4 to a weatherproof jack on Field Station and Li-ion Solar backpacks. Standard backpack: not connected (feature unlocked by purchasing a Field Station or Li-ion Solar backpack).

Two independent signal paths share J_BP pins 3-4:

**Output path (camera triggers external device):** PG6 drives an on-board TLP291 opto-coupler. Use case: AI detects feral cat → arms a nearby trap, fires a deterrent, opens a gate.

**Input path (external device triggers camera):** Contact closure on J_BP pins 3-4 pulls TRIG_SENSE (STM32U0 PA3) LOW via 100kΩ sense resistor. Use case: cage trap fires → camera wakes, captures photo, sends SMS alert with image.

```
OUTPUT PATH (PG6 → opto-coupler → J_BP):

PG6 (TRIG_OUT) ──── R1 (220Ω) ──── TLP291 LED anode (U_TRIG)
                                          │
                                     TLP291 LED cathode ──── GND

                   TLP291 collector ──┬── J_BP pin 3 (TRIG+)
                                      │
                   TLP291 emitter ────┘── J_BP pin 4 (TRIG_GND)


INPUT PATH (J_BP → sense resistor → U0):

                    3V3 ──── R2 (10kΩ) ──┐
                                          │
J_BP pin 3 ──── R3 (100kΩ) ──────────────┼── TRIG_SENSE (U0 PA3, EXTI)
                                          │
                                     TVS clamp (3.3V, bidirectional)
                                          │
                                         GND
```

The 100kΩ sense resistor (R3) is high enough impedance that it does not load the TLP291 output. The 10kΩ pull-up (R2) holds TRIG_SENSE HIGH when idle. When an external device closes a contact across J_BP pins 3-4, TRIG_SENSE is pulled LOW through the 100kΩ path, generating a falling-edge EXTI on U0 PA3.

#### Signal States

| Opto state | External contact | TRIG_SENSE (U0 PA3) | Meaning |
|---|---|---|---|
| OFF (PG6 LOW) | Open | HIGH (pull-up) | Idle — no trigger activity |
| OFF (PG6 LOW) | Closed | LOW (pulled via 100kΩ) | External device triggered camera |
| ON (PG6 HIGH) | Open | LOW (opto pulls low) | Camera triggered external device |
| ON (PG6 HIGH) | Closed | LOW | Both active (firmware ignores input during output) |

#### Output Mode — AI Trigger

- STM32N6 drives PG6 HIGH on confirmed AI detection (species + confidence above threshold)
- TLP291 opto-coupler provides >3.75kV isolation barrier — external device is completely isolated from camera power
- External device provides its own power; camera provides only a dry contact closure (max 80V/50mA, TLP291 rating)
- Configurable via CONFIG commands:
  - Which species/classes fire the trigger (e.g., "feral cat only")
  - Minimum confidence threshold (default: 0.70)
  - Pulse duration (configurable, default 2 seconds)
  - Dual-camera confirmation: wait for LoRa confirmation from second camera before firing
- Use case: camera positioned overlooking an area, detects target species, arms/activates a nearby trap or deterrent. Latency is not critical — the trigger is a "ready" signal, not a real-time activation.

#### Input Mode — External Wake

- External contact closure (cage trap, gate sensor, manual switch) pulls TRIG_SENSE LOW
- U0 PA3 EXTI wakes STM32U0 → U0 wakes STM32N6 (same path as PIR wake)
- N6 captures burst, runs AI, sends LTE alert with photo
- Use case: cage trap fires → camera wakes, photographs what's inside, sends SMS with thumbnail so operator can check remotely without driving out
- TVS clamp on TRIG_SENSE protects against voltage spikes from long cable runs to external devices

#### Both Modes Simultaneously

The camera can operate in both modes at once. Firmware distinguishes input events from its own output:
- If N6 is awake and driving PG6, it knows TRIG_SENSE LOW is self-caused → ignore
- If N6 is asleep and U0 sees TRIG_SENSE falling edge → external trigger → wake N6

#### Safety

- Opto-isolation on output path: >3.75kV barrier, external device fully isolated
- Input path protected by 100kΩ series resistor + TVS clamp — safe for long field cable runs
- Backpack weatherproof jack includes TVS on field side for additional protection
- This is the "brain" interface — Between 23° provides the intelligence; the external device provides the action

### 4.17 Accelerometer (LIS2DW12, on STM32U0)

Ultra-low-power 3-axis accelerometer for GPS anti-theft wake-on-movement detection. Connected to STM32U0 (not N6) so it operates independently during camera "off" state.

| LIS2DW12 Pin | Net Name | Connected To | Notes |
|---|---|---|---|
| VDD_IO | VCC_3V3 | 3.3V rail | 100nF bypass |
| VDD | VCC_3V3 | 3.3V rail | 100nF bypass |
| GND | GND | Common ground | |
| SDA | ACCEL_SDA | STM32U0 PA8 (I2C1 SDA) | 4.7kΩ pull-up to 3.3V |
| SCL | ACCEL_SCL | STM32U0 PA9 (I2C1 SCL) | 4.7kΩ pull-up to 3.3V |
| INT1 | ACCEL_INT | STM32U0 PA2 (EXTI) | Active HIGH, wake-up interrupt |
| INT2 | — | Not connected | |
| CS | VDD_IO | Tied HIGH (I2C mode) | |
| SDO/SA0 | VDD_IO (float/high) | I2C address = **0x19** (7-bit). **Do NOT tie to GND** — SDO has internal ~20kΩ pull-up; grounding it causes ~180 µA continuous leakage. | |

**Power:** 1.5 µA in low-power wake-up mode (motion detection threshold monitoring). Adds to sleep budget.

**Anti-theft operation (STM32U0 firmware):**
1. User enables "anti-theft" mode via BLE settings
2. Camera enters "off" state — N6 fully power-gated, C3 off
3. U0 stays in standby, LIS2DW12 in low-power wake-up mode
4. On movement detection (INT1 fires):
   - U0 wakes, powers GPS via PB5
   - GPS gets fix (~10-30 seconds with V_BCKP maintained)
   - U0 powers modem (via N6 power-up or direct 3.8V enable)
   - Sends SMS with GPS coordinates: "ALERT: Camera [ID] moved. Lat: xx.xxxx Lon: xx.xxxx"
   - Powers everything back down
5. Also sends once-daily heartbeat position report via RTC wake

**Updated Deep Sleep Budget (anti-theft mode):**

| Component | Current |
|---|---|
| STM32U0 standby | ~2 µA |
| PIR sensors (still powered, but ignored in off mode) | 2 µA |
| LIS2DW12 wake-up mode | ~1.5 µA |
| AP63300 U11 (3.3V, always on) | ~22 µA |
| **Total (anti-theft sleep)** | **~10 µA** |

At 10 µA, 6S2P NiMH (4,000 mAh) = **~400 days** of anti-theft sleep, or **~190 days** including ~2 mAh/day for daily GPS+SMS heartbeat (10 µA sleep + 2 mAh/day active = ~2.24 mAh/day total).

### 4.18 Backpack Interface Connector (J_BP)

The rear of the camera body has a standardised multi-pin connector that mates with all backpack variants. Backpacks click onto the camera rear panel and self-align with this connector.

| J_BP Pin | Signal | Direction | Notes |
|---|---|---|---|
| 1 | BATT+ | Backpack → Camera | Battery positive from backpack caddy |
| 2 | BATT- | Backpack → Camera | Battery return / ground |
| 3 | TRIG_OUT | Camera → Backpack | PG6 via on-board TLP291 opto-coupler. Field Station and Li-ion Solar backpacks route to external weatherproof jack. Standard backpack: NC. |
| 4 | TRIG_GND | Camera → Backpack | Opto-coupler emitter. Isolated from camera GND. |
| 5 | LORA_TX | Camera → Backpack | USART1 TX (PE5). Field Station and Li-ion Solar backpacks route to internal LoRa module slot. |
| 6 | LORA_RX | Backpack → Camera | USART1 RX (PE6). Field Station and Li-ion Solar backpacks route to internal LoRa module slot. |
| 7 | 3V3 | Camera → Backpack | 3.3V for LoRa module power (when present). |
| 8 | GND | Common | Signal ground reference. |

**Connector type:** Spring-loaded pogo pins (camera side) mating with gold-plated pads (backpack side). Self-aligning via enclosure guide rails. IP67 sealed by backpack gasket.

**Backpack detection:** Firmware reads J_BP pin states at boot. If LORA_RX has activity (LoRa module responding to AT probe) → enable LoRa relay mode. If TRIG_OUT line shows load (opto-coupler pull-up present on Field Station or Li-ion Solar) → enable trigger output mode. The camera does not distinguish between backpack types — it only detects which features are present.

### 4.19 Backpack Variants

| Backpack | Contents | Uses J_BP Pins | External Ports |
|---|---|---|---|
| **Standard** | 12 AA NiMH caddy. No charging. Any AA safe. | 1, 2 only (power) | None |
| **Field Station** | 12 AA NiMH caddy + TLP291 routing + LoRa module slot. No charging. Any AA safe. | All 8 | Weatherproof trigger jack (2P), LoRa antenna (SMA) |
| **Li-ion Solar** | Sealed Li-ion pack (3S/4S 18650/21700) + BMS + MPPT solar charge controller + TLP291 routing + LoRa module slot. Output voltage regulated to NiMH range. | All 8 | Weatherproof trigger jack (2P), LoRa antenna (SMA), weatherproof solar panel connector |
| **Extender** | 12 AA NiMH caddy, pass-through. Stacks with Standard or Field Station only (not Li-ion Solar). | 1, 2 (power, additive) | Mates with camera on one side, Standard or Field Station backpack on the other |

**Standard backpack** is cheap — injection-moulded battery caddy with 2 spring contacts. No charge circuitry, so any AA chemistry is safe (NiMH, alkaline, lithium primary). Pre-load AAs in the office, snap-swap in the field in 30 seconds.

**Field Station backpack** replaces the standard back case — same physical form factor, same click-on attachment. Contains:
- 12 AA NiMH caddy (no charge circuitry — any AA chemistry is safe)
- LoRa module slot (RAK4631 or similar, user-installable)
- LoRa antenna port (SMA bulkhead on backpack shell)
- Opto-coupler output routed to weatherproof 2-pin trigger jack

The Field Station is the "trigger + LoRa" backpack with swappable NiMH cells. No solar charging — cells are field-swapped like the Standard backpack.

**Li-ion Solar backpack** is the "set and forget" indefinite deployment option. Sealed unit, no user access to cells. Contains:
- Sealed Li-ion pack (3S or 4S 18650/21700, e.g. Samsung INR21700-50E 5000 mAh/cell)
- BMS with cell balancing, over-charge, over-discharge, over-temperature, and short-circuit protection
- MPPT solar charge controller (e.g. BQ25895 or similar TI part)
- Weatherproof solar panel connector
- LoRa module slot (RAK4631 or similar, user-installable)
- LoRa antenna port (SMA bulkhead on backpack shell)
- Opto-coupler output routed to weatherproof 2-pin trigger jack
- Output voltage regulated to match NiMH range (12.0–16.8V) so camera firmware sees the same voltage window regardless of backpack type. Camera firmware does not need changes.

The sealed design eliminates wrong-battery risk entirely — there are no user-accessible cell slots.

**Extender** stacks between camera body and Standard or Field Station backpacks only (not Li-ion Solar — different voltage architecture). Has matching connectors on both faces (camera-side pogo pads + backpack-side pogo pins). Adds 12 AA capacity. The extender passes through all J_BP signals so Field Station features still work.

### 4.20 Battery Safety

The backpack lineup is designed so that NiMH charging risk is eliminated by architecture, not by firmware detection.

**Standard and Field Station backpacks** have no charge circuitry whatsoever. Any AA chemistry (NiMH, alkaline, lithium primary) can be safely inserted — the backpack only passes battery voltage to the camera. There is no scenario where cells are charged, so wrong-chemistry risk does not apply.

**Li-ion Solar backpack** uses a sealed Li-ion pack with no user-accessible cell slots. The BMS (cell balancing, over-charge, over-discharge, over-temperature, short-circuit protection) is matched to the specific cells at manufacture. There is no way for a user to insert wrong cells. The MPPT solar charge controller charges only through the BMS, which enforces safe charge profiles for the installed Li-ion cells.

**Remaining general guidance:**

1. **Physical keying:** Backpack battery caddies (Standard and Field Station) use a distinct colour and form factor from the Li-ion Solar sealed pack. The Li-ion Solar backpack has no battery door or cell slots — it is a sealed unit. This prevents any confusion between backpack types.

2. **Warning labels:** Li-ion Solar backpack has a permanent label: "SEALED BATTERY — Do not open. No user-serviceable cells." Standard and Field Station backpacks have a label: "ANY AA CELLS — No charging occurs in this backpack."

3. **Voltage regulation (Li-ion Solar only):** The Li-ion Solar backpack regulates its output to the NiMH voltage window (12.0–16.8V). The camera's BATT_ADC reading cannot distinguish backpack type — this is intentional. Camera firmware does not need to know which backpack is attached.

4. **Extender compatibility:** The Extender backpack stacks with Standard or Field Station only. It is physically incompatible with the Li-ion Solar backpack (different mating interface on the battery side) to prevent mixing voltage architectures.

---

## 5. Connectors

| Ref | Type | Pins | Function | Mating |
|---|---|---|---|---|
| J1 | JST PH 2P | 2 | Battery pack (from backpack) | Red=+, Black=– |
| J_BP | 8-pin spring/pogo connector | 8 | Backpack interface | Power, trigger, LoRa UART, GND. See §4.18. |
| J3 | 20-pin header (Phase 1) / Hirose DF12 (Phase 2) | 20 | Modem daughter card | See §4.4. Near board edge. |
| J4 | JST GH 4P (SM04B-GHS-TB) | 4 | IR LED module | VLED, STROBE, ID, GND. Board edge near front panel. |
| J5 | Molex 5031821852 | — | µSD push-push slot | 4-bit SDIO |
| J6 | u.FL | 1 | Cellular antenna (on modem card) | 50Ω coax to SMA bulkhead |
| J7 | u.FL | 1 | GNSS antenna | 50Ω coax to SMA bulkhead or patch |
| J_C3_ANT | u.FL | 1 | WiFi/BLE antenna (ESP32-C3) | 50Ω to internal flex or external SMA. 2.4 GHz. |
| J8 | USB-C 16P | — | USB 2.0 programming / debug / config | 5.1kΩ CC pull-downs. Sealed port in enclosure. |
| J_EXP1 | JST PH 4P | 4 | Expansion I2C (DNP, **no MCU connection** — I2C3 unavailable on VFBGA-264) | SDA, SCL, 3V3, GND |
| J_EXP2 | JST PH 3P | 3 | Trigger test point — PG6 TRIG_OUT signal, 3V3, GND | TRIG_OUT, 3V3, GND |
| J_EXP3 | JST PH 4P | 4 | Expansion UART (DNP) — LoRa module via backpack | TX, RX, 3V3, GND |

---

## 6. MIPI CSI-2 Layout Requirements

| Parameter | Value |
|---|---|
| Lanes | 2 data lanes + 1 clock lane (differential pairs) |
| Data rate | Up to 1600 Mbps per lane |
| Impedance | 100Ω differential, 50Ω single-ended |
| Length matching | ±0.1 mm within each differential pair |
| Lane-to-lane skew | ≤ 1 mm |
| Max trace length | 50 mm (sensor to MCU) |
| Routing layer | Inner layer (Layer 2 or 3) with continuous ground reference |
| Keepout | 0.2 mm clearance from other signals |
| Ground plane | Unbroken under all CSI-2 traces |
| Via transitions | Avoid — route on single layer if possible |

Place IMX678 as close to STM32N6 as physically possible. Route CSI-2 traces first, then route everything else around them.

---

## 7. xSPI Layout Requirements

### PSRAM (XSPI1, 16-bit bus)

| Parameter | Value |
|---|---|
| Data width | 16-bit (D0–D15) |
| Impedance | 50Ω single-ended |
| Length matching | ±2 mm across all data lines, DQS, CLK |
| Max trace length | 30 mm |
| Routing layer | Inner layer with continuous ground reference |
| Decoupling | 100nF × 2 at PSRAM VDD, placed within 3 mm |

### NOR Flash (XSPI2, quad SPI)

| Parameter | Value |
|---|---|
| Data width | 4-bit (Quad SPI mode) |
| Impedance | Not critical at Quad SPI speeds (up to 133 MHz) |
| Trace matching | ±5 mm acceptable for Quad SPI |
| Max trace length | 50 mm |

---

## 8. Antenna Placement

### Cellular (on modem daughter card — J6 u.FL)
- u.FL on daughter card top edge, pigtail to SMA bulkhead on enclosure
- Daughter card carries its own PI matching network
- Keep 15 mm ground clearance around SMA bulkhead inside enclosure
- Band 28 (700 MHz) + Band 7 (2600 MHz)

### GNSS (u-blox M10 — J7 u.FL)
- u.FL on main board near M10 module
- Route 50Ω trace from M10 RF_IN pad to u.FL connector
- External ceramic patch antenna (25×25mm) via pigtail to SMA bulkhead
- Opposite side of board from cellular antenna if possible
- Keep away from switching regulators and high-speed digital (xSPI, MIPI)

### WiFi / BLE (ESP32-C3 — J_C3_ANT u.FL)
- u.FL on main board near ESP32-C3 module
- Short 50Ω pigtail to antenna (internal or external, TBD by enclosure)
- **Polycarbonate enclosure:** Internal 2.4 GHz flex PCB antenna behind enclosure wall (RF-transparent at 2.4 GHz)
- **Stainless enclosure:** External SMA stub through bulkhead, or internal behind polycarbonate RF window
- Keep 10 mm clearance from cellular and GNSS antennas
- 2.4 GHz only (WiFi 4 + BLE 5.0), short range (10-20 m to phone)

---

## 9. Decoupling & Bypass Capacitors

| Location | Capacitor | Package | Notes |
|---|---|---|---|
| STM32N6 VDD (each pin) | 100nF | 0402 | Place as close as possible |
| STM32N6 VDD (bulk) | 10µF × 2 | 0805 | Near BGA |
| STM32N6 VDDIO (each bank) | 100nF | 0402 | At each I/O bank |
| STM32U0 VDD | 100nF + 10µF | 0402/0805 | At MCU |
| IMX678 AVDD (3.3V) | 100nF + 10µF | 0402/0805 | Clean analog supply. Fed from 3.3V rail via ferrite bead + LC filter. |
| IMX678 DVDD (1.1V) | 100nF + 10µF | 0402/0805 | Digital core. TPS62088 output adjusted to 1.1V. |
| IMX678 DOVDD (1.8V) | 100nF | 0402 | Digital I/O |
| PSRAM VDD | 100nF × 2 + 10µF | 0402/0805 | At BGA |
| NOR Flash (each) VCC | 100nF | 0402 | At SOIC-8 pin |
| Modem VBAT (on daughter card) | 100µF electrolytic + 10µF ceramic + 100nF | Various | TX burst reservoir |
| u-blox M10 VCC | 100nF + 10µF | 0402/0805 | At module |
| ~~MAX17048 VDD~~ | REMOVED | — | Fuel gauge removed — incompatible with multi-cell NiMH. SOC via ADC. |
| SD card VDD | 100nF + 10µF | 0402/0805 | At slot |
| ESP32-C3 VDD | 100nF + 10µF | 0402/0805 | At module, after power gate FET |
| TPS62088 input/output | Per datasheet | 0805 | Follow TI reference design |
| AP63300 U11 input/output | Per datasheet | 0805 | Follow Diodes Inc reference design |
| TPS7A02 input/output | 1µF + 1µF | 0402 | Ultra-low noise LDO |
| AP63300 input/output | Per datasheet | 0805 | Follow Diodes reference design |

---

## 10. ESD Protection

| Net | Protection | Notes |
|---|---|---|
| USB-C D+/D– | USBLC6-2SC6 (U_USB) | Required |
| SIM lines (on daughter card) | TPD3E001DRLR | On daughter card, covers DATA/CLK/RST |
| SD card DAT lines | ESD5V3S4 or equivalent | 4-channel TVS, optional for prototype |
| MIPI CSI-2 lanes | — | Internal to MCU/sensor D-PHY ESD |
| LED module STROBE | Series 100Ω | Limits inrush on cable connect |
| Expansion digital input | TVS 3.3V clamp | On EXP_DIGITAL_1 (may be field-wired to Trap Monitor, or trigger output via backpack) |
| Backpack trigger output | TVS bidirectional | On Field Station and Li-ion Solar backpacks, field side of opto-coupler routing. Protects against inductive load kickback. |

---

## 11. Ground Plane Rules

**4-layer stackup:**

| Layer | Purpose |
|---|---|
| L1 (Top) | Components, short signal connections, power fills |
| L2 (Inner 1) | **Continuous ground plane** — primary reference for MIPI CSI-2 and xSPI |
| L3 (Inner 2) | Power planes (1.2V, 1.8V, 3.3V, 3.8V, 5V) |
| L4 (Bottom) | Components, signals, ground fill |

Rules:
- **Do NOT split ground plane on L2** — keep it continuous under all high-speed signals
- Separate analog ground island under IMX678 area (L1/L4), connected to main ground at single point via L2
- Ground stitching vias every 3–5 mm around board edges and between signal routing channels
- Star ground point near STM32N6 GND balls
- Keep switching regulator return currents away from analog sensor area

---

## 12. Board Layout — Placement Priority

```
    ┌──────────────────────────────────────────────────────────────────┐
    │ ○                                                            ○ │  ← M3 mounting holes
    │                                                                │
    │  [IMX678 Sensor]    [STM32N6 BGA]        [PSRAM BGA]           │
    │                         │                                      │
    │                    (MIPI CSI-2)         (xSPI1 bus)            │
    │                                                                │
    │  [M12 Lens Mount]                    [NOR Flash ×2]            │
    │                                        (xSPI2)                 │
    │                                                                │
    │  [JST GH LED Module]    [STM32U0]       [µSD Card Slot]       │
    │                                                                │
    │  [SMA Cell Ant]    [20-pin Modem Card]   [SMA GNSS Ant]       │
    │                                                                │
    │  [u-blox M10 GPS]          [Power Regulators]                  │
    │                              TPS62088 ×2, TPS7A02, AP63300 ×3,     │
    │                              AP63300, 5V buck                   │
    │                                                                │
    │  [ESP32-C3]  [OLED DNP]    [SW2-4 DNP]  [SW5 Reed]            │
    │  (u.FL WiFi/BLE ant)                                           │
    │                                                                │
    │  [USB-C]  [J1 Batt]                                           │
    │                                                                │
    │  ● ● ●   [J_EXP1] [J_EXP2] [J_EXP3]                          │
    │  G A R                                                         │  ← LEDs + Expansion
    │                                                                │
    │ ○                                                            ○ │  ← M3 mounting holes
    └──────────────────────────────────────────────────────────────────┘
              ~90mm × ~70mm
```

### Placement Priorities (in order):
1. **IMX678 + STM32N6** — closest possible, MIPI CSI-2 traces first
2. **PSRAM** — adjacent to STM32N6, xSPI1 bus length-matched
3. **NOR Flash** — near STM32N6, xSPI2 bus
4. **Modem daughter card connector** — near board edge for antenna routing
5. **u-blox M10 GPS** — opposite side from modem card (antenna separation)
6. **STM32U0** — near PIR connectors and STM32N6 (short SPI bus)
7. **Power regulators** — near battery connector, away from sensor/high-speed area
8. **LED module JST GH** — board edge nearest enclosure front panel
9. **µSD card slot** — accessible for card swap
10. **USB-C** — board edge, accessible through sealed enclosure port
11. **Expansion headers** — board edge, grouped, DNP

---

## 13. Test Points

| TP | Net | Purpose |
|---|---|---|
| TP1 | VCC_1V2 | Verify 1.2V STM32N6 core rail |
| TP2 | VCC_1V8 | Verify 1.8V sensor analog rail |
| TP3 | VCC_3V3 | Verify 3.3V digital rail |
| TP4 | MODEM_VCC | Verify 3.8V modem supply |
| TP5 | VLED_5V | Verify 5V LED module rail |
| TP6 | BATT_SENSE | Verify battery ADC reading |
| TP7 | GND | Ground reference |
| TP8 | MODEM_TX | Debug modem UART (PC10) |
| TP9 | MODEM_RX | Debug modem UART (PC11) |
| TP10 | GPS_TX | Debug GPS UART (PD8) |
| TP11 | GPS_RX | Debug GPS UART (PD9) |
| TP12 | GPS_VCC | Verify GPS power gate output |
| TP13 | LED_STROBE | Verify strobe signal (PA8) |
| TP14 | U0_WAKE | Verify inter-MCU wake signal |
| TP15 | SENSOR_MCLK | Verify 24 MHz external oscillator output to IMX678 |
| TP16 | C3_SPI_SCK | Debug ESP32-C3 SPI bus (PF2) |
| TP17 | C3_PWR_EN | Verify ESP32-C3 power gate (PG7) |
| TP18 | ACCEL_INT | Verify accelerometer wake interrupt (U0 PA2) |
| TP19 | LORA_TX | Verify LoRa UART TX (PE5, via J_BP pin 5) |

Add SWD debug access for both MCUs:
- STM32N6: Tag-Connect TC2030 or 10-pin 1.27mm SWD header (SWCLK, SWDIO, SWO, NRST, VDD, GND)
- STM32U0: Separate 4-pin SWD header (SWCLK, SWDIO, NRST, GND)

---

## 14. Design Constraints

| Parameter | Value |
|---|---|
| Min trace width (signal) | 0.1 mm (4 mil) |
| Min trace width (power 3.3V) | 0.3 mm (12 mil) |
| Min trace width (power 1.2V/1.8V) | 0.2 mm (8 mil) |
| Min trace width (VBAT to modem) | 0.5 mm (20 mil) — 3A peak |
| Min trace width (battery input) | 0.5 mm (20 mil) |
| Min trace width (5V LED rail) | 0.5 mm (20 mil) — 2A |
| MIPI CSI-2 differential pairs | 100Ω diff impedance, calc for stackup |
| xSPI1 traces | 50Ω single-ended impedance |
| RF traces (antenna) | 50Ω controlled impedance |
| Via size | 0.2 mm drill, 0.45 mm pad (BGA fan-out) |
| Via size (power) | 0.3 mm drill, 0.6 mm pad |
| Clearance (signal-signal) | 0.1 mm (4 mil) |
| Clearance (high-voltage battery) | 0.3 mm minimum |
| I2C trace length matching | SDA/SCL within 5 mm |
| MIPI pair matching | Within 0.1 mm (see §6) |
| xSPI1 matching | Within 2 mm (see §7) |

---

## 15. Tropical / Production Hardening Checklist

Items below are **not required for Phase 1 prototype** but should be addressed before field deployment.

### 15.1 Moisture & Corrosion
- [ ] Conformal coating (HumiSeal 1B73 or Dow Corning 1-2577). Mask off connectors, u.FL, SIM, USB-C, SD slot, test points.
- [ ] Gore PolyVent pressure vent on enclosure. Prevents condensation from thermal cycling.
- [ ] Stainless steel or nickel-plated brass for external fasteners.

### 15.2 Thermal
- [ ] 105°C rated electrolytics for modem VBAT bulk cap and regulator output caps.
- [ ] Thermal pad / copper pour under TPS62088 and AP63300 for heat spreading.
- [ ] NTC thermistor on Li-ion Solar battery pack wired to BMS temperature input (charge/discharge temp cutoff).
- [ ] Verify IMX678 junction temperature during 10-frame burst at 50°C ambient.

### 15.3 Surge & Transient Protection
- [ ] TVS diode on solar input in Li-ion Solar backpack (bidirectional, SMBJ18A or equivalent).
- [ ] TVS on expansion digital input (field-wired trigger, may run several metres).
- [ ] Battery reverse polarity protection (P-FET in positive path).

### 15.4 IR Window & Optics
- [ ] Germanium or ZnSe IR window — verify 940nm and 850nm transmission.
- [ ] Anti-reflective coating on window inner surface.
- [ ] M12 lens mount alignment jig for production assembly.

### 15.5 Weatherproofing
- [ ] Self-amalgamating tape on all SMA-to-u.FL pigtail connections.
- [ ] UV-resistant cable for antenna pigtails and external wiring.
- [ ] Python strap slot test — verify mount holds at Cyclone C/D wind loading.
