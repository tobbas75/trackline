/**
 * Remote Trap Monitoring System — Main Firmware
 * Target: ESP32-S3 + Quectel EG800Q-EU (LTE CAT-1bis) + u-blox M10 GPS
 *
 * State Machine:
 *   DEEP_SLEEP → WAKE_ASSESS → COMPOSE_MSG → [GPS_CHECK] →
 *   MODEM_INIT → SEND_MSG → CMD_LISTEN → MODEM_OFF → DEEP_SLEEP
 */

#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <RTClib.h>
#include "config.h"
#include "hal/ModemFactory.h" // modem functions (must precede storage.h)
#include "power.h"
#include "gps.h"
#include "messages.h" // EventMessage, formatSMS (must precede storage.h)
#include "storage.h"  // needs EventMessage, formatSMS, modemSendSMS
#include "leds.h"
#include "sensors.h"
#include "commands.h"

// ── Wake Reason ───────────────────────────────────────────────────────────────
enum WakeReason
{
  WAKE_TRAP,
  WAKE_RTC_HEALTH,
  WAKE_RTC_RETRY,
  WAKE_BOOT
};

// ── State Machine ─────────────────────────────────────────────────────────────
enum State
{
  STATE_WAKE_ASSESS,
  STATE_COMPOSE_MSG,
  STATE_GPS_CHECK,
  STATE_MODEM_INIT,
  STATE_SEND_MSG,
  STATE_CMD_LISTEN,
  STATE_MODEM_OFF,
  STATE_SLEEP
};

// ── Globals ───────────────────────────────────────────────────────────────────
RTC_DS3231 rtc;
SystemConfig cfg;
EventMessage currentMsg;
WakeReason wakeReason;
State state = STATE_WAKE_ASSESS;

// ── RTC RAM — survives deep sleep ─────────────────────────────────────────────
RTC_DATA_ATTR float lastKnownLat = 0.0;
RTC_DATA_ATTR float lastKnownLng = 0.0;
RTC_DATA_ATTR bool hasLastGPS = false;
RTC_DATA_ATTR int bootCount = 0;
bool criticalBatteryWake = false;

// ── Config Validation ─────────────────────────────────────────────────────────
void validateConfig(const SystemConfig &cfg) {
  bool hasWarnings = false;

  Serial.println("[CONFIG] Validating configuration...");

  if (cfg.unitId == FACTORY_UNIT_ID) {
    Serial.println("[CONFIG WARNING] Unit ID is factory default ('TRAP_001') — set a unique ID before deployment");
    hasWarnings = true;
  }

  if (cfg.smsNumber == FACTORY_SMS_NUMBER) {
    Serial.println("[CONFIG WARNING] SMS number is factory default ('+61400000000') — set the real alert recipient number");
    hasWarnings = true;
  }

  if (cfg.cmdPin == FACTORY_CMD_PIN) {
    Serial.println("[CONFIG WARNING] Command PIN is factory default ('0000') — set a secure PIN before deployment");
    hasWarnings = true;
  }

  if (hasWarnings) {
    Serial.println("[CONFIG WARNING] *** DEVICE IS USING UNCUSTOMIZED DEFAULTS — NOT READY FOR DEPLOYMENT ***");
    // Blink amber LED 5 times rapidly to give visual indication
    for (int i = 0; i < 5; i++) {
      ledSet(LED_AMBER, BLINK_SOLID);
      delay(200);
      ledSet(LED_AMBER, OFF);
      delay(200);
    }
  } else {
    Serial.println("[CONFIG] Configuration OK");
  }
}

// Forward declarations
uint64_t calculateNextSleep(SystemConfig &cfg, RTC_DS3231 &rtc);

bool queueForRetryOrDrop(EventMessage msg, const SystemConfig &cfg, bool fromRetryQueue)
{
  if (fromRetryQueue)
  {
    msg.retryAttempts++;
    int retryLimit = cfg.smsRetryCount > 0 ? cfg.smsRetryCount : SMS_RETRY_COUNT;
    Serial.printf("[MARKER][RETRY] Incremented retries to %d/%d for %s\n",
                  msg.retryAttempts, retryLimit, msg.type.c_str());
    if (msg.retryAttempts >= retryLimit)
    {
      Serial.printf("[RETRY] Dropping message after %d failed retries\n", msg.retryAttempts);
      Serial.printf("[MARKER][RETRY] Drop triggered for %s\n", msg.type.c_str());
      return false;
    }
  }

  Serial.printf("[MARKER][RETRY] Queueing message type=%s retries=%d\n",
                msg.type.c_str(), msg.retryAttempts);
  storageEnqueue(msg);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
void setup()
{
  Serial.begin(115200);
  bootCount++;

  // Init LEDs first for immediate visual feedback
  ledsInit();
  ledSet(LED_AMBER, BLINK_FAST);

  // Init filesystem
  if (!LittleFS.begin(true))
  {
    Serial.println("[FATAL] LittleFS mount failed");
    ledSet(LED_RED, BLINK_SOLID);
    delay(5000);
    ESP.restart();
  }

  // Load config from flash (or create defaults)
  storageLoadConfig(cfg);

  // Validate config — warn if factory defaults are still in use
  validateConfig(cfg);

  // Init RTC
  Wire.begin(RTC_SDA_PIN, RTC_SCL_PIN);
  if (!rtc.begin())
  {
    Serial.println("[WARN] RTC not found — using millis() fallback");
  }

  // Init GPS (u-blox M10 on Serial2 — powered off until needed)
  gpsInit();

  // Determine wake reason
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  switch (cause)
  {
  case ESP_SLEEP_WAKEUP_EXT0:
    wakeReason = WAKE_TRAP;
    break;
  case ESP_SLEEP_WAKEUP_TIMER:
    wakeReason = WAKE_RTC_HEALTH;
    break;
  default:
    wakeReason = WAKE_BOOT;
    break;
  }

  int queuedCount = storageQueueSize();
  if (queuedCount > 0 && cause == ESP_SLEEP_WAKEUP_TIMER)
  {
    wakeReason = WAKE_RTC_RETRY;
  }

  Serial.printf("[BOOT] #%d | Wake: %d | Queue: %d\n", bootCount, wakeReason, queuedCount);

  // Check battery — abort if critical
  int battPct = powerGetBatteryPct();
  if (battPct <= CRIT_BATT_THRESHOLD && battPct > 0)
  {
    Serial.println("[POWER] Critical battery — attempting last-gasp TX");
    currentMsg = composeLastGasp(cfg, battPct);
    criticalBatteryWake = true;
    state = STATE_MODEM_INIT;
  }
  else
  {
    criticalBatteryWake = false;
    state = STATE_WAKE_ASSESS;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void loop()
{
  switch (state)
  {

  // ── WAKE ASSESS ───────────────────────────────────────────────────────────
  case STATE_WAKE_ASSESS:
  {
    int battPct = powerGetBatteryPct();
    bool solarOk = powerIsSolarCharging();

    Serial.printf("[ASSESS] Batt: %d%% | Solar: %s | Wake: %d\n",
                  battPct, solarOk ? "OK" : "FAULT", wakeReason);

    // Build message based on wake reason
    bool hasMessage = true;
    switch (wakeReason)
    {
    case WAKE_TRAP:
      if (!cfg.armed)
      {
        Serial.println("[ASSESS] Disarmed — suppressing trap alert, going back to sleep");
        state = STATE_SLEEP;
        break;
      }
      currentMsg = composeTrapAlert(cfg, battPct, solarOk);
      ledSet(LED_GREEN, BLINK_3X);
      break;
    case WAKE_RTC_HEALTH:
      currentMsg = composeHealthCheck(cfg, battPct, solarOk);
      break;
    case WAKE_RTC_RETRY:
      currentMsg = storageDequeueNext();
      if (currentMsg.type.length() == 0)
      {
        Serial.println("[ASSESS] Retry wake but queue is empty — sleeping");
        state = STATE_SLEEP;
        hasMessage = false;
      }
      else
      {
        Serial.printf("[MARKER][RETRY] Dequeued type=%s retries=%d\n",
                      currentMsg.type.c_str(), currentMsg.retryAttempts);
      }
      break;
    case WAKE_BOOT:
      // First boot — send health + always include GPS
      currentMsg = composeHealthCheck(cfg, battPct, solarOk);
      currentMsg.forceGPS = true;
      break;
    }

    if (!hasMessage)
    {
      break;
    }

    // Low battery override — force alert SMS regardless
    if (battPct <= cfg.lowBattThreshold && battPct > CRIT_BATT_THRESHOLD)
    {
      currentMsg.addLowBattWarning = true;
    }

    state = STATE_COMPOSE_MSG;
    break;
  }

  // ── COMPOSE MESSAGE ───────────────────────────────────────────────────────
  case STATE_COMPOSE_MSG:
  {
    // Read expansion sensors (compiles to nothing if no sensors enabled)
    SensorData sensors = readSensors();
    String sensorStr = formatSensorSMS(sensors);
    if (sensorStr.length() > 0)
    {
      currentMsg.sensorSuffix = sensorStr;
    }
    String sensorAlert = checkSensorAlerts(sensors);
    if (sensorAlert.length() > 0)
    {
      // Queue a separate alert SMS for sensor threshold breaches
      EventMessage alertMsg;
      alertMsg.type = "ALERT";
      alertMsg.priority = msgPriorityFromType(alertMsg.type);
      alertMsg.unitId = cfg.unitId;
      alertMsg.timestamp = getCurrentTimestamp();
      alertMsg.sensorSuffix = sensorAlert;
      storageEnqueue(alertMsg);
    }

    // Check if GPS is needed
    bool needGPS = currentMsg.forceGPS;
    if (!needGPS && hasLastGPS)
    {
      // Check if unit has moved — requires current GPS fix to compare
      // We'll get a fix and compare, skip TX of coords if within threshold
      needGPS = true; // Always get fix to check movement
    }

    state = needGPS ? STATE_GPS_CHECK : STATE_MODEM_INIT;
    break;
  }

  // ── GPS CHECK ─────────────────────────────────────────────────────────────
  case STATE_GPS_CHECK:
  {
    Serial.println("[GPS] Acquiring fix...");
    GPSFix fix = gpsGetFix(GPS_TIMEOUT_S);

    if (fix.valid)
    {
      float distMoved = hasLastGPS
                            ? gpsDistance(lastKnownLat, lastKnownLng, fix.lat, fix.lng)
                            : 999.0f; // First boot — always include

      Serial.printf("[GPS] Fix: %.6f, %.6f | Moved: %.1fm\n",
                    fix.lat, fix.lng, distMoved);

      if (distMoved >= cfg.gpsMoveThresholdM || currentMsg.forceGPS)
      {
        currentMsg.lat = fix.lat;
        currentMsg.lng = fix.lng;
        currentMsg.hasGPS = true;
        lastKnownLat = fix.lat;
        lastKnownLng = fix.lng;
        hasLastGPS = true;
        Serial.println("[GPS] Including coords — movement detected or forced");
      }
      else
      {
        Serial.println("[GPS] Stationary — GPS omitted from TX");
        currentMsg.hasGPS = false;
      }
    }
    else
    {
      Serial.println("[GPS] No fix — using last known");
      if (hasLastGPS)
      {
        currentMsg.lat = lastKnownLat;
        currentMsg.lng = lastKnownLng;
        currentMsg.hasGPS = true;
        currentMsg.gpsStale = true;
      }
    }

    state = STATE_MODEM_INIT;
    break;
  }

  // ── MODEM INIT ────────────────────────────────────────────────────────────
  case STATE_MODEM_INIT:
  {
    ledSet(LED_AMBER, BLINK_FAST);
    Serial.println("[MODEM] Powering on...");

    bool registered = false;
    for (int attempt = 0; attempt < MODEM_POWER_CYCLES; attempt++)
    {
      if (modemInit(cfg.apn))
      {
        registered = true;
        break;
      }
      Serial.printf("[MODEM] Init failed attempt %d — power cycling\n", attempt + 1);
      modemPowerCycle();
      delay(5000);
    }

    if (!registered)
    {
      Serial.println("[MODEM] Failed — storing to queue, scheduling retry");
      bool queued = queueForRetryOrDrop(currentMsg, cfg, wakeReason == WAKE_RTC_RETRY);
      if (!queued)
      {
        Serial.println("[MODEM] Message dropped after max retries");
      }
      state = STATE_MODEM_OFF;
    }
    else
    {
      ledSet(LED_GREEN, BLINK_SLOW);
      state = STATE_SEND_MSG;
    }
    break;
  }

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  case STATE_SEND_MSG:
  {
    String smsText = formatSMS(currentMsg, cfg);
    Serial.printf("[SMS] Sending to %s: %s\n", cfg.smsNumber.c_str(), smsText.c_str());

    bool sent = modemSendSMS(cfg.smsNumber, smsText);

    if (sent)
    {
      Serial.println("[SMS] Sent OK");
      ledSet(LED_GREEN, BLINK_3X);

      // Also POST to API if configured
      if (cfg.apiEndpoint.length() > 0)
      {
        modemPostJSON(cfg.apiEndpoint, currentMsg);
      }
      // Flush any queued messages now we have signal
      storageFlushQueue(cfg);
    }
    else
    {
      Serial.println("[SMS] Failed — queuing for retry");
      bool queued = queueForRetryOrDrop(currentMsg, cfg, wakeReason == WAKE_RTC_RETRY);
      if (!queued)
      {
        Serial.println("[SMS] Max retries hit — dropping message");
      }
      ledSet(LED_RED, BLINK_1X);
    }

    if (criticalBatteryWake)
    {
      Serial.println("[POWER] Critical cycle — skipping command listen");
      state = STATE_MODEM_OFF;
    }
    else
    {
      state = STATE_CMD_LISTEN;
    }
    break;
  }

  // ── COMMAND LISTEN ────────────────────────────────────────────────────────
  case STATE_CMD_LISTEN:
  {
    unsigned long startTime = millis();
    unsigned long deadline = startTime + (CMD_LISTEN_WINDOW_S * 1000UL);
    unsigned long maxDuration = CMD_LISTEN_WINDOW_S * 3UL * 1000UL; // Safety cap: 3x base window
    Serial.printf("[CMD] Listening for %ds (grace: %ds, max: %lus)\n",
                  CMD_LISTEN_WINDOW_S, CMD_LISTEN_GRACE_S, maxDuration / 1000UL);

    while (millis() < deadline)
    {
      String inbound = modemCheckIncomingSMS();
      if (inbound.length() > 0)
      {
        Serial.printf("[CMD] Inbound: %s\n", inbound.c_str());
        String response = commandProcess(inbound, cfg, rtc);
        if (response.length() > 0)
        {
          modemSendSMS(cfg.smsNumber, response);
        }

        // Grace period: extend if command arrived near end of window (FW-03)
        unsigned long remaining = deadline - millis();
        unsigned long graceMs = CMD_LISTEN_GRACE_S * 1000UL;
        unsigned long elapsed = millis() - startTime;
        if (remaining < graceMs && elapsed < maxDuration)
        {
          deadline = millis() + graceMs;
          Serial.printf("[CMD] Grace period — extended listen (%lus elapsed)\n", elapsed / 1000UL);
        }
      }
      delay(1000);
    }
    Serial.println("[CMD] Listen window closed");
    state = STATE_MODEM_OFF;
    break;
  }

  // ── MODEM OFF ─────────────────────────────────────────────────────────────
  case STATE_MODEM_OFF:
  {
    modemPowerOff();
    Serial.println("[MODEM] Powered off");
    state = STATE_SLEEP;
    break;
  }

  // ── SLEEP ─────────────────────────────────────────────────────────────────
  case STATE_SLEEP:
  {
    // Save config (in case commands updated it)
    storageSaveConfig(cfg);

    // Calculate next wake time
    uint64_t sleepUs = calculateNextSleep(cfg, rtc);
    Serial.printf("[SLEEP] Going to sleep for %llus\n", sleepUs / 1000000ULL);

    // Configure wake sources
    esp_sleep_enable_ext0_wakeup((gpio_num_t)TRAP_TRIGGER_PIN, 1); // HIGH = trap fired
    esp_sleep_enable_timer_wakeup(sleepUs);

    // Ensure GPS module is powered off for deep sleep current savings
    gpsPowerOff();

    ledSet(LED_ALL, OFF);
    delay(100);

    // Atomic trap check before sleep entry (FW-04 fix)
    // Disable interrupts, read pin, decide whether to sleep or re-process.
    // ext0 wakeup only triggers DURING deep sleep — if the trap fired between
    // configuring ext0 and entering sleep, it would be missed until next
    // scheduled wake (potentially hours).
    portDISABLE_INTERRUPTS();
    bool trapPending = (digitalRead(TRAP_TRIGGER_PIN) == HIGH);
    if (trapPending)
    {
      portENABLE_INTERRUPTS();
      Serial.println("[SLEEP] Trap trigger detected before sleep — re-processing");
      wakeReason = WAKE_TRAP;
      state = STATE_WAKE_ASSESS;
      break;
    }
    portENABLE_INTERRUPTS();

    esp_deep_sleep_start();
    break; // Never reached
  }
  }
}

// ── Calculate next sleep duration ─────────────────────────────────────────────
uint64_t calculateNextSleep(SystemConfig &cfg, RTC_DS3231 &rtc)
{
  int queued = storageQueueSize();
  if (queued > 0)
  {
    // Queue has pending items — retry soon.
    Serial.printf("[MARKER][SLEEP] Queue pending (%d), using retry interval %ds\n",
                  queued, SMS_RETRY_INTERVAL_S);
    return (uint64_t)SMS_RETRY_INTERVAL_S * 1000000ULL;
  }

  // Calculate seconds until next health check
  DateTime now = rtc.now();
  int currentHour = now.hour();
  int currentMin = now.minute();
  int targetHour = cfg.healthHour;
  int targetMin = cfg.healthMinute;

  int currentTotalMin = currentHour * 60 + currentMin;
  int targetTotalMin = targetHour * 60 + targetMin;

  int minsUntil = targetTotalMin - currentTotalMin;
  if (minsUntil <= 0)
    minsUntil += 1440; // Next day

  uint64_t healthSleepUs = (uint64_t)(minsUntil * 60) * 1000000ULL;

  // Keep a periodic heartbeat wake window even if daily health target is far away.
  uint64_t heartbeatUs = (uint64_t)CMD_POLL_INTERVAL_HR * 3600ULL * 1000000ULL;
  if (heartbeatUs == 0)
  {
    Serial.printf("[MARKER][SLEEP] Heartbeat disabled, health interval %llus\n",
                  healthSleepUs / 1000000ULL);
    return healthSleepUs;
  }
  uint64_t sleepUs = (healthSleepUs < heartbeatUs) ? healthSleepUs : heartbeatUs;
  Serial.printf("[MARKER][SLEEP] health=%llus heartbeat=%llus selected=%llus\n",
                healthSleepUs / 1000000ULL,
                heartbeatUs / 1000000ULL,
                sleepUs / 1000000ULL);
  return sleepUs;
}
