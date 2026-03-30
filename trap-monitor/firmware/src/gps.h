#pragma once
#include <Arduino.h>
#include <TinyGPS++.h>
#include "config.h"

// ── GPS via u-blox M10 on Serial2 ────────────────────────────────────────────
// Reads NMEA sentences directly from standalone GPS module.
// M10 is powered via GPS_PWR_PIN to save current during deep sleep —
// always call gpsInit() in setup, gpsPowerOn() before getGPSFix().

struct GPSFix {
  bool  valid = false;
  float lat   = 0.0;
  float lng   = 0.0;
  float hdop  = 99.0;
  int   sats  = 0;
};

static TinyGPSPlus  _gps;
static HardwareSerial gpsSerial(2);

inline void gpsInit() {
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  pinMode(GPS_PWR_PIN, OUTPUT);
  digitalWrite(GPS_PWR_PIN, LOW); // Start powered off
}

inline void gpsPowerOn()  { digitalWrite(GPS_PWR_PIN, HIGH); delay(200); }
inline void gpsPowerOff() { digitalWrite(GPS_PWR_PIN, LOW); }

// ── Get GPS fix with timeout ─────────────────────────────────────────────────
// Returns GPSFix with valid=true if a fix was acquired within GPS_TIMEOUT_S.
// Caller should use last-known coords on failure.
GPSFix gpsGetFix(int timeoutSeconds) {
  GPSFix fix;
  gpsPowerOn();

  Serial.printf("[GPS] Waiting for fix (timeout: %ds)...\n", timeoutSeconds);
  unsigned long deadline = millis() + ((unsigned long)timeoutSeconds * 1000UL);

  while (millis() < deadline) {
    while (gpsSerial.available()) {
      if (_gps.encode(gpsSerial.read())) {
        // isUpdated() = location was decoded in the latest NMEA sentence.
        // Previous age() < 2000 check rejected valid fixes during cold-start
        // inter-sentence gaps (FW-02 fix).
        if (_gps.location.isValid() && _gps.location.isUpdated()) {
          fix.valid = true;
          fix.lat   = _gps.location.lat();
          fix.lng   = _gps.location.lng();
          fix.hdop  = _gps.hdop.isValid() ? _gps.hdop.hdop() : 99.0;
          fix.sats  = _gps.satellites.isValid() ? _gps.satellites.value() : 0;
          Serial.printf("[GPS] Fix OK: %.6f, %.6f HDOP:%.1f Sats:%d\n",
            fix.lat, fix.lng, fix.hdop, fix.sats);
          gpsPowerOff();
          return fix;
        }
      }
    }

    // Print progress every 30s
    static unsigned long lastProgress = 0;
    unsigned long elapsed = (millis() - (deadline - (unsigned long)timeoutSeconds * 1000UL)) / 1000;
    if (elapsed > 0 && elapsed % 30 == 0 && millis() - lastProgress > 25000) {
      Serial.printf("[GPS] Still waiting... %lus elapsed\n", elapsed);
      lastProgress = millis();
    }

    yield();
  }

  Serial.println("[GPS] Timeout — no fix");
  gpsPowerOff();
  return fix;
}

// ── Haversine distance between two coordinates (metres) ──────────────────────
float gpsDistance(float lat1, float lng1, float lat2, float lng2) {
  const float R = 6371000.0f; // Earth radius metres
  float dLat = radians(lat2 - lat1);
  float dLng = radians(lng2 - lng1);
  float a = sin(dLat/2)*sin(dLat/2) +
            cos(radians(lat1))*cos(radians(lat2))*
            sin(dLng/2)*sin(dLng/2);
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  return R * c;
}
