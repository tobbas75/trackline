---
name: mobile-offline-field-ui
description: "WORKFLOW SKILL - Build mobile-first field workflows with offline resilience in the Trap Monitor dashboard. Use when implementing technician screens, responsive layouts, offline queueing, and reconnect sync behavior."
---

# Mobile Offline Field UI

## Purpose

Deliver a reliable mobile technician experience for field checks in low-connectivity environments.

## Use This Skill When

- Building or changing field-check screens.
- Improving phone and tablet usability.
- Adding offline queue and replay behavior.
- Defining reconnect conflict handling.

## Scope Surfaces

- `frontend/src/app/dashboard/**`
- `frontend/src/components/**`
- `frontend/src/app/api/**`
- Shared types under `frontend/src/lib/**`

## Workflow

1. Define interaction flow first.
- Unit lookup or selection.
- Guided check steps.
- Final summary and submission.

2. Apply mobile-first layout strategy.
- Ensure controls are usable in bright outdoor settings.
- Ensure touch targets are at least 44px.
- Keep key actions available with minimal scrolling.

3. Add offline queue behavior.
- Queue check steps and notes while offline.
- Mark pending and synced states in UI.
- Replay queued writes on reconnect.

4. Handle failure and conflict states.
- Provider timeout.
- Delayed SMS response.
- Duplicate submission protection.

5. Validate responsiveness and resilience.
- Verify at common breakpoints.
- Verify disconnect and reconnect scenarios.

## Guardrails

- Keep external provider calls behind `/api` routes.
- Do not bypass auth or org scoping.
- Keep existing dashboard realtime model intact.

## Deliverables

- Screen flow summary.
- Component and route task list.
- Offline behavior state diagram.
- Test checklist for mobile and reconnect behavior.

## Completion Standard

This workflow is complete only when the field-check flow can be started, progressed, and completed from a phone with temporary network loss and no data corruption.