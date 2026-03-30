# Trap Monitor Skills Launcher Guide

This guide gives quick prompts you can paste into chat to invoke each workflow skill.

## How To Trigger A Skill Reliably

1. State the skill name directly.
2. Include the task keywords from the skill description.
3. Ask for concrete deliverables.

Template:

Use skill: <skill-name>. Context: <what changed>. Deliver: <specific outputs>.

## Skill Prompts

### 1) field-check-mvp-planner

Use skill: field-check-mvp-planner. We are designing the field-check app for technicians. Build an MVP scope, phased backlog, acceptance criteria, and pilot success metrics based on our current firmware, backend, and dashboard architecture.

Expected output:
- MVP boundaries
- User stories with acceptance criteria
- Sprint sequence
- Risks and assumptions

### 2) sms-contract-sync

Use skill: sms-contract-sync. We need to change SMS message formatting for trap and health events. Update compose and parse contracts, simulator payloads, and produce an end-to-end verification checklist.

Expected output:
- Contract delta table
- Required file touchpoints
- Backward compatibility notes
- Verification steps

### 3) command-roundtrip-verifier

Use skill: command-roundtrip-verifier. We are adding or changing device commands. Validate dashboard command send, API validation, firmware execution, ingest handling, and realtime UI confirmation.

Expected output:
- Command matrix
- Success and failure path checks
- Required code updates by layer
- Test evidence checklist

### 4) shared-db-safety-guard

Use skill: shared-db-safety-guard. We need a migration for field-check data. Review the SQL design against shared database ownership boundaries and RLS requirements before implementation.

Expected output:
- Ownership boundary review
- RLS and policy checklist
- Safe migration plan
- Cross-app risk assessment

### 5) mobile-offline-field-ui

Use skill: mobile-offline-field-ui. Build the field-check user flow for mobile with offline queueing and reconnect replay. Provide component tasks, API interactions, and failure state handling.

Expected output:
- Screen flow
- Offline state model
- Component and route breakdown
- Mobile test checklist

### 6) field-pilot-readiness

Use skill: field-pilot-readiness. Prepare a controlled field pilot for the field-check workflow with SOP, metrics, go or no-go gates, and rollback rules.

Expected output:
- Pilot execution script
- Metrics with thresholds
- Defect triage format
- Go or no-go decision framework

## Recommended Usage Order

1. field-check-mvp-planner
2. shared-db-safety-guard
3. mobile-offline-field-ui
4. sms-contract-sync
5. command-roundtrip-verifier
6. field-pilot-readiness

## Notes

- Keep all external provider calls behind API routes.
- Keep SMS format and parser in lockstep.
- Keep all schema changes inside Trap Monitor owned surfaces.
