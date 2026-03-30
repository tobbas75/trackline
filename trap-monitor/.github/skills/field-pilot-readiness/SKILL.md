---
name: field-pilot-readiness
description: "WORKFLOW SKILL - Prepare and run a safe field pilot for trap-check workflows. Use when defining pilot scope, test scripts, success metrics, go or no-go gates, and rollout controls."
---

# Field Pilot Readiness

## Purpose

Plan and execute a controlled pilot that validates field-check workflows under real-world operating conditions.

## Use This Skill When

- Moving from lab validation to real units.
- Defining pilot SOP and technician scripts.
- Setting launch criteria and rollback rules.
- Summarizing pilot outcomes for release decisions.

## Workflow

1. Define pilot scope.
- Unit count, sites, operator cohort.
- Duration and environmental conditions.

2. Build execution script.
- Pre-check setup steps.
- On-site check sequence.
- Failure reporting and escalation path.

3. Define measurable outcomes.
- Median time per completed check.
- Command-response success rate.
- False pass or false fail rate.
- Sync failure rate under weak signal.

4. Define safety controls.
- Feature flag or staged release gating.
- Rollback triggers.
- Manual fallback process if app flow fails.

5. Run and review.
- Capture defects with severity and reproducibility.
- Categorize by frontend, backend, firmware, or provider.
- Produce go or no-go recommendation.

## Guardrails

- Do not treat unverified pilot behavior as production-ready.
- Keep audit trail for every failed check and retry action.
- Preserve shared DB ownership boundaries during pilot updates.

## Deliverables

- Pilot plan and SOP.
- Test matrix and defect log template.
- Metric thresholds and decision gates.
- Final recommendation with risks and mitigations.

## Completion Standard

Pilot readiness is complete only when stakeholders can run the pilot from a written SOP and objectively decide go or no-go using agreed metrics.