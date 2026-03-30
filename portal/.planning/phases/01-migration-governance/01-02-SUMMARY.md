---
phase: 01-migration-governance
plan: 02
subsystem: scripts
tags: [migration-governance, static-analysis, safety-check, node-script]
dependency_graph:
  requires: []
  provides: [scripts/db-check.cjs]
  affects: [supabase/migrations]
tech_stack:
  added: []
  patterns: [zero-dependency CJS script, SQL comment stripping, normalise-before-match]
key_files:
  created:
    - scripts/db-check.cjs
    - scripts/test-fixtures/bad_drop_access.sql
    - scripts/test-fixtures/bad_signature.sql
    - scripts/test-fixtures/good_migration.sql
    - scripts/test-fixtures/comment_false_positive.sql
  modified: []
decisions:
  - id: static-analysis-only
    summary: "db-check.cjs uses text-based regex matching (no SQL parser, no live DB connection) — intentional for zero-dep, zero-credential CI compatibility"
  - id: comment-stripping
    summary: "stripComments() removes -- line comments and /* */ block comments before regex matching to prevent false positives on commented-out SQL"
  - id: normalise-before-match
    summary: "All SQL is lowercased and whitespace-collapsed before pattern matching, making checks robust to formatting variations"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 1
  tasks_total: 1
  files_created: 5
  files_modified: 0
---

# Phase 01 Plan 02: db-check.cjs Migration Safety Script Summary

**One-liner:** Zero-dependency Node.js static analysis script with 8 checks guarding all cross-app Supabase protected surfaces, with SQL comment stripping to prevent false positives.

## What Was Built

`scripts/db-check.cjs` — a portable migration safety check that reads one or more `.sql` files and blocks any migration that would break a cross-app protected surface.

**Key capabilities:**
- Checks 8 protected surfaces: `drop_check_app_access`, `signature_change_check_app_access`, `drop_portal_app_access`, `drop_portal_profiles`, `drop_portal_apps`, `drop_on_auth_user_created`, `drop_column_profiles`, `drop_column_app_access`
- Strips SQL comments (`--` and `/* */`) before matching — prevents false positives on commented-out SQL
- Normalises whitespace and lowercases SQL before matching — handles formatting variations
- Detects `CREATE OR REPLACE FUNCTION portal.check_app_access(...)` with wrong parameter name
- Exits 0 (clean), 1 (violations found), or 2 (usage error) — CI-compatible
- Zero npm dependencies — `require('fs')` and `require('path')` only

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write db-check.cjs | da1f95b | scripts/db-check.cjs, scripts/test-fixtures/*.sql |

## Verification Results

All acceptance criteria met:

| Test | Input | Expected | Actual |
|------|-------|----------|--------|
| A | bad_drop_access.sql | exit 1, `[drop_check_app_access]` | PASS |
| B | bad_signature.sql | exit 1, `[signature_change_check_app_access]` | PASS |
| C | good_migration.sql | exit 0, "db-check OK" | PASS |
| D | comment_false_positive.sql | exit 0 | PASS |
| F | no args | exit 2 | PASS |
| G | nonexistent.sql | exit 2 | PASS |
| Real | portal_001 + portal_002 migrations | exit 0 | PASS |

All 8 check IDs confirmed present in script. Only `require('fs')` and `require('path')` present.

## Deviations from Plan

None — plan executed exactly as written. The RESEARCH.md code scaffold was implemented verbatim.

## Known Stubs

None. The script is fully functional with no placeholder logic.

## Self-Check: PASSED
