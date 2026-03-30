---
component: Card-Edge Socket (Phase 2 Combined Front Module)
type: PCB Card-Edge Connector
recommended_series: Samtec MEC2-DV (2.00mm pitch)
alternatives: TE Connectivity, Amphenol ICC
status: RESEARCH — Phase 2 component, not in current BOM
verified_orderable: true (Samtec MEC2 series available via DigiKey, Mouser)
last_updated: 2026-03-28
confidence: LIKELY — Samtec MEC2 series specs from product pages and distributor data; specific 12-position part number needs confirmation from Samtec configurator
product_page: https://www.samtec.com/products/mec2-dv
datasheet_url: https://suddendocs.samtec.com/productspecs/mec2-dv.pdf
---

# Card-Edge Socket — Phase 2 Combined Front Module Interface

## Summary

Card-edge connector socket for the Phase 2 combined front module (PIR sensors + IR LEDs + optional WiseEye2 co-processor). The front module uses PCB gold fingers on a standard 1.6mm FR4 board that plugs directly into a card-edge socket on the main board. This replaces the JST GH cable connector approach used in Phase 1.

**Design rationale:**
- Blind-mate capability for field insertion
- No cable assembly required (direct board-to-board)
- Higher current capacity for LED drive (wider power traces on card edge)
- Mating cycles > 1,000 (vs 2,500 for JST GH — both adequate, but card-edge is mechanically more robust for rough field handling)
- Self-aligning — easier to connect in the dark or with gloves

## Recommended Part: Samtec MEC2-DV Series

### Key Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Series | MEC2-DV | 2.00mm Mini Edge Card, Vertical, SMD |
| Pitch | 2.00 mm | |
| Card Thickness | 1.57 mm (0.062 in) | Accepts standard 1.6mm PCB |
| Contact Style | Dual-row (both sides of card) | |
| Current Rating | 1.7A per contact | Adequate for LED drive with 2+ power contacts |
| Performance | Up to 25 Gbps | Far exceeds requirements |
| Orientation | Vertical (card inserts perpendicular to main board) | |
| Mounting | Surface mount (SMD) | Through-hole variant also available (MEC2-TH) |
| Contact Material | Phosphor bronze, gold plated | |
| Operating Temp | -55 to +125 C | Exceeds requirements |
| RoHS | Compliant | |

### Position Count Options

The MEC2-DV series is available in various position counts. For 12 positions (dual-row = 6 contacts per side):

**Suggested part number format:** `MEC2-06-01-L-DV` (6 positions per side = 12 total contacts)

Available position counts observed in distributor listings:
- MEC2-05 (5 per side = 10 total)
- MEC2-08 (8 per side = 16 total)
- MEC2-20 (20 per side = 40 total)
- MEC2-50 (50 per side = 100 total)

**Action required:** Verify exact position count options via Samtec configurator. A 6-per-side or 8-per-side variant would suit the 12-signal requirement. If 6-per-side is not available, use 8-per-side (16 contacts) and leave spares.

### Mating Cycles

Samtec gold-plated connectors typically offer:
- Standard gold (10 uin): ~1,000 cycles
- Heavy gold (30 uin): ~5,000+ cycles

The MEC2-DV mating cycle count is not explicitly stated in the search results. Samtec's connector plating FAQ notes that gold thickness directly determines cycle life. For field-swappable modules, specify the heavy gold plating option.

**Action required:** Confirm mating cycle rating from Samtec product spec PDF or sales engineering.

## Proposed Pin Assignment (12-Position, Dual-Row)

| Pin (Side A) | Signal | Pin (Side B) | Signal |
|-------------|--------|-------------|--------|
| A1 | GND | B1 | GND |
| A2 | VLED (5V) | B2 | VLED (5V) |
| A3 | STROBE | B3 | LED_ID (ADC) |
| A4 | PIR1_OUT | B4 | PIR2_OUT |
| A5 | I2C_SDA | B5 | I2C_SCL |
| A6 | 3V3 | B6 | GND |

Notes:
- Dual VLED pins (A2 + B2) at 1.7A each = 3.4A capacity, adequate for 1.4A LED drive
- Dual GND pins (A1/B1 + B6) for low-impedance return path
- I2C for optional WiseEye2 co-processor communication
- PIR signals from two Panasonic EKMB1303112K sensors mounted on front module

This is a preliminary assignment. Final pinout depends on the combined front module schematic.

## PCB Gold Finger Requirements (JLCPCB)

The front module PCB uses gold fingers (edge connector pads) that mate with the card-edge socket. JLCPCB supports gold finger manufacturing with these specifications:

| Parameter | JLCPCB Specification | Notes |
|-----------|---------------------|-------|
| Plating | Hard gold (electroplated) | 1-2 um (40-80 uin) over nickel undercoat |
| Bevel Angle | 30 degrees (default) | 20 and 45 degree options available |
| Bevel Depth | 0.6 mm (for 1.6mm board) | Remaining board thickness ~0.5mm at tip |
| Finger Length | Up to 40 mm | Typical: 3-6 mm for this application |
| Keep-out from fingers | 0.5 mm to board outline, 1.0 mm to plated holes/SMD | |
| Board minimum size | 50 x 50 mm for bevelling | Front module board must meet this minimum |
| Solder mask | None near gold fingers | Pulled back from finger area |
| Silkscreen | None near gold fingers | No markings in finger zone |

### Design Rules for Gold Fingers

1. **Symmetrical pad placement:** Pads on both sides of the PCB must be aligned (mirror image)
2. **Pad width:** Typically 1.0-1.5 mm for 2.00 mm pitch connectors
3. **Pad-to-pad gap:** 0.5-1.0 mm between adjacent finger pads
4. **No vias in finger zone:** Keep vias at least 1.0 mm from finger pads
5. **Chamfer both edges:** JLCPCB applies the bevel to the insertion edge of the board
6. **Finger orientation:** Pads must extend to the board edge on the insertion side

## Alternative Connectors Considered

### TE Connectivity Card-Edge

TE offers card-edge connectors in various pitches. The 2.00mm pitch range includes parts suitable for 1.6mm PCB. Less documentation found in search results compared to Samtec.

### Amphenol ICC

Amphenol ICC has card-edge options but their standard ranges tend toward higher density (PCI Express style). May not have a 2.00mm pitch option in the right position count.

### Standard PCI Express Style

For a more commodity approach, a standard PCIe x1 slot (36 contacts) could be repurposed. Pros: cheap, widely available, proven reliability. Cons: much larger than needed, 1.00mm pitch is unnecessarily fine, and the mechanical design doesn't suit a thin daughter board.

### Comparison

| Feature | Samtec MEC2-DV | TE Card-Edge | PCIe x1 Slot |
|---------|---------------|-------------|--------------|
| Pitch | 2.00 mm | Various | 1.00 mm |
| Current/pin | 1.7A | TBD | ~1A |
| Mating cycles | ~1,000-5,000 | TBD | ~10,000 |
| Size | Compact | Compact | Oversized |
| Availability | Good | Good | Commodity |
| Cost | ~$2-4 AUD | ~$2-4 AUD | ~$0.50 AUD |

## Application Notes

1. **Card retention:** The MEC2-DV does not include a latch or retention clip. For a field-deployed camera trap, the enclosure design must provide card retention (e.g., a guide slot or clip) to prevent the front module from vibrating loose.

2. **Insertion force:** Card-edge connectors have moderate insertion force. With 12 contacts, expect ~1-2N total. This is appropriate for hand insertion in the field.

3. **Alignment:** The card-edge connector self-aligns via the slot geometry. The front module PCB should have alignment features (notches or asymmetric key) to prevent reverse insertion.

4. **ESD protection:** The card-edge contacts are exposed during module swap. Consider TVS diode arrays on signal pins to protect against ESD during field insertion.

5. **Conformal coating:** Do not apply conformal coating to the card-edge socket contacts. Coat surrounding components only.

## Ordering (Samtec MEC2-DV)

| Distributor | Example Part | Notes |
|-------------|-------------|-------|
| DigiKey | MEC2-08-01-L-DV | 8 per side (16 total), vertical, SMD |
| Mouser | MEC2-20-01-L-DV-WT | 20 per side, with alignment posts |
| Samtec Direct | Configure via samtec.com | Custom position counts, plating options |

Unit price: ~$2-5 AUD depending on position count and plating.

**Note:** Samtec offers free samples for evaluation. Request samples through their website for prototyping.

## Open Items

- [ ] Confirm exact position count needed (6-per-side or 8-per-side) based on combined front module pinout
- [ ] Verify MEC2-DV availability in the required position count via Samtec configurator
- [ ] Confirm mating cycle rating from Samtec product specification PDF
- [ ] Design card retention mechanism for enclosure (clip, guide slot, or friction fit)
- [ ] Design front module PCB with gold fingers per JLCPCB specifications
- [ ] Add keying feature to prevent reverse insertion
- [ ] Add TVS protection on signal pins for ESD during field swap
- [ ] Order Samtec samples for mechanical fit evaluation with 1.6mm FR4 daughter board

## Sources

- [Samtec MEC2-DV Product Page](https://www.samtec.com/products/mec2-dv)
- [Samtec MEC2-DV Specification PDF](https://suddendocs.samtec.com/productspecs/mec2-dv.pdf)
- [Samtec Edge Card Systems](https://www.samtec.com/high-speed-board-to-board/edge-cards/)
- [DigiKey Samtec Edge Card](https://www.digikey.com/en/product-highlight/s/samtec/edge-card-connectors)
- [JLCPCB Gold Fingers Guide](https://jlcpcb.com/help/article/jlcpcb-gold-fingers)
- [JLCPCB Gold Finger Bevel Design](https://jlcpcb.com/blog/considerations-for-gold-finger-bevel-design)
- [JLCPCB Card Edge Connectors Blog](https://jlcpcb.com/blog/pcb-card-edge-connectors-design-gold-fingers-manufacturing)
