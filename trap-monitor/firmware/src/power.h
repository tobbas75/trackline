#pragma once
#include <Arduino.h>
#include "config.h"

// ── Battery % from ADC ────────────────────────────────────────────────────────
// SOC model: pack-level only. ADC → divider ratio → pack mV → linear 0–100%.
// All constants are pack-level (BATT_PACK_FULL_MV, BATT_PACK_EMPTY_MV).
// ADC_CAL_FACTOR compensates for divider tolerance and ESP32 ADC non-linearity.
int powerGetBatteryPct() {
  // Average 10 ADC samples for stability (100nF filter cap C1 provides
  // low-impedance charge reservoir for S/H cap despite 320kΩ source Z)
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(BATT_ADC_PIN);
    delay(5);
  }
  int rawADC = sum / 10;

  // Convert to pack millivolts (divider sees full pack voltage, not per-cell)
  float adcMv  = (rawADC / 4095.0f) * ADC_VREF_MV;
  float battMv = adcMv * ADC_DIVIDER_RATIO * ADC_CAL_FACTOR;

  // Clamp and map to 0–100% using pack-level thresholds
  float fullMv  = BATT_PACK_FULL_MV;
  float emptyMv = BATT_PACK_EMPTY_MV;

  battMv = constrain(battMv, emptyMv, fullMv);
  int pct = (int)((battMv - emptyMv) / (fullMv - emptyMv) * 100.0f);

  Serial.printf("[POWER] ADC raw: %d | Batt: %.0fmV | %d%%\n", rawADC, battMv, pct);
  return pct;
}

// ── Solar enabled? ───────────────────────────────────────────────────────────
bool isSolarEnabled() {
  return BATT_PRIMARY == 0;
}

// ── Detect solar charging ─────────────────────────────────────────────────────
bool powerIsSolarCharging() {
#if BATT_PRIMARY
  // Primary cells — no solar panel fitted
  return false;
#else
  int solar = analogRead(SOLAR_ADC_PIN);
  bool charging = (solar > 100); // Threshold — calibrate per circuit
  Serial.printf("[POWER] Solar ADC: %d | Charging: %s\n", solar, charging ? "YES" : "NO");
  return charging;
#endif
}

// ── Check if battery is critically low ───────────────────────────────────────
bool powerIsCritical() {
  return powerGetBatteryPct() <= CRIT_BATT_THRESHOLD;
}
