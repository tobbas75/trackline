# Trap Monitor

## What This Is

Trap Monitor is a remote wildlife trap monitoring system with ESP32-S3 firmware, Supabase backend, and Next.js dashboard. Devices send SMS alerts when traps trigger, and operators manage them via a web dashboard with real-time updates, mapping, and push notifications. Deployed on Vercel + Supabase with multi-tenant org-scoped data isolation.

## Core Value

Reliable remote trap monitoring — operators trust that every trap trigger reaches them, every alert is actionable, and the system is secure by default.

## Current State

**v1.0 Hardening milestone shipped 2026-03-29.** All 35 requirements satisfied, 98.76% test coverage on critical paths, 235 tests passing.

- Security: fail-closed access control, rate limiting, audit logging, PIN-guarded commands
- Data: org-scoped realtime subscriptions, composite indexes, RLS policies verified
- Code quality: typed SMS ingestion, validated GPS/timezone, dead code removed
- Dashboard: refactored from 960-line monolith to 5 focused components
- Firmware: priority retry queue, GPS fix, command grace period, atomic sleep guard
- Tests: Vitest + 18 test files, 70% coverage threshold enforced

## Requirements

### Validated

- ✓ SEC-01..05 — Security hardening (fail-closed, rate limiting, audit logging) — v1.0
- ✓ ISO-01..03 — Org-scoped data isolation (realtime, queries, indexes) — v1.0
- ✓ ERR-01..04 — Error handling (command log, GPS validation, SMS alerting, JSON schema) — v1.0
- ✓ CQ-01..05 — Code quality (BG95 removal, typed props, typed ingestion, Leaflet fix, org dedup) — v1.0
- ✓ CFG-01..04 — Configuration hardening (firmware boot, VAPID, env validation, timezone) — v1.0
- ✓ DASH-01..05 — Dashboard refactor (OrgSelector, EventList, UnitGrid, useDashboardData hook) — v1.0
- ✓ FW-01..04 — Firmware fixes (priority queue, GPS stale, grace period, sleep guard) — v1.0
- ✓ TEST-01..07 — Test coverage (Vitest, SMS parser, API routes, components, RLS, PIN, 70%+) — v1.0

### Active

- [ ] Dual ingestion pipeline (SMS + MQTT) with per-device switching
- [ ] MQTT broker integration for camera and trap devices
- [ ] Camera events table with multi-species AI detection data
- [ ] Image storage via Supabase Storage
- [ ] Species registry (extensible, not hardcoded)
- [ ] Image viewer with detection bounding box overlays
- [ ] Camera unit management within existing org structure
- [ ] Device health telemetry (battery, connectivity, inference time)

### Out of Scope

- Camera Trap hardware/firmware — separate product, NE301 evaluation only
- WildTrack or Fire App changes — shared tables are read-only from this project
- Mobile app — web dashboard only
- OTA firmware updates — deferred to future milestone
- Full observability stack (Sentry, structured logging) — deferred
- MQTT broker hosting/infrastructure — use managed service (HiveMQ Cloud, EMQX, etc.)
- AI model training — model deployment is hardware-side, not this milestone
- Removing SMS ingestion — kept as fallback, not deprecated yet

## Current Milestone: v2.0 Camera Image Pipeline + Dual Ingestion

**Goal:** Add MQTT ingestion alongside SMS with per-device switching, camera image capture with multi-species wildlife detection, and image viewing on the dashboard.

## Context

- Brownfield project with hardened MVP deployed on Vercel + Supabase
- Shared Supabase project (`landmanager`) with WildTrack and Fire App
- 18 test files, 235 tests, 98.76% line coverage, 70% threshold enforced
- Dashboard page.tsx reduced to ~200 lines with extracted components
- Firmware runs on ESP32-S3 with PlatformIO (C++)
- Frontend is Next.js 16 with App Router, Tailwind CSS v4, React 19
- NeoEyes NE301 camera trap evaluation in progress (hardware/Camera Trap/NeoEyes-Addax-Testing/)

## Constraints

- **Shared DB**: Cannot ALTER `organisations`, `org_members`, or anything in `portal` schema
- **Vercel Hobby**: No `Co-Authored-By` in commits, single author only
- **Git identity**: Must be `tobbas75 <toby.w.barton@gmail.com>`
- **SMS format**: 160-char limit, existing format is the firmware-backend contract
- **Firmware binary compatibility**: Pin names, active levels, UART assignments must not change

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove BG95 driver entirely | Not using BG95 hardware, Quectel-only setup | ✓ Good — clean codebase |
| Full dashboard split | 960-line monolith is untestable | ✓ Good — 5 focused components, all tested |
| Broad test coverage (~70%) | Zero tests, need confidence before changes | ✓ Good — achieved 98.76%, threshold locked |
| Fail-closed portal access | Silent admin grant was a security hole | ✓ Good — SEC-05 verified with 3 error patterns |
| In-memory rate limiting (LRU) | Sufficient for Vercel Hobby scale | ✓ Good — no Redis dependency |
| Direct org_id on events | Migration 011 added column, avoids subquery | ✓ Good — simpler queries, composite index |
| Firmware fail-open config | Boot warnings only, no halt | ✓ Good — enables field recovery |
| Priority queue scan-on-dequeue | ArduinoJson doesn't support efficient mid-array insert | ✓ Good — simple, works |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-29 after v2.0 milestone start*
