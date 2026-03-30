---
phase: 01-migration-governance
plan: "04"
subsystem: governance
tags: [claude-md, security, sec-01, cross-app-safety, conventions]
dependency_graph:
  requires: []
  provides: [CONV-01, CONV-02, SEC-01]
  affects: [camera-trap-dashboard, fire-app, trap-monitor, portal]
tech_stack:
  added: []
  patterns: [NODE_ENV gated bootstrap fallback, structured console.warn for production failures]
key_files:
  created:
    - c:/Software code GITs/Trap Monitor/frontend/CLAUDE.md
  modified:
    - c:/Software code GITs/LandManagment Website/portal/CLAUDE.md
    - c:/Software code GITs/camera-trap-dashboard/CLAUDE.md
    - c:/Software code GITs/Fire project system/fire-app/CLAUDE.md
    - c:/Software code GITs/LandManagment Website/portal/src/lib/check-access.ts
    - c:/Software code GITs/camera-trap-dashboard/src/lib/check-access.ts
decisions:
  - "SEC-01 fix applied to portal and WildTrack check-access.ts: production now fails closed when portal schema is unreachable"
  - "Trap Monitor CLAUDE.md created from portal template with project-specific surfaces and Governance Gap documentation"
  - "All four CLAUDE.md files now reference PROTECTED_SURFACES.md and db-check.cjs as the authoritative cross-app governance tools"
metrics:
  duration: ~15 minutes
  completed: 2026-03-30
  tasks_completed: 2
  files_changed: 6
---

# Phase 01 Plan 04: CLAUDE.md Propagation and SEC-01 Security Fix Summary

**One-liner:** NODE_ENV-gated bootstrap fallback closes production admin-grant hole; Trap Monitor CLAUDE.md created and all four repos now reference cross-app safety governance tools.

## What Was Done

### Task 1 — CLAUDE.md Propagation (CONV-01, CONV-02)

Created `Trap Monitor/frontend/CLAUDE.md` (96 lines) from the portal template, adapted for Trap Monitor's specific surfaces, dependencies, and governance gap. Key sections:
- Trap Monitor owns: `units`, `events`, `commands`, `notifications`, `trap_can_*` functions
- Depends on: WildTrack-owned `organisations`, `org_members`, helper functions
- Governance Gap: no `supabase/migrations/` directory — schema applied via dashboard; future changes must use `trap_001_description.sql` naming
- References `PROTECTED_SURFACES.md` and `db-check.cjs`

Updated the three existing CLAUDE.md files to add:
- **Portal CLAUDE.md**: added `db-check.cjs` command and `PROTECTED_SURFACES.md` reference to the Cross-App Impact Checklist section
- **WildTrack CLAUDE.md**: added same two references to the Cross-App Impact Checklist section
- **Fire App CLAUDE.md**: added same two references plus strengthened the `update_updated_at()` collision warning (clarified that `CREATE OR REPLACE` silently overwrites WildTrack's version)

### Task 2 — SEC-01 Bootstrap Fallback Security Fix

Applied the NODE_ENV gate to `checkAppAccess()` in both portal and WildTrack `src/lib/check-access.ts`.

**Before (production security hole):**
```typescript
if (accessInfraMissing) {
  return { hasAccess: true, role: "admin" };
}
```

**After (SEC-01 fix):**
```typescript
if (accessInfraMissing) {
  if (process.env.NODE_ENV !== 'production') {
    // Development only: bootstrap while portal schema is being provisioned.
    return { hasAccess: true, role: "admin" };
  }
  // Production: fail closed.
  console.warn(JSON.stringify({ level: 'warn', msg: 'portal_access_check_unavailable', ... }));
  return { hasAccess: false, role: null };
}
```

Fire App and Trap Monitor `check-access.ts` were confirmed already fail-closed — not modified.

TypeScript compiled cleanly in portal (`npx tsc --noEmit` — no errors).

## Commits

| Repo | Hash | Message |
|------|------|---------|
| portal | 6b16841 | feat(01-04): add PROTECTED_SURFACES.md and db-check.cjs references to portal CLAUDE.md |
| camera-trap-dashboard | 7c267bc | feat(01-04): add PROTECTED_SURFACES.md and db-check.cjs references to WildTrack CLAUDE.md |
| fire-app | e3e9a06 | feat(01-04): add PROTECTED_SURFACES.md, db-check.cjs, and update_updated_at collision warning to Fire App CLAUDE.md |
| trap-monitor | bfa6d51 | feat(01-04): create Trap Monitor CLAUDE.md with project-specific rules and cross-app safety documentation |
| portal | cdbf95e | fix(01-04): SEC-01 gate bootstrap fallback behind NODE_ENV in portal check-access.ts |
| camera-trap-dashboard | 9d6121b | fix(01-04): SEC-01 gate bootstrap fallback behind NODE_ENV in WildTrack check-access.ts |

## Deviations from Plan

None — plan executed exactly as written.

Fire App and Trap Monitor `check-access.ts` were confirmed already fail-closed (no changes needed, as specified in the plan).

## Known Stubs

None. All changes are complete implementations with no placeholders.

## Self-Check: PASSED

Files verified:
- `c:/Software code GITs/Trap Monitor/frontend/CLAUDE.md` — EXISTS (96 lines)
- `c:/Software code GITs/LandManagment Website/portal/src/lib/check-access.ts` — NODE_ENV check: 1 match, portal_access_check_unavailable: 1 match
- `c:/Software code GITs/camera-trap-dashboard/src/lib/check-access.ts` — NODE_ENV check: 1 match, portal_access_check_unavailable: 1 match
- `c:/Software code GITs/camera-trap-dashboard/CLAUDE.md` — db-check.cjs: 1 match
- `c:/Software code GITs/Fire project system/fire-app/CLAUDE.md` — db-check.cjs: 1 match, update_updated_at: 3 matches
- Portal TypeScript: `npx tsc --noEmit` — 0 errors
