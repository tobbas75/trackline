# Technical Concerns

**Analysis Date:** 2026-03-23

## Severity Summary

| Category | Count | Severity |
|----------|-------|----------|
| Incomplete Features | 1 | CRITICAL |
| Security Issues | 5 | HIGH |
| Fragile Dependencies | 3 | HIGH |
| Error Handling | 4 | MEDIUM |
| Performance | 4 | MEDIUM |
| Type Safety | 3 | MEDIUM |
| Configuration | 4 | MEDIUM |
| Firmware | 4 | MEDIUM |
| Test Coverage | 1 | MEDIUM |

---

## CRITICAL: Incomplete Features

### BG95 Modem Driver - Stub Only
- **File:** `firmware/src/hal/modems/BG95.h`
- `// TODO: implement BG95 init` (line 20)
- `powerOff()`, `powerCycle()` are empty stubs
- `sendSMS()`, `checkIncomingSMS()`, `postJSON()` return hardcoded failures
- **Impact:** BG95 modem selection produces non-functional device

---

## HIGH: Security Concerns

### 1. Default Command PIN
- **File:** `frontend/src/app/api/command/route.ts` (line 33)
- Falls back to `"0000"` if `DEFAULT_CMD_PIN` env var not set
- **Risk:** All devices trivially commandable with default PIN

### 2. Webhook Secret Optional
- **File:** `frontend/src/app/api/push/notify/route.ts` (lines 21-26)
- `SUPABASE_WEBHOOK_SECRET` check skipped if env var missing
- **Risk:** Endpoint becomes public - anyone can trigger push notifications

### 3. No Rate Limiting on Command Endpoint
- **File:** `frontend/src/app/api/command/route.ts`
- No rate limiting - attacker could spam SMS commands
- **Risk:** DoS via SMS queue + Telstra API costs

### 4. Service Role Key Audit Trail
- Used in `command/route.ts` (line 6) and `push/notify/route.ts` (line 52)
- No audit trail distinguishing service role vs authenticated user operations

### 5. Portal Fallback Grants Admin
- **File:** `frontend/src/lib/check-access.ts` (lines 34-35)
- If `portal.check_app_access()` fails, silently grants admin access
- **Risk:** Complete access control bypass if portal schema unavailable

---

## HIGH: Fragile Dependencies

### 1. Shared Database Schema
- `units.org_id` FK to `organisations(id)` owned by WildTrack
- Migration 005 hotfixed RLS policies on `org_members` after breaking WildTrack
- **Risk:** WildTrack schema changes can silently break Trap Monitor

### 2. Portal Schema Dependency
- `check-access.ts` depends on `portal.check_app_access()` RPC
- Portal owned by separate system with no versioning contract

### 3. Org Deduplication Logic
- **File:** `frontend/src/app/api/orgs/route.ts` (lines 91-112)
- Manually dedupes org_members join results and resolves role priority
- Fragile: assumes specific Supabase join behavior

---

## MEDIUM: Error Handling Gaps

### 1. Silent Command Log Failure
- **File:** `frontend/src/app/api/command/route.ts` (lines 50-54)
- `commands` table insert has no error handling - silently swallowed
- User sees "sent" even if DB insert failed

### 2. Unvalidated JSON Parsing
- **File:** `frontend/src/app/dashboard/page.tsx` (line 64)
- `JSON.parse()` wrapped in try/catch but no schema validation after parse
- Same pattern in `field-check/page.tsx` (lines 78, 122, 203)

### 3. GPS Coordinate Validation Missing
- **File:** `backend/supabase/functions/ingest-sms/index.ts` (lines 38-39)
- `parseFloat()` on regex match - no range validation (-90..90, -180..180)
- Invalid coordinates stored directly in database

### 4. Unknown SMS Format Silent Fallback
- **File:** `backend/supabase/functions/ingest-sms/index.ts` (line 173)
- Unrecognized SMS stored as UNKNOWN type with no alerting
- No structured way to detect parsing bugs

---

## MEDIUM: Performance Issues

### 1. Realtime Subscription Not Scoped
- **File:** `frontend/src/app/dashboard/page.tsx` (lines 164-177)
- Subscribes to ALL events table INSERTs, filters in-memory by org_id
- Should filter at subscription level: `.eq("org_id", currentOrg.id)`
- **Risk:** Every user receives all events from entire system

### 2. Unscoped Event Queries
- **File:** `frontend/src/app/dashboard/page.tsx` (lines 147-150)
- Loads 100 most recent events globally - no org_id filter
- **Risk:** Wrong events shown if multiple orgs exist

### 3. Large Monolithic Dashboard Component
- **File:** `frontend/src/app/dashboard/page.tsx` - 960 lines
- 13+ useState calls, handles auth, org loading, data fetching, filtering, rendering

### 4. Missing Composite Index
- `events(org_id, triggered_at)` composite index would improve org-scoped time-range queries
- Currently has separate indexes on `unit_id`, `event_type`, `triggered_at`

---

## MEDIUM: Type Safety

### 1. Loose MapView Props
- **File:** `frontend/src/components/map/MapView.tsx` (lines 18-19)
- `units: any[]`, `events: any[]` - should use `Unit[]`, `TrapEvent[]`

### 2. `any` Casts in SMS Ingestion
- **File:** `backend/supabase/functions/ingest-sms/index.ts` (lines 196, 209)
- `const unitUpdate: any = { ... }` and `const eventRow: any = {...}`

### 3. Leaflet Workaround
- **File:** `frontend/src/components/map/MapView.tsx` (line 9)
- `delete (L.Icon.Default.prototype as any)._getIconUrl` - necessary but hides errors

---

## MEDIUM: Configuration Risks

### 1. Firmware Defaults Not Validated
- **File:** `firmware/src/config.h`
- Default PIN `"0000"`, phone `"+61400000000"`, unit ID `"TRAP_001"`
- No validation these have been customized before deployment

### 2. Hardcoded Fallback Email
- **File:** `frontend/src/app/api/push/notify/route.ts` (line 43)
- `"mailto:admin@example.com"` if `VAPID_EMAIL` not set

### 3. No Environment Variable Validation at Startup
- Multiple required env vars with no startup check
- Deploy fails silently or with cryptic errors if missing

### 4. Timezone Default
- **File:** `backend/supabase/functions/ingest-sms/index.ts` (line 88)
- Defaults to `"Australia/Sydney"` - timestamps incorrect if device in different timezone

---

## MEDIUM: Firmware Concerns

### 1. Retry Queue Overflow
- Max queue: 50 messages (`config.h` line 146)
- No prioritization - ALERT could be dropped while HEALTH queues
- Older messages lost when full

### 2. GPS Stale Timeout Mismatch
- **File:** `firmware/src/gps.h` (line 44)
- GPS fix valid if age < 2s, but acquisition window is 300s
- Likely results in frequent "GPS stale" flags

### 3. Command Listen Window Edge Case
- **File:** `firmware/src/main.cpp` (line 390)
- 60s listen window - command sent at second 59 may not complete before modem powers off

### 4. Deep Sleep Race Condition
- **File:** `firmware/src/main.cpp` (lines 430-431)
- Timer wakeup during trap processing could miss the trap interrupt

---

## MEDIUM: Test Coverage

**No automated tests exist** - search for `*.test.ts`, `*.spec.ts`, `__tests__/` yielded zero results.

**Critical untested paths:**
1. SMS parsing pipeline (firmware to edge function to database)
2. RLS policy enforcement across orgs
3. Multi-org isolation
4. Command PIN validation
5. Realtime subscription filtering

---

## Recommended Priority

1. **Complete or remove BG95 modem driver** (CRITICAL)
2. **Fix realtime subscription scoping** - filter by org_id at subscription level (HIGH)
3. **Add rate limiting** to command endpoint (HIGH)
4. **Validate required env vars** at startup (HIGH)
5. **Add GPS coordinate range validation** in SMS parser (MEDIUM)
6. **Add tests for SMS parsing** - mission-critical path (MEDIUM)
7. **Extract dashboard into smaller components** (MEDIUM)
8. **Type MapView props** properly (MEDIUM)

---

*Concerns analysis: 2026-03-23*
