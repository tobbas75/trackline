#pragma once
#include <Arduino.h>
#include <RTClib.h>
#include "config.h"

// ── Helpers (must precede compose functions) ─────────────────────────────────
String getCurrentTimestamp()
{
  // Returns DD/MM/YY HH:MM — from RTC
  // Fallback: millis-based if RTC unavailable
  extern RTC_DS3231 rtc;
  if (rtc.lostPower())
    return "?\?/?\?/?\? ?\?:?\?";
  DateTime now = rtc.now();
  char buf[20];
  snprintf(buf, sizeof(buf), "%02d/%02d/%02d %02d:%02d",
           now.day(), now.month(), now.year() % 100, now.hour(), now.minute());
  return String(buf);
}

// ── Message struct ────────────────────────────────────────────────────────────
struct EventMessage
{
  String type; // "TRAP", "HEALTH", "ALERT"
  String unitId;
  String timestamp;
  int retryAttempts = 0; // Failed retries for this queued message
  int priority = MSG_PRIORITY_HEALTH; // Queue priority (lower = higher)
  bool trapCaught = false;
  bool hasGPS = false;
  bool gpsStale = false;
  bool forceGPS = false;
  float lat = 0.0;
  float lng = 0.0;
  int battPct = -1;
  bool solarOk = true;
  int rssi = 0;
  String fwVersion = FW_VERSION;
  bool addLowBattWarning = false;
  String sensorSuffix; // Expansion sensor data (appended to HEALTH SMS)
};

// ── Priority helper — derive priority from message type string ────────────────
inline int msgPriorityFromType(const String &type) {
  if (type == "ALERT") return MSG_PRIORITY_ALERT;
  if (type == "TRAP")  return MSG_PRIORITY_TRAP;
  return MSG_PRIORITY_HEALTH;
}

// ── Trap triggered alert ──────────────────────────────────────────────────────
EventMessage composeTrapAlert(SystemConfig &cfg, int battPct, bool solarOk)
{
  EventMessage msg;
  msg.type = "TRAP";
  msg.priority = msgPriorityFromType(msg.type);
  msg.unitId = cfg.unitId;
  msg.timestamp = getCurrentTimestamp();
  msg.trapCaught = true;
  msg.battPct = battPct;
  msg.solarOk = solarOk;
  return msg;
}

// ── Daily health check ────────────────────────────────────────────────────────
EventMessage composeHealthCheck(SystemConfig &cfg, int battPct, bool solarOk)
{
  EventMessage msg;
  msg.type = "HEALTH";
  msg.priority = msgPriorityFromType(msg.type);
  msg.unitId = cfg.unitId;
  msg.timestamp = getCurrentTimestamp();
  msg.battPct = battPct;
  msg.solarOk = solarOk;
  return msg;
}

// ── Last gasp before shutdown ─────────────────────────────────────────────────
EventMessage composeLastGasp(SystemConfig &cfg, int battPct)
{
  EventMessage msg;
  msg.type = "ALERT";
  msg.priority = msgPriorityFromType(msg.type);
  msg.unitId = cfg.unitId;
  msg.timestamp = getCurrentTimestamp();
  msg.battPct = battPct;
  msg.solarOk = false;
  return msg;
}

// ── SMS length guard ─────────────────────────────────────────────────────────
String enforceSmsLength(const String &sms, const String &timestamp)
{
  const int limit = 160;
  if (sms.length() <= limit)
  {
    return sms;
  }

  // Prefer preserving timestamp and tail context when truncating.
  int tsPos = (timestamp.length() > 0) ? sms.lastIndexOf(timestamp) : -1;
  if (tsPos > 0)
  {
    String head = sms.substring(0, tsPos);
    String tail = sms.substring(tsPos);
    int headBudget = limit - 3 - tail.length();
    if (headBudget >= 20 && head.length() > headBudget)
    {
      Serial.printf("[MARKER][SMS_LEN] Trim with timestamp preserve: %d -> %d\n",
                    sms.length(), limit);
      return head.substring(0, headBudget) + "..." + tail;
    }
  }

  // Fallback: hard cap with ellipsis.
  Serial.printf("[MARKER][SMS_LEN] Hard trim applied: %d -> %d\n", sms.length(), limit);
  return sms.substring(0, limit - 3) + "...";
}

// ── Format SMS text ───────────────────────────────────────────────────────────
// Minimal by design — keep char count low to stay in single SMS (160 chars)
String formatSMS(const EventMessage &msg, const SystemConfig &cfg)
{
  String sms = "";

  if (msg.type == "TRAP")
  {
    // Core alert — fits in ~50 chars
    sms = "TRAP #" + msg.unitId + " | CAUGHT | " + msg.timestamp;
    if (msg.hasGPS)
    {
      sms += " | GPS " + String(msg.lat, 4) + "," + String(msg.lng, 4);
      if (msg.gpsStale)
        sms += "*"; // * = stale fix
    }
    if (msg.addLowBattWarning)
    {
      sms += " | LOWBATT " + String(msg.battPct) + "%";
    }
  }
  else if (msg.type == "HEALTH")
  {
    sms = "HEALTH #" + msg.unitId + " | " + msg.timestamp;
    sms += " | Bt:" + String(msg.battPct) + "% ";
#if BATT_PRIMARY
    sms += "Pwr:PRI ";
#else
    sms += "Sol:" + String(msg.solarOk ? "OK" : "FAULT") + " ";
#endif
    sms += "FW:" + msg.fwVersion;
    sms += " | " + String(msg.trapCaught ? "CAUGHT" : "EMPTY");
    if (msg.sensorSuffix.length() > 0)
    {
      sms += msg.sensorSuffix;
    }
    if (msg.hasGPS)
    {
      sms += " | GPS " + String(msg.lat, 4) + "," + String(msg.lng, 4);
    }
  }
  else if (msg.type == "ALERT")
  {
    sms = "ALERT #" + msg.unitId + " | ";
    if (msg.sensorSuffix.length() > 0)
    {
      sms += msg.sensorSuffix;
    }
    else if (msg.battPct >= 0 && msg.battPct <= CRIT_BATT_THRESHOLD)
    {
      sms += "CRIT BATT " + String(msg.battPct) + "% SHUTTING DOWN";
    }
    else if (msg.addLowBattWarning && msg.battPct >= 0)
    {
      sms += "LOW BATT " + String(msg.battPct) + "%";
    }
#if !BATT_PRIMARY
    if (!msg.solarOk)
      sms += " | Solar:FAULT";
#endif
    sms += " | " + msg.timestamp;
  }

  return enforceSmsLength(sms, msg.timestamp);
}
