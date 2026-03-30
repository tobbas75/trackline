# AI Camera Trap — Development & Manufacturing Cost Analysis

**Date:** 14 March 2026
**Product:** Between 23° AI Camera Trap (STM32N6 + IMX678)
**Currency:** All figures in AUD unless otherwise noted
**FX assumption:** 1 USD = 1.55 AUD (March 2026)

---

## 1. Development Costs (One-Time, to Production-Ready)

### 1.1 Hardware Development

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| **STM32N6570-DK Discovery Kit** | $285 | Dev board for firmware/AI bring-up. DigiKey ~US$183. |
| **STM32U0 Nucleo board** | $25 | Power controller dev. Cheap. |
| **ESP32-C3 dev boards (×3)** | $30 | Comms processor dev. |
| **IMX678 eval module** (e-con/Arducam) | $400–600 | Camera module for sensor bring-up. MIPI CSI-2 eval. |
| **Quectel EG800Q eval kit** | $150 | Modem eval + AT command dev. |
| **u-blox MAX-M10S eval kit** | $120 | GPS eval (shared with Trap Monitor). |
| **Breakout boards, dev tools, adapters** | $500 | Logic analysers, MIPI probes, SWD debuggers, JST cables. |
| **Schematic capture + PCB layout (contractor)** | $5,000–10,000 | 4-layer controlled impedance. MIPI + xSPI routing. Modem card + LED module boards. |
| **Rev A prototype PCBs (5 sets, JLCPCB PCBA)** | $2,500–4,000 | 3 boards × 5 sets. Includes stencils, setup fees, partial assembly. Hand-solder BGA/LGA. |
| **Rev A components (5 prototype sets)** | $4,000–5,000 | 5× full BOM at prototype pricing. STM32N6 ~$17/ea, IMX678 ~$31/ea at low qty. |
| **Rev B prototype PCBs (5 sets, corrected)** | $2,500–4,000 | Budget for at least one respin. New silicon = expect issues. |
| **Rev B components (5 prototype sets)** | $4,000–5,000 | Same as Rev A. |
| **Test equipment** | $1,000–2,000 | Bench PSU, current probe, thermal camera rental, SD card test jig. |
| **Subtotal hardware dev** | **$20,510–$31,735** | |

### 1.2 Firmware Development

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| **STM32CubeIDE + CubeMX** | $0 | Free. |
| **STM32Cube.AI** | $0 | Free for model conversion to NPU. |
| **MegaDetector v5 model** | $0 | Open-source (Microsoft). |
| **Addax AWC species dataset** | $0 | Partnership / open-access. |
| **Edge Impulse (model optimisation)** | $0–500 | Free tier may suffice. Pro if needed for INT8 quantisation tuning. |
| **Firmware dev (your time)** | $0 (sweat) | Or $15,000–30,000 if contracting. HAL, state machine, AI pipeline, modem driver, WiFi offload, BLE config. |
| **Subtotal firmware dev** | **$0–$30,500** | |

### 1.3 Enclosure — In-House Manufacturing

In-house CNC mill (commercial unit) + Bambu Lab large-format 3D printer eliminates outsourced enclosure costs entirely.

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| **3D printer filament (prototyping)** | $100–200 | ASA/PC filament for design iteration. Print overnight, test next day. |
| **CNC fixture / jig (one-time)** | $300–500 | Aluminium fixture for repeatable part holding. Machine in-house. |
| **CNC end mills / tooling** | $200–400 | Polycarbonate/nylon cutting tools. Single-flute + ball nose set. |
| **O-ring / seal samples** | $100–200 | Buy range of standard sizes, test fit on prototypes. |
| **Subtotal enclosure tooling** | **$700–$1,300** | |

**Workflow:** 3D print → test fit PCBs/optics → iterate → lock design → CNC from solid polycarbonate for production. Injection moulding deferred to 500+ units when justified.

**Note:** Industrial design (CAD model, IP67 seal geometry) is self-developed using 3D printer for rapid iteration. No contractor needed for first 100 units.

### 1.4 Certification & Compliance

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| **EMC testing (AS/NZS CISPR 32)** | $5,000–10,000 | Compliance Engineering or EMC Technologies (Melbourne). Pre-scan + full test. |
| **RCM registration** | $500–1,200 | Initial registration + agent fees. |
| **RCM annual fees** | $75/year | EESS database maintenance. |
| **LTE type approval (ACMA)** | $2,000–5,000 | EG800Q may have existing type approval — check Quectel. Could save most of this. |
| **Electrical safety (AS/NZS 60950 or 62368)** | $3,000–6,000 | Battery-powered device, lower risk. May be self-declared for low-voltage. |
| **IP67 testing (environmental)** | $1,500–3,000 | Ingress protection verification. |
| **Subtotal certification** | **$12,075–$25,275** | |

**Note:** If EG800Q-EU already has Australian type approval from Quectel (likely — it supports Band 28), the LTE approval cost drops to near zero. Check with Quectel distributor.

### 1.5 AI Model Training & Validation

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| **Compute for model quantisation** | $200–500 | Cloud GPU time for INT8 quantisation and validation. |
| **Field validation dataset** | $500–2,000 | Travel to Tiwi or Arnhem Land for ground-truth camera trap images. |
| **Subtotal AI** | **$700–$2,500** | |

### 1.6 Development Cost Summary

| Category | Low Est. (AUD) | High Est. (AUD) |
|----------|---------------|-----------------|
| Hardware development | $20,510 | $31,735 |
| Firmware development | $0 | $30,500 |
| Enclosure (in-house CNC + 3D printer) | $700 | $1,300 |
| Certification & compliance | $12,075 | $25,275 |
| AI model training | $700 | $2,500 |
| **Contingency (15%)** | $5,098 | $13,697 |
| **TOTAL DEVELOPMENT** | **$39,083** | **$105,007** |

**Realistic estimate (firmware self-developed, in-house CNC/3D printed enclosures, some certification savings):**

**~$45,000–$60,000 AUD to production-ready for the first 100 units.**

In-house CNC + 3D printing saves ~$25,000–50,000 vs outsourced enclosure tooling.

---

## 2. Bill of Materials — Per Unit (100-Unit Run)

Component pricing at 100-unit quantities. Small-batch premium applies (~20–40% over 1K+ pricing for key ICs).

### 2.1 Main Board

| Component | Qty | Unit Cost (AUD) | Extended (AUD) | Notes |
|-----------|-----|----------------|---------------|-------|
| STM32N657X0H3Q | 1 | $20.50 | $20.50 | ~US$13.20 at 100 qty (DigiKey). Premium over 1K price. |
| STM32U083KCU6 | 1 | $4.50 | $4.50 | ~US$2.90 at 100 qty. |
| Sony IMX678 | 1 | $35.00 | $35.00 | ~US$22.50. Sony distributor, low-qty premium. |
| SiT8008BI (24 MHz osc) | 1 | $1.50 | $1.50 | |
| M12 lens + IR-cut filter | 1 | $12.50 | $12.50 | |
| APS256XXN-OB9-BG (32MB PSRAM, 1.8V) | 1 | $5.00 | $5.00 | |
| W25Q128JV (16MB NOR) | 1 | $3.50 | $3.50 | |
| W25Q256JV (32MB NOR) | 1 | $5.50 | $5.50 | |
| µSD slot (Molex) | 1 | $1.25 | $1.25 | |
| 2× PIR (Panasonic EKMB) | 2 | $8.00 | $16.00 | ~US$5.15/ea at 100 qty. |
| ESP32-C3-MINI-1U | 1 | $4.00 | $4.00 | |
| u-blox MAX-M10S | 1 | $19.00 | $19.00 | ~US$12.25 at 100 qty. |
| TPS62088 ×2 (VDDCORE 0.81/0.89V + DVDD 1.1V) | 2 | $2.50 | $5.00 | DSBGA-6. Replaces single 1.2V buck. |
| AP63300WU (3.3V main rail) | 1 | $2.50 | $2.50 | Replaces TPS62A01 (max Vin 5.5V, destroyed by battery). |
| TPS7A02 (1.8V LDO) | 1 | $1.25 | $1.25 | |
| AP63300WU (3.8V modem buck) | 1 | $2.50 | $2.50 | |
| ~~MAX17048 (fuel gauge)~~ | 0 | — | $0.00 | REMOVED — lithium-only algorithm, incompatible with NiMH. SOC via ADC. |
| 5V buck/boost (LED rail) | 1 | $2.50 | $2.50 | |
| Connectors (battery, solar, USB-C, JST) | — | — | $3.00 | |
| USB ESD (USBLC6-2SC6) | 1 | $0.50 | $0.50 | |
| Status LEDs (×3) | 3 | $0.08 | $0.25 | |
| Reset switch | 1 | $0.08 | $0.08 | |
| Reed switch (magnet) | 1 | $0.80 | $0.80 | |
| RTC crystal (32.768 kHz) | 1 | $0.30 | $0.30 | |
| Passives (~55 pcs) | 55 | ~$0.02 | $1.10 | Resistors + capacitors |
| Antennas (LTE flex + GNSS patch + WiFi) | 3 | — | $12.00 | |
| u.FL connectors (×3) | 3 | $0.30 | $0.90 | |
| GPS power gate (SI2301 + BSS138) | 1 | $0.25 | $0.25 | |
| **Main board components subtotal** | | | **$162.68** | |

### 2.2 Main Board PCB & Assembly

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| 4-layer PCB (ENIG, controlled impedance) | $12.00 | JLCPCB at 100 qty. ~US$7.70. |
| SMT assembly (JLCPCB PCBA) | $8.00–12.00 | ~80 SMD placements. Setup amortised over 100. |
| Through-hole assembly (PIR, connectors) | $3.00–5.00 | May need hand solder for TH parts. |
| Stencil + setup fees (amortised) | $2.00 | $200 setup / 100 units. |
| **Main board PCB + assembly subtotal** | **$25.00–$31.00** | |

### 2.3 IR LED Module (Daughter Board)

| Component | Qty | Unit Cost (AUD) | Extended (AUD) |
|-----------|-----|----------------|---------------|
| 8× ams-OSRAM SFH 4725AS A01 (940nm LEDs) | 8 | $1.25 | $10.00 |
| AL8861 LED driver | 1 | $0.80 | $0.80 |
| Sense resistor + ID resistor | 2 | $0.05 | $0.10 |
| JST GH connector + cable | 1 | $1.25 | $1.25 |
| 2-layer PCB + assembly | 1 | $3.00 | $3.00 |
| **LED module subtotal** | | | **$15.15** |

### 2.4 Modem Daughter Card

| Component | Qty | Unit Cost (AUD) | Extended (AUD) |
|-----------|-----|----------------|---------------|
| Quectel EG800Q-EU | 1 | $25.00 | $25.00 |
| 4× BSS138 level shifters | 4 | $0.08 | $0.32 |
| Nano-SIM holder | 1 | $0.80 | $0.80 |
| SIM ESD (TPD3E001) | 1 | $0.50 | $0.50 |
| u.FL connector | 1 | $0.30 | $0.30 |
| Bulk capacitors (100µF + 10µF + 100nF) | 3 | — | $0.35 |
| Pull-down resistor | 1 | $0.02 | $0.02 |
| 20-pin header | 1 | $0.80 | $0.80 |
| 2-layer PCB + assembly | 1 | $3.50 | $3.50 |
| **Modem card subtotal** | | | **$31.59** |

### 2.5 Enclosure & Mechanical (In-House CNC)

| Item | Cost (AUD) | Notes |
|------|-----------|-------|
| Polycarbonate block stock (body + lid) | $5.00 | ~$40/kg, ~120g per enclosure. In-house CNC. |
| CNC consumables (end mill wear, amortised) | $2.00 | Amortised over 100+ parts. |
| Battery caddy (12 AA) | $5.00 | Off-the-shelf, modified. |
| Mounting hardware (python strap, screws) | $3.00 | |
| IR window (polycarbonate, CNC cut in-house) | $1.50 | Material only — cut on same CNC. |
| Seals / gaskets (O-ring) | $1.50 | Standard O-ring, bulk buy. |
| **Enclosure subtotal** | **$18.00** | |

### 2.6 Per-Unit BOM Summary (100-Unit Run)

| Assembly | Cost (AUD) |
|----------|-----------|
| Main board components | $162.68 |
| Main board PCB + assembly | $25.00–31.00 |
| IR LED module | $15.15 |
| Modem daughter card | $31.59 |
| Enclosure + mechanical (in-house CNC) | $18.00 |
| **TOTAL BOM per unit** | **$252.42–$258.42** |

**Call it ~$255 AUD per unit** (~US$165) for the first 100. In-house CNC saves ~$35/unit vs outsourced enclosures.

### 2.7 BOM at Scale (1,000+ units)

At 1,000+ units with volume pricing and injection-moulded enclosure:

| Assembly | Cost (AUD) |
|----------|-----------|
| Main board components | $130.00 |
| Main board PCB + assembly | $15.00 |
| IR LED module | $12.00 |
| Modem daughter card | $25.00 |
| Enclosure (injection moulded) | $15.00 |
| **TOTAL BOM per unit (1K)** | **~$197 AUD** (~US$127) |

---

## 3. First 100 Units — Total Program Cost

| Category | Cost (AUD) | Notes |
|----------|-----------|-------|
| **Development (one-time)** | $45,000–60,000 | Hardware, firmware (self-dev), in-house enclosure, certification |
| **Manufacturing (100 units × $255)** | $25,500 | Components + PCB assembly + in-house CNC enclosure |
| **Shipping / freight (JLCPCB → AU)** | $800–1,500 | DDP sea freight for boards, air for prototypes |
| **Assembly labour (in-house)** | $2,000–4,000 | Final assembly: board into enclosure, battery caddy, antenna routing, testing |
| **Functional test jig** | $1,000–2,000 | Custom test fixture for production testing |
| **Packaging** | $500–1,000 | Simple box, quick start card, mounting strap |
| **SD cards (128 GB × 100)** | $1,500 | ~$15/ea bulk. |
| **Spare parts / yield buffer (5%)** | $1,275 | 5 extra units' worth of components |
| **TOTAL (100 units)** | **$77,575–$96,775** | |

### Per-Unit Fully Loaded Cost (First 100) — Cash Only

| Metric | Value |
|--------|-------|
| Development amortised over 100 | $450–600 |
| Manufacturing per unit | ~$255 |
| Assembly + test + packaging | $35–70 |
| **Fully loaded cost per unit (cash)** | **$740–$925** |

### Per-Unit Fully Loaded Cost (First 100) — Including Labour

| Metric | Value |
|--------|-------|
| Development amortised over 100 (cash) | $450–600 |
| Labour amortised over 100 | $450–684 |
| Manufacturing per unit | ~$255 |
| Assembly + test + packaging | $35–70 |
| **True fully loaded cost per unit** | **$1,190–$1,609** |

### Per-Unit Fully Loaded Cost (if development amortised over 1,000) — Including Labour

| Metric | Value |
|--------|-------|
| Development amortised over 1,000 (cash) | $45–60 |
| Labour amortised over 1,000 | $45–68 |
| Manufacturing per unit (at 1K) | ~$197 |
| Assembly + test + packaging | $20–30 |
| **True fully loaded cost per unit** | **$307–$355** |

---

## 4. Break-Even Analysis

### 4.1 Labour / Sweat Equity Estimate

All founder time is costed at **$60/hr AUD** for break-even purposes.

| Task | Est. Hours | Labour Cost (AUD) |
|------|-----------|-------------------|
| Firmware development | 400–600 | $24,000–36,000 |
| Enclosure design + CAD + iteration | 80–120 | $4,800–7,200 |
| CNC machining (100 units) | 60–100 | $3,600–6,000 |
| 3D print prototyping + testing | 30–50 | $1,800–3,000 |
| Final assembly + test (100 units) | 100–150 | $6,000–9,000 |
| Project mgmt, sourcing, cert coordination | 80–120 | $4,800–7,200 |
| **Total labour** | **750–1,140 hrs** | **$45,000–68,400** |

~6–9 months full-time equivalent.

### 4.2 Total Economic Cost (Cash + Labour)

| Component | Low Est. (AUD) | High Est. (AUD) |
|-----------|---------------|-----------------|
| Cash outlay (dev + manufacturing) | $60,000 | $75,000 |
| Labour (sweat equity at $60/hr) | $45,000 | $68,400 |
| **Total economic cost** | **$105,000** | **$143,400** |

### 4.3 Break-Even (Including Labour)

At **$399 AUD retail** (~US$257):

| Scenario | Total Cost (cash + labour) | Mfg Cost/Unit | Margin/Unit | Break-Even Units |
|----------|---------------------------|---------------|-------------|-----------------|
| Conservative | $143,400 | $255 | $144 | 996 |
| Moderate | $120,000 | $230 | $169 | 710 |
| Optimistic | $105,000 | $197 | $202 | 520 |

At **$499 AUD retail** (~US$322, Reconyx 4K territory):

| Scenario | Total Cost (cash + labour) | Mfg Cost/Unit | Margin/Unit | Break-Even Units |
|----------|---------------------------|---------------|-------------|-----------------|
| Conservative | $143,400 | $255 | $244 | 588 |
| Moderate | $120,000 | $230 | $269 | 446 |
| Optimistic | $105,000 | $197 | $302 | 348 |

### 4.4 Break-Even (Cash Only — Excludes Labour)

For cash flow planning — what you actually need in the bank:

At **$399 AUD retail**:

| Scenario | Cash Cost | Mfg Cost/Unit | Margin/Unit | Break-Even Units |
|----------|----------|---------------|-------------|-----------------|
| Conservative | $75,000 | $255 | $144 | 521 |
| Moderate | $65,000 | $230 | $169 | 385 |
| Optimistic | $60,000 | $197 | $202 | 297 |

**Key insight:** Including labour, true break-even is ~520–1,000 units at $399 AUD. That's achievable within Year 2–3 based on the market analysis (target 500–2,600 units Year 1–2). At $499 AUD, break-even drops to ~350–590 units — comfortably within reach.

**For grant applications:** The sweat equity component ($45–68K) is claimable as in-kind contribution, strengthening the total project value to $105–143K.

---

## 5. Cost Reduction Levers

| Lever | Savings | When |
|-------|---------|------|
| Volume pricing (1K+ on STM32N6, IMX678) | 20–30% on key ICs | After pilot proves demand |
| Injection-moulded enclosure | $5–10/unit vs in-house CNC | After 500+ committed orders |
| Quectel volume pricing | ~$5/unit on modem | At 500+ qty |
| JLCPCB economic PCBA tier | ~$3–5/unit on assembly | 500+ qty |
| Consolidate NOR flash (1× 32MB vs 2× separate) | ~$2/unit | Rev C board |
| eSIM (MFF2) instead of SIM holder | ~$0.50/unit + simpler assembly | When eSIM profiles available in AU |
| Source IMX678 from Chinese module houses | ~$5–10/unit | Risk: quality. Only if supply-constrained. |

---

## 6. Cash Flow Timeline

| Month | Activity | Cash Out (AUD) | Cumulative |
|-------|----------|---------------|------------|
| 1–2 | Dev kits, eval boards | $2,000 | $2,000 |
| 2–4 | Schematic + PCB layout (contractor) | $8,000 | $10,000 |
| 3–5 | 3D print enclosure prototypes (parallel) | $200 | $10,200 |
| 4–5 | Rev A prototypes (5 sets) | $7,000 | $17,200 |
| 5–7 | Firmware bring-up, testing | $1,000 | $18,200 |
| 6–7 | CNC fixture + tooling (parallel) | $700 | $18,900 |
| 7–8 | Rev B prototypes (5 sets) | $7,000 | $25,900 |
| 8–10 | Certification (EMC, RCM) | $12,000 | $37,900 |
| 10–11 | CNC enclosures (100 units, in-house) | $1,800 | $39,700 |
| 11–12 | First 100 PCB/component manufacturing order | $25,500 | $65,200 |
| 12–13 | Assembly, test, packaging | $5,000 | $70,200 |
| 13+ | Ship to customers | Revenue starts | |

**Total time to first delivery: ~12–14 months from start.**
**Total cash required: ~$60,000–$75,000 AUD.**

In-house CNC + 3D printing enables parallel enclosure development alongside PCB work — no waiting on suppliers.

---

## 7. Funding Strategy Options

| Option | Amount | Pros | Cons |
|--------|--------|------|------|
| **Self-funded** | $60–75K cash + $45–68K labour | Full control, no dilution | High personal risk + opportunity cost |
| **Innovative Biodiversity Monitoring Grant** | Up to A$750K | Non-dilutive, validates mission | Competitive, slow process |
| **IPA equipment grants** | $50–200K | Tied to deployment, builds references | Restricted to Indigenous partnerships |
| **CSIRO Kick-Start** | Up to $50K | Matched funding for R&D | Requires CSIRO collaboration |
| **Pre-orders from ranger programs** | $20–50K | Validates demand, de-risks manufacturing | Requires working prototype first |
| **Kickstarter/Pozible** | $30–80K | Market validation + funding | Public exposure, delivery pressure |

---

## 8. Risk-Adjusted Recommendation

**For the first 100 units:**

1. Budget **$60,000–$75,000 AUD** total program cost
2. **3D print enclosure prototypes** in ASA/PC — iterate daily, zero supplier lead time
3. **CNC machine production enclosures** in-house from solid polycarbonate — ~$18/unit vs $45+ outsourced
4. **Self-develop firmware** — biggest cost saving ($15–30K)
5. Check **EG800Q type approval** with Quectel — could save $5K on certification
6. Apply for **Innovative Biodiversity Monitoring Grant** to fund the manufacturing run
7. Price at **$399 AUD retail** ($499 for solar SKU) — break even at ~220–420 units
8. First 50 units go to **Tiwi Land Council pilot** at cost or subsidised (build reference)
9. Remaining 50 units at full retail to early adopter researchers

At 1,000 units (Year 2–3), per-unit cost drops to ~$197 AUD. At $399 retail, that's a 51% gross margin — healthy for hardware.

### Manufacturing Capability Summary

| Capability | Equipment | Impact |
|------------|-----------|--------|
| Rapid prototyping | Bambu Lab large-format 3D printer | Overnight enclosure iterations, ASA/PC for field trials |
| Production enclosures | Commercial CNC mill | $18/unit vs $45+ outsourced, same-day turnaround |
| Design iteration | Both | Free revisions — no supplier quotes, no lead time |
| Field trial units | 3D printer | First 10–20 units in 3D printed ASA for real-world testing |
| Production run | CNC | 5–10 enclosures/day, production-grade finish + IP67 tolerances |
