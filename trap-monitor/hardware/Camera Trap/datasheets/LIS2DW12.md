---
component: LIS2DW12TR
manufacturer: STMicroelectronics
category: Sensor — 3-Axis MEMS Accelerometer
status: Active (full production)
last_verified: 2026-03-28
confidence: HIGH for core specs (voltage, I2C address, temperature, full-scale) from ST product pages and community posts. HIGH for SDO pull-up leakage issue from multiple ST community confirmations. LIKELY for exact register bit definitions and current consumption values — verify against datasheet Rev 3 (or later) before firmware development.
---

# LIS2DW12 — Ultra-Low-Power 3-Axis Accelerometer

## Datasheet Links

- Product page: https://www.st.com/en/mems-and-sensors/lis2dw12.html
- Datasheet PDF: https://www.st.com/resource/en/datasheet/lis2dw12.pdf
- Application note AN5038: https://www.st.com/resource/en/application_note/an5038-lis2dw12-alwayson-3axis-accelerometer-stmicroelectronics.pdf
- Design tip DT0098 (wake-up recognition): https://www.st.com/resource/en/design_tip/dt0098-setting-up-wakeup-recognition-and-absoluterelative-references-with-sts-mems-accelerometers-stmicroelectronics.pdf
- ST driver examples: https://github.com/STMicroelectronics/STMems_Standard_C_drivers/tree/master/lis2dw12_STdC/examples

## Key Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Axes | 3 (X, Y, Z) | |
| Full-scale ranges | +/-2g, +/-4g, +/-8g, +/-16g | User-selectable |
| Output data rate (ODR) | 1.6 Hz to 1600 Hz | 12.5/25/50/100/200/400/800/1600 Hz + 1.6 Hz LP |
| Supply voltage (VDD) | 1.62V to 3.6V | |
| Supply voltage (VDD_IO) | 1.62V to 3.6V | Separate I/O supply, can be different from VDD |
| I2C address (SDO/SA0 = LOW) | 0x18 (7-bit) | **Avoid — causes 165+ uA leakage** |
| I2C address (SDO/SA0 = HIGH or float) | 0x19 (7-bit) | **Use this — SDO has internal pull-up** |
| SPI support | Yes (4-wire, 3-wire) | Up to 10 MHz |
| WHO_AM_I register value | 0x44 | At register address 0x0F |
| Operating temperature | -40C to +85C | Industrial grade |
| Package | LGA-12 | 2.0 x 2.0 x 0.7 mm |
| Noise density (LP Mode 1) | ~3.5 mg/sqrt(Hz) | VERIFY — noise varies by mode and ODR |
| Noise density (High-Performance) | ~0.9 mg/sqrt(Hz) | VERIFY from datasheet |
| Self-test output change | +/-70 to +/-1500 mg | VERIFY exact range from datasheet |

## Current Consumption

| Mode | ODR | Current (typical) | Notes |
|------|-----|--------------------|-------|
| Power-down | - | 0.05 uA | All outputs disabled |
| LP Mode 1 (12-bit) | 1.6 Hz | 0.38 uA | **Lowest active power** |
| LP Mode 1 (12-bit) | 12.5 Hz | 0.5 uA | VERIFY exact value |
| LP Mode 1 (12-bit) | 25 Hz | 0.7 uA | VERIFY exact value |
| LP Mode 2 (14-bit) | 12.5 Hz | 0.65 uA | VERIFY exact value |
| LP Mode 3 (14-bit) | 12.5 Hz | 1.0 uA | VERIFY exact value |
| LP Mode 4 (14-bit) | 12.5 Hz | 1.25 uA | VERIFY exact value |
| High-Performance (14-bit) | 12.5 Hz | ~15 uA | VERIFY — significantly higher |
| Sleep-to-wake (activity detect) | 12.5 Hz | ~0.5 uA | LP Mode 1 with SLEEP_ON enabled |

**For this design (anti-theft wake-on-motion):** Sleep-to-wake mode at 12.5 Hz in LP Mode 1. Expected current ~0.5 uA. When motion exceeds threshold, device wakes to higher ODR and asserts INT1.

## Absolute Maximum Ratings

| Parameter | Value | Notes |
|-----------|-------|-------|
| VDD | 4.8V | VERIFY from datasheet |
| VDD_IO | 4.8V | VERIFY from datasheet |
| Acceleration (any axis) | 10,000 g | For 0.1 ms, non-repetitive |
| ESD (HBM) | 2 kV | VERIFY |
| Operating temperature | -40C to +85C | |
| Storage temperature | -40C to +125C | VERIFY |

**WARNING: Absolute maximum ratings are partially from training data. Verify against the ST LIS2DW12 datasheet before design sign-off.**

## Pin Configuration

**Package: LGA-12, 2.0 x 2.0 x 0.7 mm, bottom view**

```
        ┌─────────────┐
    12  │ VDD_IO      │  7   INT2
    11  │ GND         │  8   GND
    10  │ CS          │  9   SDO/SA0
     ─  │             │  ─
     1  │ SCL/SPC     │  6   INT1
     2  │ GND (EP)    │  5   GND
     3  │ SDA/SDI/SDO │  4   VDD
        └─────────────┘
```

**VERIFY this pinout against the LIS2DW12 datasheet. Pin numbering for LGA-12 packages can vary between datasheets.**

| Pin | Name | Function | This Design |
|-----|------|----------|-------------|
| 1 | SCL/SPC | I2C clock / SPI clock | U0 PA9 (I2C1 SCL) |
| 2 | GND | Ground (exposed pad) | GND |
| 3 | SDA/SDI/SDO | I2C data / SPI data in | U0 PA8 (I2C1 SDA) |
| 4 | VDD | Supply voltage | 3.3V rail |
| 5 | GND | Ground | GND |
| 6 | INT1 | Interrupt output 1 | U0 PA2 (EXTI, wake-on-motion) |
| 7 | INT2 | Interrupt output 2 | Not connected (NC) |
| 8 | GND | Ground | GND |
| 9 | SDO/SA0 | I2C address select / SPI data out | **Float (internal pull-up to VDD)** |
| 10 | CS | SPI chip select (active LOW) | **Tied to VDD (selects I2C mode)** |
| 11 | GND | Ground | GND |
| 12 | VDD_IO | I/O supply voltage | 3.3V rail (same as VDD) |

## SDO/SA0 Internal Pull-Up — CRITICAL DESIGN NOTE

The SDO/SA0 pin has an **internal pull-up resistor (~20 kohm to VDD)** that **cannot be disabled**.

### Leakage when SDO grounded

If SDO is tied to GND to select address 0x18:
```
Leakage current = VDD / R_pullup = 3.3V / 20k = 165 uA
```

This is **catastrophic for a battery-powered design** — it would dominate the entire sleep budget.

### Solution (used in this design)

**Leave SDO/SA0 floating.** The internal pull-up pulls it to VDD, selecting I2C address **0x19**. No leakage path.

This is confirmed by multiple ST community threads:
- https://community.st.com/t5/mems-sensors/lis2dw12-vdd-io-current-way-too-high/td-p/210831
- https://community.st.com/t5/mems-sensors/i2c-address-selection-leakage-current-with-2-x-lis2dw12-on-one/td-p/660933

**BOM.csv notes:** "I2C addr 0x19 (SDO floating/high — avoids ~180 uA leakage if SDO tied to GND)"

## Wake-on-Motion Configuration

### Key Registers

| Register | Address | Purpose |
|----------|---------|---------|
| WHO_AM_I | 0x0F | Device identification (reads 0x44) |
| CTRL1 | 0x20 | ODR, mode, LP mode selection |
| CTRL2 | 0x21 | Boot, soft reset, CS/I2C config |
| CTRL3 | 0x22 | Self-test, **H_LACTIVE** (INT polarity), SIM, PP_OD, SLP_MODE_SEL |
| CTRL4_INT1_PAD_CTRL | 0x23 | INT1 routing (wake-up, free-fall, tap, 6D, DRDY) |
| CTRL5_INT2_PAD_CTRL | 0x24 | INT2 routing |
| CTRL6 | 0x25 | Bandwidth, full-scale, low-noise |
| CTRL7 | 0x3F | Interrupt enable, INT routing, user offset |
| WAKE_UP_THS | 0x34 | Wake-up threshold (WK_THS[5:0]) + SLEEP_ON + SINGLE_DOUBLE_TAP |
| WAKE_UP_DUR | 0x35 | Wake-up duration (WAKE_DUR[1:0]) + sleep duration + timer resolution |
| STATUS | 0x27 | Data ready, wake-up, sleep state flags |

### Wake-Up Threshold (WK_THS)

The WK_THS[5:0] field is **6 bits wide** (values 0-63). The threshold LSB depends on the full-scale setting:

| Full Scale | LSB Value | Threshold Range |
|------------|-----------|-----------------|
| +/-2g | FS/64 = 31.25 mg | 31.25 mg to 1968.75 mg |
| +/-4g | FS/64 = 62.5 mg | 62.5 mg to 3937.5 mg |
| +/-8g | FS/64 = 125 mg | 125 mg to 7875 mg |
| +/-16g | FS/64 = 250 mg | 250 mg to 15750 mg |

**For anti-theft at +/-2g:** WK_THS = 2 gives threshold of 62.5 mg (very sensitive). WK_THS = 4 gives 125 mg (moderate). Tune in field testing.

### INT1 Output Configuration

The INT1 pin polarity is controlled by the **H_LACTIVE bit in CTRL3 (0x22)**:
- H_LACTIVE = 0: INT active HIGH (default)
- H_LACTIVE = 1: INT active LOW

The output driver mode is controlled by **PP_OD bit in CTRL3**:
- PP_OD = 0: Push-pull (default)
- PP_OD = 1: Open-drain

**For this design:** Active HIGH, push-pull (default settings). INT1 connects to U0 PA2 configured as EXTI rising edge.

### Recommended Wake-on-Motion Init Sequence

```c
// 1. Verify device identity
read(0x0F);  // Should return 0x44

// 2. Set low-power mode 1, 12.5 Hz ODR
write(CTRL1, 0x20);  // ODR=12.5Hz, LP_MODE=LP1 — VERIFY bit encoding

// 3. Set full scale +/-2g, low-noise off
write(CTRL6, 0x04);  // FS=+/-2g, BW_FILT=ODR/2, LOW_NOISE=0 — VERIFY

// 4. Set wake-up threshold
write(WAKE_UP_THS, 0x82);  // SLEEP_ON=1, WK_THS=2 (62.5mg) — VERIFY

// 5. Set wake-up duration
write(WAKE_UP_DUR, 0x00);  // 0 = immediate — VERIFY

// 6. Route wake-up to INT1
write(CTRL4_INT1_PAD_CTRL, 0x20);  // INT1_WU=1 — VERIFY bit position

// 7. Enable interrupts
write(CTRL7, 0x20);  // INTERRUPTS_ENABLE=1 — VERIFY bit position
```

**VERIFY all register values against the LIS2DW12 datasheet and AN5038 before firmware implementation. The bit positions above are from training data and may have errors.**

## Power

| State | Current | Notes |
|-------|---------|-------|
| Sleep-to-wake monitoring | ~0.5 uA | LP Mode 1, 12.5 Hz, SLEEP_ON=1 |
| Idle (Phase 1, firmware-disabled) | 0.05 uA | Power-down mode (ODR=0) |
| Active measurement (if needed) | ~15 uA | High-performance mode — not planned for this design |

**Phase 1:** PHASE1_ANTITHEFT_ENABLED = 0 in config.h. Firmware skips I2C init, device stays in power-down (~0.05 uA). The hardware is fully populated.

**Phase 2 (when enabled):** Sleep-to-wake at ~0.5 uA. On motion detection, INT1 wakes U0, which logs event and optionally wakes N6 for photo/alert.

## Application Notes for This Design

1. **I2C bus:** Connected to STM32U0 I2C1 (PA8 = SDA, PA9 = SCL). NOT on the STM32N6 I2C bus. The U0 owns the accelerometer entirely.

2. **I2C address:** 0x19 (SDO floating, internal pull-up). Confirmed in BOM.csv and DESIGN_SPEC.md.

3. **INT1 routing:** INT1 connects to U0 PA2. Configured as EXTI rising edge when anti-theft is enabled.

4. **CS pin:** Tied to VDD to select I2C mode (disables SPI).

5. **SDO pin:** Left floating (NC). Internal pull-up selects address 0x19 and avoids 165 uA leakage.

6. **Phase 1 state:** Device is in power-down mode. config.h PHASE1_ANTITHEFT_ENABLED = 0. U0 firmware does not initialise I2C1 to the accelerometer.

7. **Bypass capacitors:** 100 nF ceramic on VDD and VDD_IO, placed within 2 mm of pins. VERIFY recommended decoupling from datasheet.

8. **I2C pull-ups:** External 4.7 kohm pull-ups to 3.3V on SDA and SCL lines. The LIS2DW12 does not have internal I2C pull-ups on SDA/SCL (only on SDO/CS).

## Procurement

| Source | Part Number | Stock Status | Unit Price (AUD) |
|--------|-------------|--------------|-------------------|
| DigiKey AU | 497-LIS2DW12TR-ND | In stock | ~$1.80 |
| Mouser | 511-LIS2DW12TR | In stock | ~$1.80 |
| LCSC | C189624 | In stock | ~$1.20 |

**Lead time:** Generally in stock at all major distributors. Commodity ST MEMS part.

## Known Issues

1. **SDO leakage (165 uA).** The most critical hardware design issue. SDO must NOT be tied to GND. Leave floating or connect to VDD. This design leaves it floating.

2. **CS and SDO internal pull-ups.** Both CS and SDO/SA0 have internal pull-ups. If using SPI mode, be aware that SDO pull-up is still active and cannot be disabled.

3. **LP Mode 1 resolution.** LP Mode 1 provides only 12-bit data. For anti-theft wake detection this is more than adequate (threshold is 6-bit). Do not use LP1 if high-resolution measurement is needed.

4. **Activity/inactivity current higher than expected.** Multiple ST community reports of higher-than-datasheet current in sleep-to-wake mode. Root cause is usually incorrect register configuration or SDO leakage. With correct setup (SDO floating, LP1, 12.5 Hz, SLEEP_ON=1), measured current should be ~0.5 uA per community reports.

5. **Interrupt latching.** Wake-up interrupts may be latched (require read to clear) depending on LIR bit in CTRL3. For this design, use latched interrupts and clear by reading STATUS register after each wake event.
