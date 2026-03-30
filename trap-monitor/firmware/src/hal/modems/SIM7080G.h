#pragma once
/**
 * Driver: SIMCom SIM7080G
 * Technology: NB-IoT / LTE-M
 * GNSS: Integrated (GPS + GLONASS + BeiDou)
 * Key bands: Band 28 (700MHz AU), global NB-IoT bands
 *
 * NOTE:
 * This is currently a compile-safe stub. TinyGSM dependency was removed from
 * platformio.ini for the EG800Q production path. Implement full SIM7080G AT
 * handling before selecting MODEM_MODEL "SIM7080G".
 */

#include "../IModem.h"
#include "../../config.h"

class SIM7080G : public IModem
{
public:
  bool init(const String &apn) override
  {
    (void)apn;
    Serial.println("[SIM7080G] STUB — implement modem driver before use");
    return false;
  }

  void powerOff() override {}
  void powerCycle() override {}
  bool sendSMS(const String &number, const String &text) override
  {
    (void)number;
    (void)text;
    return false;
  }
  String checkIncomingSMS() override { return ""; }
  bool postJSON(const String &url, const String &json) override
  {
    (void)url;
    (void)json;
    return false;
  }
  int getRSSI() override { return 0; }
  bool isRegistered() override { return false; }
  String getNetworkInfo() override { return "SIM7080G NB-IoT/LTE-M (stub)"; }
};
