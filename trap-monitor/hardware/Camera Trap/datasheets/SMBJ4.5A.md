---
component: SMBJ4.5A TVS Diode (Modem VBAT Protection)
type: Unidirectional Transient Voltage Suppressor
manufacturer: Various (Littelfuse, Bourns, Vishay, STMicroelectronics, Diodes Inc.)
package: SMB (DO-214AA)
status: CONFIRMED NON-EXISTENT — SMBJ4.5A does not exist in ANY manufacturer lineup (Bourns, Littelfuse, Vishay, ON Semi). Replaced with BZT52C4V3 Zener + PTC fuse approach.
verified_orderable: NO — part does not exist. Replacement: BZT52C4V3-7-F (LCSC C151003) + PTC fuse.
last_updated: 2026-03-29
confidence: HIGH — confirmed non-existent via Chrome research across Bourns SMBJ datasheet, Littelfuse SMAJ/SMDJ datasheets, Nexperia PESD series, and DigiKey parametric search. No unidirectional TVS with ≤4.3V standoff exists in SMA/SMB/SMC packages from any manufacturer.
---

# SMBJ4.5A TVS Diode — Modem VBAT Over-Voltage Protection

## Summary

TVS diode on the modem daughter card VBAT rail to protect the Quectel EG800Q-EU against over-voltage from AP63300 regulator failure. The modem absolute maximum VBAT is 4.5V (per EG800Q-EU datasheet, operating range 3.3-4.3V).

## CRITICAL: Part Number Validity

**The SMBJ4.5A may not be a standard part number.** Research across Littelfuse, Bourns, Vishay, and STMicroelectronics SMBJ series datasheets shows the series typically starts at SMBJ5.0A (5.0V standoff). No SMBJ4.5A was found in any manufacturer's standard product table.

**Options:**
1. **SMBJ5.0A** — lowest standard SMBJ part. Standoff 5.0V, clamping 9.2V. **Clamping voltage is too high for EG800Q-EU protection (max 4.5V).**
2. **SMAJ4.5A** — SMAJ series (400W) includes a 4.5V variant. Smaller package (SMA/DO-214AC), lower power rating.
3. **SMBJ3.3A** — would clamp lower but standoff voltage (3.3V) is below the normal operating VBAT of 3.8V, causing the TVS to conduct during normal operation.
4. **Alternative TVS families** — consider SP0503BAHT, PESD5V0, or Zener-based clamping.

## SMBJ5.0A Specifications (Closest Standard Part)

**WARNING: The SMBJ5.0A clamping voltage of 9.2V far exceeds the EG800Q-EU absolute maximum of 4.5V. This part does NOT provide adequate protection for this application.**

| Parameter | Value | Notes |
|-----------|-------|-------|
| Designation | SMBJ5.0A | Unidirectional |
| Standoff Voltage (V_WM) | 5.0V | Max continuous working voltage |
| Breakdown Voltage (V_BR) | 6.40V min, 7.00V max | At I_T = 1 mA |
| Clamping Voltage (V_C) | 9.2V | At I_PP = 65.2A |
| Peak Pulse Current (I_PP) | 65.2A | 10/1000 us waveform |
| Peak Pulse Power | 600W | 10/1000 us waveform |
| Reverse Leakage (I_R) | 800 uA max | At V_WM = 5.0V |
| Capacitance | ~350-500 pF typical | From graph — not spec'd numerically |
| Package | SMB (DO-214AA) | 4.57 x 3.94 x 2.44 mm |
| Response Time | < 1 ns (typical for TVS) | |
| Operating Temp | -55 to +150 C | |

### Why SMBJ5.0A Does NOT Work

The EG800Q-EU modem has:
- Operating VBAT range: 3.3V - 4.3V
- Absolute maximum VBAT: 4.5V (damage threshold)

The SMBJ5.0A:
- Does not begin conducting until V_BR = 6.4V minimum
- Clamps at 9.2V under surge conditions

**This means the modem would be damaged (>4.5V) long before the TVS activates.** The SMBJ5.0A is only useful for protecting against high-energy surges where the modem has already been destroyed — it does not protect against regulator over-voltage faults.

## Recommended Alternative: SMAJ4.5A

The SMAJ series (400W, SMA/DO-214AC package) includes a 4.5V standoff variant.

| Parameter | SMAJ4.5A (estimated) | Notes |
|-----------|---------------------|-------|
| Standoff Voltage (V_WM) | 4.5V | |
| Breakdown Voltage (V_BR) | ~5.0V min | Estimated from series progression |
| Clamping Voltage (V_C) | ~7.5V (estimated) | At peak pulse current |
| Peak Pulse Power | 400W | Lower than SMBJ (600W) |
| Package | SMA (DO-214AC) | Smaller than SMB |

**Problem:** The SMAJ4.5A still clamps at ~7.5V, which is well above the 4.5V modem maximum. TVS diodes by design clamp at significantly higher voltage than their standoff — they are surge protectors, not voltage regulators.

## Correct Approach: Zener or Active Clamp

For protecting a 4.3V-max device powered from a 3.8V rail, a standard TVS diode is the wrong protection topology. The voltage margin is too small (3.8V operating, 4.3V max, 4.5V absolute max).

### Option A: Zener Diode Clamp

A 4.3V Zener diode (e.g., BZT52C4V3) provides a hard clamp at ~4.3V:

| Parameter | BZT52C4V3 | Notes |
|-----------|-----------|-------|
| Zener Voltage | 4.3V (nom) | At 5 mA test current |
| Tolerance | +/- 5% (4.09V - 4.52V) | C tolerance grade |
| Package | SOD-123 | Much smaller than SMB |
| Power Rating | 500 mW | Limits fault current handling |
| Dynamic Resistance | ~20 ohm | Voltage rises under high current |

**Concern:** A Zener can only absorb limited fault current. If the AP63300 output FET fails short (battery voltage ~7-8V appears on 3.8V rail), the fault current through a 4.3V Zener would be (7.2 - 4.3) / R_source, potentially exceeding the Zener's power rating. The Zener would fail, but it might fail short (protecting the modem temporarily) or open (providing no protection).

### Option B: TVS with Lower Clamping + Fuse

Use a low-voltage TVS or Zener in combination with a resettable fuse (PTC) or current-limiting resistor:

1. PTC fuse (e.g., 0.5A hold) in series with VBAT
2. 4.3V Zener or TVS to ground after the fuse
3. Over-voltage fault causes Zener to conduct, current rises, fuse trips

This provides robust protection at the cost of an additional component.

### Option C: Keep SMBJ5.0A as Surge Protection Only

Accept that the SMBJ5.0A protects against external surges (ESD, cable transients) but not against regulator failure. Rely on the AP63300's internal over-voltage protection and layout to prevent regulator failure modes.

**Recommendation:** Use Option B (Zener + PTC) for robust protection, or Option C if the risk of AP63300 FET failure is deemed acceptably low. Document the decision.

## BOM Note Correction

The BOM states: "Clamps at 4.5V. Protects modem (abs max 4.5V) against AP63300 FET failure."

**This is incorrect.** No standard SMB TVS diode clamps at 4.5V. The SMBJ5.0A clamps at 9.2V. The BOM description should be updated to reflect the actual protection provided or the alternative protection scheme chosen.

## Ordering (SMBJ5.0A — if used for surge protection only)

| Distributor | Manufacturer | Part Number | Stock |
|-------------|-------------|-------------|-------|
| DigiKey | Littelfuse | SMBJ5.0A | In stock |
| LCSC | Various | SMBJ5.0A | In stock |
| Mouser | STMicroelectronics | SMBJ5.0A-TR | In stock |
| Octopart | Multiple | SMBJ5.0A | Multiple sources |

Unit price: ~$0.10-0.20 AUD (qty 1).

## Open Items

- [ ] **CRITICAL:** Decide protection strategy — Zener+PTC, SMBJ5.0A surge-only, or alternative
- [ ] Verify SMBJ4.5A existence — contact Littelfuse/Bourns to confirm if this is a real or phantom part number
- [ ] Update BOM D_OVP entry to reflect correct part number and actual protection characteristics
- [ ] If using Zener approach, select specific part and calculate fault current / power dissipation
- [ ] Review AP63300 failure modes — does the output FET fail short or open? What is the actual over-voltage risk?
- [ ] Consider whether the modem's own internal protection (EG800Q-EU may have internal ESD/OVP) is sufficient

## Sources

- [Littelfuse SMBJ Series Datasheet](https://www.littelfuse.com/assetdocs/tvs-diodes-smbj-series-datasheet?assetguid=ba555e99-a12d-4f72-a0b6-86b06c67171e)
- [Bourns SMBJ Series Datasheet](https://www.bourns.com/docs/Product-Datasheets/SMBJ.pdf)
- [Vishay SMBJ Series Datasheet](https://www.vishay.com/docs/88392/smbj.pdf)
- [Diodes Inc SMBJ Datasheet](https://www.diodes.com/datasheet/download/SMBJ5.0(C)A-SMBJ170(C)A.pdf)
- [Littelfuse SMBJ5.0A Product Page](https://www.littelfuse.com/products/overvoltage-protection/tvs-diodes/surface-mount/smbj/smbj5-0a)
- [STMicroelectronics SMBJ5.0A](https://www.st.com/en/protections-and-emi-filters/smbj5-0a.html)
