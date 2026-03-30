# Modem Daughter Card Interface Specification

**Date:** March 2026
**Applies to:** Camera Trap, Trap Monitor
**Status:** DRAFT — Rev A locked to EG800Q-EU

---

## 1. Purpose

Define a shared modem daughter card interface used by both the Camera Trap (STM32N6 host) and Trap Monitor (ESP32-S3 host). Both products carry the same physical connector and signal definitions. The modem module, RF matching, SIM/eSIM, and antenna connector live on the daughter card. The host main board provides power, UART, and control signals.

This enables:
1. One modem certification covers both products
2. One Telstra/D2C qualification applies to both
3. Modem upgrades (5G RedCap, D2C-native modules) are a card swap, not a redesign
4. Rev A: EG800Q-EU (CAT-1bis). Rev B+: 5G D2C module when available.

---

## 2. Connector

**Connector:** Hirose DF12 20-pin board-to-board (0.5mm pitch), or Molex SlimStack equivalent.
**Mating height:** 1.0–1.5 mm (low profile).
**Keying:** Polarised — cannot be inserted backwards.

For Phase 1 prototype: a 2×10 2.54mm pin header is acceptable for hand assembly and debug access. Production migrates to board-to-board.

---

## 3. Pin Assignment

| Pin | Signal          | Direction (host→card) | Type          | Description |
|-----|-----------------|-----------------------|---------------|-------------|
| 1   | VBAT_MODEM      | →                     | Power         | 3.8V regulated, 3A peak. From host buck converter. |
| 2   | GND             |                       | Ground        | Power ground return. |
| 3   | GND             |                       | Ground        | Power ground return (parallel). |
| 4   | UART_TXD        | →                     | Logic (3.3V)  | Host TX → modem RXD. Level shifted on card if needed. |
| 5   | UART_RXD        | ←                     | Logic (3.3V)  | Modem TXD → host RX. Level shifted on card if needed. |
| 6   | UART_RTS        | →                     | Logic (3.3V)  | Optional flow control. 0R strap to enable. |
| 7   | UART_CTS        | ←                     | Logic (3.3V)  | Optional flow control. 0R strap to enable. |
| 8   | PWRKEY          | →                     | Logic (3.3V)  | Modem power key. Active HIGH pulse. |
| 9   | RESET_N         | →                     | Logic (3.3V)  | Modem hard reset. Active LOW. |
| 10  | STATUS          | ←                     | Logic (3.3V)  | Modem status output. HIGH = modem on. |
| 11  | RI              | ←                     | Logic (3.3V)  | Ring indicator. Pulse on incoming data/SMS. |
| 12  | DTR             | →                     | Logic (3.3V)  | Data terminal ready. Optional. |
| 13  | W_DISABLE       | →                     | Logic (3.3V)  | RF disable. Active LOW = RF off. Normally HIGH. |
| 14  | USB_DP          | ↔                     | USB 2.0       | USB data positive. For modem firmware update / diagnostics. |
| 15  | USB_DM          | ↔                     | USB 2.0       | USB data negative. |
| 16  | SIM_VCC         | ←                     | Power (1.8/3V)| SIM power from modem. Routed to SIM holder on card. |
| 17  | SIM_DATA        | ↔                     | SIM           | SIM I/O (bidirectional). |
| 18  | SIM_CLK         | ←                     | SIM           | SIM clock from modem. |
| 19  | SIM_RST         | ←                     | SIM           | SIM reset from modem. |
| 20  | GND             |                       | Ground        | Signal ground return. |

### Notes

- **Level shifting lives on the daughter card**, not the host. Host signals are 3.3V. The daughter card translates to 1.8V (EG800Q-EU) or whatever the modem requires. This means a 5G module that runs 3.3V logic would skip the level shifters — no host change needed.
- **SIM interface stays on the daughter card.** Nano-SIM holder and optional MFF2 eSIM footprint are on the card. The host never touches SIM lines.
- **Power regulation:** The host provides 3.8V on VBAT_MODEM. If a future modem needs a different voltage, the daughter card carries its own regulator.
- **BSS138 discrete level shifting** is the standard for Rev A (aligns with Trap Monitor March 2026 spec). 4 channels minimum: TXD, RXD, PWRKEY, RESET_N.
- **Antenna connector:** u.FL on the daughter card, pigtail to SMA bulkhead on enclosure. Card carries its own matching network.

---

## 4. Daughter Card Responsibilities

The daughter card contains:
1. Modem module (EG800Q-EU for Rev A)
2. BSS138 level shifters (3.3V host ↔ modem logic level)
3. Nano-SIM holder + optional MFF2 eSIM footprint (DNP)
4. SIM ESD protection (TPD3E001 or equivalent)
5. u.FL antenna connector + PI matching network
6. Modem VBAT decoupling (100µF electrolytic + 10µF ceramic + 100nF, same as Trap Monitor spec)
7. 10kΩ pull-down on PWRKEY (modem side) to prevent spurious toggle during host boot

### Daughter card does NOT contain:
- Buck converter (power comes from host)
- GPS module (separate on host main board)
- Host MCU connections (just the connector)

---

## 5. Host Main Board Responsibilities

The host main board provides:
1. 3.8V regulated rail at ≥3A peak (AP63300 or equivalent buck converter)
2. 3.3V logic on all connector signals
3. UART at 115200 baud (default, configurable in firmware)
4. GPIO control lines for PWRKEY, RESET_N, and optional DTR/W_DISABLE
5. Board-to-board connector footprint at defined location near board edge

---

## 6. Mechanical

| Parameter              | Value |
|------------------------|-------|
| Daughter card size     | 30 × 25 mm max (Rev A, EG800Q-EU) |
| Connector location     | Bottom edge of daughter card |
| Mounting               | Connector friction + 2× M2 standoffs |
| Antenna u.FL           | Top edge, facing enclosure wall |
| Height above host PCB  | 5 mm max (connector + components) |

---

## 7. Rev A Acceptance (EG800Q-EU)

Same criteria as Trap Monitor prototype acceptance:
1. Modem powers reliably across battery range
2. No brownout/reset during SMS TX burst events
3. SMS send/receive passes across repeated cycles
4. Deep sleep current within budget (modem ~8µA in power-off state)
5. SIM detect/provision path validated
6. Packet-data / HTTP POST — optional scope for Rev A

---

## 8. 5G / D2C Upgrade Path

When Starlink D2C matures in Australia and a suitable 5G module is available:
1. Design new daughter card with 5G module on same 20-pin connector
2. Daughter card carries its own level shifters (may not need them if module is 3.3V)
3. Daughter card may need a beefier on-card regulator for 5G TX current (3–5A peak)
4. If on-card regulator is needed, host VBAT_MODEM pin becomes raw battery input or higher-voltage rail
5. USB data pair (pins 14–15) becomes more important for 5G modules that prefer USB over UART
6. Host firmware modem HAL supports both AT-command-over-UART and AT-command-over-USB
7. Same WildTrack API, same JSON event schema, just higher bandwidth payload capability

The Camera Trap benefits most from 5G — it can push full 4K burst sets (25 MB) over D2C instead of 150 KB thumbnails. The Trap Monitor probably stays on CAT-1bis permanently (160-byte SMS is fine).
