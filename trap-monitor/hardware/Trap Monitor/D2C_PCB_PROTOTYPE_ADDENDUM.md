# D2C PCB Prototype Addendum (Modem Path + Swap Interface)

**Date:** 12 March 2026
**Applies to:** Phase 1 prototype PCB design
**Use with:** `PCB_DESIGN_BRIEF.md`, `DESIGN_SPEC.md`, and firmware `config.h`

---

## 1) Purpose

Define a practical, prototype-ready modem subsystem for Australia that supports:

1. terrestrial IoT SMS + low-rate data now
2. a realistic upgrade path to Direct-to-Cell (D2C)
3. low-risk modem swapping in later board spins

This addendum narrows modem decisions and gives explicit PCB interface requirements.

---

## 2) Modem Strategy for Prototype

### Primary module (lock for Rev A)

- **Quectel EG800Q-EU**
  - 4G Cat-1 bis class
  - aligns with current firmware and hardware documents
  - suitable for terrestrial SMS + data and D2C pathway discussions

### Likely swap candidates for Rev B / pilot variants

1. Telit LE910Q1
2. Telit LE910C1-WWX
3. Quectel EG21GGB-MINIPCIE-S
4. Quectel EG915N-EA (roadmap/in-certification class)

Do not attempt a universal single-footprint design for all these modules.

---

## 3) Australia Pathway (Engineering-Critical)

1. Prove terrestrial first on Telstra IoT APN with SMS reliability as mandatory; packet-data validation is optional Rev A firmware scope.
2. Collect objective field logs before certification engagement:
   - attach success rate
   - SMS delivery latency
   - data session success
   - modem rail droop under TX bursts
3. Use one fixed HW/FW baseline for pre-cert discussions (board rev + modem SKU + firmware hash).
4. Keep modem electrical interface configurable so accepted module changes do not force a full redesign.

---

## 4) Mandatory PCB Requirements (Modem Subsystem)

## 4.1 Power Rail

1. Dedicated modem rail at **3.8V** from buck converter.
2. Design for **>= 3A peak headroom** on modem rail.
3. Place local bulk + ceramic decoupling at modem VBAT pins.
4. Keep high-current loop short and wide.

## 4.2 Logic Levels

1. Keep ESP32 side at 3.3V.
2. Provide 1.8V-compatible interface to modem side.
3. Level-shift at minimum: UART TX, UART RX, PWRKEY, RESET_N.
4. Include optional paths for RTS/CTS if enabled later.

## 4.3 SIM and eSIM

1. Populate nano-SIM for prototype bring-up.
2. Add **MFF2 eSIM footprint** as DNP option on same board.
3. Route SIM lines to support either physical SIM or eSIM population option.
4. Add ESD protection and short, clean SIM routing.

Note: eSIM can work, but carrier profile/provisioning acceptance is still required per module and service profile.

## 4.4 RF and Bands

1. 50-ohm controlled impedance from modem RF to connector.
2. Include PI matching pad set near modem RF output.
3. Keep RF feed short, with clear ground strategy and keepouts.
4. Ensure selected antenna supports AU terrestrial + D2C target bands used in your rollout strategy.

---

## 5) Swap-Friendly Interface Architecture

### Recommended approach

Use a **baseboard + modem daughtercard** model for future swaps.

- Baseboard: MCU, power, SIM/eSIM, sensors, common host connector
- Daughtercard: modem-specific footprint and RF details

If a daughtercard is not possible in Rev A, include a reserve host header footprint and 0R strap matrix so Rev B migration is easy.

### Recommended host signal groups

| Group | Signals |
|---|---|
| Power | VBAT_MODEM, GND, optional 3V3_AUX |
| Control | PWRKEY, RESET_N, STATUS, RI, DTR, W_DISABLE |
| UART | TXD, RXD, RTS, CTS |
| Service | USB_DP, USB_DM |
| SIM | SIM_VCC, SIM_CLK, SIM_IO, SIM_RST, SIM_DET |
| Optional | GNSS_TXD, GNSS_RXD, GPIOs, I2C |

---

## 6) Pin Mapping Lock (Current Firmware)

Do not change these defaults in prototype unless explicitly approved:

1. MODEM_TX: GPIO 17
2. MODEM_RX: GPIO 18
3. MODEM_PWRKEY: GPIO 5
4. MODEM_RST: GPIO 7

Add 0R strap options around these nets so alternate GPIO mapping can be enabled in a later spin without major reroute.

---

## 7) Prototype Acceptance Checklist (PCB + Bring-Up)

1. Modem powers reliably across battery range.
2. No brownout/reset during SMS TX burst events.
3. SMS send/receive passes across repeated cycles.
4. Packet-data attach/PDP context test passes. HTTP POST validation is optional and requires dedicated firmware implementation.
5. Deep sleep current remains within project budget.
6. SIM detect/provision path validated.
7. Basic field test in weak and no-terrestrial areas completed with logs.

---

## 8) Hurdles To Plan For

1. Carrier acceptance can be solution-specific, not just modem-spec based.
2. D2C behaviour is intermittent and line-of-sight dependent.
3. Public module-SKU acceptance data in Australia is still limited.
4. eSIM profile availability and operational policy can differ by carrier plan.
5. RF implementation quality is often the difference between pass/fail in field conditions.

---

## 9) Handoff Note to PCB Designer

For Phase 1, optimize for speed and testability:

1. keep firmware pin map unchanged
2. keep modem rail robust
3. keep SIM/eSIM optionality on-board
4. leave clear migration path to alternate Cat-1/Cat-1 bis modules
5. quote packet-data/HTTP validation and non-EG800Q modem support as separate optional scope
