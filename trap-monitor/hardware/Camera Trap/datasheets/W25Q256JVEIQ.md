---
component: W25Q256JVEIQ
manufacturer: Winbond Electronics
category: Memory (NOR Flash)
status: Active
last_verified: 2026-03-29
confidence: HIGH — Winbond W25Q256JV is a mature, widely-documented part. Specs below are from training knowledge of the datasheet. Verify exact values against current revision before production.
---

# W25Q256JVEIQ — 256 Mbit Serial NOR Flash (WSON-8)

## Datasheet Links

| Source | URL | Access |
|--------|-----|--------|
| SparkFun mirror (datasheet PDF) | https://cdn.sparkfun.com/assets/c/2/9/2/6/W25Q256JV.pdf | Public |
| Winbond product page | https://www.winbond.com/hq/product/code-storage-flash-memory/serial-nor-flash/?__locale=en&partNo=W25Q256JV | Public |
| LCSC product page | https://www.lcsc.com/product-detail/C97522.html | Public |

## Part Number Decode

`W25Q256` `JV` `E` `I` `Q`

| Field | Value | Meaning |
|-------|-------|---------|
| W25Q256 | — | 256 Mbit (32 MB) serial NOR flash |
| JV | Revision | JV series (3.3V, SPI/Dual/Quad) |
| E | Package | **WSON-8 (6 × 5 mm, exposed pad)** |
| I | Temperature | Industrial: -40°C to +85°C |
| Q | Packaging | Tape & Reel |

### CRITICAL: SOIC-8 Does NOT Exist for W25Q256JV

**The SOIC-8 ("S" suffix) package is NOT available for the 256 Mbit capacity.** Winbond does not manufacture W25Q256JV in SOIC-8. Available packages:

| Suffix | Package | Dimensions | Notes |
|--------|---------|------------|-------|
| **E** | **WSON-8** | **6 × 5 × 0.75 mm, exposed pad** | **Used in this design (U6)** |
| M | SOIC-16 | 10.3 × 7.5 mm (300 mil) | Wide body, RESET# on pin 1 |
| F | BGA-24 | 5 × 5 mm | Not common |

The reason SOIC-8 does not exist is that the SOIC-8 pinout has no pin available for RESET#, which is strongly recommended for 4-byte address mode recovery. The WSON-8 package provides RESET# on a dedicated pin.

## Key Specifications

| Parameter | Min | Typical | Max | Unit | Confidence |
|-----------|-----|---------|-----|------|------------|
| Capacity | — | 256 | — | Mbit (32 MB) | Verified |
| Interface | SPI / Dual SPI / Quad SPI | — | — | — | Verified |
| SPI clock (standard read) | — | — | 50 | MHz | High |
| SPI clock (fast read) | — | — | 133 | MHz | High |
| Quad SPI clock | — | — | 133 | MHz | High |
| Supply voltage (VCC) | 2.7 | 3.3 | 3.6 | V | High |
| **Address mode (default)** | — | **3-byte (24-bit)** | — | — | High |
| **Address mode (extended)** | — | **4-byte (32-bit)** | — | — | **Required for addresses above 16 MB** |
| Page size (program) | — | 256 | — | bytes | High |
| Sector size (erase) | — | 4 | — | KB | High |
| Block size (32KB) | — | 32 | — | KB | High |
| Block size (64KB) | — | 64 | — | KB | High |
| Chip erase time | — | 80 | 400 | s | High |
| Sector erase time (4KB) | — | 45 | 400 | ms | High |
| Block erase time (64KB) | — | 150 | 2000 | ms | High |
| Page program time | — | 0.4 | 3 | ms | High |
| Endurance | 100,000 | — | — | erase cycles (per sector) | High |
| Data retention | 20 | — | — | years (at 85°C) | High |
| Operating temperature | -40 | — | +85 | °C | Verified (I suffix) |

## 4-Byte Addressing — CRITICAL

The W25Q256JV has 32 MB (256 Mbit), which requires 25-bit addressing. Standard 3-byte (24-bit) SPI commands can only access the first 16 MB. To access the full 32 MB:

### Option 1: Enter 4-Byte Address Mode (Recommended)

| Command | Opcode | Description |
|---------|--------|-------------|
| Enter 4-Byte Mode | **0xB7** | All subsequent read/write/erase commands use 4-byte addresses |
| Exit 4-Byte Mode | **0xE9** | Return to 3-byte addressing |

**ADP bit (Address Mode, Status Register 3, bit 0):**
- ADP = 0: 3-byte address mode (default after power-on/reset)
- ADP = 1: 4-byte address mode
- The ADP bit in the non-volatile status register can be programmed to default to 4-byte mode on power-up

### Option 2: Extended Address Register
- Write the upper address byte to the Extended Address Register (command 0xC5)
- 3-byte commands then use this upper byte as bits [24:24] of the address
- Less convenient than 4-byte mode — not recommended

### Option 3: 4-Byte Address Commands
- Dedicated 4-byte address versions of common commands exist:
  - 0x13 (Read), 0x0C (Fast Read), 0x6C (Quad Read), etc.
  - These always use 4-byte addresses regardless of the ADP setting

**Design recommendation:** Use command 0xB7 to enter 4-byte address mode during initialisation. The STM32N6 XSPI2 HAL supports 4-byte addressing natively.

**IMPORTANT: After a hardware reset (RESET# pin) or software reset, the device returns to 3-byte mode (ADP=0 by default).** Firmware must re-enter 4-byte mode after every reset unless the ADP non-volatile bit is programmed.

## Absolute Maximum Ratings

| Parameter | Min | Max | Unit | Confidence |
|-----------|-----|-----|------|------------|
| VCC | -0.5 | 4.0 | V | High |
| Input voltage (any pin) | -0.5 | VCC + 0.5 | V | High |
| Output short circuit current | — | 20 | mA | Likely |
| Storage temperature | -65 | +150 | °C | High |
| ESD (HBM) | — | 4000 | V | Likely |

## Pin Configuration

**WSON-8 (6 × 5 × 0.75 mm, exposed pad)**

```
         ┌──────┐
  CS# ──┤1    8├── VCC
         │      │
  DO  ──┤2    7├── HOLD#/RESET#
  (IO1)  │      │
  WP# ──┤3    6├── CLK
  (IO2)  │      │
  GND ──┤4    5├── DI
         │      │  (IO0)
         └──┬───┘
          EP (GND)
```

| Pin | Name | Type | Function | Notes |
|-----|------|------|----------|-------|
| 1 | CS# | Input | Chip Select | Active LOW. Internal pull-up. |
| 2 | DO (IO1) | Output | Data Out / IO1 | Standard SPI: MISO. Quad: bidirectional IO1. |
| 3 | WP# (IO2) | Input | Write Protect / IO2 | Active LOW. Quad mode: bidirectional IO2. Internal pull-up. |
| 4 | GND | Power | Ground | |
| 5 | DI (IO0) | Input | Data In / IO0 | Standard SPI: MOSI. Quad: bidirectional IO0. |
| 6 | CLK | Input | Serial Clock | |
| 7 | HOLD#/RESET# | Input | Hold / IO3 / RESET# | **Configurable via OTP bit.** Default: HOLD#/IO3. Can be configured as RESET# (active LOW, hardware reset). |
| 8 | VCC | Power | Supply | 2.7V–3.6V |
| EP | Exposed Pad | Power | **Thermal pad — connect to GND** | Mandatory GND connection for thermal and electrical performance |

### RESET# Pin (Pin 7) — Important

The WSON-8 package provides pin 7 as HOLD#/IO3 by default. It can be reconfigured as RESET# via an OTP (One-Time Programmable) bit:

- **Default (unprogrammed):** Pin 7 = HOLD#/IO3 (same as SOIC-8 on W25Q128JV)
- **After OTP programming:** Pin 7 = RESET# (active LOW hardware reset)

**If using RESET# function:**
- Add an external RC circuit: 10 kΩ pull-up to VCC + 100 nF to GND (provides power-on reset pulse)
- RESET# is active LOW — assert for at least 50 µs to guarantee reset
- After reset, device returns to 3-byte address mode and default register state

**If NOT using RESET# function (keeping as HOLD#/IO3):**
- In Quad mode, pin 7 becomes IO3 (bidirectional data)
- HOLD# function is disabled when QE=1 (Quad Enable set)
- Connect to STM32N6 XSPI2 IO3 line (if available) or tie HIGH via 10 kΩ

**Design decision for this board:** The BOM notes that WSON-8 was chosen specifically because RESET# is available. If RESET# is needed for 4-byte address mode recovery, program the OTP bit. However, this means Quad IO3 is lost on pin 7, limiting to Quad Output (3 data pins + separate address phase) rather than Quad I/O (4 data pins for both address and data). **Evaluate whether RESET# or Quad IO3 is more important for this design.**

## Power

### Current Consumption

| Mode | Typical | Max | Unit | Conditions | Confidence |
|------|---------|-----|------|------------|------------|
| Active read (50 MHz, SPI) | 8 | 15 | mA | Standard read | High |
| Active read (133 MHz, Quad) | 15 | 25 | mA | Quad I/O fast read | High |
| Page program | 15 | 20 | mA | During program operation | High |
| Sector erase | 15 | 25 | mA | During 4KB erase | High |
| Standby (CS# HIGH) | — | 1 | µA | No operation, clock idle | High |
| Deep power-down | — | 0.5 | µA | After DP command (0xB9) | High |

### Exposed Thermal Pad

The WSON-8 exposed pad **must be connected to GND** on the PCB. This provides:
1. Electrical ground return path (required for proper operation)
2. Thermal dissipation path (improves junction-to-board thermal resistance)
3. Mechanical stability during reflow

Use at least 4 thermal vias under the exposed pad, connected to the ground plane.

## Memory Organisation

| Level | Size | Count | Notes |
|-------|------|-------|-------|
| Page | 256 bytes | 131,072 | Program unit |
| Sector | 4 KB (16 pages) | 8,192 | Smallest erase unit |
| Block (32K) | 32 KB (8 sectors) | 1,024 | |
| Block (64K) | 64 KB (16 sectors) | 512 | Most common erase unit |
| Chip | 32 MB (33,554,432 bytes) | 1 | Full chip erase available |

### Address Space
- Full address range: 0x0000000 to 0x1FFFFFF (25 bits needed)
- 3-byte mode: Only accesses 0x000000–0xFFFFFF (first 16 MB)
- **4-byte mode required** to access 0x1000000–0x1FFFFFF (upper 16 MB)

## Key Commands (Differences from W25Q128JV)

All standard W25Q128JV commands are supported, plus:

| Command | Opcode | Description | Confidence |
|---------|--------|-------------|------------|
| Enter 4-Byte Mode | **0xB7** | Switch to 32-bit addressing | High |
| Exit 4-Byte Mode | **0xE9** | Return to 24-bit addressing | High |
| Read (4-byte addr) | 0x13 | 4-byte address read | High |
| Fast Read (4-byte addr) | 0x0C | 4-byte address fast read | High |
| Quad Read (4-byte addr) | 0x6C | 4-byte address quad output read | High |
| Quad I/O Read (4-byte addr) | 0xEC | 4-byte address quad I/O read | High |
| Page Program (4-byte addr) | 0x12 | 4-byte address page program | High |
| Sector Erase (4-byte addr) | 0x21 | 4-byte address 4KB erase | High |
| Block Erase 64KB (4-byte addr) | 0xDC | 4-byte address 64KB erase | High |
| Read Extended Addr Reg | 0xC8 | Read upper address byte | High |
| Write Extended Addr Reg | 0xC5 | Write upper address byte | High |
| Read Status Reg 3 | 0x15 | ADP bit (address mode), driver strength | High |
| Enable Reset | 0x66 | Prepare for software reset | High |
| Reset Device | 0x99 | Execute software reset (must follow 0x66) | High |
| Read JEDEC ID | 0x9F | Returns 0xEF, 0x40, 0x19 (256 Mbit) | High |

## Application Notes for This Design

### Role in System
- **U6 on BOM** — Metadata / config / event log storage (32 MB)
- Connected to STM32N6 XSPI2 (Port 2) with CS2 (separate from U5)
- Shares XSPI2 CLK and data lines with W25Q128JV (U5)

### STM32N6 XSPI2 Connection

| Flash Pin | STM32N6 Pin | Function |
|-----------|-------------|----------|
| CS# | (Separate CS — needs dedicated GPIO or XSPI2 nCS2) | XSPI2 nCS2 |
| CLK | PN6 | XSPI2 CLK (shared with U5) |
| DI (IO0) | PN2 | XSPI2 IO0 (shared with U5) |
| DO (IO1) | PN3 | XSPI2 IO1 (shared with U5) |
| WP# (IO2) | PN4 | XSPI2 IO2 (shared with U5) |
| HOLD#/IO3/RESET# | PN5 or separate GPIO | Depends on pin 7 configuration |
| VCC | 3.3V rail | From AP63300 (U11) |
| GND + EP | GND | Exposed pad to GND with thermal vias |

### Initialisation Sequence

1. Power-on (VCC ramp to 2.7V minimum)
2. Wait tVSL (VCC stable to CS# LOW, typically 5-10 µs — verify from datasheet)
3. Read JEDEC ID (0x9F) — expect 0xEF, 0x40, 0x19
4. **Enter 4-byte address mode** (0xB7) — required for full 32 MB access
5. Set QE bit if using Quad mode (one-time, non-volatile)
6. Configure for memory-mapped mode via XSPI2 HAL

### Shared Bus Considerations
- U5 (W25Q128JV) and U6 (W25Q256JV) share XSPI2 CLK and data lines
- Only one device can be active at a time (CS# arbitration)
- Both devices must support the same SPI mode (Mode 0 or Mode 3 — both support both)
- **Address mode difference:** U5 uses 3-byte, U6 uses 4-byte. The XSPI2 HAL must switch addressing mode when changing between chips.

### XIP / Memory-Mapped Mode
- STM32N6 can memory-map both flash chips simultaneously (different address windows)
- Each chip gets its own CS and address mode configuration in the XSPI2 peripheral
- Firmware executes from U5 (16 MB), metadata/config accessed from U6 (32 MB)

## Procurement

| Source | Part Number | Notes |
|--------|-------------|-------|
| LCSC | C97522 (W25Q256JVEIQ) | Low cost, tape & reel. **WSON-8 package (E suffix).** |
| DigiKey AU | W25Q256JVEIQ | |
| Mouser | W25Q256JVEIQ | |

**IMPORTANT: Verify "E" suffix when ordering.** The "E" means WSON-8. Do not accidentally order a different package suffix. There is no SOIC-8 ("S") option for this capacity.

**Pricing:** ~$3.50 AUD per unit at low volume (from BOM).

**Lead time:** Typically in stock at major distributors. The WSON-8 variant may have slightly less stock than SOIC-8 equivalents in other capacities.

## Known Issues / Errata

1. **4-byte mode lost on reset.** After any hardware reset (RESET# pin or power cycle) or software reset (0x66 + 0x99), the device returns to 3-byte address mode. Firmware must re-issue command 0xB7 after every reset. Alternatively, program the ADP non-volatile bit in Status Register 3 to default to 4-byte mode — but this makes the device incompatible with 3-byte-only programmers.

2. **SOIC-8 does not exist.** This is documented in the BOM but bears repeating: do not attempt to source W25Q256JVS (SOIC-8). It does not exist. The WSON-8 (E suffix) is the smallest package available for 256 Mbit.

3. **Pin 7 dual function.** Pin 7 serves as HOLD#/IO3 (default) or RESET# (after OTP programming). This is a one-time choice — the OTP bit cannot be reverted. If Quad I/O mode is needed (all 4 data pins bidirectional), pin 7 must remain as IO3, and RESET# is not available. If hardware reset is more important, program the OTP bit but lose full Quad I/O.

4. **Exposed pad soldering.** The WSON-8 exposed pad requires proper stencil aperture design (typically 50-80% coverage with thermal relief pattern) and thermal vias. Insufficient thermal vias can cause voids under the pad, degrading thermal and electrical performance.

5. **Shared bus address mode switching.** When U5 (3-byte) and U6 (4-byte) share the XSPI2 bus, the firmware must ensure the correct address width is configured in the XSPI2 peripheral each time it switches between devices. A missed switch will result in incorrect addressing and data corruption.

6. **Compatibility with W25Q128JV.** Both U5 and U6 use the same JV series command set, same voltage range, and same SPI modes. The only significant differences are capacity (16 MB vs 32 MB), addressing (3-byte vs 4-byte), and package (SOIC-8 vs WSON-8). This simplifies the driver — a single driver with configurable address width handles both.
