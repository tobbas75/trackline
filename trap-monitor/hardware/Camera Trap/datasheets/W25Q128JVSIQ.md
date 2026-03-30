---
component: W25Q128JVSIQ
manufacturer: Winbond Electronics
category: Memory (NOR Flash)
status: Active
last_verified: 2026-03-29
confidence: HIGH — Winbond W25Q128JV is a mature, widely-documented part. Specs below are from training knowledge of the datasheet (Rev. N or later). Verify exact values against current revision before production.
---

# W25Q128JVSIQ — 128 Mbit Serial NOR Flash (SOIC-8)

## Datasheet Links

| Source | URL | Access |
|--------|-----|--------|
| Winbond product page | https://www.winbond.com/hq/product/code-storage-flash-memory/serial-nor-flash/?__locale=en&partNo=W25Q128JV | Public |
| LCSC product page | https://www.lcsc.com/product-detail/C97521.html | Public |
| Winbond datasheet (PDF) | Search "W25Q128JV datasheet" — Winbond hosts on their product page | Public |

## Part Number Decode

`W25Q128` `JV` `S` `I` `Q`

| Field | Value | Meaning |
|-------|-------|---------|
| W25Q128 | — | 128 Mbit (16 MB) serial NOR flash |
| JV | Revision | JV series (3.3V, SPI/Dual/Quad) |
| S | Package | SOIC-8 (208 mil body width) |
| I | Temperature | Industrial: -40°C to +85°C |
| Q | Packaging | Tape & Reel |

### Package Suffix Reference

| Suffix | Package | Dimensions | Notes |
|--------|---------|------------|-------|
| S | SOIC-8 | 5.28 × 5.23 mm (208 mil) | Used in this design (U5) |
| E | WSON-8 | 6 × 5 mm, exposed pad | Smaller footprint, better thermal |
| M | SOIC-16 | 10.3 × 7.5 mm (300 mil) | Wide body |

## Key Specifications

| Parameter | Min | Typical | Max | Unit | Confidence |
|-----------|-----|---------|-----|------|------------|
| Capacity | — | 128 | — | Mbit (16 MB) | Verified |
| Interface | SPI / Dual SPI / Quad SPI | — | — | — | Verified |
| SPI clock (standard read) | — | — | 50 | MHz | High |
| SPI clock (fast read) | — | — | 133 | MHz | High |
| Dual SPI clock | — | — | 133 | MHz | High |
| Quad SPI clock | — | — | 133 | MHz | High |
| Supply voltage (VCC) | 2.7 | 3.3 | 3.6 | V | High |
| Address mode | — | 3-byte (24-bit) | — | — | Verified (16 MB fits in 24-bit address) |
| Page size (program) | — | 256 | — | bytes | High |
| Sector size (erase) | — | 4 | — | KB | High |
| Block size (32KB erase) | — | 32 | — | KB | High |
| Block size (64KB erase) | — | 64 | — | KB | High |
| Chip erase time | — | 40 | 200 | s | High |
| Sector erase time (4KB) | — | 45 | 400 | ms | High |
| Block erase time (64KB) | — | 150 | 2000 | ms | High |
| Page program time | — | 0.4 | 3 | ms | High |
| Endurance | 100,000 | — | — | erase cycles (per sector) | High |
| Data retention | 20 | — | — | years (at 85°C) | High |
| Operating temperature | -40 | — | +85 | °C | Verified (I suffix) |

## Absolute Maximum Ratings

| Parameter | Min | Max | Unit | Confidence |
|-----------|-----|-----|------|------------|
| VCC | -0.5 | 4.0 | V | High |
| Input voltage (any pin) | -0.5 | VCC + 0.5 | V | High |
| Output short circuit current | — | 20 | mA | Likely |
| Storage temperature | -65 | +150 | °C | High |
| ESD (HBM) | — | 4000 | V | Likely |

## Pin Configuration

**SOIC-8 (208 mil)**

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
         └──────┘
```

| Pin | Name | Type | Function | Notes |
|-----|------|------|----------|-------|
| 1 | CS# | Input | Chip Select | Active LOW. Internal pull-up. |
| 2 | DO (IO1) | Output | Data Out (SPI) / IO1 (Dual/Quad) | Standard SPI: MISO. Quad mode: bidirectional IO1. |
| 3 | WP# (IO2) | Input | Write Protect (SPI) / IO2 (Quad) | Active LOW write protect. In Quad mode: bidirectional IO2. Internal pull-up. |
| 4 | GND | Power | Ground | |
| 5 | DI (IO0) | Input | Data In (SPI) / IO0 (Dual/Quad) | Standard SPI: MOSI. Quad mode: bidirectional IO0. |
| 6 | CLK | Input | Serial Clock | SPI clock input |
| 7 | HOLD# (IO3) | Input | Hold (SPI) / IO3 (Quad) / RESET# | Active LOW hold. In Quad mode: bidirectional IO3. On some variants, this pin functions as RESET#. Internal pull-up. |
| 8 | VCC | Power | Supply | 2.7V–3.6V. Bypass with 100 nF ceramic. |

**SOIC-8 note:** Pin 7 is HOLD#/IO3. The RESET# function on pin 7 is NOT available on the SOIC-8 package for W25Q128JV — HOLD# is the default function. (RESET# on pin 7 is available on WSON-8 package variants via OTP bit configuration.)

## Power

### Current Consumption

| Mode | Typical | Max | Unit | Conditions | Confidence |
|------|---------|-----|------|------------|------------|
| Active read (50 MHz) | 8 | 15 | mA | Standard SPI read | High |
| Active read (133 MHz, Quad) | 15 | 25 | mA | Quad I/O fast read | High |
| Page program | 15 | 20 | mA | During program operation | High |
| Sector erase | 15 | 25 | mA | During 4KB erase | High |
| Standby (CS# HIGH) | — | 1 | µA | No operation, clock idle | High |
| Deep power-down | — | 0.5 | µA | After DP command (0xB9) | High |

### Power-Down Modes

| Mode | Entry | Exit | Current | Data | Confidence |
|------|-------|------|---------|------|------------|
| Standby | CS# HIGH | CS# LOW | ~1 µA max | Retained | High |
| Deep Power-Down | Command 0xB9 | Command 0xAB (release) | ~0.5 µA max | Retained | High |

**Design note:** In this camera trap, the NOR flash is powered from the always-on 3.3V rail (AP63300, U11). Use the Deep Power-Down command between operations to minimise sleep current. The 0.5 µA deep power-down current is negligible in the 50 µA sleep budget.

## Memory Organisation

| Level | Size | Count | Notes |
|-------|------|-------|-------|
| Page | 256 bytes | 65,536 | Program unit |
| Sector | 4 KB (16 pages) | 4,096 | Smallest erase unit |
| Block (32K) | 32 KB (8 sectors) | 512 | |
| Block (64K) | 64 KB (16 sectors) | 256 | Most common erase unit |
| Chip | 16 MB (16,777,216 bytes) | 1 | Full chip erase available |

### Address Space
- 24-bit addressing (0x000000 to 0xFFFFFF)
- 3-byte address commands are the default
- No 4-byte addressing needed (16 MB fits in 24-bit address space)

## Key Commands

| Command | Opcode | Description | Confidence |
|---------|--------|-------------|------------|
| Read Data | 0x03 | Standard SPI read (up to 50 MHz) | High |
| Fast Read | 0x0B | Fast read with dummy byte (up to 133 MHz) | High |
| Dual Output Fast Read | 0x3B | 2-bit output (up to 133 MHz) | High |
| Quad Output Fast Read | 0x6B | 4-bit output (up to 133 MHz) | High |
| Quad I/O Fast Read | 0xEB | 4-bit addr + output (up to 133 MHz) | High |
| Page Program | 0x02 | Program up to 256 bytes | High |
| Sector Erase (4KB) | 0x20 | Erase 4 KB sector | High |
| Block Erase (32KB) | 0x52 | Erase 32 KB block | High |
| Block Erase (64KB) | 0xD8 | Erase 64 KB block | High |
| Chip Erase | 0xC7 / 0x60 | Erase entire chip | High |
| Write Enable | 0x06 | Must precede program/erase | High |
| Read Status Reg 1 | 0x05 | BUSY bit, WEL, block protect | High |
| Read Status Reg 2 | 0x35 | QE bit, security lock | High |
| Deep Power-Down | 0xB9 | Enter deep power-down | High |
| Release Power-Down | 0xAB | Exit deep power-down / read ID | High |
| Read JEDEC ID | 0x9F | Returns Mfr (0xEF), Mem Type (0x40), Capacity (0x18) | High |
| Read Unique ID | 0x4B | 64-bit unique serial number | High |

## Application Notes for This Design

### Role in System
- **U5 on BOM** — Firmware storage + AI model weights (16 MB)
- Connected to STM32N6 XSPI2 (Port 2) with CS1 (PN1)
- Shares XSPI2 bus with W25Q256JV (U6) on separate CS

### STM32N6 XSPI2 Connection

| Flash Pin | STM32N6 Pin | Function |
|-----------|-------------|----------|
| CS# | PN1 | XSPI2 nCS1 (dedicated to this chip) |
| CLK | PN6 | XSPI2 CLK |
| DI (IO0) | PN2 | XSPI2 IO0 |
| DO (IO1) | PN3 | XSPI2 IO1 |
| WP# (IO2) | PN4 | XSPI2 IO2 (Quad mode) |
| HOLD# (IO3) | PN5 | XSPI2 IO3 (Quad mode) |
| VCC | 3.3V rail | From AP63300 (U11) |
| GND | GND | |

### Layout
- Place near STM32N6 XSPI2 pins (GPION port)
- 100 nF bypass cap at VCC pin (0402, within 3 mm)
- Keep CLK and data traces matched in length (±5 mm acceptable for 133 MHz)
- Ground plane under flash IC — no splits

### XIP / Memory-Mapped Mode
- STM32N6 XSPI2 supports memory-mapped mode (XIP — execute in place)
- Flash appears at a fixed address in the STM32N6 memory map
- Used for firmware execution and AI model weight access without explicit read commands
- Quad I/O mode (0xEB) provides best throughput for XIP

### Quad Enable (QE) Bit
- Quad SPI mode requires QE bit set in Status Register 2
- QE bit must be programmed once (non-volatile) — persists across power cycles
- **Set QE bit during manufacturing/programming, not at every boot**
- When QE=1, WP# and HOLD# become IO2 and IO3 (write protect and hold functions disabled)

## Procurement

| Source | Part Number | Notes |
|--------|-------------|-------|
| LCSC | C97521 (W25Q128JVSIQ) | Low cost, tape & reel |
| DigiKey AU | W25Q128JVSIQ | |
| Mouser | W25Q128JVSIQ | |

**Pricing:** ~$2.00 AUD per unit at low volume (from BOM). Commodity NOR flash — widely available.

**Lead time:** Typically in stock at major distributors. No supply concerns.

## Known Issues / Errata

1. **HOLD# pin in Quad mode.** When QE bit is set (Quad mode enabled), the HOLD# pin becomes IO3 and the hold function is disabled. This is the intended configuration for this design (XSPI2 uses all 4 data lines). Ensure QE bit is set during programming.

2. **No RESET# pin on SOIC-8.** The SOIC-8 package does not have a dedicated hardware reset pin. Software reset is available via the "Enable Reset" (0x66) + "Reset" (0x99) command sequence. If the flash enters an unknown state, a power cycle is the only guaranteed recovery. The WSON-8 package variant has RESET# available on pin 7 (configurable).

3. **3-byte addressing only.** The W25Q128JV uses 24-bit (3-byte) addressing, which is sufficient for 16 MB. This is simpler than the W25Q256JV (U6) which requires 4-byte addressing. No special address mode configuration needed.

4. **Endurance planning.** 100K erase cycles per sector. For firmware storage (infrequent updates), this is not a concern. For frequently-written config/log data, consider wear levelling or dedicating specific sectors.

5. **VCC range 2.7-3.6V.** This part requires 3.3V nominal. It is NOT compatible with the 1.8V rail. Ensure it is powered from the 3.3V AP63300 output, not the 1.8V TPS7A02 output.
