# Camera Trap — Schematic Changes V1.1

**Date:** March 2026
**Trigger:** Deep component-level review with internet validation of all parts
**Status:** Pre-layout — all changes must be applied before PCB fab

---

## CRITICAL — Will not function without these fixes

### 1. PSRAM — Wrong part, replace entirely

| | Old (WRONG) | New (CORRECT) |
|---|---|---|
| Part | AP6404L-3SQR | **APS256XXN-OBR-BG** |
| Capacity | 8 MB (not 32 as BOM claimed) | 32 MB |
| Interface | QSPI (4-bit) | HexaDeca-SPI (16-bit DDR, 200 MHz) |
| Package | SOP-8 | BGA-24 (6x8mm, 1.0mm pitch) |
| Voltage | 3.3V | **1.8V** |
| Reference | — | Same part as STM32N6570-DK discovery board |

**Action:** Replace U4. XSPI1 pin assignments (PO0-PO4, PP0-PP15) remain identical. Change VDD/VDDQ from 3.3V to **1.8V rail (TPS7A02)**. Verify TPS7A02 can supply PSRAM + IMX678 DOVDD simultaneously (~80 mA combined).

### 2. IMX678 Power Rails — Wrong voltages

| Rail | Old (WRONG) | New (CORRECT) | Action |
|---|---|---|---|
| AVDD (analog) | 1.8V from TPS7A02 | **3.3V** from TPS62A01 via ferrite bead + LC filter | Route 3.3V to AVDD pads with analog filtering. Separate from digital 3.3V at regulator output. |
| DVDD (digital) | 1.2V from TPS62088 | **1.1V** from TPS62088 (adjust feedback resistors) | Change R_FB divider on TPS62088 to set 1.1V output. STM32N6 core also runs from this rail — verify 1.1V is within N6 VDD spec or add separate 1.1V regulator for sensor. |
| DOVDD (I/O) | 1.8V from TPS7A02 | 1.8V (unchanged) | No change needed. |

**Power-on sequence:** DVDD (1.1V) first, then DOVDD (1.8V), then AVDD (3.3V). All within 200 ms.

### 3. IR LEDs — Wrong wavelength

| | Old (WRONG) | New (CORRECT) |
|---|---|---|
| Part | SFH4718A (850nm) | **SFH4725S** (940nm) |
| Wavelength | 850nm (visible red glow!) | 940nm (covert, no glow) |
| Beam angle | 40° | 90° |
| Package | OSLON Black | OSLON Black (same footprint) |

**Action:** Replace LED1-8 on LED daughter board BOM. Same OSLON Black package — PCB footprint unchanged. Verify illumination coverage with 90° beam vs previous 40° assumption.

### 4. Battery Topology — Changed from 12S to 6S2P

| | Old | New |
|---|---|---|
| Configuration | 12S (all series) | **6S2P** (6 series × 2 parallel) |
| Voltage range | 12.0–16.8V | **6.0–8.4V** |
| Capacity | 2,000 mAh | **4,000 mAh** |
| Battery life | ~54 days | **~108 days** |

**Action:** Update voltage divider: R1=2MΩ, R2=1MΩ (was R1=3.3MΩ, R2=680kΩ). Update all documentation references.

### 5. Power Cascade — TPS62088 and TPS62A01 cannot connect to battery

Both TPS62088 (1.1V buck) and TPS62A01 (3.3V buck) have **max Vin = 5.5V**. Battery is 6.0–8.4V.

**Required topology:**
```
Battery (6.0–8.4V)
  ├─→ AP63300 #1 → 3.8V (modem VBAT, power-gated via PB7)
  ├─→ AP63300 #2 → 5.0V (LED VLED, power-gated via PB6)
  └─→ AP63300 #3 → 3.3V (main digital rail)
        ├─→ TPS62088 → 1.1V (STM32N6 core + IMX678 DVDD)
        ├─→ TPS7A02 → 1.8V (IMX678 DOVDD + PSRAM)
        └─→ Ferrite + LC → 3.3V filtered (IMX678 AVDD)
```

**Action:** Verify schematic has AP63300 as first-stage buck from battery. TPS62088 and TPS62A01 inputs must come from the 3.3V rail, never directly from battery. If TPS62A01 is used, its input must be ≤5.5V.

### 6. MAX17048 Fuel Gauge — REMOVED

**Reason:** CELL pin absolute max = 5.5V. Battery pack is 6.0–8.4V. Would be destroyed on first power-up.

**Action:** Remove U14 (MAX17048), associated passives (bypass cap, CELL filter, CTG cap), and I2C2 pull-ups (PD4/PD14). SOC estimation uses existing BATT_SENSE voltage divider (PA1 ADC). I2C2 and U0 PB2 are now available.

---

## HIGH — Significant risk if not addressed

### 7. Modem Sleep Current — Must power-gate buck

EG800Q-EU power-off mode draws ~55 µA (not ~8 µA as previously estimated). **PB7 (MODEM_3V8_EN) must be driven LOW in sleep** to disable the AP63300 3.8V buck entirely, reducing modem rail current to ~0 µA. This is firmware-enforced, not optional.

### 8. Antenna Part Numbers — Unverified

| Antenna | Old PN (not found) | Suggested replacement |
|---|---|---|
| LTE flex | Molex 2132510100 | **Molex 209142-0180** (698-4000 MHz, verified) |
| GNSS patch | Molex 2066830001 | **Molex 2066400001** (active patch with LNA, verified) |

**Action:** Verify original PNs with Molex. If not available, use suggested replacements.

### 9. Oscillator (Y2) — Part number mismatch

SiT8008BI-**33**-**25**E decodes to 2.5V supply, 5.0×3.2mm package. BOM needs a **1.8V, 2.5×2.0mm (SOT-23-5)** variant.

**Action:** Order correct SiTime part for 1.8V, SOT-23-5. Verify exact ordering code with SiTime configurator.

### 10. LIS2DW12 I2C Address — Changed to avoid leakage

SDO/SA0 pin changed from GND (addr 0x18) to **floating/high** (addr **0x19**). Tying SDO to GND causes ~180 µA continuous leakage through internal pull-up.

**Action:** Leave SDO pin unconnected or tie to VDD_IO. Update firmware I2C address to 0x19.

---

## MEDIUM — Should fix before field deployment

### 11. ESP32-C3 SPI Clock — Reduced

C3 SPI slave max is ~10 MHz (not 20 MHz). Config.h updated to 10 MHz.

### 12. GPS V_BCKP — Insufficient for hot start

100 nF capacitor provides only milliseconds of backup. For hot starts between power-gated sessions, add a 0.1F supercap on V_BCKP. Otherwise accept 24-second cold starts.

### 13. NIR Sensitivity Claim — Corrected

Silicon cutoff is ~1050 nm, not ~1200 nm. 940nm IR LEDs work well with STARVIS 2 — no design change needed, just documentation correction.

### 14. IR Window Material — Corrected

Germanium is opaque at 940nm (it's for LWIR 8-14µm thermal imaging). Use **NIR-optimised polycarbonate** (e.g., Covestro Makrolon NIR series). ~92% transmission at 940nm, appears black to human eye, impact-resistant, $10-30 AUD.

---

## Files Modified

| File | Changes |
|---|---|
| `BOM.csv` | PSRAM, oscillator, IR LEDs, fuel gauge removed, IMX678 voltage notes, regulator notes, antenna PNs, LIS2DW12 address |
| `firmware/config.h` | Battery topology 6S2P, divider ratio, PSRAM part, fuel gauge removed, SPI clock, power rail comments, accel address |
| `DESIGN_SPEC.md` | IMX678 voltages, PSRAM replacement, MAX17048 removed, battery topology, voltage divider, power cascade, LIS2DW12 SDO |
| `POWER_BUDGET.md` | Sleep budget (33µA), battery life (108 days), capacity correction |
| `HARDWARE_DESIGN_BRIEF.md` | Power rails, IR window, battery topology, IMX678 voltages, NIR claim |
| `LED_MODULE_SPEC.md` | SFH4718A → SFH4725S (940nm), beam angle 60° → 90° |
| `CLAUDE.md` | Hardware stack table, battery, power budget |
