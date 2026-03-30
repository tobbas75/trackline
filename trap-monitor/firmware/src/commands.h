#pragma once
#include <Arduino.h>
#include "config.h"
#include "storage.h"
#include "power.h"
#include "gps.h"

extern int bootCount; // defined in main.cpp (RTC_DATA_ATTR)

// ── Parse and execute inbound SMS command ────────────────────────────────────
// Format: PIN CMD #UNITID [arg]
// e.g.:   1234 STATUS #TRAP_001
String commandProcess(const String &raw, SystemConfig &cfg, RTC_DS3231 &rtc)
{
  String msg = raw;
  msg.trim();
  msg.toUpperCase();

  // Extract and validate PIN
  int space1 = msg.indexOf(' ');
  if (space1 < 0)
    return "";
  String pin = msg.substring(0, space1);
  if (pin != cfg.cmdPin)
  {
    Serial.println("[CMD] Invalid PIN");
    return ""; // Silently ignore — don't confirm unit exists to attackers
  }

  String rest = msg.substring(space1 + 1);

  // Extract unit ID check (optional — if #UNITID present, must match)
  int hashPos = rest.lastIndexOf('#');
  if (hashPos >= 0)
  {
    String targetUnit = rest.substring(hashPos + 1);
    targetUnit.trim();
    String myId = cfg.unitId;
    myId.toUpperCase();
    if (targetUnit != myId)
    {
      Serial.println("[CMD] Not addressed to this unit — ignoring");
      return "";
    }
    rest = rest.substring(0, hashPos);
    rest.trim();
  }

  // Parse command
  String cmd = rest;
  String arg = "";
  int argSpace = rest.indexOf(' ');
  if (argSpace >= 0)
  {
    cmd = rest.substring(0, argSpace);
    arg = rest.substring(argSpace + 1);
    arg.trim();
  }

  Serial.printf("[CMD] Executing: %s arg=%s\n", cmd.c_str(), arg.c_str());

  if (cmd == "STATUS")
  {
    int batt = powerGetBatteryPct();
    bool solar = powerIsSolarCharging();
    return "STATUS #" + cfg.unitId + " | Bt:" + String(batt) +
           "% Sol:" + String(solar ? "OK" : "FAULT") +
           " Q:" + String(storageQueueSize()) +
           " FW:" + FW_VERSION;
  }
  else if (cmd == "GPS")
  {
    GPSFix fix = gpsGetFix(GPS_TIMEOUT_S);
    if (fix.valid)
    {
      return "GPS #" + cfg.unitId + " | " +
             String(fix.lat, 6) + "," + String(fix.lng, 6) +
             " Acc:" + String(fix.hdop, 1);
    }
    else
    {
      return "GPS #" + cfg.unitId + " | NO FIX";
    }
  }
  else if (cmd == "RESET")
  {
    modemSendSMS(cfg.smsNumber, "REBOOTING #" + cfg.unitId);
    delay(1000);
    ESP.restart();
    return ""; // Never reached
  }
  else if (cmd == "DISARM")
  {
    cfg.armed = false;
    storageSaveConfig(cfg);
    return "DISARMED #" + cfg.unitId;
  }
  else if (cmd == "ARM")
  {
    cfg.armed = true;
    storageSaveConfig(cfg);
    return "ARMED #" + cfg.unitId;
  }
  else if (cmd == "SETGPS")
  {
    float newThresh = arg.toFloat();
    if (newThresh > 0 && newThresh < 10000)
    {
      cfg.gpsMoveThresholdM = newThresh;
      storageSaveConfig(cfg);
      return "GPS THR " + String((int)newThresh) + "m SET #" + cfg.unitId;
    }
    return "SETGPS ERR — valid range 1-9999";
  }
  else if (cmd == "SETHOUR")
  {
    int h = arg.toInt();
    if (h >= 0 && h <= 23)
    {
      cfg.healthHour = h;
      storageSaveConfig(cfg);
      return "HEALTH HOUR " + String(h) + " SET #" + cfg.unitId;
    }
    return "SETHOUR ERR — valid 0-23";
  }
  else if (cmd == "SETPIN")
  {
    bool pinValid = (arg.length() == 4);
    for (int i = 0; i < arg.length() && pinValid; i++)
    {
      if (!isDigit(arg[i]))
      {
        pinValid = false;
      }
    }
    if (pinValid)
    {
      cfg.cmdPin = arg;
      storageSaveConfig(cfg);
      return "PIN UPDATED #" + cfg.unitId; // Send before saving new PIN
    }
    return "SETPIN ERR — must be 4 digits";
  }
  else if (cmd == "QUEUE")
  {
    int q = storageQueueSize();
    return "QUEUE #" + cfg.unitId + " | " + String(q) + " pending";
  }
  else if (cmd == "VERSION")
  {
    return "VER #" + cfg.unitId + " | FW:" + FW_VERSION + " | Boot#" + String(bootCount);
  }

  return "UNKNOWN CMD: " + cmd;
}
