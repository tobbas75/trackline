# Field Check Usability And Offline Requirements

Date: 2026-03-12
Status: Non-negotiable product requirements

## 1. Product Bar

The field check app must be usable by a first-time technician in the field, under stress, with poor or no connectivity.

Design targets:
- Minimal cognitive load
- Zero data loss during offline use
- Deterministic sync behavior when online returns
- Clear user feedback for every action state

## 2. Simplicity Rules (Hard Rules)

1. One primary action per screen.
2. Maximum 3 decisions per step.
3. No hidden critical actions behind menus.
4. Large touch targets (minimum 44x44 px).
5. Plain language labels only; no ambiguous jargon.
6. Every step shows explicit current status: pending, passed, failed, synced.
7. Every failure message must include exact next action.

## 3. Technician Flow Constraints

Required flow:
1. Select unit
2. Start check
3. Run guided steps in fixed order
4. Review summary
5. Submit and confirm

Restrictions:
- Do not allow technicians to skip mandatory safety-critical steps.
- Allow retry when command timeout occurs.
- Allow technician note on every failed step.

## 4. Offline-First Contract

Definition of success:
- Technician can fully complete a check session without network.
- All required writes are stored locally until sync succeeds.
- No completed step is lost after app close, tab refresh, or temporary power loss.

Required local persistence:
- field_check_session draft state
- step results
- notes and local timestamps
- outbound API intents with idempotency keys
- sync attempt metadata

Local persistence technology:
- IndexedDB for durable queue and session state
- localStorage allowed only for tiny non-critical UI preferences

## 5. Sync Contract (When Connection Returns)

Sync guarantees:
1. FIFO replay for queued writes in original order.
2. Idempotent writes enforced by request idempotency key.
3. Partial sync recovery: failed item remains queued; successful items marked synced.
4. Automatic retry with exponential backoff.
5. Manual retry button available to technician.

Sync status model per item:
- pending
- syncing
- synced
- failed

Conflict policy:
- Session completion wins only if all required steps exist.
- Duplicate step submission resolves to latest identical idempotency key (no duplicate row).
- Server-authoritative timestamps preserved on final write.

## 6. Command Roundtrip Under Offline Conditions

Important constraint:
- Sending SMS commands requires network at send time.

Required behavior:
- If offline, app queues command intent and displays "Queued - will send when online".
- App never shows command as successful until provider/API acknowledgement and evidence is received.
- Timeouts are explicit and retriable.

## 7. UX Feedback Requirements

Global indicators:
- Connection badge: online or offline
- Queue counter: number of unsynced actions
- Last sync time

Per-step indicators:
- Step state icon and text
- Retry control when failed
- Evidence source tag: manual, command, event

Completion screen:
- Local completion confirmation appears immediately
- Separate cloud sync confirmation appears when synced

## 8. Reliability Acceptance Criteria

Data integrity:
- 0 lost check steps in offline to online transition tests
- 0 duplicate server rows during replay tests

Usability:
- 90 percent of first-time users complete a session without assistance
- Median completion time less than or equal to 10 minutes

Operational reliability:
- Offline queue replay success greater than or equal to 98 percent within 15 minutes of reconnect
- Command timeout and retry flow always exposes clear next action

## 9. Test Matrix (Must Pass)

Offline scenarios:
1. Start session fully offline
2. Complete all steps offline
3. Force close app, reopen, resume session
4. Reconnect and replay queue
5. Verify server state exactly once per action

Mixed connectivity scenarios:
1. Online start, offline mid-session, online completion
2. Command queued while offline then sent on reconnect
3. One queue item fails while others succeed

Human factors scenarios:
1. Bright sunlight readability test
2. One-hand operation test
3. Glove-friendly tap targets test

## 10. Implementation Guardrails

- External provider calls remain behind API routes.
- RLS on all new tables.
- Shared DB ownership boundaries must be enforced.
- SMS parser and firmware message formats stay synchronized.

## 11. Release Gates

Gate 1: Usability
- Field usability test sessions completed with target pass rate.

Gate 2: Offline Integrity
- Offline to online reliability matrix passes with zero data loss.

Gate 3: Security And Data Isolation
- No cross-org data exposure findings.

Go-live condition:
- All three gates pass. If one fails, rollout is blocked.
