

* C5 still 120pF — buck output caps need to be 47-100µF (C7/C8 removed but not replaced)
* C29 still 1µF — should be 100nF
* LDO input still from +BATT — needs to come from buck 3.8V output per Xianghao's thermal concern
* V\_IO on M10 (pin 7) still unconnected — needs to be tied to 3V3 with 100nF decoupling
* Q1/Q2 orientation — please verify EasyEDA pin mapping matches physical SOT-23
* D4 solar diode — cathode to GND per Xianghao
* C26/C27 swap positions
* C23 placement + HF decoupling near CN3767 VCC
* CP2102N VDD bypass cap (100nF)
* B3V3 net label — buck now outputs 3.8V, label should reflect that to avoid confusion during debug
* From the Quectel FAE review — easy additions before layout:



Test points on: 

* USB\_VBUS/DM/DP, debug UART, all power rails (+BATT, 3.8V, 3.3V, VDD\_EXT), PWRKEY, STATUS, GPS\_VCC. These cost nothing and will save us hours when debugging the first boards.
* 0Ω isolation resistors between power stages (+BATT→buck, buck→LDO, +BATT→solar). Lets us cut stages apart for isolated debugging if something doesn't work. Can be wire-linked for production.



Questions on new things in V2:



* C18/C19/C20 — values seem swapped between designators. Still on correct nets?
* L2 (solar inductor) — was in V1 but gone in V2. Intentional?
* Q6/Q7 (S8050) with LED6/LED7 — what are these for?
* L3 (10µH) and L4 (27nH) — what do these filter?
* R47/C33 — RC filter on GPIO0?
* C36/C37 — what are these decoupling?
* Buck FB wiring — did you redraw the circuit per the AP63300 datasheet, or just change the resistor value?

