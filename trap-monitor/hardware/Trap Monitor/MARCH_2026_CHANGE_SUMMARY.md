# Trap Monitor — March 2026 Change Summary

**Purpose:** Short attachment to accompany the updated hardware brief and confirm what changed before Phase 1 layout proceeds.

---

## What Changed

### 1. Rev A modem baseline is now explicit

- **Rev A is locked to Quectel EG800Q-EU** for firmware compatibility.
- The existing fixed-binary requirement applies to this modem baseline.
- Any future modem-family change should be treated as a **separate variation** with its own firmware and validation scope.

### 2. Rev A acceptance scope is clarified

- **Rev A acceptance is SMS-first.**
- Packet-data / HTTP validation is **optional scope**, not a mandatory Phase 1 acceptance item.
- Non-EG800Q modem support is also **optional scope** and should be quoted separately if offered.

### 3. Modem level shifting is standardized

- Rev A should use **discrete BSS138 level shifting** for modem UART/control lines.
- Auto-direction translator options are no longer the default Rev A recommendation.

### 4. Power-system wording is now aligned

- Solar charging is assumed via **on-board CN3767 MPPT** path for the rechargeable-pack configuration.
- Deep sleep language is aligned to the current architecture budget:
  - **~84 uA current architecture budget**
  - **~63 uA stretch target** if AP63300 EN is used to shut the modem rail down in sleep

### 5. GPS power-gate logic is clarified

- The GPS power-gate description now explicitly matches firmware behavior:
  - **GPIO 6 HIGH = GPS powered**

---

## What This Means For Phase 1 Quote

Please confirm whether your current quote already includes the following:

1. EG800Q-EU retained as the Rev A modem baseline.
2. BSS138 discrete modem level shifting.
3. 3.8V modem rail sized for TX burst headroom.
4. Nano-SIM bring-up path plus optional MFF2 eSIM footprint (DNP).
5. 0R strap/reroute options on modem UART/control lines.
6. Additional modem/SIM debug test points.
7. Optional setup-trigger input reservation.

Please quote the following separately if they are not already included:

1. Packet-data / HTTP validation work.
2. Any non-EG800Q modem support or alternate-modem preparation beyond the documented Rev A baseline.

---

## Likely Cost Impact

- **Low or none** if work is still at early schematic stage.
- **Small increase** if schematic is complete and layout has started.
- **Moderate increase** if layout/routing is well advanced and these changes require rework.

The largest likely cost drivers are:

1. changing the chosen modem level-shift implementation
2. adding optional debug / setup / SIM flexibility features
3. any optional packet-data validation scope
4. any support for alternate modem families

---

## Requested Response

Please reply with:

1. confirmation that you have reviewed the March 2026 update
2. whether the updated requirements are already included in your quote
3. any additional cost or schedule impact, itemized by line item
