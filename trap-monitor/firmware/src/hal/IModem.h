#pragma once
/**
 * Hardware Abstraction Layer — Modem Interface
 *
 * Every modem driver implements this interface.
 * The rest of the firmware ONLY calls these functions — never modem-specific code.
 *
 * GPS is handled separately via gps.h (u-blox M10 on Serial2).
 *
 * To add a new modem:
 *   1. Create firmware/src/hal/modems/YourModem.h
 *   2. Implement all pure virtual methods below
 *   3. Register it in ModemFactory.h
 *   4. Set MODEM_MODEL in config.h
 */

#include <Arduino.h>

class IModem {
public:
  virtual ~IModem() = default;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  virtual bool  init(const String& apn)     = 0;  // Power on + register to network
  virtual void  powerOff()                  = 0;  // Clean shutdown
  virtual void  powerCycle()                = 0;  // Hard reset

  // ── Messaging ──────────────────────────────────────────────────────────────
  virtual bool   sendSMS(const String& number, const String& text) = 0;
  virtual String checkIncomingSMS()                                 = 0;
  virtual bool   postJSON(const String& url, const String& json)   = 0;

  // ── Status ─────────────────────────────────────────────────────────────────
  virtual int    getRSSI()        = 0;   // Signal strength (CSQ 0-31)
  virtual bool   isRegistered()   = 0;   // On network?
  virtual String getNetworkInfo() = 0;   // e.g. "EG800Q LTE-CAT1bis Band28"
};
