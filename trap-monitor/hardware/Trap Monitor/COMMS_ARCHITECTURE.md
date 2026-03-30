# Communications Architecture — Trap Monitor

**Date:** March 2026
**Status:** Design specification
**Related:** Camera Trap comms spec at `../Camera Trap/COMMS_ARCHITECTURE.md`

---

## 1. Overview

The Trap Monitor has simpler comms requirements than the Camera Trap — no image data, just short event messages. But it shares the same modem daughter card and benefits from the same QR registration and BLE config system.

The ESP32-S3 on the Trap Monitor already has WiFi and BLE hardware built in — no additional radio modules needed.

| Radio | Function | Status |
|-------|----------|--------|
| **5G / LTE-M** | SMS alerts, HTTP event push to cloud | Active (modem daughter card) |
| **BLE** | Discovery, config, status, arm/disarm | Available (ESP32-S3 built-in, firmware TBD) |
| **WiFi** | Not required (no bulk data to offload) | Available but unused |

---

## 2. Cellular — 5G RedCap (LTE-M Mode)

**Module:** Same 5G RedCap daughter card as Camera Trap
**Interface:** Shared 20-pin modem daughter card (Hirose DF12)
**Operating mode:** Permanently throttled to LTE-M — identical power to current EG800Q

| Mode | Current | Use case |
|------|---------|----------|
| LTE-M (default) | 0.5–1 A | SMS + HTTP push |
| PSM (sleep) | ~5–8 µA | Default state between events |
| eDRX | ~1 mA avg | Reachable for remote commands |

The Trap Monitor never needs 5G bandwidth. Running the same 5G RedCap module in LTE-M fallback mode gives:
- **One modem SKU** across both products
- **One certification** (most expensive part of cellular compliance)
- **One daughter card PCB** design
- **Identical power consumption** to current EG800Q when throttled
- **Future flexibility** if the product ever needs more bandwidth

### Cellular event types

| Event | Payload | Method |
|-------|---------|--------|
| Trap triggered | Unit ID, GPS, battery %, timestamp | SMS (160 char) + HTTP POST |
| Heartbeat | Unit ID, GPS, battery %, signal strength | HTTP POST |
| Low battery | Unit ID, battery % | SMS + HTTP POST |
| Armed/disarmed | Unit ID, new state | HTTP POST |
| Remote command ack | Command ID, result | HTTP POST |

SMS remains the primary alert channel (works without internet). HTTP POST to Supabase edge function is secondary.

---

## 3. BLE — Config and Status

**Hardware:** ESP32-S3 built-in BLE 5.0 (already on board, no additional components)
**Antenna:** ESP32-S3 PCB antenna
**Range:** ~30 m
**Activation:** Physical button press (same button as arm/disarm, context-dependent)

### BLE GATT services

| Service | Access | Data |
|---------|--------|------|
| Device Info | Read (open) | Device UUID, type, firmware version, hardware revision |
| Status | Read (open) | Battery %, GPS coords, signal strength, armed state, last event |
| Config | Read/Write (authenticated) | Check-in interval, SMS number, alert preferences, arm/disarm |
| Firmware | Write (authenticated) | OTA firmware update (ESP32-S3 OTA partition) |

### What BLE replaces

Currently, Trap Monitor configuration requires either:
- Physical access to serial port (development only)
- SMS commands to the device
- Cloud-side config pushed via eDRX

BLE config is faster, works offline, and doesn't use cellular data. A ranger walks up, scans the QR tag, opens the app, and changes settings directly over BLE.

### No WiFi needed

The Trap Monitor has no bulk data to offload. WiFi hardware exists on the ESP32-S3 but stays unused. If a future use case emerges (e.g., batch firmware updates at base camp), it can be enabled in firmware without hardware changes.

---

## 4. QR Code Device Registration

Same system as Camera Trap — stainless steel tag, laser-engraved QR code.

### QR code format

```
tm://d/{device-uuid}
```

Same URI scheme for both products. The app determines device type from the UUID lookup.

### Tag specification

- **Material:** 316 stainless steel (marine grade)
- **Marking:** Laser engraving
- **Attachment:** Riveted to enclosure (or adhesive-backed for ABS Hammond box)
- **Placement:** External, visible without opening enclosure or removing from mount
- **Cost:** ~$1–2 per tag at volume

### Registration flow

Identical to Camera Trap:

```
Admin creates org
  → "Add Device" → scans QR tag
  → Device registered to org
  → Set name, trap type, GPS location, alert preferences
  → Device profile cached locally in app
```

### Field scanning

```
Org member scans QR
  → App shows cached device profile (works offline):
    device name, battery, last event, armed state, GPS
  → "Connect via BLE" (if button pressed)
  → "Navigate to device" (offline map)
  → "Start field check" (auto-logs visit)
```

---

## 5. Physical Button

The Trap Monitor already needs a button for arm/disarm. This same button enables BLE.

### Button behaviour

| Action | Result |
|--------|--------|
| **Short press** | Toggle arm/disarm state (existing function) |
| **Long press (3s)** | Enable BLE advertising for 10 minutes |
| **BLE connection established** | Extend timeout while connected |
| **Timeout or disconnect** | BLE off |

A magnetic reed switch is recommended (same as Camera Trap) for weatherproofing, but the Trap Monitor's simpler enclosure could also use an IP67 pushbutton since it's smaller and more accessible.

### LED feedback

| State | LED |
|-------|-----|
| Armed | Green pulse (existing) |
| Disarmed | Off (existing) |
| BLE advertising | Blue slow blink (or green double-blink to reuse existing LED) |
| BLE connected | Blue steady (or green steady) |

If the enclosure only has one LED, overload the green LED with different blink patterns. A second LED colour is nicer but not essential.

---

## 6. Firmware Architecture

### Transport abstraction

```
IModem (existing)
  → sendSMS()          — trap trigger alerts
  → postJSON()         — event data to cloud
  → getRSSI()          — signal quality
  → powerOff() / PSM   — sleep between events

IBLEService (new)
  → startAdvertising()  — called on long button press
  → stopAdvertising()   — called on timeout
  → onConnect()         — client connected callback
  → onWrite()           — config change received
  → getStatus()         — build status response for GATT read
```

`IBLEService` is implemented on ESP32-S3 using the NimBLE stack (already supported in ESP-IDF / Arduino). No new hardware dependencies.

### Event flow with BLE

```
Trap trigger:
  1. Wake from deep sleep
  2. Read sensors (reed switch state, battery, GPS)
  3. Send SMS via IModem
  4. POST event to cloud via IModem
  5. Return to deep sleep
  (BLE is NOT activated on trap trigger — saves power)

Button long press:
  1. Enable BLE advertising
  2. Start 10-minute timer
  3. Wait for connection or timeout
  4. On connection: serve GATT, accept config writes
  5. On timeout/disconnect: disable BLE, return to low-power state

Heartbeat (periodic):
  1. Wake from deep sleep
  2. POST status to cloud (battery, GPS, signal, armed state)
  3. Check for pending commands via eDRX
  4. Return to deep sleep
```

---

## 7. Power Impact

### BLE costs (only when activated)

| Activity | Current | Duration | Energy |
|----------|---------|----------|--------|
| BLE advertising | ~15 µA | 10 min max | 0.003 mAh |
| BLE connected (GATT serving) | ~5 mA | 2–5 min typical | 0.08–0.42 mAh |
| ESP32-S3 BLE stack overhead | ~30 mA | During BLE session | included above |

Per visit: ~0.1–0.5 mAh. Negligible even on the Trap Monitor's smaller battery.

### No daily impact

BLE is off by default. No sleep current increase. Only active during ranger visits.

The 5G RedCap module in LTE-M mode has identical sleep current (~5–8 µA PSM) to the current EG800Q. No daily budget change.

---

## 8. Comparison with Camera Trap Comms

| Feature | Trap Monitor | Camera Trap |
|---------|-------------|-------------|
| Cellular module | 5G RedCap (LTE-M only) | 5G RedCap (LTE-M → 5G) |
| Cellular use | SMS + HTTP events | Thumbnails + full-res upload |
| WiFi | Hardware present, unused | ESP32-C3, image offload |
| BLE | ESP32-S3 built-in | ESP32-C3 |
| QR tag | Yes (same system) | Yes (same system) |
| Physical button | Arm/disarm + BLE enable | BLE/WiFi enable |
| Upload policy | Always send (SMS is tiny) | Configurable (never/WiFi/threshold/always/on-demand) |
| Data volume | ~140 bytes per event | 30 KB–40 MB per event |

### Shared components

- Same modem daughter card (5G RedCap, 20-pin Hirose DF12)
- Same QR tag format (`tm://d/{uuid}`)
- Same app registration flow
- Same BLE GATT service structure (device info, status, config)
- Same stainless steel tag specification

---

## 9. Implementation Priority

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1 — Now** | 5G RedCap daughter card (LTE-M mode), QR tag on enclosure | Hardware design, tag sourcing |
| **Phase 2 — Near** | BLE config via ESP32-S3, button long-press, app BLE support | Firmware + app development |
| **Phase 3 — Later** | OTA firmware updates via BLE, remote config sync | Firmware + cloud |
| **Phase 4 — If needed** | WiFi on ESP32-S3 for batch firmware updates at base camp | Firmware only |
