---
name: shared-db-safety-guard
description: "WORKFLOW SKILL - Safely design and review Supabase migrations in a shared multi-app database. Use when creating schema changes, RLS policies, or function updates that may affect Trap Monitor, WildTrack, or Fire App."
---

# Shared DB Safety Guard

## Purpose

Prevent cross-application breakage when changing Trap Monitor database schema or security policies in the shared Supabase project.

## Use This Skill When

- Writing or reviewing migrations.
- Adding or changing RLS policies.
- Creating or changing SQL functions.
- Planning new tables for field-check features.

## Ownership Boundaries

Trap Monitor owned surfaces include:

- `units`
- `events`
- `commands`
- `notifications`
- `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()`, `get_user_orgs()`

Do not alter from this repo:

- `organisations` table DDL
- `org_members` table DDL
- RLS policies on `org_members`
- `portal` schema objects
- WildTrack and Fire App domain tables and enums

## Workflow

1. Pre-change impact scan.
- Compare intended SQL targets against ownership boundaries.
- Stop immediately if the change touches non-owned shared surfaces.

2. Migration design.
- Prefer additive, reversible migrations.
- Enable RLS for every new table.
- Add least-privilege policies scoped by org access helpers.

3. Function safety.
- Use `CREATE OR REPLACE` for compatible updates.
- Preserve shared function signatures where required.

4. Policy safety review.
- Ensure service role use stays server-side only.
- Ensure authenticated role permissions are explicit.

5. Validation.
- Check migration against cross-app checklist before execution.
- Confirm no policy or schema drift outside Trap Monitor-owned objects.

## Guardrails

- Never create or drop RLS policies on `org_members`.
- Never alter shared WildTrack-owned table definitions.
- Never expose service role credentials to frontend code.

## Deliverables

- Migration impact statement.
- Ownership boundary checklist outcome.
- RLS and auth rationale summary.
- Verification notes and residual risks.

## Completion Standard

A migration change is complete only when it is proven to remain inside Trap Monitor-owned surfaces and passes the shared database impact checklist.