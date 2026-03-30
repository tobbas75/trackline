# Field Check App MVP Backlog

Date: 2026-03-12
Owner: Trap Monitor team
Status: Planning complete, implementation ready

Reference requirements:
- docs/FIELD_CHECK_USABILITY_OFFLINE_REQUIREMENTS.md

## 1. MVP Scope Statement

Build a mobile-first field check workflow in the existing dashboard that allows a technician to verify trap hardware on site and store an auditable pass/fail record.

Primary outcome:
- A technician can complete one unit check in less than 10 minutes, including command roundtrip verification and final report submission.

Non-negotiable quality bar:
- The flow must be simple enough for first-time use without training.
- The technician must be able to complete and save a check fully offline.
- No check data loss is acceptable during offline-to-online transitions.
- Sync behavior on reconnect must be deterministic and observable.

In scope:
- Guided check session in frontend
- Check session persistence in Supabase
- Command send and response verification hooks
- Offline queue for check step submission and reconnect replay
- Check history per unit

Out of scope for MVP:
- Full photo media pipeline (optional placeholder only)
- Advanced analytics dashboards
- Multi-unit bulk check workflow
- Push notification orchestration redesign

## 2. Constraints And Guardrails

Architecture and domain constraints to preserve:
- Keep firmware, backend, and frontend layer boundaries intact.
- Keep SMS payload expectations aligned with one-segment target (160 chars).
- Keep command auth behavior aligned with PIN-prefixed command contract.
- Keep all external provider calls server-side behind /api routes.
- Keep field check schema inside Trap Monitor-owned surfaces.
- Do not alter shared WildTrack-owned table definitions or org_members policies.
- Enable RLS on all newly created tables.
- Keep the interaction model simple: one primary action per screen, no hidden critical actions.

Shared DB safety constraints:
- Do not alter public.organisations DDL.
- Do not alter public.org_members DDL or policies.
- Do not modify portal schema objects.

## 3. Technician Workflow (Target UX)

1. Start check session
- Technician chooses org and unit.
- App records session start, operator, and device local timestamp.

2. Identity and preflight
- Confirm unit ID label and latest known phone_id.
- Confirm operator safety pre-check complete.

3. Connectivity and command roundtrip
- Send STATUS command.
- Wait for inbound response window.
- Auto-mark pass when matching inbound event/update observed.
- If offline, queue command intent and mark it pending until online send succeeds.

4. Hardware health checks
- Battery check from latest event/unit state.
- Solar check from latest event/unit state.
- Trap state check (armed/disarmed and caught/empty consistency).

5. GPS check
- Send GPS command.
- Confirm fix freshness and stale marker behavior.

6. Complete report
- Technician records notes, optional issues, and final pass/fail.
- App submits completion and sync status.

## 4. Check Protocol And Pass/Fail Rules

| Step | Evidence Source | Pass Rule | Fail Rule |
|---|---|---|---|
| Unit identity | Unit record + operator confirm | Selected unit matches physical unit label | Mismatch not resolved |
| STATUS roundtrip | Command row + inbound event/unit update | Valid response received within timeout window | No valid response after retries |
| Battery | latest battery_pct | battery_pct >= 20 | battery_pct < 20 |
| Solar | latest solar_ok | solar_ok = true | solar_ok = false |
| Trap state | unit.armed + recent trap event state | State matches operator observation | State mismatch |
| GPS roundtrip | Command + inbound GPS payload | Coordinates present and parseable | No fix or unparseable response |
| Final submission | Session completion row | All required steps recorded | Missing required step |

Default command response timeout:
- 90 seconds initial wait
- 1 retry allowed for STATUS and GPS

## 5. Data Model Plan (MVP)

New table: field_check_sessions
- id (uuid pk)
- org_id (uuid, references organisations)
- unit_id (text, references units)
- started_by (uuid)
- started_at (timestamptz)
- completed_at (timestamptz nullable)
- final_result (text: pass/fail/blocked)
- notes (text nullable)
- started_lat, started_lng (double precision nullable)
- completed_lat, completed_lng (double precision nullable)
- sync_status (text: synced/pending/failed)
- created_at, updated_at

New table: field_check_steps
- id (bigserial pk)
- session_id (uuid, references field_check_sessions)
- step_key (text)
- step_status (text: pass/fail/skipped/pending)
- evidence_source (text: command/event/manual)
- evidence_ref (text nullable)
- observed_value (jsonb nullable)
- notes (text nullable)
- recorded_at (timestamptz)
- created_by (uuid)

RLS requirements:
- Enable RLS on both tables.
- Select/insert/update only for org members via trap_can_view_org/trap_can_edit_org patterns.
- No cross-org visibility.

## 6. API Plan (Frontend Server Routes)

Create route group:
- frontend/src/app/api/field-checks/

Endpoints:
1. POST /api/field-checks/sessions
- Creates new field_check_sessions row.

2. POST /api/field-checks/sessions/[sessionId]/steps
- Appends step result row.

3. POST /api/field-checks/sessions/[sessionId]/complete
- Writes completion state and final_result.

4. GET /api/field-checks/history?unitId=...
- Returns recent sessions with step summaries.

Rules:
- Validate org membership server-side.
- Reject unknown step_key values.
- Record idempotency key for offline replay protection.

## 7. Frontend Plan (Mobile-First)

Create routes:
- /dashboard/field-check
- /dashboard/field-check/[sessionId]

Core components:
- FieldCheckStartCard
- StepRunner
- CommandWaitPanel
- FieldCheckSummary
- OfflineSyncBanner

State model:
- session draft
- running
- waiting-response
- retrying
- complete
- sync-pending
- sync-failed

Offline behavior:
- Queue step writes in IndexedDB when network unavailable.
- Replay queued writes in original order on reconnect.
- Mark each step as pending/synced visibly.
- Persist queue state across tab close, refresh, and browser restart.

Important limitation and expected behavior:
- SMS commands cannot be transmitted while offline; queue intent locally and auto-send on reconnect.
- Do not mark command success until provider/API acknowledgment and evidence is observed.

## 8. Firmware And SMS Dependencies

No mandatory new firmware command required for MVP if existing STATUS and GPS responses are sufficient.

Potential firmware/parser follow-up (only if needed after lab validation):
- Ensure STATUS response includes stable key-value tokens for parser matching.
- Ensure GPS response remains parseable and within SMS constraints.
- Keep messages.h and ingest-sms/index.ts synchronized.

## 9. Ordered Delivery Backlog

## Sprint 0 - Definition And Safety (2-3 days)

Story 0.1 - Finalize check protocol
Acceptance criteria:
- Step list, pass/fail rules, and timeout policy approved.
- Required and optional evidence fields documented.

Story 0.2 - DB safety design review
Acceptance criteria:
- Ownership boundary review completed.
- Proposed migration does not modify shared-owned surfaces.

## Sprint 1 - Backend Foundation (3-4 days)

Story 1.1 - Add migration for field_check_sessions and field_check_steps
Acceptance criteria:
- Tables created with RLS enabled.
- Indexes added for org_id, unit_id, started_at.
- Migration reviewed against shared DB checklist.

Story 1.2 - Add API routes for session lifecycle
Acceptance criteria:
- Session create, step append, complete, and history endpoints implemented.
- Request validation and auth checks included.
- Offline replay idempotency supported.
- Duplicate submissions with the same idempotency key do not create duplicate rows.

## Sprint 2 - Frontend Workflow (4-6 days)

Story 2.1 - Build start and run flow
Acceptance criteria:
- Technician can start session and progress through required steps.
- Step status persists via API and survives refresh.

Story 2.2 - Add command wait and roundtrip verification
Acceptance criteria:
- STATUS and GPS checks can trigger /api/command.
- UI shows waiting, retry, timeout, pass/fail states.

Story 2.3 - Add completion and history view
Acceptance criteria:
- Technician can submit final result and notes.
- Unit history displays recent field-check outcomes.

Story 2.4 - Simplify UX for first-time field use
Acceptance criteria:
- One primary action per screen.
- Large touch targets for mobile field operation.
- Every failure state includes exact next action.

## Sprint 3 - Offline Reliability And Pilot Prep (3-5 days)

Story 3.1 - Offline queue and reconnect replay
Acceptance criteria:
- Step submissions queue offline and replay safely.
- Duplicate writes are prevented by idempotency key.
- Queue survives tab close/reopen and resumes replay automatically.
- Each queued item has visible state: pending, syncing, synced, failed.

Story 3.2 - Field pilot package
Acceptance criteria:
- Pilot SOP document prepared.
- Metrics dashboard query pack prepared.
- Go/no-go thresholds agreed.

## 10. Data Flow Summary

1. Technician starts session in frontend.
2. Frontend creates field_check_sessions record via /api/field-checks/sessions.
3. Frontend sends command via /api/command for STATUS or GPS step.
4. Command is logged in commands and delivered by SMS provider.
5. Unit executes command and replies over SMS.
6. SMS provider posts inbound payload to ingest-sms edge function.
7. Edge function parses inbound SMS and writes units/events.
8. Realtime updates refresh dashboard state.
9. Frontend evaluates evidence and writes field_check_steps.
10. Technician completes session and writes final result.

## 11. Verification Plan

Lab validation set:
- Normal roundtrip success for STATUS and GPS
- Timeout then retry then success
- Timeout then fail
- Low battery and solar fault handling
- Offline start, offline step record, reconnect replay
- App close and reopen during offline session, then resume and sync
- Partial replay failure where one item fails and remaining items stay queued

Field validation set:
- 5-10 units across mixed coverage areas
- At least 2 technicians
- Day and low-light conditions

## 12. Risks, Assumptions, Mitigations

Risk: delayed SMS causes false failure
Mitigation: 90-second timeout + one retry + manual override note

Risk: offline replay duplicates step rows
Mitigation: idempotency key on step writes

Risk: parser mismatch with command responses
Mitigation: run sms-contract-sync workflow before command schema changes

Risk: cross-app DB impact
Mitigation: run shared-db-safety-guard checklist before migration

Assumptions:
- Existing STATUS and GPS commands are available and stable.
- Current command listen window is sufficient for on-site checks.
- Technician phone has intermittent but eventual connectivity.

Clarification:
- 100 percent offline completion applies to local capture and persistence.
- Network-dependent send operations (SMS command transmission) are queued and executed on reconnect.

## 13. Pilot Success Metrics

Primary thresholds:
- >= 90% of sessions completed without supervisor intervention
- Median session duration <= 10 minutes
- STATUS roundtrip success >= 95% in normal coverage
- GPS roundtrip success >= 90% in normal coverage
- Offline sync success >= 98% within 15 minutes of reconnect
- Cross-org data leakage incidents = 0
- Offline data loss incidents = 0
- Duplicate sync row incidents = 0

Go/no-go rule:
- Go only if security and data-isolation metrics pass and zero-loss/zero-duplicate metrics pass.

## 14. Initial File Touchpoints For Implementation

Backend:
- backend/supabase/migrations/007_field_check_sessions.sql (new)
- backend/supabase/functions/ingest-sms/index.ts (verification touchpoint)

Frontend:
- frontend/src/app/api/field-checks/** (new)
- frontend/src/app/dashboard/field-check/** (new)
- frontend/src/lib/types.ts (extend types)
- frontend/src/app/dashboard/page.tsx (entry points and links)

Cross-layer verification:
- frontend/src/app/api/command/route.ts
- backend/supabase/functions/ingest-sms/index.ts
- firmware/src/messages.h
- firmware/src/commands.h
- tools/simulate-sms.js
