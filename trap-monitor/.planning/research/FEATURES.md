# Feature Research

**Domain:** Production hardening — IoT monitoring web app (Next.js + Supabase + ESP32 firmware)
**Researched:** 2026-03-23
**Confidence:** HIGH (grounded in existing CONCERNS.md audit + verified against current docs and community best practices)

---

## Context: This Is Not a Feature Milestone

This is a hardening milestone on a working MVP. The "features" here are quality attributes and production-readiness characteristics, not user-visible functionality. The categorization below answers: which hardening concerns are non-negotiable for production, which are differentiated investments, and which should be deliberately excluded from this milestone's scope.

---

## Feature Landscape

### Table Stakes (Production Readiness — Must Fix)

Features/qualities that any production IoT system with real users must have. Their absence constitutes a defect, not a missing feature.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fail-closed access control | Security holes that grant admin on error are unacceptable in any production system — the portal fallback granting admin on RPC failure is a critical gap | LOW | Single condition flip in `check-access.ts`; test the failure path explicitly |
| Mandatory secret enforcement (no fallbacks to defaults) | Default PIN "0000" and optional webhook secret mean the system ships insecure by default — operators won't read docs | LOW | Remove fallback strings; validate at startup with `@t3-oss/env-nextjs` + Zod |
| Environment variable validation at startup | Cryptic runtime failures from missing env vars are a deployment-time trap; the industry standard is fail-fast at boot | LOW | `@t3-oss/env-nextjs` validates all vars before any request is served; widely adopted pattern (HIGH confidence) |
| Webhook signature verification (required, not optional) | The push/notify endpoint is publicly reachable; without HMAC verification anyone can trigger push notifications | LOW | Web Crypto API available in both Next.js Edge and Deno; Supabase sends `X-Supabase-Signature` HMAC header |
| Rate limiting on command endpoint | Unthrottled command dispatch allows SMS queue flooding and runs up Telstra API costs — a reachable DoS vector | MEDIUM | In-memory rate limiting (e.g., `lru-cache` token bucket) is sufficient for Vercel Hobby; Upstash Redis is the production alternative but adds a dependency |
| Realtime subscription scoped by org_id | Subscribing to the entire events table means every user receives every org's events — a data isolation failure | LOW | Filter at channel level: `.eq('org_id', orgId)` eliminates in-memory filtering; required for multi-tenant correctness |
| Event queries scoped by org_id | Loading 100 global events then filtering in-memory shows wrong data if multiple orgs share the instance | LOW | Add `.eq('org_id', orgId)` to all event queries — companion to realtime fix |
| Composite DB index on `events(org_id, triggered_at)` | Org-scoped time-range queries do sequential scans without this index; as event volume grows, dashboard load degrades | LOW | Single migration; standard PostgreSQL pattern for multi-tenant time-series data |
| Error handling for command log inserts | Silent swallow of DB insert errors means users see "command sent" when the audit log was never written | LOW | Check `error` on insert; return appropriate HTTP error or at minimum log structured error |
| GPS coordinate range validation | Raw `parseFloat()` on regex matches stores out-of-range coordinates (-90..90 lat, -180..180 lon) directly in the DB | LOW | Three comparisons after parse; prevents map rendering failures and bad data |
| JSON schema validation after parse | `JSON.parse()` in try/catch without schema validation accepts structurally invalid payloads silently | LOW | Use Zod schemas for post-parse validation in dashboard and field-check pages |
| Alerting on unknown SMS formats | Unrecognized SMS formats are silently stored as UNKNOWN with no signal to operators or developers | LOW | Log structured error + optionally insert a `notifications` row; surfaces parsing bugs in production |
| Remove BG95 modem stub (dead code) | Non-functional stubs selected via config produce a silent non-working device — a critical defect waiting to happen | LOW | Delete `BG95.h`, remove from `ModemFactory` — clean removal, no new code |
| Service role audit logging | Operations performed via service role key are indistinguishable from user operations; no audit trail | MEDIUM | Insert into `commands` or a dedicated `audit_log` table on service-role operations; correlate with authenticated user session where possible |
| TypeScript strict types on MapView and SMS ingestion | `any[]` props on MapView and `any` casts in SMS ingestion hide type errors at the boundary most likely to receive malformed data | LOW | Define `Unit[]` and `TrapEvent[]` prop types; replace `any` casts with typed interfaces in ingest-sms |
| Dashboard component decomposition | 960-line monolith with 13+ useState calls is untestable; cannot write meaningful unit tests against it | HIGH | Extract `OrgSelector`, `EventList`, `UnitGrid`, `useDashboardData` hook — this is the largest single work item |
| Test coverage on critical paths (~70%) | Zero tests on an IoT system handling trap alerts means silent regressions are undetectable; SMS parsing is mission-critical | HIGH | Framework setup (Vitest) + SMS parsing suite + API route tests + RLS policy tests via pgTAP; most time spent writing tests, not configuring |
| Firmware config validation at boot | Default values for PIN, phone number, and unit ID in `config.h` are indistinguishable from production values at runtime | MEDIUM | Compile-time or boot-time assertion that sentinel values have been replaced |
| Firmware priority retry queue (ALERT > TRAP > HEALTH) | Flat FIFO queue can lose ALERT messages while HEALTH messages fill capacity — wrong priority ordering for a safety system | MEDIUM | Priority sort on dequeue using message type as key; FreeRTOS queue pattern supports this |
| GPS stale timeout alignment | 2-second stale threshold against a 300-second acquisition window produces near-constant "GPS stale" flags | LOW | Align stale threshold to acquisition window or use a separate "fix acquired" state flag |
| Command listen window grace period | 60-second window with no grace period drops commands dispatched at second 59 when modem powers off before ACK | LOW | Add configurable grace extension (5-10s) after window close if a command is in-flight |
| Deep sleep / trap interrupt race condition fix | Timer wakeup during trap processing can miss the interrupt, causing a trapped animal to go unreported | HIGH | Disable timer wakeup during active trap processing; re-arm after state machine completes |
| Hardcoded fallback email removal | `"mailto:admin@example.com"` in push/notify route is a configuration smell that ships wrong in production | LOW | Require `VAPID_EMAIL` via env validation; fail startup if absent |
| Org deduplication logic hardening | Manual deduplication of Supabase join results assumes specific join behavior; breaks silently if query structure changes | MEDIUM | Replace manual dedup with a proper SQL query using `DISTINCT ON` or aggregate; add a test asserting correct behavior |
| Timezone validation for DEVICE_TIMEZONE | Default "Australia/Sydney" produces wrong timestamps for devices in other timezones with no warning | LOW | Validate env var against a list of IANA timezone identifiers at startup |

### Differentiators (Worth Adding, Not Required for Production Readiness)

Features that improve operator experience or system observability beyond what's strictly required.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Structured logging pipeline | Structured logs (JSON) with correlation IDs enable debugging production incidents by tracing a single SMS from webhook → edge function → event insert → realtime push | MEDIUM | Requires consistent log format across Next.js API routes and Supabase Edge Functions; valuable if production issues need root-cause analysis |
| SMS parsing regression test fixture library | A corpus of real-world SMS formats (including malformed ones) as test fixtures prevents parser regressions as format evolves | MEDIUM | Build alongside SMS parsing tests; high value because SMS format is the firmware-backend contract and hard to reproduce in CI |
| RLS policy test matrix | Systematic tests asserting each org's data is invisible to other orgs' users; goes beyond "it probably works" | MEDIUM | pgTAP + Supabase test helpers; `supashield` CLI can generate a baseline; HIGH value for multi-tenant confidence |
| Dead code removal beyond BG95 | Full audit of unused imports, components, and utility functions; reduces bundle size and cognitive load | LOW | ESLint with `no-unused-vars` catches most; worth one pass during decomposition phase |
| Firmware watchdog telemetry | Report watchdog-triggered resets in HEALTH messages so operators know a device is crash-looping | MEDIUM | Requires persisting reset reason across deep sleep using RTC memory; genuinely useful for field diagnosis |

### Anti-Features (Deliberately Out of Scope for This Milestone)

These are things that might seem appropriate but should not be built during a hardening milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| New user-visible UI features | Temptation to "improve" the dashboard while refactoring | Scope creep during a hardening milestone introduces untested surface area and delays security fixes; every new feature is a new test burden | Capture in a backlog; this milestone's dashboard work is decomposition only, not new capabilities |
| Upstash Redis for rate limiting | Redis-backed sliding window is more robust than in-memory | Adds an external dependency and billing surface for a Vercel Hobby deployment; in-memory token bucket is sufficient for current scale | Use `lru-cache`-based rate limiter now; migrate to Upstash if rate limiting proves insufficient in monitoring |
| Full observability stack (Datadog, Sentry) | Production monitoring is valuable | Requires account setup, billing decisions, and SDK integration that belongs in a dedicated observability milestone | Add structured logging now (the differentiator above); observability tooling is a separate milestone |
| BG95 modem implementation | The modem stub is incomplete | The BG95 hardware is not in use; implementing a driver for unused hardware adds maintenance burden and test surface | Remove the stub entirely; if BG95 hardware is ever needed, implement it then with its own test suite |
| Mobile app or PWA | Field operators might benefit from mobile access | Out of scope per PROJECT.md; the existing web dashboard works on mobile browsers adequately | Explicitly out of scope — redirect requests to the backlog |
| Multi-region or edge database | Geo-distributed data is a scalability pattern | The system has a single Australia-based deployment; multi-region adds operational complexity with no current benefit | Single Supabase region is correct at this scale |
| Real-time firmware OTA updates | Remote firmware updates would save field visits | Extremely complex over SMS-only data channel; not feasible without a separate data pipeline | Out of scope; document as a future architectural requirement if GSM data capability is added to hardware |

---

## Feature Dependencies

```
[Env Var Validation at Startup]
    └──enables──> [Mandatory Secret Enforcement]
    └──enables──> [Hardcoded Email Removal]
    └──enables──> [Timezone Validation]

[Dashboard Component Decomposition]
    └──enables──> [Test Coverage — Component Tests]
    └──enables──> [Realtime Subscription Scoping] (easier to fix in isolated hook)

[Realtime Subscription Scoping]
    └──companion──> [Event Queries Scoped by Org ID]
    (both fix the same data isolation failure; must be done together)

[JSON Schema Validation]
    └──companion──> [GPS Coordinate Range Validation]
    (both fix the same "unvalidated parse" pattern in SMS ingest)

[Test Coverage Setup (Vitest)]
    └──enables──> [SMS Parsing Tests]
    └──enables──> [API Route Tests]
    └──enables──> [Component Tests] (depends on decomposition)

[pgTAP RLS Tests]
    └──independent of Vitest──> [RLS Policy Correctness]
    (different runtime: Supabase CLI + PostgreSQL, not Node.js)

[Priority Retry Queue]
    └──requires──> [Firmware Config Validation] (confirm queue size is tuned)

[Deep Sleep Race Fix]
    └──independent──> other firmware fixes
    (state machine change; review against listen window grace period for combined wake logic)
```

### Dependency Notes

- **Env var validation enables three other fixes:** Implementing `@t3-oss/env-nextjs` as the first backend task gives a single place to enforce all secrets; the three config fixes (email, timezone, webhook secret) collapse into one PR.
- **Dashboard decomposition is a prerequisite for meaningful component tests:** Testing the 960-line monolith is impractical; extract components first, write tests second.
- **Realtime scoping and event query scoping must ship together:** Fixing the subscription but not the initial query load (or vice versa) leaves one path showing cross-org data.
- **Vitest setup is a prerequisite for all JS/TS tests:** One configuration task gates the entire test coverage goal; do it first in the testing phase.
- **pgTAP RLS tests are independent of the Vitest setup:** They run against a local Supabase instance via the CLI; can proceed in parallel if a phase splits firmware and backend work.

---

## MVP Definition

### This Milestone's "Launch Criteria" (all table stakes must ship)

The hardening milestone is complete when every table stakes item above is resolved. Prioritized order:

- [ ] Fail-closed access control — closes the most severe security hole
- [ ] Mandatory secret enforcement + env var validation (single Zod schema) — closes default PIN and webhook secret holes simultaneously
- [ ] Webhook signature verification — closes public push notification endpoint
- [ ] Realtime subscription + event query org scoping — closes data isolation failure
- [ ] Remove BG95 stub — closes silent non-functional device defect
- [ ] Rate limiting on command endpoint — closes SMS flood vector
- [ ] GPS coordinate validation + JSON schema validation — closes bad data ingestion
- [ ] Error handling for command log inserts + unknown SMS alerting — closes silent failure gaps
- [ ] Service role audit logging — closes audit trail gap
- [ ] TypeScript `any` elimination (MapView + ingest-sms) — closes type safety holes at data boundaries
- [ ] Composite DB index on `events(org_id, triggered_at)` — perf fix, trivial to ship
- [ ] Hardcoded email removal — resolves with env var validation PR
- [ ] Timezone validation — resolves with env var validation PR
- [ ] Dashboard decomposition — enables testability; required before test phase
- [ ] Org deduplication hardening — closes fragile query assumption
- [ ] Test coverage ~70%: SMS parsing, API routes, key components, RLS policies
- [ ] Firmware: config validation at boot
- [ ] Firmware: priority retry queue
- [ ] Firmware: GPS stale timeout alignment
- [ ] Firmware: command listen window grace period
- [ ] Firmware: deep sleep / trap interrupt race fix

### Add After This Milestone (v1.x)

- [ ] Structured logging pipeline — once hardening is complete, observability is the next investment
- [ ] SMS parsing regression fixture library — builds naturally from test suite established in this milestone
- [ ] Firmware watchdog telemetry — adds value once the state machine race condition is fixed

### Future Consideration (v2+)

- [ ] Full observability stack (Sentry/Datadog) — when team size or incident rate justifies it
- [ ] Upstash Redis rate limiting — when traffic outgrows in-memory approach
- [ ] RLS policy test matrix via supashield — once basic pgTAP tests are in place

---

## Feature Prioritization Matrix

| Feature | Production Risk Reduction | Implementation Cost | Priority |
|---------|--------------------------|---------------------|----------|
| Fail-closed access control | HIGH | LOW | P1 |
| Mandatory secret enforcement + env validation | HIGH | LOW | P1 |
| Webhook signature verification | HIGH | LOW | P1 |
| Realtime + query org scoping | HIGH | LOW | P1 |
| Remove BG95 stub | HIGH | LOW | P1 |
| Rate limiting on command endpoint | HIGH | MEDIUM | P1 |
| Deep sleep / trap interrupt race fix | HIGH | HIGH | P1 |
| Dashboard decomposition | HIGH (enables tests) | HIGH | P1 |
| Test coverage (~70%) | HIGH | HIGH | P1 |
| GPS coordinate + JSON schema validation | MEDIUM | LOW | P2 |
| Command log error handling | MEDIUM | LOW | P2 |
| Unknown SMS alerting | MEDIUM | LOW | P2 |
| Service role audit logging | MEDIUM | MEDIUM | P2 |
| TypeScript `any` elimination | MEDIUM | LOW | P2 |
| Composite DB index | MEDIUM | LOW | P2 |
| Firmware priority retry queue | MEDIUM | MEDIUM | P2 |
| Firmware GPS stale timeout fix | MEDIUM | LOW | P2 |
| Firmware config validation | MEDIUM | MEDIUM | P2 |
| Command listen window grace period | LOW | LOW | P3 |
| Org deduplication hardening | LOW | MEDIUM | P3 |
| Structured logging pipeline | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must resolve in this milestone — active security or reliability defect
- P2: Should resolve — code quality or medium-risk reliability gap
- P3: Worth fixing — low-risk polish or minor reliability improvement

---

## Sources

- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices — makerkit.dev](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [pgTAP Unit Testing — Supabase Docs](https://supabase.com/docs/guides/database/extensions/pgtap)
- [Testing RLS Policies with pgTAP — Basejump](https://usebasejump.com/blog/testing-on-supabase-with-pgtap)
- [Next.js T3 Env — env.t3.gg](https://env.t3.gg/docs/nextjs)
- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest)
- [Rate Limiting Next.js — Upstash Blog](https://upstash.com/blog/nextjs-ratelimiting)
- [Receiving Webhooks with Supabase Edge Functions — Svix](https://www.svix.com/blog/receive-webhooks-with-supabase-edge-functions/)
- [ESP32 FreeRTOS Queue Tutorial](https://esp32tutorials.com/esp32-esp-idf-freertos-queue-tutorial/)
- [Next.js Security Hardening 2026 — Medium](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e)
- [CONCERNS.md — direct codebase audit](/.planning/codebase/CONCERNS.md)

---
*Feature research for: production hardening — IoT trap monitoring (Next.js + Supabase + ESP32)*
*Researched: 2026-03-23*
