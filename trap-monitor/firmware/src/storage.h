#pragma once
#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "config.h"

// Forward references — EventMessage, formatSMS, modemSendSMS are defined in
// headers included before storage.h in main.cpp (messages.h, hal/ModemFactory.h)

inline int storageRetryLimit(const SystemConfig &cfg)
{
  return cfg.smsRetryCount > 0 ? cfg.smsRetryCount : SMS_RETRY_COUNT;
}

inline void storageSerializeMessage(JsonObject entry, const EventMessage &msg)
{
  entry["type"] = msg.type;
  entry["unit"] = msg.unitId;
  entry["ts"] = msg.timestamp;
  entry["retries"] = msg.retryAttempts;
  entry["pri"] = msg.priority;
  entry["batt"] = msg.battPct;
  entry["solar"] = msg.solarOk;
  entry["trap"] = msg.trapCaught;
  entry["gps"] = msg.hasGPS;
  entry["gpsStale"] = msg.gpsStale;
  entry["forceGPS"] = msg.forceGPS;
  entry["lowBattWarn"] = msg.addLowBattWarning;

  if (msg.hasGPS)
  {
    entry["lat"] = msg.lat;
    entry["lng"] = msg.lng;
  }
  if (msg.fwVersion.length() > 0)
  {
    entry["fw"] = msg.fwVersion;
  }
  if (msg.sensorSuffix.length() > 0)
  {
    entry["sensor"] = msg.sensorSuffix;
  }
}

inline EventMessage storageDeserializeMessage(JsonObjectConst entry)
{
  EventMessage msg;
  msg.type = entry["type"] | "";
  msg.unitId = entry["unit"] | "";
  msg.timestamp = entry["ts"] | "";
  msg.retryAttempts = entry["retries"] | 0;
  msg.priority = entry["pri"] | msgPriorityFromType(msg.type);
  msg.battPct = entry["batt"] | -1;
  msg.solarOk = entry["solar"] | true;
  msg.trapCaught = entry["trap"] | false;
  msg.gpsStale = entry["gpsStale"] | false;
  msg.forceGPS = entry["forceGPS"] | false;
  msg.addLowBattWarning = entry["lowBattWarn"] | false;
  msg.fwVersion = entry["fw"] | FW_VERSION;
  msg.sensorSuffix = entry["sensor"] | "";

  JsonVariantConst latVar = entry["lat"];
  JsonVariantConst lngVar = entry["lng"];
  bool explicitGps = entry["gps"] | false;
  if (explicitGps || (!latVar.isNull() && !lngVar.isNull()))
  {
    msg.hasGPS = true;
    msg.lat = latVar.isNull() ? 0.0f : latVar.as<float>();
    msg.lng = lngVar.isNull() ? 0.0f : lngVar.as<float>();
  }

  return msg;
}

// ── Load config from flash ────────────────────────────────────────────────────
void storageLoadConfig(SystemConfig &cfg)
{
  if (!LittleFS.exists(CONFIG_FILE))
  {
    Serial.println("[STORAGE] No config file — using defaults");
    return;
  }
  File f = LittleFS.open(CONFIG_FILE, "r");
  JsonDocument doc;
  if (deserializeJson(doc, f) == DeserializationError::Ok)
  {
    cfg.unitId = doc["unitId"] | DEFAULT_UNIT_ID;
    cfg.smsNumber = doc["smsNumber"] | DEFAULT_SMS_NUMBER;
    cfg.apiEndpoint = doc["apiEndpoint"] | "";
    cfg.cmdPin = doc["cmdPin"] | DEFAULT_CMD_PIN;
    cfg.apn = doc["apn"] | APN;
    cfg.gpsMoveThresholdM = doc["gpsMoveThresholdM"] | GPS_MOVE_THRESHOLD_M;
    cfg.healthHour = doc["healthHour"] | HEALTH_HOUR;
    cfg.healthMinute = doc["healthMinute"] | HEALTH_MINUTE;
    cfg.lowBattThreshold = doc["lowBattThreshold"] | LOW_BATT_THRESHOLD;
    cfg.smsRetryCount = doc["smsRetryCount"] | SMS_RETRY_COUNT;
    cfg.armed = doc["armed"] | true;
    Serial.println("[STORAGE] Config loaded OK");
  }
  f.close();
}

// ── Save config to flash ──────────────────────────────────────────────────────
void storageSaveConfig(const SystemConfig &cfg)
{
  File f = LittleFS.open(CONFIG_FILE, "w");
  JsonDocument doc;
  doc["unitId"] = cfg.unitId;
  doc["smsNumber"] = cfg.smsNumber;
  doc["apiEndpoint"] = cfg.apiEndpoint;
  doc["cmdPin"] = cfg.cmdPin;
  doc["apn"] = cfg.apn;
  doc["gpsMoveThresholdM"] = cfg.gpsMoveThresholdM;
  doc["healthHour"] = cfg.healthHour;
  doc["healthMinute"] = cfg.healthMinute;
  doc["lowBattThreshold"] = cfg.lowBattThreshold;
  doc["smsRetryCount"] = cfg.smsRetryCount;
  doc["armed"] = cfg.armed;
  serializeJson(doc, f);
  f.close();
  Serial.println("[STORAGE] Config saved");
}

// ── Enqueue a message for retry ───────────────────────────────────────────────
void storageEnqueue(const EventMessage &msg)
{
  // Read existing queue
  JsonDocument qDoc;
  JsonArray queue;
  if (LittleFS.exists(QUEUE_FILE))
  {
    File f = LittleFS.open(QUEUE_FILE, "r");
    DeserializationError err = deserializeJson(qDoc, f);
    f.close();
    if (err)
    {
      Serial.println("[QUEUE] Corrupt queue file — recreating");
      qDoc.clear();
    }
    if (!qDoc["q"].is<JsonArray>())
    {
      queue = qDoc["q"].to<JsonArray>();
    }
    else
    {
      queue = qDoc["q"].as<JsonArray>();
    }
  }
  else
  {
    queue = qDoc["q"].to<JsonArray>();
  }

  // Enforce max queue size — evict lowest-priority message (highest pri value)
  while (queue.size() >= MAX_QUEUE_SIZE)
  {
    int evictIdx = 0;
    int lowestPri = queue[0]["pri"] | MSG_PRIORITY_HEALTH;
    for (int i = 1; i < (int)queue.size(); i++)
    {
      int p = queue[i]["pri"] | MSG_PRIORITY_HEALTH;
      if (p > lowestPri)
      {
        lowestPri = p;
        evictIdx = i;
      }
      // If tied, keep evictIdx as-is (older = lower index = evict first among ties)
    }
    Serial.printf("[QUEUE] Overflow — evicting idx=%d pri=%d\n", evictIdx, lowestPri);
    queue.remove(evictIdx);
  }

  // Add new message
  JsonObject entry = queue.add<JsonObject>();
  storageSerializeMessage(entry, msg);

  File f = LittleFS.open(QUEUE_FILE, "w");
  serializeJson(qDoc, f);
  f.close();
  Serial.printf("[QUEUE] Stored — %d items in queue\n", queue.size());
  Serial.printf("[MARKER][QUEUE] Enqueued type=%s retries=%d size=%d\n",
                msg.type.c_str(), msg.retryAttempts, (int)queue.size());
}

// ── Dequeue oldest message ────────────────────────────────────────────────────
EventMessage storageDequeueNext()
{
  EventMessage msg;
  if (!LittleFS.exists(QUEUE_FILE))
    return msg;

  File f = LittleFS.open(QUEUE_FILE, "r");
  JsonDocument qDoc;
  DeserializationError err = deserializeJson(qDoc, f);
  f.close();
  if (err || !qDoc["q"].is<JsonArray>())
  {
    Serial.println("[QUEUE] Failed to parse queue file");
    return msg;
  }

  JsonArray queue = qDoc["q"].as<JsonArray>();
  if (queue.size() == 0)
  {
    LittleFS.remove(QUEUE_FILE);
    return msg;
  }

  // Find highest-priority entry (lowest pri value; oldest if tied)
  int bestIdx = 0;
  int bestPri = queue[0]["pri"] | MSG_PRIORITY_HEALTH;
  for (int i = 1; i < (int)queue.size(); i++)
  {
    int p = queue[i]["pri"] | MSG_PRIORITY_HEALTH;
    if (p < bestPri)
    {
      bestPri = p;
      bestIdx = i;
    }
    // If tied, keep bestIdx (lower index = older = dequeue first)
  }

  JsonObjectConst entry = queue[bestIdx].as<JsonObjectConst>();
  msg = storageDeserializeMessage(entry);
  Serial.printf("[MARKER][QUEUE] Dequeued type=%s pri=%d retries=%d\n",
                msg.type.c_str(), msg.priority, msg.retryAttempts);

  queue.remove(bestIdx);
  if (queue.size() == 0)
  {
    LittleFS.remove(QUEUE_FILE);
  }
  else
  {
    File fw = LittleFS.open(QUEUE_FILE, "w");
    serializeJson(qDoc, fw);
    fw.close();
  }

  return msg;
}

// ── Flush entire queue now we have signal ─────────────────────────────────────
void storageFlushQueue(const SystemConfig &cfg)
{
  if (!LittleFS.exists(QUEUE_FILE))
    return;

  JsonDocument qDoc;
  File f = LittleFS.open(QUEUE_FILE, "r");
  DeserializationError err = deserializeJson(qDoc, f);
  f.close();
  if (err || !qDoc["q"].is<JsonArray>())
  {
    Serial.println("[QUEUE] Failed to parse queue file");
    return;
  }

  JsonArray queue = qDoc["q"].as<JsonArray>();
  int count = queue.size();
  if (count == 0)
  {
    LittleFS.remove(QUEUE_FILE);
    return;
  }

  int retryLimit = storageRetryLimit(cfg);
  Serial.printf("[QUEUE] Flushing %d queued messages\n", count);
  int sentCount = 0;
  while (queue.size() > 0)
  {
    // Find highest-priority entry (lowest pri value; oldest if tied)
    int bestIdx = 0;
    int bestPri = queue[0]["pri"] | MSG_PRIORITY_HEALTH;
    for (int i = 1; i < (int)queue.size(); i++)
    {
      int p = queue[i]["pri"] | MSG_PRIORITY_HEALTH;
      if (p < bestPri)
      {
        bestPri = p;
        bestIdx = i;
      }
    }

    EventMessage msg = storageDeserializeMessage(queue[bestIdx].as<JsonObjectConst>());
    String sms = formatSMS(msg, cfg);
    if (!modemSendSMS(cfg.smsNumber, sms))
    {
      msg.retryAttempts++;
      Serial.printf("[MARKER][QUEUE] Flush fail type=%s pri=%d retries=%d/%d\n",
                    msg.type.c_str(), msg.priority, msg.retryAttempts, retryLimit);
      if (msg.retryAttempts >= retryLimit)
      {
        Serial.printf("[QUEUE] Dropping queued message after %d failed retries\n", msg.retryAttempts);
        Serial.printf("[MARKER][QUEUE] Dropped type=%s after retries\n", msg.type.c_str());
        queue.remove(bestIdx);
      }
      else
      {
        JsonObject update = queue[bestIdx].as<JsonObject>();
        update.clear();
        storageSerializeMessage(update, msg);
      }
      Serial.println("[QUEUE] Flush stopped — send failure, keeping remaining messages");
      break;
    }
    queue.remove(bestIdx);
    sentCount++;
    delay(2000); // Throttle — avoid burst
  }

  if (queue.size() == 0)
  {
    LittleFS.remove(QUEUE_FILE);
    Serial.printf("[QUEUE] Flushed %d messages and cleared queue\n", sentCount);
  }
  else
  {
    File fw = LittleFS.open(QUEUE_FILE, "w");
    serializeJson(qDoc, fw);
    fw.close();
    Serial.printf("[QUEUE] Flushed %d messages, %d remain queued\n", sentCount, (int)queue.size());
  }
}

// ── Queue size ────────────────────────────────────────────────────────────────
int storageQueueSize()
{
  if (!LittleFS.exists(QUEUE_FILE))
    return 0;
  File f = LittleFS.open(QUEUE_FILE, "r");
  JsonDocument qDoc;
  deserializeJson(qDoc, f);
  f.close();
  return qDoc["q"].as<JsonArray>().size();
}
