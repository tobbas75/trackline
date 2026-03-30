# Communications Architecture — AI Camera Trap

**Date:** March 2026
**Status:** Design specification
**Applies to:** Camera Trap (primary), Trap Monitor (where noted)

---

## 1. Overview

Three radios, three jobs. No overlap.

| Radio | Function | Direction | Always on? |
|-------|----------|-----------|------------|
| **5G / LTE-M** | Cloud alerts, thumbnail upload, full-res upload (configurable) | Device → Cloud | PSM (sleep), wakes on event |
| **WiFi** | Bulk image offload to phone or network | Device → Phone / Network | Off by default, BLE-triggered |
| **BLE** | Discovery, config, status, WiFi handshake | Phone ↔ Device | Off by default, button-activated |

---

## 2. Radio Specifications

### 2.1 Cellular — 5G RedCap (with LTE-M fallback)

**Module:** TBD — 5G RedCap with LTE-M/NB-IoT fallback capability
**Interface:** Shared 20-pin modem daughter card (same connector as Trap Monitor)
**Bands:** Band 28 (700 MHz, Telstra AU terrestrial) + Band 7 (2600 MHz, Starlink D2C satellite)

Power modes (software-selectable via AT commands):

| Mode | Peak current | Uplink speed | Use case |
|------|-------------|--------------|----------|
| 5G RedCap full | 3–5 A | ~50 Mbps | Full-res burst upload |
| 5G RedCap low-BW | 1–2 A | ~10 Mbps | Thumbnails + metadata |
| LTE-M fallback | 0.5–1 A | ~0.3 Mbps | SMS-equivalent, minimum power |
| PSM (Power Save Mode) | ~5–8 µA | 0 | Default sleep state |
| eDRX | ~1 mA avg | 0 (periodic wake) | Reachable for downlink commands |

**Day 1 operation:** Run in LTE-M fallback mode — identical power profile to current EG800Q.
**D2C launch:** Switch to 5G NR mode via config — full bandwidth, higher power only during transmit.
**Per-event decision:** Firmware selects LTE-M vs 5G based on payload size and battery level.

Both Camera Trap and Trap Monitor use the same 5G RedCap daughter card. Trap Monitor runs permanently throttled to LTE-M — one modem SKU for both products simplifies manufacturing, certification, and spares.

### 2.2 WiFi — Local offload

**Module:** ESP32-C3 (WiFi 4 + BLE 5.0, soldered to main board)
**Antenna:** PCB trace antenna (shared with BLE, time-multiplexed)
**Range:** 10–20 m (sufficient for phone proximity)

Two operating modes:

| Mode | How it works | Use case |
|------|-------------|----------|
| **AP mode** (hotspot) | Camera creates WiFi network, phone connects | Field — no infrastructure |
| **Station mode** (client) | Camera joins known WiFi network | Base camp, research station, farm shed |

Station mode credentials configured via BLE. Camera stores SSID + password, connects opportunistically on wake.

**Power:** ~120 mA when active. Off by default. Auto-shutdown after transfer complete or 10-minute timeout.

### 2.3 BLE — Control channel

**Module:** ESP32-C3 (same chip as WiFi)
**Antenna:** Shared with WiFi (time-multiplexed)
**Range:** ~30 m
**Protocol:** BLE 5.0, GATT server, no pairing required

BLE services:

| Service | Access | Data |
|---------|--------|------|
| Device Info | Read (open) | Device UUID, type, firmware version |
| Status | Read (open) | Battery %, GPS coords, SD card %, image queue count, last sync |
| Config | Read/Write (authenticated) | Capture schedule, sensitivity, operating mode, arm/disarm |
| WiFi Control | Write (authenticated) | Start AP mode, set station credentials |
| WiFi Credentials | Read (authenticated) | AP SSID + password for phone auto-connect |

**No pairing.** BLE uses unencrypted GATT for read-only status. Config writes require app authentication via challenge-response using a shared secret set during device registration.

---

## 3. Activation — Physical Button

All radios are off by default. A physical button on the enclosure enables BLE + WiFi readiness.

### Button options (enclosure decision pending)

| Type | Pros | Cons |
|------|------|------|
| **Magnetic reed switch** | No hole in enclosure, waterproof, insect-proof, no moving parts | Ranger must carry magnet |
| **Capacitive touch** | No hole, no tools | Can false-trigger in rain |
| **IP67 pushbutton** | Proven, intuitive | Adds enclosure penetration point |

**Recommended:** Magnetic reed switch. Magnet on a lanyard or clip attached to ranger's kit. No seal to fail, nothing to corrode.

### Button behaviour

| Action | Result | LED feedback |
|--------|--------|-------------|
| Single press/magnet | Enable BLE advertising + WiFi ready (10 min window) | Slow blink |
| BLE connection established | Extend timeout while connected | Steady on |
| WiFi AP started (via BLE command) | WiFi AP active | Fast blink |
| Transfer complete or timeout | BLE + WiFi shut down | Off |

**LED:** Single status LED visible through IR window or dedicated light pipe. Minimal hardware — the app showing "Connected to TrapCam-07" is the primary feedback.

---

## 4. Connection Flow — AirDrop-Inspired

No Bluetooth pairing. BLE is discovery + command only. WiFi handles data transfer.

```
Ranger arrives at camera
  │
  ├─ Presses button / holds magnet to enclosure
  │    → Camera: BLE advertising ON, LED slow blink
  │
  ├─ Opens Trap Monitor app → "Nearby Cameras" shows TrapCam-07 (23 images)
  │    (or: scans QR tag → app identifies device, checks for BLE signal)
  │
  ├─ Taps "Connect" → BLE exchanges WiFi AP credentials
  │    → Camera: WiFi AP ON, LED fast blink
  │
  ├─ Phone auto-joins camera's WiFi AP
  │    → HTTPS transfer over local WiFi — fast, encrypted
  │    → Progress bar in app: "23/23 images downloaded"
  │
  ├─ Transfer complete
  │    → Camera shuts down WiFi + BLE, LED off
  │
  └─ Ranger walks to next camera
```

### WiFi station mode (base camp)

```
Camera wakes on capture event
  │
  ├─ Scans for known WiFi networks (credentials stored via BLE setup)
  │
  ├─ Known network found?
  │    → YES: Connect, upload queued full-res images to cloud via WiFi
  │    → NO:  Cellular for thumbnails only, full-res stays on SD
  │
  └─ Disconnect, back to sleep
```

---

## 5. QR Code Device Registration

Each device has a laser-engraved stainless steel tag on the enclosure with a QR code.

### QR code contents

Minimal and static — just an identifier:

```
tm://d/{device-uuid}
```

Example: `tm://d/a8f3e2b1-7c44-4e9f-b123-456789abcdef`

The tag never needs updating. All dynamic data (battery, config, status) lives in the app's cached device profile.

### Stainless tag specification

- **Material:** 316 stainless steel (marine grade, tropical-rated)
- **Marking:** Laser engraving — survives rain, UV, mud, heat, termites indefinitely
- **Attachment:** Riveted or welded to enclosure
- **Placement:** Visible without removing device from mount, not obscured by strap/bracket
- **Cost:** ~$1–2 per tag at volume

### Registration flow

```
Admin creates org → "Tiwi Islands Conservation"
  │
  ├─ Receives new device
  │
  ├─ Opens app → "Add Device" → scans QR tag
  │    → Device registered to org
  │    → Set name, GPS location, config, alert preferences
  │    → Device profile cached locally in app
  │
  └─ Device appears in org dashboard for all members
```

### Field scanning (any org member)

```
Org member scans QR tag
  │
  ├─ App recognises device (cached profile, works offline)
  │    → Shows: device name, last known battery, last sync,
  │      GPS coordinates, capture count, config summary
  │    → Option: "Connect via BLE" (if button pressed)
  │    → Option: "Navigate to device" (offline map, cached GPS)
  │    → Option: "Start field check" (auto-logs visit)
  │
  └─ Non-org member scans QR
       → "This device belongs to Tiwi Islands Conservation. Request access?"
```

### QR + BLE integration

Scanning the QR tag pre-identifies the device. When the ranger then presses the physical button:
- App already knows which device to expect on BLE
- Skips "Nearby Cameras" scan — connects directly to the known UUID
- Faster, more reliable connection

---

## 6. Cellular Upload Policy

Full-res image upload over cellular is configurable per device. Settings managed in app, synced to device via BLE or eDRX command.

| Setting | Behaviour |
|---------|-----------|
| **Never** | Thumbnails + metadata only. Full-res stays on SD card. |
| **WiFi only** | Upload full-res when connected to WiFi (station mode or AP offload). |
| **Battery threshold** | Upload full-res over 5G when battery > X% (e.g., 60%). |
| **Always** | Push everything over cellular. For solar/mains-powered deployments. |
| **On demand** | User taps "Fetch full-res" on a specific capture in the app. Device receives command via eDRX, uploads that image only. |

Default: **WiFi only** — safest for battery life.

---

## 7. Firmware Decision Logic

```
On capture event:
  1. ALWAYS → store full-res burst on SD card
  2. ALWAYS → push thumbnail + metadata over cellular (LTE-M / 5G)
  3. Check upload policy:
     a. "Always" or ("Battery threshold" and battery > X%)
        → push full-res over 5G
     b. "WiFi only" → check for known WiFi network
        → found: connect, upload full-res queue
        → not found: skip, queue for next WiFi opportunity
     c. "Never" / "On demand" → skip
  4. Return to PSM sleep

On BLE connect:
  → Expose GATT services (status, config)
  → Accept config changes (authenticated)
  → Accept "start WiFi AP" command
  → NEVER send image data over BLE

On WiFi AP active:
  → Serve queued images over HTTPS
  → Accept firmware OTA updates
  → Auto-shutdown on transfer complete or 10-min timeout

On WiFi station connect:
  → Upload queued full-res to cloud
  → Download pending firmware updates
  → Disconnect when queue empty
```

---

## 8. Alert Types

Push notifications to org members via cellular:

| Alert | Trigger | Priority |
|-------|---------|----------|
| **Species detected** | AI classification confidence > threshold | High |
| **Motion only** | PIR trigger, no species classified | Low |
| **Low battery** | Battery < 20% | Medium |
| **SD card full** | Storage > 90% capacity | Medium |
| **Device offline** | No check-in for 26+ hours | Medium |
| **Firmware update available** | New version pushed to cloud | Low |

Alert preferences configurable per org member in notification settings (existing UI at `/dashboard/settings/notifications`).

---

## 9. Power Impact — Comms Subsystem

### Added to daily sleep budget

| Component | Sleep current | Daily energy |
|-----------|-------------|-------------|
| ESP32-C3 deep sleep | ~5 µA | 0.12 mAh |
| 5G RedCap PSM (vs EG800Q) | ~3 µA additional | 0.07 mAh |
| **Total added sleep draw** | **~8 µA** | **0.19 mAh** |

Negligible impact on existing 37 mAh/day budget.

### Per-event comms cost

| Activity | Current | Duration | Energy |
|----------|---------|----------|--------|
| LTE-M thumbnail push | ~300 mA | 5 s | 0.42 mAh |
| 5G full-res push (10 frames) | ~2 A | 10 s | 5.56 mAh |
| WiFi AP offload (23 images) | ~120 mA | 5 min | 10.0 mAh |
| BLE advertising window | ~15 µA | 10 min | 0.003 mAh |

### Impact scenarios

| Scenario | Added daily cost | % of 37 mAh budget |
|----------|-----------------|-------------------|
| LTE-M thumbnails only (7/day) | 2.92 mAh | 7.9% (unchanged) |
| 5G full-res all species hits (7/day) | 38.9 mAh | 105% (doubles budget — solar recommended) |
| WiFi offload once per week | 1.4 mAh/day avg | 3.8% |
| BLE window once per week | 0.0004 mAh/day avg | negligible |

5G full-res upload at high volume requires solar power or "battery threshold" policy to prevent drain.

---

## 10. Antenna Layout

Two antennas on two separate systems:

| Antenna | Radio | Type | Location |
|---------|-------|------|----------|
| Cellular | 5G RedCap / LTE-M (modem daughter card) | External stub or PCB antenna | Top of enclosure, ground plane clearance |
| WiFi + BLE | ESP32-C3 (main board) | PCB trace antenna | Internal, away from metal enclosure walls |

WiFi and BLE time-multiplex on the ESP32-C3's single antenna — no conflict since they're never active simultaneously (BLE discovers, then hands off to WiFi).

Cellular antenna may need to be external (SMA connector through enclosure) for reliable remote coverage. PCB antenna acceptable for WiFi/BLE given short range requirements.

---

## 11. Security Model

Lightweight security appropriate for remote field deployment.

### Device registration
- QR code scan binds device to org in cloud database
- App stores device secret locally (received from cloud on registration)
- Device secret used for BLE challenge-response authentication

### BLE security
- **Read-only GATT** (device info, status): open, no authentication
- **Config writes** (arm/disarm, schedule, WiFi credentials): challenge-response required
- **No BLE pairing** — avoids pairing state corruption and "unable to connect" issues

### WiFi security
- AP mode: WPA2-PSK, password derived from device secret
- Password exchanged over BLE (authenticated channel) — never broadcast
- Local HTTPS for image transfer (self-signed cert, app pins device fingerprint)

### Physical security
- Stainless QR tag is an identifier only — no secrets in the QR code
- Button activation required for BLE/WiFi — device is radio-silent by default
- Scanning QR without org membership shows device owner and "request access" option

---

## 12. Trap Monitor Comms Comparison

Both products share the same modem daughter card and cellular architecture. Key differences:

| Feature | Camera Trap | Trap Monitor |
|---------|------------|--------------|
| Cellular module | 5G RedCap (throttled to LTE-M day 1) | 5G RedCap (permanently LTE-M mode) |
| WiFi | Yes (ESP32-C3, image offload) | No (ESP32-S3 has WiFi but unused) |
| BLE | Yes (ESP32-C3, config + discovery) | Future option (ESP32-S3 has BLE built in) |
| QR tag | Yes | Yes (same registration flow) |
| Physical button | Yes (enable BLE/WiFi) | Future option (arm/disarm + BLE) |
| Upload policy | Configurable (never / WiFi / threshold / always / on-demand) | SMS only (always) |

Note: Trap Monitor's ESP32-S3 already has WiFi and BLE hardware. BLE config could be enabled in firmware without hardware changes. WiFi offload is not needed (no image data).

---

## 13. Implementation Priority

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| **Phase 1 — Now** | 5G RedCap daughter card (LTE-M mode), QR tag registration, cellular alerts | PCB design, modem sourcing |
| **Phase 2 — Near** | ESP32-C3 integration, BLE discovery + config, WiFi AP offload, AirDrop-style flow | Firmware HAL, app BLE/WiFi features |
| **Phase 3 — D2C** | Enable 5G NR mode, configurable upload policy, station mode WiFi | Starlink D2C AU availability |
| **Phase 4 — Trap Monitor BLE** | Enable BLE on ESP32-S3 for config/status | Firmware update, app changes |
