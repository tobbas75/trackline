---
name: command-roundtrip-verifier
description: "WORKFLOW SKILL - Validate command flow from dashboard to trap and back. Use when adding or modifying command names, command payload rules, command auth, or command-response handling."
---

# Command Roundtrip Verifier

## Purpose

Ensure every command change works end-to-end across frontend API, SMS transport, firmware command parser, event ingestion, and UI state updates.

## Use This Skill When

- A command is added, removed, or renamed.
- Command argument validation changes.
- Command PIN or target-unit rules change.
- Command result handling changes in UI.

## Roundtrip Surfaces

- `frontend/src/app/api/command/route.ts`
- `firmware/src/commands.h`
- `firmware/src/messages.h`
- `backend/supabase/functions/ingest-sms/index.ts`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/units/[unitId]/page.tsx`

## Workflow

1. Build a command matrix.
- Command name.
- Expected input format.
- Expected device response format.
- UI behavior expected after response.

2. Validate outbound command gate.
- Ensure API route command whitelist is aligned.
- Ensure command text construction uses correct PIN and unit suffix.
- Ensure invalid commands are rejected with clear errors.

3. Validate firmware command execution.
- Ensure parser enforces PIN and optional unit targeting.
- Ensure response text is deterministic and parse-friendly.
- Ensure state-changing commands persist config where required.

4. Validate ingestion and persistence.
- Ensure response SMS is parseable or captured as raw when unknown.
- Ensure events and unit state reflect command effects.

5. Validate realtime UI update.
- Ensure dashboard subscriptions observe state changes.
- Ensure operator can confirm pass or fail quickly.

## Guardrails

- Keep command authentication behavior intact.
- Do not expose service role keys to client code.
- Keep external provider calls in API routes only.

## Deliverables

- Updated command matrix.
- Files changed across all affected layers.
- Verification notes for success path and failure path.

## Completion Standard

A command change is complete only when the command can be issued from UI, executed on device, ingested correctly, and reflected in dashboard state without manual data correction.