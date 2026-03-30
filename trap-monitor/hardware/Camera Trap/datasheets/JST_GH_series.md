---
component: JST GH Series Connectors (SM04B-GHS-TB, SM08B-GHS-TB, SM12B-GHS-TB)
type: Wire-to-Board Connector, 1.25mm pitch
manufacturer: JST (J.S.T. Mfg. Co., Ltd.)
package: Through-hole / SMD, right-angle
status: IN DESIGN — SM04B currently used for LED module; SM08B and SM12B are potential options for combined front module
verified_orderable: true (DigiKey, LCSC, Mouser, JLCPCB parts)
last_updated: 2026-03-28
confidence: VERIFIED — specs from JST official GH series datasheet (eGH.pdf)
datasheet_url: https://www.jst.com/wp-content/uploads/2021/08/eGH-new.pdf
catalog_page: https://www.jst-mfg.com/product/detail_e.php?series=105
---

# JST GH Series — 1.25mm Pitch Wire-to-Board Connectors

## Summary

JST GH series is a 1.25mm pitch disconnectable crimp-style wire-to-board connector with secure locking mechanism. Used in this design for the IR LED module interface (4-pin SM04B) and potentially for the combined front module interface (8-pin or 12-pin).

**Design status:** The JST GH connector is being reconsidered in favour of a card-edge interface for the combined front module (Phase 2) due to durability concerns. See "Durability Assessment" section below.

## Common Specifications (All Pin Counts)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Pitch | 1.25 mm | |
| Current Rating | 1A per contact | |
| Voltage Rating | 50V AC (RMS) | |
| Contact Resistance | 20 milliohm max (initial) | |
| Insulation Resistance | 1000 Megohm min | |
| Withstanding Voltage | 500V AC for 1 minute | |
| Operating Temperature | -25 to +85 C | |
| Wire Gauge | 26-30 AWG | JST recommends 28 AWG for crimp quality |
| Mating Cycles | 2,500 cycles | Per JST official datasheet — NOT 30 as previously estimated |
| Contact Material | Phosphor bronze, copper undercoat, tin plated (reflow) | |
| Housing Material | PA 9T, UL94 V-0 | Natural (ivory) colour |
| Solder Tab Material | Brass, copper undercoat, tin plated | |
| Locking | Yes — positive lock with release tab | Low insertion force design |

## IMPORTANT: Mating Cycle Correction

The BOM notes stated "~30 mating cycles" for JST GH connectors. **This is incorrect.** The JST official GH series datasheet specifies **2,500 mating cycles**. This significantly changes the durability assessment for field-swappable modules.

At 2,500 cycles, even with weekly module swaps (unlikely in the field), the connector would last ~48 years. This removes the primary argument for replacing JST GH with card-edge for the front module interface.

**However**, the card-edge interface may still be preferred for other reasons:
- Blind-mate capability (easier insertion in the field)
- Higher current capacity per contact for LED drive
- No cable assembly required (direct board-to-board)
- Reduced connector stack height

## Variant Details

### SM04B-GHS-TB (4-pin) — LED Module Connector

| Parameter | Value |
|-----------|-------|
| Pin Count | 4 |
| PCB Dimension A | 3.75 mm |
| PCB Dimension B | 8.25 mm |
| Height | ~5.0 mm (seated) |
| BOM Designator | J2 (main board side) |
| Mating Housing | GHR-04V-S (cable side, J_LED) |
| Signal Assignment | VLED, STROBE, ID, GND |

**Current design:** 4-pin cable connects LED daughter board to main board. VLED carries up to 1.4A LED drive current — **this exceeds the 1A per-pin rating.** The LED module BOM shows a single VLED pin, which is inadequate.

**Action required:** Either:
1. Double up VLED pins (use 2 pins for power, 2 for signal) — requires 6-pin connector minimum
2. Switch to card-edge interface with wider power traces
3. Add a separate power connector for VLED alongside the signal connector

### SM08B-GHS-TB (8-pin) — Potential Sensor Module

| Parameter | Value |
|-----------|-------|
| Pin Count | 8 |
| PCB Dimension A | 8.75 mm |
| PCB Dimension B | 13.25 mm |
| Height | ~5.0 mm (seated) |
| Mating Housing | GHR-08V-S |

Potential use for an 8-signal combined front module interface. Not currently in the BOM.

### SM12B-GHS-TB (12-pin) — Potential Combined Front Module

| Parameter | Value |
|-----------|-------|
| Pin Count | 12 |
| PCB Dimension A | 13.75 mm |
| PCB Dimension B | 18.25 mm |
| Height | ~5.0 mm (seated) |
| Mating Housing | GHR-12V-S |

Potential use for a 12-signal combined front module (PIR + LEDs + optional WiseEye2). Not currently in the BOM. At 1A per pin, adequate for LED current if 2-3 pins are dedicated to VLED power.

## PCB Footprint

The GH series header (SMxxB-GHS-TB) has:
- Through-hole solder tails on 1.25mm pitch
- Two SMD solder tabs (mounting/ground) on either side of the connector body
- Right-angle (horizontal) orientation — cable exits parallel to PCB surface
- Board lock tabs provide mechanical retention

Footprint files are available from JST and most EDA libraries (KiCad, Altium, Eagle).

## Cable Assemblies

| Assembly | Description | Notes |
|----------|-------------|-------|
| GHR-04V-S + 4x SSHL-002T-P0.2 | 4-pin housing + crimps | For LED module cable |
| Pre-made cables | Available from JST and third parties | 100mm, 150mm, 200mm lengths common |

Wire: 28 AWG stranded recommended. Pre-crimped leads (ASSHLS28K###) available from JST for prototype quantities.

## Durability Assessment for Field-Swappable Modules

| Scenario | Swaps/year | Years to 2,500 cycles | Verdict |
|----------|-----------|----------------------|---------|
| LED module replacement | 2 | 1,250 | More than adequate |
| Weekly sensor swap (research) | 52 | 48 | Adequate |
| Daily swap (lab testing) | 365 | 6.8 | Adequate |
| Automated test jig | 5,000 | 0.5 | Insufficient — use card-edge |

For field deployment, 2,500 cycles is adequate. The connector durability concern was based on incorrect data (30 cycles). Card-edge may still be preferred for mechanical robustness and blind-mate capability.

## Ordering

| Part | Distributor | Part Number | Price (qty 1) |
|------|-------------|-------------|---------------|
| SM04B-GHS-TB(LF)(SN) | LCSC | C189895 | ~$0.15 AUD |
| SM04B-GHS-TB | DigiKey | 455-1566-ND | ~$0.40 AUD |
| GHR-04V-S | LCSC | C189896 | ~$0.10 AUD |
| SM08B-GHS-TB(LF)(SN) | LCSC | C189899 | ~$0.20 AUD |
| SM12B-GHS-TB(LF)(SN) | LCSC | C189903 | ~$0.25 AUD |

## Open Items

- [ ] Resolve VLED current overload on 4-pin connector (1.4A through 1A-rated pin)
- [ ] Decide whether Phase 2 combined front module uses JST GH 12-pin or card-edge interface
- [ ] If keeping JST GH for LED module, change to 6-pin minimum (2x VLED, STROBE, ID, GND, spare)
- [ ] Verify operating temperature adequate for enclosure internal temps (up to 70 C — within -25 to +85 C spec)

## Sources

- [JST GH Series Datasheet (eGH.pdf)](https://www.jst.com/wp-content/uploads/2021/08/eGH-new.pdf)
- [JST GH Series Catalog Page](https://www.jst-mfg.com/product/detail_e.php?series=105)
- [DigiKey SM04B-GHS-TB](https://www.digikey.com/en/products/detail/jst-sales-america-inc/SM04B-GHS-TB/807788)
- [LCSC SM04B-GHS-TB](https://lcsc.com/product-detail/Wire-To-Board-Connector_JST-SM04B-GHS-TB-LF-SN_C189895.html)
- [JLCPCB Parts SM04B-GHS-TB](https://jlcpcb.com/partdetail/JST-SM04B_GHS_TB_LF_SN/C189895)
