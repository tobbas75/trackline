---
name: field-check-mvp-planner
description: "WORKFLOW SKILL - Plan and scope the field-check app MVP for trap hardware validation. Use when requests mention field check design, technician workflow, checklist steps, acceptance criteria, phased delivery, or rollout planning."
---

# Field Check MVP Planner

## Purpose

Create an implementation-ready MVP plan for a field technician app flow that verifies trap hardware in real conditions.

## Use This Skill When

- You need a step-by-step technician workflow.
- You need pass or fail criteria for each field-check step.
- You need a phased backlog for frontend, backend, and firmware touchpoints.
- You need to define pilot success metrics before rollout.

## Do Not Use This Skill When

- The request is only code debugging for an existing feature.
- The request is a small one-file change with clear requirements.

## Required Context

Read these files before planning:

- `ARCHITECTURE.md`
- `DOMAIN_RULES.md`
- `REPO_MAP.md`
- `docs/WEB_APP_BUILDOUT_PLAN.md`

## Workflow

1. Confirm scope and constraints.
- Confirm field operator goals, environment limits, and connectivity assumptions.
- Preserve architecture boundaries: firmware, backend, frontend remain decoupled.

2. Define the technician journey.
- Start check, identify unit, run checks, capture evidence, complete report.
- Add timeout and retry behavior for weak network conditions.

3. Define check protocol and pass or fail rules.
- Identity check.
- Command send and response verification.
- Battery and solar health.
- Trap state validation.
- GPS freshness and movement checks.

4. Map data requirements.
- Session record.
- Step outcomes.
- Evidence fields (notes, photos if in scope, GPS position).
- Final disposition and timestamps.

5. Produce implementation backlog.
- Frontend stories and acceptance criteria.
- Backend API and schema stories with RLS requirements.
- Firmware and SMS contract dependencies.

6. Add rollout and validation plan.
- Lab test matrix.
- Field pilot script.
- Go or no-go quality gates.

## Guardrails

- Keep SMS payload assumptions aligned with 160 character limit.
- Keep command flow aligned with PIN-protected command rules.
- Never bypass API routes for external provider calls from the client.
- Do not propose schema changes that touch WildTrack-owned tables.

## Deliverables

- MVP scope statement.
- Ordered backlog with acceptance criteria.
- Data flow summary.
- Risks, assumptions, and mitigations.
- Pilot success metrics and target thresholds.

## Completion Standard

The plan is complete only when another engineer can implement without guessing missing requirements.