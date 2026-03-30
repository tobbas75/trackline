# Starlink D2C IoT Modem Findings

**Last updated:** 12 March 2026
**Prepared for:** Trap Monitor hardware and firmware planning

---

## Purpose

This note captures verified findings on existing IoT modem modules being used with Starlink Direct to Cell (D2C), with a focus on practical module choices for PCB design.

---

## Executive Summary

- The strongest public, carrier-grade evidence today comes from One NZ.
- One NZ has commercial Satellite IoT live and publishes a certified module list.
- Starlink D2C IoT support is currently centered on 4G Cat-1 / Cat-1 bis module families.
- Cat-M / NB-IoT modules are common for terrestrial IoT but are generally not marked D2D-approved in the One NZ list.

---

## Verified Sources

- One NZ certified modules PDF: https://one.nz/iot/iot-certified-modules-and-integrated-devices.pdf
- One NZ Satellite IoT launch: https://media.one.nz/bees
- One NZ IoT connectivity plans: https://one.nz/iot/connectivity-plans/
- One NZ IoT networks: https://one.nz/iot/networks/
- Starlink D2C page: https://www.starlink.com/business/direct-to-cell
- T-Mobile satellite service page: https://www.t-mobile.com/coverage/satellite-phone-service
- Telstra satellite-to-mobile trials: https://www.telstra.com.au/exchange/telstra-satellite-to-mobile-connectivity--our-latest-trials-and-

---

## Confirmed D2D-Approved Embedded Modules (One NZ)

From the March 2026 One NZ certification document:

| Vendor | Model | Network Support | VoLTE | One NZ Satellite D2D |
|---|---|---|---|---|
| Quectel | EG21GGB-MINIPCIE-S | 4G Cat-1 Satellite DTD | Yes | Yes |
| Quectel | EG800Q-EU | 4G Cat-1 bis Satellite DTD | No | Yes |
| Telit | LE910C1-WWX | 4G Cat-1 Satellite DTD | Yes | Yes |
| Telit | LE910Q1 | 4G Cat-1 bis Satellite DTD | No | Yes |
| Thales | PLS-63W | 4G Cat-1 Satellite DTD | No | Yes |
| u-blox | LEXI R10011D | 4G satellite DTD | No | Yes |

---

## In Certification / Roadmap (One NZ)

| Vendor | Model | Network Support | VoLTE | One NZ Satellite D2D |
|---|---|---|---|---|
| Quectel | EG915N-EA | 4G Cat-1 bis Satellite DTD | Yes | Yes |
| u-blox | LEXI-R10801D | 4G satellite DTD | No | TBC |

---

## Important Constraint for Hardware Selection

- One NZ Satellite IoT terms indicate Satellite IoT uses 4G Band 7 and certified modules.
- This implies D2C design should prioritize Cat-1/Cat-1 bis modules with required regional band support.
- NB-IoT / Cat-M modules in the same certification document are generally listed without D2D approval.

---

## Implications for Trap Monitor

1. Favor Cat-1/Cat-1 bis architecture for D2C readiness.
2. Keep modem abstraction in firmware so module swaps stay low risk.
3. Design PCB with module footprint and RF flexibility for regional variants.
4. Keep a certified-module pathway per target carrier (not just generic 3GPP support).

---

## Carrier Status Snapshot (Public Evidence)

- One NZ: strongest public evidence for live D2C IoT module approvals.
- T-Mobile: live consumer smartphone satellite service and app data; no public carrier IoT module certification list found in this research pass.
- Telstra: active satellite-to-mobile progress and trials; no public D2C IoT module list found in this research pass.

---

## Confidence

- High confidence: One NZ module list and D2D statuses (from official PDF).
- Medium confidence: broader carrier roadmap timing outside One NZ due to limited public SKU-level disclosures.
