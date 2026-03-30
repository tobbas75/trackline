# Platform Alignment — Camera Trap & Trap Monitor

**Date:** March 2026
**Purpose:** Document shared interfaces and design decisions between the two products to prevent accidental divergence.

---

## 1. Product Family

| | Trap Monitor | Camera Trap |
|---|---|---|
| **Function** | Trap trigger → SMS alert | PIR → burst capture → AI species ID → alert |
| **MCU** | ESP32-S3-WROOM-1-N8 | STM32N657X0H3Q + STM32U083KCU6 |
| **Modem** | EG800Q-EU (shared daughter card) | EG800Q-EU (shared daughter card) |
| **GPS** | u-blox MAX-M10S | u-blox MAX-M10S |
| **Sensor** | Reed switch | Sony IMX678 + 2× PIR |
| **Storage** | LittleFS (internal flash) | µSD card (128/256 GB) |
| **AI** | None | MegaDetector v5 + AWC species classifier |
| **IR** | None | Modular LED daughter board (strobed) |
| **BOM (volume)** | ~$40–50 | ~$90–110 |
| **Sleep current** | ~84 µA | ~37 µA |
| **Battery** | 2S LiFePO4 6Ah + solar | 12/24 AA NiMH + solar option |

---

## 2. Shared Components (Must Stay Aligned)

### 2.1 Modem Daughter Card

**Specification:** `camera-trap/hardware/MODEM_INTERFACE_SPEC.md`

Both products use the identical modem daughter card. Same 20-pin connector, same signal definitions, same EG800Q-EU module, same BSS138 level shifting, same SIM/eSIM, same antenna connector.

**Alignment rule:** Any change to the modem daughter card must be validated against both host boards.

### 2.2 GPS Module

Both use u-blox MAX-M10S at 9600 baud NMEA on a dedicated UART. Both use the same power gating circuit: GPIO → BSS138 N-FET inverter → SI2301 P-FET → M10 VCC. HIGH = powered.

**Alignment rule:** GPS power gate circuit is identical. If either product changes the gating method, both must change.

### 2.3 Level Shifting Standard

BSS138 discrete level shifting. Standardised in March 2026 change summary for Trap Monitor. Camera Trap follows same standard.

**Alignment rule:** No auto-direction translators (TXB0104 etc.) in either product.

### 2.4 Firmware Comms HAL

The AT command layer, SMS send/receive, MQTT publish, GPS NMEA parsing, and retry logic are shared code. Written as a portable HAL with a UART abstraction that works on both ESP32-S3 (Arduino Serial) and STM32N6 (HAL USART).

**Alignment rule:** Modem HAL API is the same. Platform-specific UART drivers are the only difference.

### 2.5 WildTrack API

Both products post events to the same WildTrack backend. Event schema:

```json
{
  "device_id": "CAM_001",
  "device_type": "camera_trap",
  "event_type": "species_detection",
  "timestamp": "2026-03-13T14:32:00+09:30",
  "location": { "lat": -12.4523, "lng": 130.8891 },
  "battery_pct": 72,
  "payload": {
    "species": "Dasyurus hallucatus",
    "common_name": "Northern Quoll",
    "confidence": 0.92,
    "model_version": "awc_135sp_v2.1",
    "led_module": "940nm_standard",
    "operating_mode": "validation",
    "burst_id": "burst_143200_001",
    "thumbnail_url": "..."
  }
}
```

Trap Monitor event:

```json
{
  "device_id": "TRAP_001",
  "device_type": "trap_monitor",
  "event_type": "trap_triggered",
  "timestamp": "2026-03-13T14:32:00+09:30",
  "location": { "lat": -12.4523, "lng": 130.8891 },
  "battery_pct": 85,
  "payload": {
    "trigger_source": "reed_switch",
    "armed": true
  }
}
```

**Alignment rule:** Same top-level schema. `device_type` and `event_type` differentiate. WildTrack dashboard renders both on the same map.

### 2.6 Enclosure

Enclosures are **separate designs** — deployment contexts are too different to share a form factor. The Camera Trap mounts to trees/posts at height with an IR window and lens port. The Trap Monitor mounts on or near a trap at ground level. Both are IP67 polycarbonate but sized, shaped, and mounted differently. SMA antenna bulkheads and USB-C sealed ports are common components but not shared shells.

---

## 3. Deliberate Divergences (Accepted)

| Area | Trap Monitor | Camera Trap | Reason |
|------|-------------|-------------|--------|
| MCU | ESP32-S3 (3.3V, Arduino) | STM32N6 + U0 (multi-rail, bare-metal/RTOS) | Camera needs NPU + MIPI CSI-2 |
| Battery | 2S LiFePO4 (6.4V) | AA NiMH (config-dependent V) | Trap Monitor needs years of standby; Camera needs months with high burst current |
| Power rails | 3.3V + 3.8V | 1.2V + 1.8V + 3.3V + 3.8V + 5V | Camera sensor and MCU need multiple rails |
| Sleep architecture | Single MCU, ext0 wake | Dual MCU (U0 manages wake) | Camera needs faster wake + more complex power sequencing |
| Storage | Internal flash (LittleFS) | µSD card | Camera stores megabytes of images |
| PCB layers | 2-layer acceptable | 4-layer minimum | STM32N6 BGA + MIPI + xSPI routing |

---

## 4. Combined Deployment Use Case

**Trap triggers → Camera captures:**

A simple wire from the Trap Monitor's spare digital output to the Camera Trap's EXP_DIGITAL input. When the trap fires:

1. Trap Monitor wakes, sends SMS alert ("Trap 14 fired")
2. Simultaneously, the wire pulls the Camera Trap's expansion input HIGH
3. Camera Trap treats this as a PIR-equivalent wake event
4. Camera captures burst, runs AI, sends species alert with photo
5. WildTrack dashboard shows both events correlated by timestamp + location

No firmware changes needed on either side — the Trap Monitor fires a GPIO, the Camera Trap wakes on a digital input. The correlation happens in WildTrack backend based on proximity (same GPS coordinates ± 50m) and timing (within 30 seconds).

---

## 5. Shared Sourcing

| Component | Supplier | Both products |
|-----------|----------|---------------|
| EG800Q-EU | Quectel distributor | ✓ |
| MAX-M10S | Mouser / DigiKey | ✓ |
| BSS138 | LCSC C49139 | ✓ |
| SI2301CDS | LCSC C10487 | ✓ |
| TPD3E001 | LCSC **C470828** (NOT C128632 — that was wrong part!) | ✓ (on modem card, SOT-5X3) |
| Nano-SIM holder | LCSC C266612 | ✓ (on modem card) |
| u.FL connectors | LCSC C88374 | ✓ |
| JST PH connectors | LCSC C131337/8/9 | ✓ |
| AP63300WU-7 | LCSC C2158012 | ✓ (modem buck) |

Shared sourcing reduces MOQ pressure and simplifies procurement.
