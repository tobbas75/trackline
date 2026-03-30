# Trap Monitor — Schematic Changes V1.1

**Date:** 25 March 2026
**Source:** Quectel FAE review (Xianghao Kong, ANZ team) + internal BOM audit
**Schematic reviewed:** EasyEDA V1.0, created 2026-03-16, updated 2026-03-21
**Priority:** All CRITICAL and HIGH items must be completed before PCB fabrication.

---

## Designator Note

The schematic and BOM use different designators for some components. This table maps them. **Please align the schematic to match the BOM designators going forward.**

| Component | Schematic designator | BOM designator | Use BOM designator |
|-----------|---------------------|----------------|-------------------|
| LDO (HT7333-A) | U3 | U4 | U4 |
| Buck (AP63300) | U4 | U5 | U5 |
| Buck FB top | R3 | R25 | R25 |
| Buck FB bottom | R4 | R26 | R26 |
| SIM DATA series | R14 | R10 | R10 |
| SIM CLK series | R15 | R11 | R11 |
| SIM RST series | R16 | R12 | R12 |

---

## Status of Previously Agreed Changes

These were agreed in our earlier emails. Items marked "still outstanding" need to be included in this round.

| # | Item | Status |
|---|------|--------|
| 1 | R1 LCSC fix → C26083 (1M 0402) | Agreed — implement if not done |
| 2 | R2 LCSC fix → C25790 (470k 0402) | Agreed — implement if not done |
| 3 | U4 LDO fix → C21583 (HT7333-A 3.3V) | Agreed — implement if not done |
| 4 | TXB0104 removed → 4x BSS138 (Q3-Q6) with pull-ups | Agreed — implement if not done. Quectel independently confirms TXB0104 cannot work for PWRKEY (OE pin is low during power-up, so PWRKEY can never be driven). |
| 5 | R24 PWRKEY pull-down → pull-up to VDD_EXT | Agreed — implement if not done |
| 6 | C29 EN cap → 100nF (was 1uF) | Agreed — implement if not done |
| 7 | **C5/C7/C8 buck output caps → 47-100uF ceramic** | **STILL OUTSTANDING — flagged three times now. This is the single most likely cause of field failure. Must be done this round.** |

---

## CRITICAL — Board will not work without these

### C1. Buck converter feedback resistors (U5 / AP63300)

**Problem:** Two issues:
1. The AP63300 internal reference voltage is **0.8V** (per datasheet), not 0.6V as written in BOM notes. That was my error in the BOM. Current BOM values (R25=160k, R26=30k) would output **5.07V** — this will damage the modem.
2. Xianghao flagged that the feedback network is "connected incorrectly" in the schematic — the physical wiring of the FB network needs to be redrawn per the AP63300 datasheet application circuit (Figure 1).

**Fix:**
- Redraw FB network per AP63300 datasheet typical application circuit
- FB pin connects to the midpoint of the resistor divider: R_top from VOUT to FB, R_bottom from FB to GND
- For 3.8V output: **R_top = 100k, R_bottom = 27k**
  - Vout = 0.8V x (1 + 100k/27k) = 3.76V (within EG800Q spec)
- Verify against AP63300 datasheet resistor selection table
- Update BOM: R25 = 100k, R26 = 27k

### C2. LDO input voltage too high (U4 / HT7333-A)

**Problem:** U4 is fed directly from +BATT (up to 7.2V). The voltage drop (7.2V - 3.3V = 3.9V) at 150mA load dissipates ~585mW in a SOT-89 package. At 40degC ambient (outdoor Australia) this exceeds the 150degC junction temperature limit. It will overheat in the field.

**Fix:**
- Change U4 input from +BATT to the buck output (3.8V rail from U5)
- This gives 0.5V drop x 150mA = 75mW — safe in SOT-89
- Routing change: U4 VIN connects to U5 VOUT instead of +BATT

### C3. GPS module V_IO not connected (U8 / MAX-M10S)

**Problem:** V_IO (pin 7) is unconnected in the schematic. V_IO powers all digital I/O on the M10 including UART TX/RX. Per the u-blox Integration Manual, both VCC and V_IO must be present for normal operation. GPS UART will not work without this.

**Fix:**
- Connect V_IO (pin 7) to 3V3
- Leave VIO_SEL (pin 15) open/unconnected — this selects 3.3V I/O mode
- Add 100nF decoupling cap on V_IO close to pin

### C4. GPS power gate FET orientation (Q1 / SI2301, Q2 / BSS138)

**Problem:** Xianghao flagged that Q1 and Q2 drain/source appear reversed. SI2301 SOT-23 pinout: Pin1=Gate, Pin2=Source, Pin3=Drain. If the EasyEDA symbol has the wrong pin mapping, the power gate will not switch correctly.

**Fix:**
- Verify Q1 (SI2301) schematic symbol pin map matches physical SOT-23: Gate=1, Source=2, Drain=3
- For high-side P-FET switch: Source connects to 3V3 supply, Drain connects to GPS_VCC load
- Verify Q2 (BSS138) orientation as well (Gate=1, Source=2, Drain=3)
- If symbols are wrong, update the pin mapping in EasyEDA

### C5. Identify and resolve R25 in LTE section

**Problem:** Xianghao says "R25 is suggested to be deleted" in the LTE circuit section. There is a designator conflict — R25 in the BOM is the buck FB resistor (different function). Need to identify what R25 connects to in the modem area.

**Fix:**
- Please confirm what R25 connects to in the LTE section of your schematic
- If it's a pull-down/pull-up near the modem: delete it per Xianghao's recommendation
- If it's the same component as BOM R25 (buck FB): the designator numbering needs fixing
- Report back what it connects to so we can confirm

---

## HIGH — Will cause problems in testing

### H1. Solar diode D4 (SB1045L) reversed

**Problem:** Cathode of D4 should be connected to GND. Currently reversed.

**Fix:** Flip D4 orientation so cathode goes to GND.

### H2. Solar caps C26/C27 swap positions

**Problem:** Smaller capacitance should be closer to the circuit output.

**Fix:** Swap C26 and C27 physical positions. C27 (1uF, smaller) closer to output.

### H3. Solar decoupling on CN3767 VCC

**Problem:** C23 (47uF) is drawn far from CN3767 VCC pin. Also missing high-frequency decoupling.

**Fix:**
- Place C23 (47uF) as close as possible to CN3767 VCC pin
- Add 1uF ceramic in parallel, close to VCC pin
- Add 100nF ceramic in parallel, close to VCC pin

### H4. Buck output HF decoupling

**Problem:** Output side of buck (U5 / AP63300) needs additional HF decoupling beyond the main output caps.

**Fix:** Add 1uF + 100nF ceramic in parallel with the main output caps, close to VOUT pin. This is in addition to the C5/C7/C8 fix (47-100uF) from the previously agreed changes.

### H5. SIM series resistors — change to 0 ohm

**Problem:** R10/R11/R12 are 22 ohm. Quectel EG800Q hardware design guide specifies 0 ohm for USIM_DATA, USIM_CLK, USIM_RST. The 0 ohm acts as a debug jumper — can be swapped for a different value after signal integrity testing if needed.

**Fix:** Change R10, R11, R12 from 22 ohm to 0 ohm (0402).

### H6. CP2102N (U6) VDD bypass cap missing

**Problem:** No decoupling capacitor on U6 VDD pin.

**Fix:** Add 100nF ceramic (0402) directly on U6 VDD pin to GND.

---

## MEDIUM — Recommended improvements

### M1. RF ESD protection on antenna traces

Add ultra-low capacitance ESD diodes (0.1pF to 0.5pF max) on:
- Modem RF trace (JP1 to EG800Q-EU ANT_MAIN)
- GPS RF trace (JP2 to MAX-M10S RF_IN)

**Important:** Only use ESD parts rated for RF — standard TVS diodes have too much capacitance and will attenuate the signal.

### M2. Test points

Add test points on:
- USB_VBUS, USB_DM, USB_DP (for firmware upgrade / debug)
- Debug UART TX/RX (AUX_TXD/AUX_RXD or DBG_TXD/DBG_RXD)
- All power rails: +BATT, 3.8V (buck output), 3V3 (LDO output), VDD_EXT (1.8V)
- GPS_VCC (after power gate)
- PWRKEY, STATUS (modem control)

### M3. 0 ohm isolation resistors between power stages

Add 0 ohm resistors between:
- +BATT and buck input (U5 VIN)
- Buck output and LDO input (U4 VIN, after C2 fix)
- +BATT and solar charger output

Purpose: allows cutting power stages apart for isolated debugging. Replace with wire link for production.

### M4. SIM hot-swap (optional)

The SIM card holder (C266612) supports hot-swap and EG800Q supports USIM_DET. Consider wiring USIM_DET to the card detect pin for hot-swap functionality. Low priority — can be added in a future revision.

### M5. 4-layer stackup

Xianghao recommends 4-layer PCB for boards with multiple switching circuits (buck converter + solar charger). Benefits:
- Dedicated ground plane reduces switching noise
- Better thermal dissipation
- Proper RF trace impedance control (50 ohm)

This impacts cost — discuss with Toby.

---

## PCB Layout Notes from Xianghao (no schematic changes)

These are layout guidelines for PCB routing:

1. **Buck converter (U5) and solar charger (CN3767):** Follow buck converter layout guidelines. Keep power loop areas small. Input caps close to VIN/GND. Inductor close to SW pin. Output caps close to GND. Reference: https://fscdn.rohm.com/en/products/databook/applinote/ic/power/switching_regulator/converter_pcb_layout_appli-e.pdf
2. **SIM card traces:** Keep short, away from switching noise areas, avoid vias, provide unbroken return path.
3. **RF antenna traces:** Calculate trace width for 50 ohm impedance. Use via fencing around RF traces and u.FL connectors.

---

## Checklist

**Previously agreed (implement if not already done):**
- [ ] R1 → 1M (C26083)
- [ ] R2 → 470k (C25790)
- [ ] U4 → HT7333-A (C21583)
- [ ] TXB0104 → 4x BSS138 with pull-ups
- [ ] R24 → pull-up to VDD_EXT
- [ ] C29 → 100nF
- [ ] C5/C7/C8 → 47-100uF ceramic (OUTSTANDING)

**Critical (new):**
- [ ] C1: Redraw buck FB network, R25=100k R26=27k (Vref=0.8V, target 3.8V)
- [ ] C2: Route LDO (U4) input from buck output instead of +BATT
- [ ] C3: Connect M10 V_IO to 3V3 + add 100nF decoupling
- [ ] C4: Verify Q1/Q2 pin mapping in EasyEDA vs physical SOT-23
- [ ] C5: Identify R25 in LTE section — report what it connects to, then delete

**High:**
- [ ] H1: Flip D4 diode orientation
- [ ] H2: Swap C26/C27 positions
- [ ] H3: Move C23 close to CN3767 VCC + add 1uF + 100nF
- [ ] H4: Add 1uF + 100nF on buck output (HF decoupling)
- [ ] H5: R10/R11/R12 change from 22R to 0R
- [ ] H6: Add 100nF on CP2102N VDD

**Medium:**
- [ ] M1: Add RF ESD diodes (ultra-low cap)
- [ ] M2: Add test points
- [ ] M3: Add 0R power stage isolation
- [ ] M4: SIM hot-swap wiring (optional)
- [ ] M5: Discuss 4-layer stackup

**Housekeeping:**
- [ ] Align all designators between schematic and BOM
