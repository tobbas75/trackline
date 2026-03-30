#pragma once
/**
 * Driver: 5G RedCap (Reduced Capability) — FUTURE STUB
 *
 * 5G RedCap is the 3GPP Release 17 successor to NB-IoT/LTE-M for IoT.
 * Telstra's NB-IoT network is expected to remain active until at least 2030.
 * When RedCap modules become cost-effective (est. 2026–2028), implement here.
 *
 * Candidate modules to evaluate when ready:
 *   - Quectel RG255C-GL (5G RedCap)
 *   - Sierra Wireless RV55 (5G)
 *   - SIMCom SIM8262E (5G)
 *
 * To activate: set MODEM_MODEL "REDCAP5G" in config.h
 */

#include "../IModem.h"

class RedCap5G : public IModem
{
public:
  bool init(const String &apn) override
  {
    Serial.println("[5G-REDCAP] STUB — implement when hardware available");
    return false;
  }

  void powerOff() override {}
  void powerCycle() override {}

  bool sendSMS(const String &number, const String &text) override { return false; }
  String checkIncomingSMS() override { return ""; }
  bool postJSON(const String &url, const String &json) override { return false; }

  int getRSSI() override { return 0; }
  bool isRegistered() override { return false; }
  String getNetworkInfo() override { return "5G RedCap"; }
};
