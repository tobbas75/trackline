#pragma once

// ═══════════════════════════════════════════════════════════════════════════════
// Between 23° AI Camera Trap — Hardware Pin Definitions & System Constants
// ═══════════════════════════════════════════════════════════════════════════════
//
// TARGET MCU:  STM32N657X0H3Q (Cortex-M55 @ 800MHz, Neural-ART NPU)
// POWER MCU:   STM32U083KCU6 (Cortex-M0+, sleep/wake controller)
// SENSOR:      Sony IMX678 (STARVIS 2, 8MP, MIPI CSI-2)
// MODEM:       Quectel EG800Q-EU (via modem daughter card)
// GPS:         u-blox MAX-M10S (NMEA 9600 baud)
//
// This file is the SINGLE SOURCE OF TRUTH for all GPIO assignments.
// The same firmware binary must run across board revisions.
// Do not change pin assignments without updating the PCB design.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ── Unit Identity ─────────────────────────────────────────────────────────────
#define DEFAULT_UNIT_ID       "CAM_001"
#define FW_VERSION            "0.1.0"

// ── Operating Mode ────────────────────────────────────────────────────────────
// VALIDATION: Store ALL bursts, tag with AI result. For trust-building.
// PRODUCTION: Store confirmed species only. Thumbnail + metadata for rejects.
// RESEARCH:   Store ALL bursts + full AI telemetry for model retraining.
typedef enum {
    MODE_VALIDATION = 0,
    MODE_PRODUCTION = 1,
    MODE_RESEARCH   = 2
} OperatingMode_t;

#define DEFAULT_OPERATING_MODE  MODE_VALIDATION

// ── Phase 1 Feature Flags ───────────────────────────────────────────────────
// All hardware is fully populated on prototype boards.
// Features not needed for Phase 1 field validation are disabled here.
// Phase 1 focus: PIR → capture → AI → modem alert → GPS geotag → sleep.
// Field configuration via SMS commands (same pattern as Trap Monitor).
// Workshop configuration via USB serial (same command format as SMS).
#define PHASE1_C3_ENABLED             0       // 0 = ESP32-C3 power-gated OFF (PG7 LOW)
                                              // Config via USB serial (workshop) or SMS (field)
#define PHASE1_ANTITHEFT_ENABLED      0       // 0 = LIS2DW12 ignored, U0 skips accel I2C init
#define PHASE1_LORA_ENABLED           0       // 0 = LoRa auto-detect disabled (no backpack module)
#define PHASE1_STOP2_ENABLED          0       // 0 = deep sleep only (~8 µA vs ~112 µA STOP2)
#define PHASE1_VIDEO_CLIP_ENABLED     0       // 0 = burst capture only, no MJPEG video
#define PHASE1_SMS_CONFIG             1       // 1 = accept CONFIG: SMS commands via modem
#define PHASE1_USB_CONFIG             1       // 1 = accept CONFIG: commands via USB serial (workshop)

// ── AI Pipeline ───────────────────────────────────────────────────────────────
#define AI_CONFIDENCE_THRESHOLD   0.70f   // Minimum species confidence to flag
#define AI_MEGADETECTOR_THRESHOLD 0.50f   // Minimum MegaDetector animal score
#define BURST_FRAME_COUNT         10      // Frames per trigger burst
#define AI_INFERENCE_FRAMES       3       // Frames to run AI on (2, 5, 8)
#define AI_FRAME_INDICES          {1, 4, 7}  // 0-indexed: frames 2, 5, 8

// ── Capture ───────────────────────────────────────────────────────────────────
#define CAPTURE_DAY_WIDTH         3856    // Full 4K
#define CAPTURE_DAY_HEIGHT        2180
#define CAPTURE_NIGHT_WIDTH       1928    // 2×2 binned
#define CAPTURE_NIGHT_HEIGHT      1090
#define CAPTURE_FPS               10      // Target burst frame rate
#define JPEG_QUALITY_FULL         85      // 4K frames to SD
#define JPEG_QUALITY_THUMBNAIL    60      // AI preview / LTE alert thumbnail
#define THUMBNAIL_WIDTH           640
#define THUMBNAIL_HEIGHT          360

// ── Day/Night Auto-Switching ────────────────────────────────────────────────
// Before each burst, firmware captures a single AE meter frame (no strobe).
// IMX678 gain readback determines day vs night mode for the actual burst.
// Hysteresis prevents mode flapping at dusk/dawn.
#define NIGHT_MODE_AUTO           1       // 1 = auto-detect, 0 = force via config
#define NIGHT_GAIN_THRESHOLD_DB   24.0f   // AE gain above this → night mode
#define DAY_GAIN_THRESHOLD_DB     18.0f   // AE gain below this → day mode (hysteresis)
#define METER_FRAME_EXPOSURE_MS   30      // AE meter frame max integration time

// Per-module night gain presets (analog gain in dB, applied after LED module ID read)
// Day mode: AE runs freely. Night mode: fixed exposure (30ms strobe) + fixed gain below.
#define NIGHT_GAIN_940NM_STD_DB   30.0f   // Higher — 940nm has lower sensor QE
#define NIGHT_GAIN_940NM_LONG_DB  33.0f   // Highest — longer range, less photon flux
#define NIGHT_GAIN_940NM_SLONG_DB 33.0f   // Same as long range (narrower beam compensates)
#define NIGHT_GAIN_850NM_DB       24.0f   // Lower — better sensor response at 850nm
#define NIGHT_GAIN_WHITE_DB       0.0f    // AE handles it (broadband light)
#define NIGHT_GAIN_BLANK_DB       0.0f    // No illumination — AE only (daytime deploy)

// ── Alerts ────────────────────────────────────────────────────────────────────
#define DEFAULT_SMS_NUMBER        "+61400000000"  // Primary alert recipient
#define DEFAULT_MQTT_TOPIC        "wildtrack/events"
#define DEFAULT_MQTT_BROKER       ""              // WildTrack backend URL
#define ALERT_ON_SPECIES          1               // Send LTE alert on confirmed species
#define ALERT_INCLUDE_THUMBNAIL   1               // Attach JPEG thumbnail to alert
#define THUMBNAIL_MAX_BYTES       153600           // 150 KB max for LTE transmission

// ── Timing ────────────────────────────────────────────────────────────────────
#define PIR_LOCKOUT_S             5       // Minimum seconds between triggers
#define HEALTH_CHECK_HOUR         6       // Daily health report (local time)
#define HEALTH_CHECK_MINUTE       0
#define GPS_TIMEOUT_S             300     // 5 min GPS fix timeout
#define MODEM_INIT_TIMEOUT_S      60
#define LOW_BATT_THRESHOLD_PCT    20
#define CRIT_BATT_THRESHOLD_PCT   10

// ── Retry Logic ───────────────────────────────────────────────────────────────
#define ALERT_RETRY_COUNT         3
#define ALERT_RETRY_INTERVAL_S    300     // 5 minutes between retries
#define MODEM_POWER_CYCLES        3       // Before MCU reboot

// ═══════════════════════════════════════════════════════════════════════════════
// HARDWARE PINS — STM32N657X0H3Q
// ═══════════════════════════════════════════════════════════════════════════════
//
// Pin naming convention: P<port><pin> e.g. PA0, PB5, PD12
// Exact STM32N6 pin assignments TBD during schematic — placeholders below
// use logical groupings. Final assignments depend on STM32N6 package pinout
// and CubeMX validation. The SIGNAL NAMES and ACTIVE LEVELS are locked.
//

// ── PIR Sensors (wake source, directly to STM32U0 power controller) ──────────
// PIR interrupts go to STM32U0 first. U0 aggregates and wakes STM32N6.
// STM32U0 pins: PIR_1 = U0_PA0, PIR_2 = U0_PA1
#define PIR_WAKE_FROM_U0_PIN      PG3     // STM32U0 → STM32N6 wake signal (EXTI)

// ── HSE Crystal ─────────────────────────────────────────────────────────────
// 25 MHz crystal on PH0 (OSC_IN) and PH1 (OSC_OUT) — Crystal/Ceramic Resonator mode.
// PH0/PH1 are dedicated to HSE and cannot be used for other functions.

// ── Image Sensor (Sony IMX678, MIPI CSI-2) ───────────────────────────────────
// MIPI CSI-2 lanes connect to STM32N6 dedicated CSI D-PHY pads (not GPIO-muxed)
// No pin assignment needed for CSI-2 data/clock lanes — dedicated analog pads
#define SENSOR_RESET_PIN          PC8     // IMX678 XCLR (active LOW reset)
                                          // MUST be open-drain — PC8 is on VDDIO4 (3.3V),
                                          // sensor XCLR is DOVDD-referenced (1.8V).
                                          // 10kΩ pull-up to 1.8V on PCB.
#define SENSOR_PWDN_PIN           PD2     // IMX678 power-down (active HIGH)
                                          // MUST be open-drain — PD2 is on VDD (3.3V),
                                          // sensor PWDN is DOVDD-referenced (1.8V).
                                          // 10kΩ pull-up to 1.8V on PCB.
                                          // Default float = HIGH (standby). Drive LOW to activate.
// SENSOR_MCLK: External 24 MHz oscillator (e.g. SiT8008) wired directly to
// IMX678 INCK pin. No MCU pin required — RCC_MCO1 has no usable AF on
// VFBGA-264 when HSE crystal occupies PH0/PH1.

// IMX678 control interface (I2C for register configuration)
#define SENSOR_I2C_INSTANCE       1       // I2C1
#define SENSOR_I2C_ADDR           0x1A    // IMX678 7-bit I2C address
#define SENSOR_I2C_SDA_PIN        PC1     // I2C1 SDA (AF4), BSS138 level-shifted (3.3V ↔ 1.8V)
                                          // 4.7kΩ pull-up to 3.3V (MCU side), 4.7kΩ to 1.8V (sensor side)
#define SENSOR_I2C_SCL_PIN        PH9     // I2C1 SCL (AF4), BSS138 level-shifted (3.3V ↔ 1.8V)
                                          // 4.7kΩ pull-up to 3.3V (MCU side), 4.7kΩ to 1.8V (sensor side)

// ── IR LED Module (modular daughter board, 4-pin JST GH) ─────────────────────
#define LED_STROBE_PIN            PA8     // TIM1 CH1 output — strobe signal (AF1)
#define LED_STROBE_TIMER          1       // TIM1 (advanced timer for PWM/strobe)
#define LED_STROBE_CHANNEL        1       // Channel 1
#define LED_MODULE_ID_ADC_PIN     PA0     // ADC input — reads module ID resistor
#define LED_MODULE_ID_ADC_CHAN     0       // ADC1 channel 0
#define LED_5V_EN_PIN             PB6     // 5V VLED buck/boost enable (HIGH = on)

// Strobe timing (matched to sensor exposure)
#define STROBE_PULSE_MS           30      // Per-frame LED on-time (= exposure)
#define STROBE_ACTIVE_HIGH        1       // HIGH = LEDs on

// LED module ID resistor values (10-bit ADC, 3.3V ref, 10kΩ pull-up to 3.3V)
// Module type determined by voltage divider on ID pin.
// Resistors are E24 standard values, spaced ≥100 ADC counts apart.
//   R_ID        Voltage         ADC (10-bit)
//   1.2kΩ       0.35V           107         Blank plug
//   2.7kΩ       0.70V           213         940nm Super Long Range
//   5.6kΩ       1.19V           359         940nm Long Range
//   10kΩ        1.65V           500         940nm Standard
//   22kΩ        2.27V           688         850nm Research
//   47kΩ        2.72V           824         White Flash
//   open        3.3V            >950        No module
#define LED_ID_NONE               0       // No module / open circuit (>3.0V, ADC >950)
#define LED_ID_940NM_STANDARD     1       // 8× SFH 4725AS A01 80° PARALLEL (R_ID=10kΩ, ~1.65V, ADC ~500)
#define LED_ID_940NM_LONGRANGE    2       // 4× SFH 4725AS A01 + TIR optics (R_ID=5.6kΩ, ~1.19V, ADC ~359)
#define LED_ID_850NM_RESEARCH     3       // RESERVED — (R_ID=22kΩ, ~2.27V, ADC ~688). Build if research partners request.
#define LED_ID_WHITE_FLASH        4       // 4× Cree XP-G3 45° (R_ID=47kΩ, ~2.72V, ADC ~824). Day + night colour.
#define LED_ID_940NM_SUPER_LONG   6       // RESERVED — (R_ID=2.7kΩ, ~0.70V, ADC ~213). Build if long-range insufficient.
#define LED_ID_BLANK              7       // Blanking plug (R_ID=1.2kΩ, ~0.35V, ADC ~107)

// ── Modem Daughter Card (shared interface with Trap Monitor) ─────────────────
// 20-pin connector: power, UART, USB, control, SIM
// Active modem for Rev A: Quectel EG800Q-EU (CAT-1bis)
// Future: 5G RedCap / D2C module — same connector, new daughter card
#define MODEM_UART_INSTANCE       4       // UART4
#define MODEM_TX_PIN              PC10    // STM32N6 → modem RXD (UART4 TX, AF8)
#define MODEM_RX_PIN              PC11    // Modem TXD → STM32N6 (UART4 RX, AF8)
#define MODEM_BAUD                115200
#define MODEM_PWRKEY_PIN          PB0     // Active HIGH pulse
#define MODEM_RST_PIN             PB1     // Active LOW reset
#define MODEM_STATUS_PIN          PB2     // Modem status output (HIGH = modem on)
#define MODEM_RI_PIN              PB3     // Ring indicator (EXTI)
#define MODEM_DTR_PIN             PB4     // Data terminal ready
#define MODEM_3V8_EN_PIN          PB7     // AP63300 EN pin (optional sleep gating)
#define MODEM_POWER_SETTLE_MS     100     // Wait after PB7 HIGH before PWRKEY pulse
                                          // AP63300 soft-start ~1ms, 100ms for output settle + cap charge

// Level shifting: BSS138 discrete, 3.3V (MCU) ↔ 1.8V (modem)
// Matches Trap Monitor standard (March 2026 change — BSS138 over TXB0104)

// SIM interface (directly to modem, no MCU involvement)
// Nano-SIM populated for prototype. MFF2 eSIM footprint DNP.

// ── GPS (u-blox MAX-M10S — same module as Trap Monitor) ──────────────────────
#define GPS_UART_INSTANCE         3       // USART3
#define GPS_TX_PIN                PD8     // STM32N6 → M10 RXD (USART3 TX, AF7)
#define GPS_RX_PIN                PD9     // M10 TXD → STM32N6 (USART3 RX, AF7)
#define GPS_BAUD                  9600
#define GPS_PWR_PIN               PB5     // Power gate enable (HIGH = powered)
// Power gate: GPIO → BSS138 inverter → SI2301 P-FET → M10 VCC
// Same circuit as Trap Monitor

// ── PSRAM (32 MB frame buffer) ───────────────────────────────────────────────
// Connected via STM32N6 xSPI (OCTOSPI) interface — pins fixed by peripheral
#define PSRAM_SIZE_MB             32
#define PSRAM_PART                "APS256XXN-OBR-BG"  // 32MB, BGA-24, HexaSPI x16 DDR, 1.8V
                                                      // Same part as STM32N6570-DK board

// ── NOR Flash (firmware + AI models) ─────────────────────────────────────────
// Connected via STM32N6 xSPI2 — pins fixed by peripheral
#define FLASH_CODE_SIZE_MB        16      // W25Q128JV — firmware + models
#define FLASH_LOG_SIZE_MB         32      // W25Q256JV — metadata, config

// ── SD Card (µSD, SDIO 4-bit) ────────────────────────────────────────────────
// Connected via STM32N6 SDMMC2 — CLK=PC2, CMD=PC3, D0=PC4, D1=PC5, D2=PC0, D3=PE4
#define SD_SDMMC_INSTANCE         2       // SDMMC2
#define SD_DETECT_PIN             PN12    // Card detect (active LOW, EXTI)

// ── Power Management ─────────────────────────────────────────────────────────
// Battery: 12 AA NiMH in 6S2P via snap-on backpack system
// 7.2V nominal (6 × 1.2V), 8.4V full (6 × 1.4V), 6.0V discharged (6 × 1.0V)
// Capacity: 4000 mAh (2 parallel × 2000 mAh). Energy: 28.8 Wh.
// Standard: 12 AA NiMH. Field Station: 12 AA + trigger + LoRa (no solar).
// Li-ion Solar: sealed Li-ion + BMS + MPPT solar. Extender: stacks +12 AA.
#define BATT_6S2P_MAH             4000    // 6S2P: 2 parallel × 2000 mAh
#define BATT_ADC_PIN              PA1     // Battery voltage via divider (ADC1 CH1)
#define BATT_ADC_DIVIDER_RATIO    3.0f    // R1=2MΩ, R2=1MΩ. NOT same as Trap Monitor.
                                          // 8.4V full → 2.80V ADC. 6.0V empty → 2.00V ADC.

// Fuel gauge — REMOVED (March 2026 review)
// MAX17048 CELL pin max = 5.5V, incompatible with 6S2P pack (6.0-8.4V).
// SOC estimation uses ADC voltage measurement via BATT_SENSE divider (PA1).
// NiMH has a predictable OCV-to-SOC curve — voltage thresholds are sufficient.
// I2C2 (PD4/PD14) is now AVAILABLE for future use.
// U0 PB2 (FUEL_ALERT) is now AVAILABLE — repurpose as needed.

// Power rails — CASCADED architecture (March 2026 V1.2 review)
// Battery (6S2P, 6.0-8.4V) feeds AP63300 bucks ONLY.
// TPS62088 max Vin=5.5V — fed from 3.3V rail, NOT battery.
//
// FIRST STAGE (from battery):
// Battery → AP63300 U11 → 3.3V (main digital, ALWAYS ON, Iq=22µA)
// Battery → AP63300 U13 → 3.8V (modem VBAT, power-gated via PB7)
// Battery → AP63300 U15 → 5.0V (LED VLED, power-gated via PB6)
//
// SECOND STAGE (from 3.3V):
//   3.3V → TPS62088 U10a → 0.81V/0.89V (STM32N6 VDDCORE, GPIO PF4 switches)
//   3.3V → TPS62088 U10b → 1.1V (IMX678 DVDD only — cannot share VDDCORE rail)
//   3.3V → TPS7A02 U12 → 1.8V (IMX678 DOVDD + PSRAM + VDDIO_XSPI1)
//   3.3V → Ferrite+LC → 3.3V filtered (IMX678 AVDD)
//
// NOTE: TPS62A01 REMOVED — max Vin=5.5V cannot survive 6S2P battery (8.4V)
#define VDDCORE_VOS_PIN           PF4     // GPIO switches TPS62088 U10a feedback divider
                                          // LOW = 0.81V (VOS nominal, 600MHz)
                                          // HIGH = 0.89V (VOS overdrive, 800MHz + full NPU)
// VDDCORE circuit (CONFIRMED from DK board schematic mb1939-n6570-c02 Sheet 5):
//   TPS62088 VFB = 0.600V
//   R38 = 56k (upper, VDDCORE→FB, always active)
//   R29 = 160k (lower, FB→GND, always active)
//   R157 = 422k (lower parallel, switched by Q7 Si1062X N-FET via PF4)
//   R223 = 1M (Q7 gate pulldown — ensures PF4=LOW default = 0.81V on reset)
//   PF4=LOW:  lower=160k,           Vout = 0.6*(1+56/160)   = 0.810V
//   PF4=HIGH: lower=160k||422k=116k, Vout = 0.6*(1+56/115.9) = 0.890V

// AP63300 feedback resistors (CONFIRMED from datasheet Table 1, VFB=0.800V, R2=30.1k):
//   U11 (3.3V):  R1 = 93.1k,  R2 = 30.1k
//   U13 (3.8V):  R1 = 113k,   R2 = 30.1k  (calculated, not in table)
//   U15 (5.0V):  R1 = 158k,   R2 = 30.1k

// Solar charging: self-contained in Li-ion Solar backpack (not on main board)
// No external power jack on camera body

// ── Status LEDs ──────────────────────────────────────────────────────────────
#define LED_STATUS_GREEN_PIN      PG0     // Species confirmed / OK
#define LED_STATUS_AMBER_PIN      PG1     // Processing / warning
#define LED_STATUS_RED_PIN        PG2     // Error / low battery

// ── Inter-MCU Communication (STM32N6 ↔ STM32U0) ─────────────────────────────
// SPI1 on GPIOA — PA4(NSS, GPIO), PA5(SCK), PA6(MISO), PA7(MOSI), AF5
#define U0_COMM_INTERFACE         1       // SPI1
#define U0_SPI_NSS_PIN            PA4     // SPI1 NSS (GPIO, software chip select)
#define U0_SPI_SCK_PIN            PA5     // SPI1 SCK (AF5)
#define U0_SPI_MISO_PIN           PA6     // SPI1 MISO (AF5) — U0 → N6
#define U0_SPI_MOSI_PIN           PA7     // SPI1 MOSI (AF5) — N6 → U0
#define U0_WAKE_PIN               PG3     // STM32U0 → STM32N6 wake (EXTI rising)
#define U0_STATUS_PIN             PG4     // STM32N6 → STM32U0 busy/done
#define U0_PWRCTRL_PIN            PG5     // STM32U0 controls N6 power enable

// ── ESP32-C3 Comms Processor (WiFi + BLE + Display + Buttons) ────────────────
// ESP32-C3-MINI-1U module on main board. Handles:
//   - WiFi AP mode (image offload to phone, AirDrop-style)
//   - BLE GATT server (config, status, discovery)
//   - SSD1306 OLED display (I2C, on C3 side)
//   - Navigation buttons + reed switch (on C3 side)
// Link to STM32N6 via SPI2 (high-bandwidth image streaming, ~20 MHz)
// BLE and WiFi are sequential, never simultaneous (avoids C3 coexistence issue)
#define C3_SPI_INSTANCE           2       // SPI2 (N6 master, C3 slave)
#define C3_SPI_SCK_PIN            PF2     // SPI2 SCK — CubeMX validated (VFBGA-264)
#define C3_SPI_MOSI_PIN           PD7     // SPI2 MOSI — N6 → C3
#define C3_SPI_MISO_PIN           PD6     // SPI2 MISO — C3 → N6
#define C3_SPI_NSS_PIN            PB12    // SPI2 NSS — hardware chip select
#define C3_PWR_EN_PIN             PG7     // Power enable (HIGH = C3 powered, from 3.3V rail)
#define C3_READY_PIN              PG8     // C3 → N6 ready/interrupt (EXTI, active HIGH)
#define C3_SPI_CLOCK_HZ           10000000 // 10 MHz — ESP32-C3 SPI slave max ~10 MHz (f_APB/8)

// Reed switch (magnetic activation for BLE/WiFi)
// Directly wakes C3 via shared line. Also routed to N6 for awareness.
#define REED_SWITCH_PIN           PG9     // Magnetic reed switch (EXTI, active LOW)

// ── Bidirectional Trigger Interface (on-board, routed via backpack) ──────────
// Two independent signal paths share J_BP pins 3-4:
//   OUTPUT: PG6 drives on-board TLP291 opto-coupler → J_BP → backpack jack
//           Use case: AI detects target species → arms trap / fires deterrent
//   INPUT:  External contact closure on J_BP pins 3-4 → 100kΩ → TRIG_SENSE (U0 PA3)
//           Use case: cage trap fires → camera wakes, photographs, sends SMS
// Field Station and Li-ion Solar backpacks route J_BP pins 3-4 to weatherproof jack.
// Standard backpack: NC (feature unlocked by backpack upgrade).
#define TRIG_OUT_PIN              PG6     // TLP291 opto-coupler drive (active HIGH)
#define TRIG_OUT_ACTIVE_HIGH      1
#define TRIG_PULSE_MS             2000    // Default trigger pulse duration
#define TRIG_CONFIDENCE_THRESHOLD 0.70f   // Min confidence to fire trigger
#define TRIG_DUAL_CAMERA_CONFIRM  0       // 0 = single camera, 1 = require LoRa confirmation
#define TRIG_SENSE_PIN_U0         PA3     // STM32U0 EXTI input, active LOW (external trigger)
                                          // 100kΩ series + 10kΩ pull-up + TVS on main board
#define TRIG_INPUT_ENABLED        0       // 0 = ignore external triggers, 1 = wake on contact closure

// ── Accelerometer (LIS2DW12, on STM32U0) ──────────────────────────────────
// Anti-theft wake-on-movement. Connected to STM32U0 I2C1.
// 1.5 µA in low-power wake-up mode.
// STM32U0 pins: SDA = PA8, SCL = PA9, INT1 = PA2
#define ACCEL_I2C_ADDR            0x19    // LIS2DW12 7-bit address (SDO/SA0 = HIGH/float)
                                          // Avoids ~180µA leakage when SDO tied to GND
#define ACCEL_INT_PIN_U0          PA2     // STM32U0 EXTI, active HIGH on motion

// ── GPS Anti-Theft Mode ────────────────────────────────────────────────────
#define ANTITHEFT_ENABLED         0       // 0 = off, 1 = enabled via BLE settings
#define ANTITHEFT_HEARTBEAT_HOURS 24      // Daily position report interval
#define ANTITHEFT_SMS_FMT         "ALERT: Camera %s moved. Lat: %.6f Lon: %.6f"

// ── STOP2 Fast Trigger Mode ───────────────────────────────────────────────
#define STOP2_FAST_TRIGGER        0       // 0 = deep sleep (~200ms wake), 1 = STOP2 (~175ms wake)
                                          // STOP2 adds ~3.6 mAh/day sleep current (~112 µA vs ~8 µA)

// ── Short Video Clip Mode ─────────────────────────────────────────────────
#define VIDEO_CLIP_ENABLED        0       // 0 = burst only, 1 = 5-sec MJPEG on trigger
#define VIDEO_CLIP_DURATION_S     5
#define VIDEO_CLIP_FPS            15      // 1080p MJPEG at 15fps
#define VIDEO_CLIP_WIDTH          1920
#define VIDEO_CLIP_HEIGHT         1080

// ── Expansion / Backpack Interface ─────────────────────────────────────────
// Backpack interface connector (J_BP, 8-pin pogo) on camera rear panel.
// Standard backpack: power only (pins 1-2).
// Field Station backpack: power + trigger + LoRa + 3V3 (all 8 pins). No solar.
// Li-ion Solar backpack: power + trigger + LoRa + 3V3 (all 8 pins) + sealed solar.
// I2C expansion: REMOVED — I2C3 has no valid pin mapping on VFBGA-264 package.
// EXP_DIGITAL_1_PIN removed — PG6 is now dedicated TRIG_OUT (see trigger section above)
// J_EXP2 is a test point for the trigger signal, not a general-purpose expansion port
#define LORA_UART_INSTANCE        1       // USART1 (via J_BP to Field Station / Li-ion Solar backpack)
#define LORA_UART_TX_PIN          PE5     // USART1 TX (AF7) — J_BP pin 5
#define LORA_UART_RX_PIN          PE6     // USART1 RX (AF7) — J_BP pin 6
#define LORA_UART_BAUD            115200

// ── SD Card File Structure ───────────────────────────────────────────────────
#define SD_ROOT_DIR               "/"
#define SD_BURST_DIR_FMT          "/%04d-%02d-%02d/burst_%02d%02d%02d_%03d/"
// e.g. /2026-03-13/burst_143022_001/
//   frame_01.jpg ... frame_10.jpg
//   metadata.json

// ── AI Model Paths (in NOR flash) ────────────────────────────────────────────
#define MODEL_MEGADETECTOR_PATH   "/models/megadetector_v5_int8.tflite"
#define MODEL_SPECIES_PATH        "/models/awc_135sp_int8.tflite"
#define MODEL_MEGADETECTOR_SIZE   2621440  // ~2.5 MB
#define MODEL_SPECIES_SIZE        1572864  // ~1.5 MB
// Total: ~4.0 MB — fits in STM32N6 4.2 MB SRAM

// ── Network ──────────────────────────────────────────────────────────────────
#define MODEM_MODEL               "EG800Q"
#define APN                       "telstra.m2m"
#define NETWORK_BAND              28        // 700 MHz AU terrestrial
#define D2C_BAND                  7         // 2600 MHz Starlink D2C (future)

// ── Runtime Config (persisted to NOR flash) ──────────────────────────────────
typedef struct {
    char     unitId[16];
    char     smsNumber[20];
    char     mqttBroker[128];
    char     mqttTopic[64];
    char     apn[32];
    uint8_t  operatingMode;           // MODE_VALIDATION / PRODUCTION / RESEARCH
    float    aiConfidenceThreshold;
    float    megadetectorThreshold;
    uint8_t  healthCheckHour;
    uint8_t  healthCheckMinute;
    uint8_t  lowBattThresholdPct;
    uint8_t  burstFrameCount;
    uint8_t  aiInferenceFrames;
    uint8_t  alertOnSpecies;
    uint8_t  alertIncludeThumbnail;
    uint16_t pirLockoutS;
    char     fwVersion[12];
    char     modelVersion[32];        // AI model version string
    uint8_t  ledModuleType;           // Auto-detected from ID pin
} SystemConfig_t;
