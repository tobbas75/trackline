---
name: sms-contract-sync
description: "WORKFLOW SKILL - Keep firmware SMS formatting and backend parsing in lockstep. Use when changing SMS message formats, parser regex rules, message fields, or simulator payloads."
---

# SMS Contract Sync

## Purpose

Prevent breakage by updating all SMS contract surfaces together: compose, parse, and simulate.

## Use This Skill When

- You modify SMS text in firmware.
- You change parser logic in ingest-sms.
- You add a message field or message type.
- You update simulator payloads.

## Contract Surfaces

- `firmware/src/messages.h`
- `backend/supabase/functions/ingest-sms/index.ts`
- `tools/simulate-sms.js`
- `DOMAIN_RULES.md`

## Workflow

1. Capture the target contract.
- List message types and exact grammar.
- Mark required and optional fields.
- Note timestamp format and timezone assumptions.

2. Update compose side first.
- Change firmware message composition.
- Enforce 160 character constraints.
- Preserve markers for stale GPS and battery warnings.

3. Update parser side second.
- Adjust regex or parsing logic for new grammar.
- Preserve unknown-format fallback storage behavior.
- Keep support for Telstra and Twilio payload formats.

4. Update simulator payloads third.
- Add realistic examples for each affected message type.
- Include at least one success case and one edge case.

5. Verify end-to-end behavior.
- Send simulator payloads to ingest function.
- Confirm unit upsert behavior and event insert behavior.
- Confirm frontend-relevant fields are populated.

## Guardrails

- Do not change SMS format in one layer only.
- Do not silently drop unknown messages.
- Do not exceed one-segment SMS target unless explicitly approved.
- Keep timestamps parseable from `DD/MM/YY HH:MM`.

## Deliverables

- Updated contract table in change notes.
- Files changed list across firmware, backend, and simulator.
- Verification evidence for each message type changed.
- Any backward compatibility caveats.

## Completion Standard

This workflow is complete only when one sample per changed message type round-trips from simulated SMS through parser to stored event data without manual patching.