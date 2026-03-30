#pragma once
/**
 * Driver: Quectel EG800Q-EU
 * Technology: LTE CAT-1bis (Qualcomm QCX216)
 * Bands: Band 28 (700MHz AU terrestrial) + Band 7 (D2C satellite)
 * GNSS: NONE — GPS handled by separate u-blox M10 module
 * Antenna: Single (no MIMO diversity needed)
 *
 * AT command reference: Quectel EG800Q Series AT Commands Manual V1.x
 * Implements IModem interface.
 */

#include "../IModem.h"
#include "../../config.h"

#define SerialModem Serial1

class EG800Q : public IModem {
public:
  EG800Q() {}

  bool init(const String& apn) override {
    SerialModem.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
    delay(500);

    // Power on sequence
    _powerOn();

    // Wait for AT response
    if (!_sendAT("AT", "OK", 5000)) {
      Serial.println("[EG800Q] No AT response after power on");
      return false;
    }

    // Disable echo
    _sendAT("ATE0", "OK", 1000);

    // Set SMS text mode
    _sendAT("AT+CMGF=1", "OK", 1000);

    // Enable SMS notification to UART
    _sendAT("AT+CNMI=2,1,0,0,0", "OK", 1000);

    // Set APN
    _sendAT("AT+CGDCONT=1,\"IP\",\"" + apn + "\"", "OK", 3000);

    // Wait for network registration (LTE CEREG)
    if (!_waitForNetwork(MODEM_INIT_TIMEOUT_S)) {
      Serial.println("[EG800Q] Network registration failed");
      return false;
    }

    Serial.println("[EG800Q] Registered on network");
    return true;
  }

  void powerOff() override {
    _sendAT("AT+QPOWD=1", "POWERED DOWN", 5000);
    delay(2000);
  }

  void powerCycle() override {
    // Hard reset via RESET_N pin (active LOW)
    pinMode(MODEM_RST_PIN, OUTPUT);
    digitalWrite(MODEM_RST_PIN, LOW);
    delay(300);
    digitalWrite(MODEM_RST_PIN, HIGH);
    delay(3000); // Wait for reboot
  }

  bool sendSMS(const String& number, const String& text) override {
    // Ensure text mode
    if (!_sendAT("AT+CMGF=1", "OK", 1000)) return false;

    // Send header
    SerialModem.print("AT+CMGS=\"");
    SerialModem.print(number);
    SerialModem.println("\"");
    delay(500);

    // Wait for '>' prompt
    unsigned long deadline = millis() + 3000;
    bool gotPrompt = false;
    while (millis() < deadline) {
      if (SerialModem.available()) {
        char c = SerialModem.read();
        if (c == '>') { gotPrompt = true; break; }
      }
    }
    if (!gotPrompt) {
      Serial.println("[EG800Q] No > prompt for SMS body");
      return false;
    }

    // Send body + Ctrl-Z
    SerialModem.print(text);
    SerialModem.write(0x1A);

    // Wait for +CMGS: confirmation (up to 30s for network)
    return _waitFor("+CMGS:", 30000);
  }

  String checkIncomingSMS() override {
    // Check for unread SMS
    _sendAT("AT+CMGF=1", "OK", 1000);
    _lastResponse = "";
    SerialModem.println("AT+CMGL=\"REC UNREAD\"");

    // Read full response
    unsigned long deadline = millis() + 5000;
    while (millis() < deadline) {
      while (SerialModem.available()) {
        char c = SerialModem.read();
        _lastResponse += c;
      }
      if (_lastResponse.indexOf("OK") >= 0 || _lastResponse.indexOf("ERROR") >= 0) break;
      delay(10);
    }

    if (_lastResponse.indexOf("+CMGL:") < 0) return ""; // No unread messages

    // Extract the SMS body (line after the +CMGL: header)
    int headerEnd = _lastResponse.indexOf('\n', _lastResponse.indexOf("+CMGL:"));
    if (headerEnd < 0) return "";
    int bodyEnd = _lastResponse.indexOf('\n', headerEnd + 1);
    String body = (bodyEnd > headerEnd)
      ? _lastResponse.substring(headerEnd + 1, bodyEnd)
      : _lastResponse.substring(headerEnd + 1);
    body.trim();

    // Delete all read messages to free SIM storage
    _sendAT("AT+CMGD=1,1", "OK", 3000);

    return body;
  }

  bool postJSON(const String& url, const String& json) override {
    // Stub — extend with Quectel HTTP AT commands for production
    Serial.printf("[EG800Q] POST stub: %s\n", url.c_str());
    return true;
  }

  int getRSSI() override {
    if (!_sendAT("AT+CSQ", "+CSQ:", 2000)) return 0;
    int idx = _lastResponse.indexOf("+CSQ:");
    if (idx < 0) return 0;
    // +CSQ: rssi,ber — extract rssi (0-31, 99=unknown)
    String val = _lastResponse.substring(idx + 5);
    val.trim();
    int comma = val.indexOf(',');
    if (comma > 0) val = val.substring(0, comma);
    int rssi = val.toInt();
    return (rssi == 99) ? 0 : rssi;
  }

  bool isRegistered() override {
    if (!_sendAT("AT+CEREG?", "+CEREG:", 2000)) return false;
    // +CEREG: n,stat — stat 1=home, 5=roaming
    return (_lastResponse.indexOf(",1") >= 0 || _lastResponse.indexOf(",5") >= 0);
  }

  String getNetworkInfo() override {
    return "EG800Q LTE-CAT1bis";
  }

private:
  String _lastResponse;

  void _powerOn() {
    pinMode(MODEM_PWRKEY_PIN, OUTPUT);
    pinMode(MODEM_RST_PIN, OUTPUT);
    digitalWrite(MODEM_RST_PIN, HIGH); // Not in reset

    // PWRKEY pulse: LOW → HIGH 500ms → LOW
    digitalWrite(MODEM_PWRKEY_PIN, LOW);
    delay(100);
    digitalWrite(MODEM_PWRKEY_PIN, HIGH);
    delay(500);
    digitalWrite(MODEM_PWRKEY_PIN, LOW);
    delay(3000); // EG800Q boot time ~2-3s
  }

  bool _sendAT(const String& cmd, const String& expected, uint16_t timeoutMs) {
    _lastResponse = "";
    SerialModem.println(cmd);
    return _waitFor(expected, timeoutMs);
  }

  bool _waitFor(const String& target, uint16_t timeoutMs) {
    _lastResponse = "";
    unsigned long deadline = millis() + timeoutMs;
    while (millis() < deadline) {
      while (SerialModem.available()) {
        char c = SerialModem.read();
        _lastResponse += c;
        if (target.length() > 0 && _lastResponse.indexOf(target) >= 0) return true;
        if (_lastResponse.indexOf("ERROR") >= 0) return false;
      }
      delay(1);
    }
    return target.length() == 0; // Empty target = fire-and-forget
  }

  bool _waitForNetwork(uint16_t timeoutSec) {
    unsigned long deadline = millis() + (timeoutSec * 1000UL);
    while (millis() < deadline) {
      if (isRegistered()) return true;
      delay(2000);
    }
    return false;
  }
};
