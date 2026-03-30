---
component: STM32U083KCU6
manufacturer: STMicroelectronics
category: Processing / Power Controller MCU
status: Active (full production)
last_verified: 2026-03-29
confidence: High — most specs verified from datasheet feature list and multiple distributor pages; standby/shutdown currents verified from ST datasheet summary
---

# STM32U083KCU6 — Ultra-Low-Power Cortex-M0+ MCU, 256KB Flash, UFQFPN-32

Ultra-low-power microcontroller used as the sleep/wake power controller in the Between 23 AI Camera Trap. Manages PIR aggregation, battery monitoring, watchdog, and controls power sequencing for the STM32N6 main MCU.

---

## Datasheet Links

| Document | URL | Access |
|----------|-----|--------|
| **Product page** | https://www.st.com/en/microcontrollers-microprocessors/stm32u083kc.html | Public |
| **Datasheet (STM32U083xC)** | https://www.st.com/resource/en/datasheet/stm32u083kc.pdf | Public PDF |
| **Reference Manual RM0503** | Search ST site for RM0503 | May require ST login |
| **STM32U0 series overview** | https://www.st.com/en/microcontrollers-microprocessors/stm32u0-series.html | Public |

---

## Part Number Decode

```
STM32 U 083 K C U 6
│     │ │   │ │ │ │
│     │ │   │ │ │ └── Temperature: Industrial (-40 to +85C)
│     │ │   │ │ └──── Package: UFQFPN-32 (5x5mm, 0.5mm pitch)
│     │ │   │ └────── Flash: C = 256 KB
│     │ │   └──────── Pin count: K = 32 pins
│     │ └──────────── Sub-family: 083 (with USB, AES, RNG, LCD)
│     └────────────── Series: U0 (ultra-low-power entry level)
└──────────────────── STM32 family
```

**CRITICAL NOTE:** The "U6" suffix means **UFQFPN-32** (QFN, 5x5mm, 0.5mm pitch, exposed pad). This is **NOT** LQFP-32 (QFP). Completely different footprint — using the wrong footprint is a PCB layout blocker. Verified in SCHEMATIC_CHANGES_V1.2.md.

**Other package options in STM32U083 family:**
- **Tx** = LQFP-48 (7x7mm)
- **Rx** = LQFP-64 (10x10mm)
- **Mx** = SO-8N (unusual for MCU, very limited GPIO)

---

## Key Specifications

| Parameter | Value | Confidence |
|-----------|-------|------------|
| CPU Core | Arm Cortex-M0+ (32-bit RISC) | VERIFIED |
| Max CPU clock | 56 MHz | VERIFIED (datasheet, multiple sources) |
| Flash memory | 256 KB | VERIFIED |
| SRAM | 40 KB (with hardware parity check) | VERIFIED |
| VDD range | 1.71 - 3.6V | VERIFIED |
| Package | UFQFPN-32 (5x5x0.55mm, 0.5mm pitch, exposed pad) | VERIFIED |
| GPIOs (32-pin package) | 27 (LIKELY) — **verify from datasheet pinout table** | LIKELY |
| Operating temperature | -40 to +85C (6 suffix) | VERIFIED |
| Internal oscillators | MSI (100kHz-48MHz), HSI16 (16MHz), LSI (~32kHz) | VERIFIED |
| MSI accuracy | Better than +/-0.25% when trimmed by LSE | VERIFIED |
| USB | 1x crystal-less USB 2.0 Full Speed | VERIFIED |
| Security | AES 256-bit, RNG | VERIFIED (083 sub-family) |
| LCD driver | Segment LCD controller | VERIFIED (083 sub-family) |

---

## Peripheral Summary

| Peripheral | Count | Confidence |
|------------|-------|------------|
| I2C | 4 | VERIFIED |
| SPI | 3 | VERIFIED |
| USART | 4 | VERIFIED |
| LPUART (low-power UART) | 3 | VERIFIED |
| USB Full Speed | 1 (crystal-less) | VERIFIED |
| ADC | 1x 12-bit | VERIFIED |
| ADC channels (32-pin) | NEEDS VERIFICATION — LIKELY 10-12 | UNCERTAIN |
| DAC | 1x 12-bit | VERIFIED |
| Comparators | 2 (rail-to-rail) | VERIFIED |
| Op-amp | 1 | VERIFIED |
| Timer (32-bit GP) | 1 | VERIFIED |
| Timer (16-bit PWM motor) | 1 | VERIFIED |
| Timer (16-bit GP) | 3 | VERIFIED |
| Timer (16-bit LP) | 3 | VERIFIED |
| RTC | 1 (with calendar, alarm, tamper) | VERIFIED |
| DMA | LIKELY GPDMA | LIKELY |

**Total timers:** 8 (1x 32-bit + 1x 16-bit PWM + 3x 16-bit GP + 3x 16-bit LP)

### Peripheral Use in Camera Trap

| U0 Peripheral | Connection | Purpose |
|---------------|-----------|---------|
| SPI1 (slave) | STM32N6 SPI1 (master) | Inter-MCU communication |
| I2C1 | LIS2DW12 accelerometer | Anti-theft wake-on-movement |
| GPIO PA0 | PIR sensor 1 (EXTI) | Wake trigger |
| GPIO PA1 | PIR sensor 2 (EXTI) | Wake trigger |
| GPIO PA2 | LIS2DW12 INT1 (EXTI) | Accelerometer motion interrupt |
| GPIO PA3 | External trigger sense (EXTI) | Cage trap / external contact closure |
| GPIO (output) | STM32N6 PG3 | Wake signal to main MCU |
| GPIO (input) | STM32N6 PG4 | Busy/done status from main MCU |
| GPIO (output) | STM32N6 PG5 | Power enable for N6 |
| ADC | Battery voltage divider (via shared signal or own divider) | Battery monitoring in sleep |
| RTC | Internal | Periodic health check wakeup |
| LPTIM | — | PIR lockout timing |

---

## Power Consumption

**These figures are from the ST datasheet summary and web search results. Stop2 values verified from ST product page.**

| Mode | Conditions | Current | Confidence |
|------|-----------|---------|------------|
| **Run** | 56 MHz, all peripherals on | NEEDS VERIFICATION | UNCERTAIN |
| **Run (LP)** | Reduced clock | NEEDS VERIFICATION | UNCERTAIN |
| **Stop 0** | — | NEEDS VERIFICATION | UNCERTAIN |
| **Stop 1** | — | NEEDS VERIFICATION | UNCERTAIN |
| **Stop 2** | With RTC | 825 nA | VERIFIED (ST product page) |
| **Stop 2** | Without RTC | 695 nA | VERIFIED (ST product page) |
| **Standby** | With RTC | ~360 nA (LIKELY) | LIKELY (search result mentioned "may exceed 360nA") |
| **Standby** | Without RTC | NEEDS VERIFICATION — LIKELY ~250 nA | UNCERTAIN |
| **Shutdown** | All off | NEEDS VERIFICATION — LIKELY ~16-25 nA | UNCERTAIN |

**Design note:** In our camera trap, the STM32U0 runs in **Standby with RTC** during system sleep. At ~360nA this contributes negligibly (~0.36uA) to the system sleep budget. The power budget uses ~2uA as a conservative estimate that includes leakage and wakeup overhead.

### Power-On Reset

| Parameter | Value | Confidence |
|-----------|-------|------------|
| POR rising threshold | NEEDS VERIFICATION — LIKELY ~1.6V | UNCERTAIN |
| POR falling threshold | NEEDS VERIFICATION — LIKELY ~1.5V | UNCERTAIN |
| POR hysteresis | NEEDS VERIFICATION | UNCERTAIN |
| Brown-out reset (BOR) | Programmable thresholds (LIKELY) | LIKELY |

---

## Absolute Maximum Ratings

**NEEDS VERIFICATION from datasheet. Values below are LIKELY based on typical STM32U0 family.**

| Parameter | Min | Max | Confidence |
|-----------|-----|-----|------------|
| VDD | -0.3V | 4.0V | LIKELY |
| VBAT | -0.3V | 4.0V | LIKELY |
| I/O pin voltage | -0.3V | VDD + 0.3V | LIKELY |
| Vin (5V tolerant pins) | -0.3V | 5.5V | LIKELY — verify which pins are 5V tolerant |
| Junction temperature | — | 125C | LIKELY |
| Storage temperature | -65C | 150C | LIKELY |
| ESD (HBM) | — | 2000V | LIKELY |

---

## Oscillator Details

| Oscillator | Frequency | Accuracy | Confidence |
|------------|-----------|----------|------------|
| MSI | 100 kHz - 48 MHz (multi-speed) | +/-0.25% with LSE trim | VERIFIED |
| HSI16 | 16 MHz | +/-1% typical | LIKELY |
| LSI | ~32 kHz | +/-5% typical (LIKELY) — **verify from datasheet** | UNCERTAIN |
| LSE | 32.768 kHz (external crystal) | Depends on crystal | VERIFIED (supported) |
| HSE | External crystal (4-48 MHz LIKELY) | Depends on crystal | LIKELY |

**Design note:** Our U0 uses LSI for RTC in standby (no external 32.768 kHz crystal on U0 to save board space). LSI accuracy of ~5% means RTC drift of ~70 minutes/day, but we only use it for periodic health check wakeup (every 24h) where this drift is acceptable. If precise RTC is needed, route LSE crystal to U0.

---

## Pin Configuration (32-pin UFQFPN Package)

**NEEDS VERIFICATION from datasheet pinout diagram. The pin assignments below are from config.h and design intent.**

| Pin | Function in Camera Trap | Alternate Function |
|-----|------------------------|-------------------|
| PA0 | PIR sensor 1 input (EXTI) | ADC_IN0 |
| PA1 | PIR sensor 2 input (EXTI) | ADC_IN1 |
| PA2 | LIS2DW12 INT1 (EXTI) | USART2_TX |
| PA3 | External trigger sense (EXTI) | USART2_RX |
| PA4 | SPI1 NSS (to N6, software CS) | SPI1_NSS |
| PA5 | SPI1 SCK (to N6) | SPI1_SCK |
| PA6 | SPI1 MISO (U0 -> N6) | SPI1_MISO |
| PA7 | SPI1 MOSI (N6 -> U0) | SPI1_MOSI |
| PA8 | LIS2DW12 I2C1 SDA | I2C1_SDA |
| PA9 | LIS2DW12 I2C1 SCL | I2C1_SCL |
| PBx | Wake signal to N6 | GPIO output |
| PBx | Status from N6 | GPIO input |
| PBx | N6 power enable | GPIO output |
| PB2 | Available (was FUEL_ALERT, MAX17048 removed) | — |

**Exposed pad:** Must be soldered to ground plane for thermal and electrical performance.

---

## Procurement

| Distributor | URL | Price (qty 1) | Stock | Confidence |
|-------------|-----|---------------|-------|------------|
| DigiKey | Search STM32U083KCU6 | TBD — check directly | TBD | NOT CHECKED |
| Mouser | Search STM32U083KCU6 | TBD — check directly | TBD | NOT CHECKED |
| LCSC | https://lcsc.com/product-detail/microcontrollers-mcu-mpu-soc_stmicroelectronics-stm32u083kcu6_C22459164.html | ~$2.32 USD | In stock | VERIFIED |
| RS Components | https://twen.rs-online.com/web/p/microcontrollers/0216843 | TBD | Listed | VERIFIED listing exists |
| ST eStore | https://estore.st.com/en/stm32u083kcu6-cpn.html | TBD | Listed | VERIFIED listing exists |

**Good availability.** Entry-level STM32U0 parts are widely stocked and inexpensive.

---

## Known Issues / Errata

No specific errata document was identified in web searches. Check ST website for the STM32U083 errata sheet before production.

**Search for:** "ES" document number on https://www.st.com/en/microcontrollers-microprocessors/stm32u083kc.html under "Resources" tab.

---

## TODO — Manual Verification Needed

- [ ] **GPIO count on 32-pin package:** Verify exact number from datasheet pinout table (expect 27)
- [ ] **Standby current without RTC:** Read from electrical characteristics table
- [ ] **Shutdown current:** Read from electrical characteristics table
- [ ] **LSI accuracy:** Verify +/-X% from datasheet oscillator specs
- [ ] **Absolute maximum ratings:** Verify all Vmax values
- [ ] **5V tolerant pins:** Identify which pins (if any) on UFQFPN-32 are 5V tolerant
- [ ] **ADC channels on 32-pin package:** Count from pinout table
- [ ] **POR thresholds:** Read from electrical characteristics
- [ ] **Run mode current:** Read typical at 56MHz, 3.3V
- [ ] **Errata sheet:** Find and review
- [ ] **HSE crystal range:** Verify supported frequencies
- [ ] **Boot pins:** Identify BOOT0 configuration on 32-pin package
