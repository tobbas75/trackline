#pragma once

// ── Unit Identity ─────────────────────────────────────────────────────────────
#define DEFAULT_UNIT_ID       "TRAP_001"
#define DEFAULT_CMD_PIN       "0000"           // CHANGE ON FIRST SETUP

// ── SMS Destinations ──────────────────────────────────────────────────────────
#define DEFAULT_SMS_NUMBER    "+61400000000"   // Primary alert recipient
#define DEFAULT_API_ENDPOINT  ""               // Optional HTTP POST endpoint

// ── Transmission Rules ────────────────────────────────────────────────────────
#define GPS_MOVE_THRESHOLD_M  50.0f            // Metres before GPS is included
#define HEALTH_HOUR           6                // Daily health check hour (local)
#define HEALTH_MINUTE         0
#define LOW_BATT_THRESHOLD    20               // % battery — triggers alert SMS
#define CRIT_BATT_THRESHOLD   10              // % — last-gasp attempt then shutdown

// ── Retry Logic ───────────────────────────────────────────────────────────────
#define SMS_RETRY_COUNT       5
#define SMS_RETRY_INTERVAL_S  300              // 5 minutes between retries
#define MODEM_POWER_CYCLES    3               // Before MCU reboot

// ── Timing ────────────────────────────────────────────────────────────────────
#define CMD_LISTEN_WINDOW_S   60              // Listen for inbound SMS after TX
#define CMD_LISTEN_GRACE_S    10              // Extend listen if cmd received in final N seconds
#define GPS_TIMEOUT_S         300             // 5 min GPS fix timeout
#define MODEM_INIT_TIMEOUT_S  60
#define CMD_POLL_INTERVAL_HR  4              // Poll for commands every N hours

// ── Hardware Pins (ESP32-S3) ──────────────────────────────────────────────────
#define TRAP_TRIGGER_PIN      4               // Reed switch NC — interrupt
#define SOLAR_ADC_PIN         1               // ADC — solar charge current sense
#define BATT_ADC_PIN          2               // ADC — battery voltage divider
#define LED_GREEN_PIN         38
#define LED_AMBER_PIN         39
#define LED_RED_PIN           40
#define RTC_SDA_PIN           8
#define RTC_SCL_PIN           9

// ── Modem (Quectel EG800Q-EU) ───────────────────────────────────────────────
// LTE CAT-1bis | QCX216 | Band 28 (AU terrestrial) + Band 7 (D2C satellite)
// Single antenna — one U.FL/SMA only. NO integrated GNSS.
// UART: Serial1 on ESP32-S3 (configurable TX/RX pins below)
#define MODEM_TX_PIN          17              // ESP32-S3 → EG800Q-EU RXD
#define MODEM_RX_PIN          18              // EG800Q-EU TXD → ESP32-S3
#define MODEM_PWRKEY_PIN      5               // EG800Q-EU PWRKEY (active HIGH pulse)
#define MODEM_RST_PIN         7               // EG800Q-EU RESET_N (active LOW)
#define MODEM_BAUD            115200

// ── GPS (u-blox M10 — separate module, Serial2) ────────────────────────────
// EG800Q-EU has NO integrated GNSS. GPS is provided by a standalone u-blox
// M10 connected on Serial2. M10 outputs standard NMEA sentences at 9600 baud.
// Power the M10 from a GPIO-controlled LDO to cut power during deep sleep.
#define GPS_TX_PIN            15              // ESP32-S3 → M10 RXD (for config cmds)
#define GPS_RX_PIN            16              // M10 TXD → ESP32-S3
#define GPS_PWR_PIN           6               // M10 VCC enable (GPIO HIGH = powered)
#define GPS_BAUD              9600

// ── Power — Battery Pack Selection ─────────────────────────────────────────
// Uncomment ONE pack option below. Default: Pack A (LiFePO4 2S + solar).
// Pack D = primary cells (no solar, no recharge) — field-swap only.

#define BATTERY_PACK_A          // LiFePO4 2S 3.2V × 2 = 6.4V nom + solar
// #define BATTERY_PACK_B       // BLOCKED — 1S LiFePO4 max 3.6V < AP63300 Vin min 3.8V
// #define BATTERY_PACK_C       // Li-ion 18650 2S 3.7V × 2 = 7.4V nom + solar
// #define BATTERY_PACK_D       // 3× D-cell Energizer L91 1.5V (primary, no solar)

#if defined(BATTERY_PACK_A)
  #define BATT_CAPACITY_MAH     6000
  #define BATT_PACK_FULL_MV     7200          // 2S LiFePO4 full: 2 × 3600mV
  #define BATT_PACK_EMPTY_MV    5600          // 2S LiFePO4 cutoff: 2 × 2800mV
  #define BATT_PRIMARY          0             // Rechargeable
#elif defined(BATTERY_PACK_B)
  // Pack B (1S LiFePO4, 3.2V nom, 3.6V full) is INCOMPATIBLE with the
  // AP63300 modem buck converter which requires Vin ≥ 3.8V.
  // Pack B's full-charge voltage (3.6V) is below the buck minimum.
  // To support 1S packs, replace AP63300 with a buck-boost converter.
  #error "BATTERY_PACK_B is incompatible with AP63300 buck (Vin min 3.8V > Pack B full 3.6V)"
#elif defined(BATTERY_PACK_C)
  #define BATT_CAPACITY_MAH     7000
  #define BATT_PACK_FULL_MV     8400          // 2S Li-ion full: 2 × 4200mV
  #define BATT_PACK_EMPTY_MV    6000          // 2S Li-ion cutoff: 2 × 3000mV
  #define BATT_PRIMARY          0
#elif defined(BATTERY_PACK_D)
  #define BATT_CAPACITY_MAH     18000         // 3× D-cell ~6000mAh each
  #define BATT_PACK_FULL_MV     4800          // 3 × 1600mV fresh
  #define BATT_PACK_EMPTY_MV    4000          // AP63300 buck Vin min = 3.8V + 200mV margin
  //  NOTE: True cell end-of-life is 2.7V (3×0.9V), but the modem buck
  //  converter drops out at 3.8V. Setting empty = 4.0V ensures the last
  //  SMS (critical alert) can still be sent before modem power fails.
  //  Usable SOC range is 4.0–4.8V (800mV window). L91 lithium cells have
  //  a flat discharge curve ~4.5V for most of their life, so this window
  //  still captures >90% of usable capacity.
  #define BATT_PRIMARY          1             // Non-rechargeable — no solar
#else
  #error "No battery pack selected — uncomment one BATTERY_PACK_x in config.h"
#endif

// ── SOC Model ──────────────────────────────────────────────────────────────
// Single pack-level model: ADC reads divider midpoint → multiply by ratio
// to recover pack voltage → linear map between BATT_PACK_EMPTY_MV and
// BATT_PACK_FULL_MV → 0–100%. No per-cell multipliers or secondary models.
// Calibrate ADC_CAL_FACTOR per-board with a multimeter on TP3 (BATT_SENSE).
#define ADC_VREF_MV             3300
#define ADC_DIVIDER_RATIO       3.128f        // (1MΩ+470kΩ)/470kΩ exact — max 7.2V → 2.30V at ADC
#define ADC_CAL_FACTOR          1.0f          // Per-board calibration multiplier (measure & adjust)

// ── Network ───────────────────────────────────────────────────────────────────
// Supported: "EG800Q" (default) | "SIM7080G" (legacy) | "BG95"
// Add new models in firmware/src/hal/modems/ + register in ModemFactory.h
#define MODEM_MODEL           "EG800Q"
#define APN                   "telstra.m2m"   // Telstra LTE APN
#define NETWORK_BAND          28              // 700MHz — critical for AU remote

// ── Sensor Expansion Headers (reserved on PCB, unpopulated by default) ────────
// All features DISABLED by default. Uncomment to activate.
// Enabled sensors are included in the daily HEALTH report SMS automatically.

// #define SENSOR_TEMP_HUMIDITY          // I2C BME280/SHT31 on EXP_I2C header
// #define SENSOR_ONEWIRE_TEMP           // DS18B20 waterproof probe on EXP_1WIRE
// #define SENSOR_SOIL_MOISTURE          // Analogue 0–3.3V probe on EXP_ANALOG
// #define SENSOR_WATER_LEVEL            // Analogue float/ultrasonic on EXP_ANALOG
// #define SENSOR_SECONDARY_TRIGGER      // Second NC trap trigger on EXP_DIGITAL_1
// #define SENSOR_FLOW_PULSE             // Rain gauge / flow meter on EXP_DIGITAL_2
// #define SENSOR_UART_DEVICE            // Serial sensor (ultrasonic etc) on EXP_UART

// Expansion GPIO — matches silkscreen labels on PCB headers
#define EXP_I2C_SDA_PIN       41            // EXP_I2C (separate bus from RTC)
#define EXP_I2C_SCL_PIN       42
#define EXP_ONEWIRE_PIN       43            // EXP_1WIRE
#define EXP_ANALOG_PIN        10            // EXP_ANALOG (ADC1 CH9)
#define EXP_DIGITAL_1_PIN     11            // EXP_DIGITAL_1 (NC, pull-up 3.3V)
#define EXP_DIGITAL_2_PIN     12            // EXP_DIGITAL_2 (pulse count or NC)
#define EXP_UART_TX_PIN       13            // EXP_UART
#define EXP_UART_RX_PIN       14

// Sensor alert thresholds (only active when sensor define is enabled above)
#define TEMP_HIGH_THRESHOLD_C 60.0f         // Enclosure overheat warning
#define TEMP_LOW_THRESHOLD_C  5.0f          // Unexpected cold alert
#define SOIL_DRY_THRESHOLD    20            // % — below this = dry alert
#define WATER_LEVEL_LOW_MM    100           // mm — below this = low level alert

// ── Storage ───────────────────────────────────────────────────────────────────
#define CONFIG_FILE           "/config.json"
#define QUEUE_FILE            "/queue.json"
#define LOG_FILE              "/events.log"
#define MAX_QUEUE_SIZE        50              // Max unsent messages to store

// ── Message Priority (lower = higher priority) ─────────────────────────────
#define MSG_PRIORITY_ALERT    0              // Critical — always sent first
#define MSG_PRIORITY_TRAP     1              // Trap trigger — high importance
#define MSG_PRIORITY_HEALTH   2              // Routine health check — lowest

// ── Firmware Version ─────────────────────────────────────────────────────────
#define FW_VERSION "1.0.0"

// ── Config Validation Sentinels ─────────────────────────────────────────────
// These are the factory defaults. If cfg matches any of these after loading
// from flash, the unit has not been properly configured for deployment.
// Firmware will warn loudly on serial but WILL still operate (fail-open for
// field recovery scenarios where reflashing is the only option).
#define FACTORY_UNIT_ID       DEFAULT_UNIT_ID       // "TRAP_001"
#define FACTORY_SMS_NUMBER    DEFAULT_SMS_NUMBER     // "+61400000000"
#define FACTORY_CMD_PIN       DEFAULT_CMD_PIN        // "0000"

// ── Runtime Config (persisted to LittleFS) ───────────────────────────────────
#include <Arduino.h>

struct SystemConfig {
  String unitId          = DEFAULT_UNIT_ID;
  String smsNumber       = DEFAULT_SMS_NUMBER;
  String apiEndpoint     = DEFAULT_API_ENDPOINT;
  String cmdPin          = DEFAULT_CMD_PIN;
  String apn             = APN;
  float  gpsMoveThresholdM = GPS_MOVE_THRESHOLD_M;
  int    healthHour      = HEALTH_HOUR;
  int    healthMinute    = HEALTH_MINUTE;
  int    lowBattThreshold = LOW_BATT_THRESHOLD;
  int    smsRetryCount   = SMS_RETRY_COUNT;
  bool   armed           = true;
};
