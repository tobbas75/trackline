#pragma once
#include "config.h"

// ── Optional Sensor Expansion ─────────────────────────────────────────────────
// Each sensor block is compiled only when the matching #define is active in config.h
// All read functions return a float value; -999.0f signals a read failure.
// Call readSensors() from main.cpp after WAKE_ASSESS, append results to health SMS.

struct SensorData {
  float tempC       = -999.0f;   // SENSOR_TEMP_HUMIDITY or SENSOR_ONEWIRE_TEMP
  float humidityPct = -999.0f;   // SENSOR_TEMP_HUMIDITY
  float soilPct     = -999.0f;   // SENSOR_SOIL_MOISTURE
  float waterMM     = -999.0f;   // SENSOR_WATER_LEVEL
  bool  trigger2    = false;     // SENSOR_SECONDARY_TRIGGER
  float pulseCount  = 0.0f;      // SENSOR_FLOW_PULSE (counts since last reset)
  bool  valid       = false;     // true if at least one sensor read successfully
};

#ifdef SENSOR_TEMP_HUMIDITY
#include <Wire.h>
#include <Adafruit_BME280.h>
static Adafruit_BME280 bme;
static bool bmeInit = false;
#endif

#ifdef SENSOR_ONEWIRE_TEMP
#include <OneWire.h>
#include <DallasTemperature.h>
static OneWire oneWire(EXP_ONEWIRE_PIN);
static DallasTemperature dallasSensor(&oneWire);
#endif

// ── readSensors() ─────────────────────────────────────────────────────────────
// Call once per wake cycle. Returns populated SensorData struct.
inline SensorData readSensors() {
  SensorData d;

#ifdef SENSOR_TEMP_HUMIDITY
  if (!bmeInit) {
    Wire1.begin(EXP_I2C_SDA_PIN, EXP_I2C_SCL_PIN);
    bmeInit = bme.begin(0x76, &Wire1) || bme.begin(0x77, &Wire1);
  }
  if (bmeInit) {
    d.tempC       = bme.readTemperature();
    d.humidityPct = bme.readHumidity();
    d.valid       = true;
  }
#endif

#ifdef SENSOR_ONEWIRE_TEMP
  dallasSensor.begin();
  dallasSensor.requestTemperatures();
  float t = dallasSensor.getTempCByIndex(0);
  if (t != DEVICE_DISCONNECTED_C) {
    d.tempC = t;
    d.valid = true;
  }
#endif

#ifdef SENSOR_SOIL_MOISTURE
  // Raw ADC 0–4095 mapped to 0–100% (dry=4095, wet=0 — invert as needed for probe)
  int raw = analogRead(EXP_ANALOG_PIN);
  d.soilPct = 100.0f - (raw / 4095.0f * 100.0f);
  d.valid = true;
#endif

#ifdef SENSOR_WATER_LEVEL
  // Assumes 0–3.3V analogue output from float sensor or ultrasonic (calibrate per sensor)
  int raw = analogRead(EXP_ANALOG_PIN);
  d.waterMM = (raw / 4095.0f) * 3000.0f; // Default: 0–3000mm range, adjust to suit
  d.valid = true;
#endif

#ifdef SENSOR_SECONDARY_TRIGGER
  pinMode(EXP_DIGITAL_1_PIN, INPUT_PULLUP);
  d.trigger2 = (digitalRead(EXP_DIGITAL_1_PIN) == LOW); // NC = LOW when closed
#endif

#ifdef SENSOR_FLOW_PULSE
  // Pulse count read from RTC memory (incremented in ISR, reset after TX)
  // Implement ISR in main.cpp: attachInterrupt(EXP_DIGITAL_2_PIN, pulseISR, FALLING)
  extern volatile uint32_t g_pulseCount;
  d.pulseCount = (float)g_pulseCount;
#endif

  return d;
}

// ── formatSensorSMS() ─────────────────────────────────────────────────────────
// Appends sensor readings to a String for inclusion in health SMS.
// Returns empty string if no sensors active or all reads failed.
inline String formatSensorSMS(const SensorData& d) {
  if (!d.valid) return "";
  String s = "";
  if (d.tempC       > -999.0f) s += " T:" + String(d.tempC, 1) + "C";
  if (d.humidityPct > -999.0f) s += " H:" + String(d.humidityPct, 0) + "%";
  if (d.soilPct     > -999.0f) s += " Soil:" + String(d.soilPct, 0) + "%";
  if (d.waterMM     > -999.0f) s += " Wtr:" + String(d.waterMM, 0) + "mm";
  if (d.trigger2)               s += " T2:CAUGHT";
  if (d.pulseCount  > 0)        s += " Pulse:" + String((int)d.pulseCount);
  return s;
}

// ── checkSensorAlerts() ───────────────────────────────────────────────────────
// Returns a non-empty string if any sensor has crossed an alert threshold.
// Intended for inclusion as a separate alert SMS (not bundled with health).
inline String checkSensorAlerts(const SensorData& d) {
  String alert = "";
  if (d.tempC > -999.0f && d.tempC > TEMP_HIGH_THRESHOLD_C)
    alert += "HIGH TEMP " + String(d.tempC, 1) + "C ";
  if (d.tempC > -999.0f && d.tempC < TEMP_LOW_THRESHOLD_C)
    alert += "LOW TEMP " + String(d.tempC, 1) + "C ";
  if (d.soilPct > -999.0f && d.soilPct < SOIL_DRY_THRESHOLD)
    alert += "SOIL DRY " + String(d.soilPct, 0) + "% ";
  if (d.waterMM > -999.0f && d.waterMM < WATER_LEVEL_LOW_MM)
    alert += "WATER LOW " + String(d.waterMM, 0) + "mm ";
  return alert;
}
