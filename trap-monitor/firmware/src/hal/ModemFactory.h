#pragma once
/**
 * Modem Factory
 *
 * Returns the correct IModem implementation based on MODEM_MODEL in config.h.
 * This is the ONLY place hardware model selection happens.
 *
 * To add a new modem:
 *   1. Create firmware/src/hal/modems/YourModem.h implementing IModem
 *   2. Add #include and else-if block below
 *   3. Set MODEM_MODEL "YOURMODEM" in config.h
 *   4. Recompile — nothing else changes
 */

#include "IModem.h"
#include "modems/EG800Q.h"
#include "modems/SIM7080G.h"
#include "modems/RedCap5G.h"

IModem *createModem()
{
  String model = MODEM_MODEL;
  model.toUpperCase();

  if (model == "EG800Q")
    return new EG800Q();
  else if (model == "SIM7080G")
    return new SIM7080G();
  else if (model == "REDCAP5G")
    return new RedCap5G();
  else
  {
    Serial.printf("[HAL] Unknown MODEM_MODEL '%s' — defaulting to EG800Q\n", MODEM_MODEL);
    return new EG800Q();
  }
}

// ── Global modem instance + free function wrappers ────────────────────────────
// Created on first call to modemInit(). All firmware code calls these wrappers
// so it never needs to know which IModem implementation is running.
static IModem *_modem = nullptr;

inline bool modemInit(const String &apn)
{
  if (!_modem)
    _modem = createModem();
  return _modem->init(apn);
}
inline void modemPowerOff()
{
  if (_modem)
    _modem->powerOff();
}
inline void modemPowerCycle()
{
  if (_modem)
    _modem->powerCycle();
}
inline bool modemSendSMS(const String &num, const String &txt)
{
  return _modem ? _modem->sendSMS(num, txt) : false;
}
inline String modemCheckIncomingSMS() { return _modem ? _modem->checkIncomingSMS() : ""; }
inline int modemGetRSSI() { return _modem ? _modem->getRSSI() : 0; }
inline bool modemIsRegistered() { return _modem ? _modem->isRegistered() : false; }

// postJSON helper — serialises EventMessage to JSON for HTTP path
struct EventMessage; // forward declaration
inline bool modemPostJSON(const String &url, const EventMessage &msg)
{
  if (!_modem)
    return false;
  // Minimal JSON — extend if HTTP ingest path is activated
  return _modem->postJSON(url, "{}");
}
