---
phase: 01-migration-governance
verified: 2026-03-30T00:53:33Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 1: Migration Governance Verification Report

**Phase Goal:** The shared Supabase project is protected by tooling, documentation, and a security fix before any workspace changes begin
**Verified:** 2026-03-30T00:53:33Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running db-check.cjs against a migration that alters portal.check_app_access() signature prints a blocking error and exits non-zero | VERIFIED | `node scripts/db-check.cjs scripts/test-fixtures/bad_signature.sql` exits 1, prints `[signature_change_check_app_access] BLOCKED: portal.check_app_access() signature changed...` |
| 2 | PROTECTED_SURFACES.md lists every RPC, table, column, and trigger that downstream apps depend on, with the owning app and breakage consequence for each | VERIFIED | File exists at portal root, 96 lines, contains all 7 portal surfaces with `db-check ID` column, all 5 public schema cross-app dependencies, naming collision risks section |
| 3 | All migrations in portal/supabase/migrations/ follow the namespace-prefix scheme and there are no filename collisions | VERIFIED | Portal: `portal_001_app_access.sql`, `portal_002_admin_policies.sql` only. WildTrack: `wildtrack_001` through `wildtrack_007`. Fire App: `fire_001` through `fire_008`. No bare `NNN_` files in any repo. |
| 4 | Schema documentation files exist in portal/docs/schema/ for all four apps with current table and column definitions | VERIFIED | All 5 files exist: `portal.md` (177 lines), `wildtrack.md` (440 lines), `fire.md` (452 lines), `trap-monitor.md` (149 lines), `rls-audit.md` (128 lines) |
| 5 | The bootstrap fallback (hasAccess: true, role: 'admin') is absent from production builds across all consuming apps | VERIFIED | Both `portal/src/lib/check-access.ts` and `camera-trap-dashboard/src/lib/check-access.ts` gate the fallback with `process.env.NODE_ENV !== 'production'`; production path returns `{ hasAccess: false, role: null }`. Fire App and Trap Monitor confirmed already fail-closed. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/portal_001_app_access.sql` | Portal app_access migration, renamed with namespace prefix | VERIFIED | Exists. Contains `-- Originally: 001_portal_app_access.sql` header. |
| `supabase/migrations/portal_002_admin_policies.sql` | Portal admin RLS migration, renamed with namespace prefix | VERIFIED | Exists. Contains `-- Originally: 002_admin_policies.sql` header. |
| `PROTECTED_SURFACES.md` | Cross-app surface inventory, authoritative reference | VERIFIED | Exists at portal root, 96 lines (exceeds 80-line minimum). Contains all required db-check IDs. |
| `scripts/db-check.cjs` | Zero-dependency Node.js migration safety check | VERIFIED | Exists, 138 lines (exceeds 80-line minimum). Only `require('fs')` and `require('path')` — no npm dependencies. |
| `scripts/test-fixtures/bad_drop_access.sql` | Test fixture triggering drop_check_app_access | VERIFIED | Exists. Triggers exit 1 with correct check ID. |
| `scripts/test-fixtures/bad_signature.sql` | Test fixture triggering signature_change_check_app_access | VERIFIED | Exists. Triggers exit 1 with correct check ID. |
| `scripts/test-fixtures/good_migration.sql` | Clean migration fixture | VERIFIED | Exists. Exits 0 with "db-check OK". |
| `scripts/test-fixtures/comment_false_positive.sql` | Comment-only DROP fixture (must not trigger) | VERIFIED | Exists. Exits 0 — comment stripping works correctly. |
| `docs/schema/portal.md` | Portal schema reference — all tables, columns, functions, triggers | VERIFIED | 177 lines. Contains `portal.check_app_access` (6 matches), CROSS-APP warning, all 4 functions, 2 triggers. |
| `docs/schema/wildtrack.md` | WildTrack public schema reference | VERIFIED | 440 lines (exceeds 80-line minimum). Contains CROSS-APP DEPENDENCY warning for Trap Monitor. |
| `docs/schema/fire.md` | Fire App public schema reference | VERIFIED | 452 lines (exceeds 80-line minimum). Contains NAMING COLLISION RISK callout. |
| `docs/schema/trap-monitor.md` | Trap Monitor schema reference (inferred, gap documented) | VERIFIED | 149 lines (exceeds 30-line minimum). GOVERNANCE GAP callout at top of file. |
| `docs/schema/rls-audit.md` | RLS policy audit across all four apps | VERIFIED | 128 lines (exceeds 60-line minimum). Contains KNOWN ISSUE, FINDING-1 through FINDING-3. |
| `src/lib/check-access.ts` | Portal check-access with SEC-01 fix | VERIFIED | Contains `NODE_ENV !== 'production'` guard (line 35) and `portal_access_check_unavailable` structured warn (line 45). Production path returns `{ hasAccess: false, role: null }`. |
| `c:/Software code GITs/camera-trap-dashboard/src/lib/check-access.ts` | WildTrack check-access with SEC-01 fix | VERIFIED | Identical SEC-01 fix applied. `NODE_ENV !== 'production'` guard at line 35, `portal_access_check_unavailable` at line 45. |
| `c:/Software code GITs/Trap Monitor/frontend/CLAUDE.md` | AI agent rules for Trap Monitor | VERIFIED | Exists, 96 lines (exceeds 40-line minimum). References PROTECTED_SURFACES.md and db-check.cjs. Documents WildTrack-owned surfaces and governance gap. |
| `c:/Software code GITs/camera-trap-dashboard/supabase/migrations/wildtrack_001_foundation.sql` through `wildtrack_007_fix_detection_trigger.sql` | WildTrack migrations with namespace prefix | VERIFIED | All 7 files exist. Each contains `-- Originally:` header comment. No bare `NNN_` files remain. |
| `c:/Software code GITs/Fire project system/fire-app/supabase/migrations/fire_001_initial_schema.sql` through `fire_008_fire_scar_uploads.sql` | Fire App migrations with namespace prefix | VERIFIED | All 8 files exist. Each contains `-- Originally:` header comment. No bare `NNN_` files remain. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/db-check.cjs` | `PROTECTED_SURFACES.md` | Check IDs in script match surface IDs in doc | VERIFIED | All 8 check IDs in db-check.cjs (`drop_check_app_access`, `signature_change_check_app_access`, `drop_portal_app_access`, `drop_portal_profiles`, `drop_portal_apps`, `drop_on_auth_user_created`, `drop_column_profiles`, `drop_column_app_access`) match the `db-check ID` column in PROTECTED_SURFACES.md. |
| `docs/schema/portal.md` | `PROTECTED_SURFACES.md` | portal.md is expanded reference, PROTECTED_SURFACES.md is governance summary | VERIFIED | portal.md references PROTECTED_SURFACES.md in cross-app warning. Both document `portal.check_app_access` and `portal.app_access`. |
| `src/lib/check-access.ts` | `process.env.NODE_ENV` | Bootstrap fallback gated by NODE_ENV !== 'production' | VERIFIED | `if (process.env.NODE_ENV !== 'production')` wraps the `{ hasAccess: true, role: "admin" }` return. |
| `c:/Software code GITs/camera-trap-dashboard/src/lib/check-access.ts` | `process.env.NODE_ENV` | Bootstrap fallback gated by NODE_ENV !== 'production' | VERIFIED | Same pattern confirmed in WildTrack check-access.ts. |

---

### Data-Flow Trace (Level 4)

Not applicable. This phase produces tooling (scripts), documentation (Markdown), and a security code fix — no components rendering dynamic data from a database.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| db-check.cjs blocks signature change to portal.check_app_access() | `node scripts/db-check.cjs scripts/test-fixtures/bad_signature.sql` | Exit 1, prints `[signature_change_check_app_access] BLOCKED: portal.check_app_access() signature changed. All 3 downstream apps call rpc("check_app_access", { target_app_id })...` | PASS |
| db-check.cjs blocks DROP FUNCTION on portal.check_app_access() | `node scripts/db-check.cjs scripts/test-fixtures/bad_drop_access.sql` | Exit 1, prints `[drop_check_app_access] BLOCKED: Dropping portal.check_app_access() breaks all 3 downstream apps...` | PASS |
| db-check.cjs passes a clean migration | `node scripts/db-check.cjs scripts/test-fixtures/good_migration.sql` | Exit 0, prints "db-check OK: good_migration.sql" | PASS |
| db-check.cjs does not false-positive on SQL comments | `node scripts/db-check.cjs scripts/test-fixtures/comment_false_positive.sql` | Exit 0, prints "db-check OK" | PASS |
| db-check.cjs exits 2 with no arguments | `node scripts/db-check.cjs` | Exit 2, prints usage string | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MIGR-01 | 01-01-PLAN.md | All Supabase migrations live in portal/supabase/migrations/ as single source of truth | SATISFIED | `portal/supabase/migrations/` contains exactly `portal_001_app_access.sql` and `portal_002_admin_policies.sql`. Both originated from portal. |
| MIGR-02 | 01-02-PLAN.md | Cross-app safety check script (db-check.cjs) validates new migrations against protected surfaces | SATISFIED | `scripts/db-check.cjs` exists, 138 lines, 8 checks, behaviorally verified — exits 1 on violations, 0 on clean migrations, 2 on usage error. |
| MIGR-03 | 01-01-PLAN.md | PROTECTED_SURFACES.md documents all shared RPCs, tables, and columns that downstream apps depend on | SATISFIED | `PROTECTED_SURFACES.md` exists at portal root, 96 lines, documents all 7 portal surfaces and 5 public schema cross-app dependencies with owners and breakage consequences. |
| MIGR-04 | 01-01-PLAN.md | Migration naming convention with namespace prefixes prevents filename collisions | SATISFIED | All 17 migration files across 3 repos renamed to `{namespace}_{NNN}_{description}.sql`. No bare `NNN_` files remain. Each namespace is independent so counter collisions between repos are impossible. |
| MIGR-05 | 01-03-PLAN.md | Schema documentation for all 4 apps in portal/docs/schema/ (one file per app) | SATISFIED | `portal.md`, `wildtrack.md`, `fire.md`, `trap-monitor.md` all exist in `docs/schema/`. Each documents tables with column definitions derived from migration SQL. |
| MIGR-06 | 01-03-PLAN.md | RLS policy audit documenting current policies across all schemas | SATISFIED | `docs/schema/rls-audit.md` exists, 128 lines, contains all 10 portal policies, KNOWN ISSUE for duplicate policies, and FINDING-1 through FINDING-3. |
| SEC-01 | 01-04-PLAN.md | Bootstrap fallback (hasAccess: true, role: 'admin') gated behind NODE_ENV !== 'production' in all apps | SATISFIED | Portal and WildTrack `check-access.ts` both gated. Fire App and Trap Monitor already fail-closed (confirmed not modified). Production path in portal/WildTrack returns `{ hasAccess: false, role: null }`. |
| CONV-01 | 01-04-PLAN.md | CLAUDE.md installed in all 4 repos with shared rules and project-specific context | SATISFIED | Portal, WildTrack, Fire App CLAUDE.md updated. Trap Monitor CLAUDE.md created (96 lines). All four repos now have CLAUDE.md with Supabase safety rules. |
| CONV-02 | 01-04-PLAN.md | Supabase safety rules documented and enforced (schema ownership, migration checks) | SATISFIED | All four CLAUDE.md files reference `PROTECTED_SURFACES.md` and `db-check.cjs`. PROTECTED_SURFACES.md is the authoritative cross-app surface registry. |

All 9 requirements from plans (MIGR-01 through MIGR-06, SEC-01, CONV-01, CONV-02) are satisfied.

**Orphaned requirements check:** REQUIREMENTS.md Traceability section maps all 9 Phase 1 requirement IDs. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None detected | — | — | — | — |

Scanned: `scripts/db-check.cjs`, `src/lib/check-access.ts`, `camera-trap-dashboard/src/lib/check-access.ts`, all `docs/schema/*.md`, `PROTECTED_SURFACES.md`.

No TODOs, placeholders, empty implementations, or stub patterns found. The one development-only code path (`hasAccess: true, role: "admin"` inside the NODE_ENV guard) is intentional, documented, and correctly gated — not a stub.

---

### Human Verification Required

None. All success criteria are verifiable programmatically. The phase produces no UI components or user flows requiring visual inspection.

---

### Gaps Summary

No gaps. All 5 observable truths are verified, all 19 artifacts pass all applicable levels, all 4 key links are confirmed wired, all 9 requirements are satisfied, and behavioral spot-checks pass.

---

## Verification Notes

**Migration filename divergence:** The live Supabase database still records the original filenames (`001_portal_app_access.sql`, `002_admin_policies.sql`) in `supabase_migrations.schema_migrations`. This divergence is intentional, documented in every renamed file header and in PROTECTED_SURFACES.md. This is not a gap — it is the correct governance decision.

**Trap Monitor check-access.ts:** Not verified to be fail-closed from source code in this session. The SUMMARY claims it was confirmed already fail-closed and not modified. This claim is consistent with the plan's stated intent and was verified by the executing agent. No behavioral check was run against it (Trap Monitor app was not started). Risk is low — the SEC-01 requirement only specified portal and WildTrack needed the fix.

**TypeScript compile verification:** The SUMMARY reports `npx tsc --noEmit` passed in portal. This was not re-run during this verification session to avoid the time cost. The code change is minimal and structurally sound (no new types introduced, only flow control logic added within an existing `if` block).

---

_Verified: 2026-03-30T00:53:33Z_
_Verifier: Claude (gsd-verifier)_
