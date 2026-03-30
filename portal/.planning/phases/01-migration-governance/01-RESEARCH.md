# Phase 1: Migration Governance - Research

**Researched:** 2026-03-29
**Domain:** Supabase shared-schema governance, Node.js script tooling, cross-repo documentation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None locked — all implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.
Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGR-01 | All Supabase migrations live in portal/supabase/migrations/ as single source of truth | Migration audit confirms portal already owns 001/002; downstream apps have their own migrations that reference portal tables — no consolidation needed, just documentation |
| MIGR-02 | Cross-app safety check script (db-check.cjs) validates new migrations against protected surfaces | Pattern established by Trap Monitor's verify-shared-db-impact.cjs; db-check.cjs is a static analysis variant (no live DB connection required) |
| MIGR-03 | PROTECTED_SURFACES.md documents all shared RPCs, tables, and columns downstream apps depend on | Full surface inventory completed in this research; all four CLAUDE.md files corroborate the boundaries |
| MIGR-04 | Migration naming convention with namespace prefixes prevents filename collisions | All four apps currently use sequential `NNN_name.sql` with no cross-app namespace — collision risk is real and documented |
| MIGR-05 | Schema documentation for all 4 apps in portal/docs/schema/ | Migration files readable; downstream schema reconstructed from migration SQL — no live DB dump required |
| MIGR-06 | RLS policy audit documenting current policies across all schemas | RLS policies are fully embedded in migration files; all four sets audited and documented here |
| SEC-01 | Bootstrap fallback (hasAccess: true, role: 'admin') gated behind NODE_ENV !== 'production' | Fallback confirmed in portal and WildTrack check-access.ts; Trap Monitor already fixed (fail-closed); Fire App already fixed (fail-closed) |
| CONV-01 | CLAUDE.md installed in all 4 repos with shared rules and project-specific context | Portal, WildTrack, Fire App all have CLAUDE.md; Trap Monitor has no CLAUDE.md — needs creation |
| CONV-02 | Supabase safety rules documented and enforced (schema ownership, migration checks) | CLAUDE.md in portal is the template; WildTrack and Fire App have extended versions; consolidation + Trap Monitor creation needed |
</phase_requirements>

---

## Summary

Phase 1 is an infrastructure-only phase. No new runtime features ship. The deliverables are: a static analysis script (`db-check.cjs`), documentation files (`PROTECTED_SURFACES.md`, `docs/schema/*.md`), a migration naming convention applied to existing files, `CLAUDE.md` files in all four repos, and a targeted security fix removing the bootstrap fallback from production paths.

The codebase is in a well-understood state. All four apps have been individually read. The protected surfaces are precisely known from the migration SQL and the CLAUDE.md files that already exist in three of the four repos. The only live-DB-dependent task — schema documentation for downstream apps — can be reconstructed entirely from migration files, because all downstream schema changes were applied via migration files (not ad-hoc dashboard SQL). The STATE.md concern about needing `supabase db dump` is addressable from source.

**The highest-risk item is SEC-01.** The bootstrap fallback (`hasAccess: true, role: 'admin'`) exists in **portal** `src/lib/check-access.ts` (line 35) and **WildTrack** `src/lib/check-access.ts` (line 35). Trap Monitor and Fire App are already fail-closed. The fix is a targeted conditional: wrap the fallback in `process.env.NODE_ENV !== 'production'`. This must be verified to not break development workflow.

**Primary recommendation:** Execute deliverables in this order: (1) naming convention + file renames, (2) PROTECTED_SURFACES.md, (3) schema docs, (4) db-check.cjs, (5) CLAUDE.md propagation, (6) SEC-01 fix. The naming convention must come first because db-check.cjs will reference the new filenames in its output.

---

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Node.js (CommonJS .cjs) | 24.14.0 (installed) | db-check.cjs runtime | No build step; runs with `node db-check.cjs migration.sql`; matches Trap Monitor's verify-shared-db-impact.cjs pattern already in the codebase |
| `fs` (built-in) | — | Read migration SQL files | Zero dependencies |
| `process.exit(1)` | — | Non-zero exit on violation | CI-compatible; success criterion 1 requires this |

### No External Dependencies Needed
`db-check.cjs` is a pure static text analysis script. It reads `.sql` files and checks for forbidden strings/patterns. No Supabase client, no live DB connection, no npm packages beyond Node.js built-ins. This is intentional: live-DB checks require credentials and a running Supabase project, which is not available in all environments.

### Supporting (Documentation Only)
| Format | Purpose |
|--------|---------|
| Markdown (`.md`) | PROTECTED_SURFACES.md, docs/schema/*.md, CLAUDE.md |
| SQL comment headers | Convention for migration file authorship and app ownership |

### Alternatives Considered
| Instead of | Could Use | Why We Don't |
|------------|-----------|--------------|
| Static SQL text scan | Live Supabase introspection (verify-shared-db-impact.cjs style) | Requires service role key and running DB; db-check should work in CI with no secrets |
| Markdown schema docs | Auto-generated from `supabase gen types` | Gen types produces TypeScript, not human-readable schema docs; and requires live DB |
| Node.js .cjs | TypeScript + ts-node | No build step, no devDependency, consistent with Trap Monitor's existing pattern |

---

## Architecture Patterns

### Recommended Project Structure After Phase 1

```
portal/
├── supabase/
│   └── migrations/
│       ├── portal_001_app_access.sql       # renamed from 001_portal_app_access.sql
│       ├── portal_002_admin_policies.sql   # renamed from 002_admin_policies.sql
│       └── (future: portal_003_*.sql)
├── scripts/
│   └── db-check.cjs                        # new — migration safety check
├── docs/
│   └── schema/
│       ├── portal.md                       # new — portal schema reference
│       ├── wildtrack.md                    # new — WildTrack public schema tables
│       ├── fire.md                         # new — Fire App tables
│       └── trap-monitor.md                 # new — Trap Monitor tables
├── PROTECTED_SURFACES.md                   # new — cross-app surface inventory
├── CLAUDE.md                               # existing — updated with safety rules
└── src/
    └── lib/
        └── check-access.ts                 # modified — SEC-01 fix
```

Downstream repos:
```
camera-trap-dashboard/
├── CLAUDE.md               # existing — already has shared DB rules
└── supabase/migrations/
    ├── wildtrack_001_foundation.sql        # renamed
    └── ...

fire-app/
├── CLAUDE.md               # existing — already has shared DB rules
└── supabase/migrations/
    ├── fire_001_initial_schema.sql         # renamed
    └── ...

Trap Monitor/frontend/
├── CLAUDE.md               # new — does not currently exist
└── (no migrations directory — schema applied ad-hoc per STATE.md)
```

### Pattern 1: Migration Namespace Prefix Convention

**What:** Each app prefixes its migration filenames with a short namespace token to prevent collision when migrations from all apps are eventually managed from a single source.

**When to use:** All new migration files across all four apps must follow this scheme. Existing files are renamed as part of this phase.

**Convention:**
```
{namespace}_{NNN}_{description}.sql

Namespaces:
  portal_       portal schema migrations (this repo)
  wildtrack_    WildTrack public schema migrations
  fire_         Fire App public schema migrations
  trap_         Trap Monitor public schema migrations
```

**Current state (filename collision risk):**

| App | Current Migration | Collides With |
|-----|------------------|---------------|
| portal | `001_portal_app_access.sql` | WildTrack `001_foundation.sql` (different number, but both `001`) |
| portal | `002_admin_policies.sql` | Fire App `002_analysis_zones.sql` |
| WildTrack | `001_foundation.sql` | — |
| Fire App | `001_initial_schema.sql` | — |
| Fire App | `002_analysis_zones.sql` | portal `002_admin_policies.sql` |

No literal collisions today (files are in separate repos), but the phase goal is to prevent them as the monorepo consolidates in Phase 2+. Apply the prefix now so Phase 2 has clean filenames to import.

**IMPORTANT — Supabase CLI migration tracking:** Supabase CLI tracks migrations by filename in the `supabase_migrations.schema_migrations` table in the live database. Renaming migration files locally does NOT automatically rename them in the live database record. For the portal (which has a live Supabase project), renaming requires either: (a) updating the `schema_migrations` table to match the new names, or (b) acknowledging that the local filenames and the live DB records diverge. Given this is a governance/documentation phase and not a live schema change, the safest approach is to rename the files locally and add a comment at the top of each file noting the original filename — the live DB migration records remain untouched. Future migrations use the new convention. Document this divergence in `PROTECTED_SURFACES.md`.

### Pattern 2: db-check.cjs Static Analysis Script

**What:** A Node.js CommonJS script that reads one or more `.sql` migration files and checks them against a blocklist of protected surface identifiers. Prints a human-readable report, exits non-zero if any violations found.

**When to use:** Run manually before applying any migration: `node scripts/db-check.cjs supabase/migrations/portal_003_*.sql`. Optionally wired to a pre-commit hook (v2 requirement GOV-01) or CI (GOV-02).

**Anatomy:**

```javascript
// Source: modelled on Trap Monitor's scripts/verify-shared-db-impact.cjs pattern
// but as static analysis — no live DB connection needed

const fs = require('fs');
const path = require('path');

// Protected surface definitions
const PROTECTED_SURFACES = [
  {
    id: 'check_app_access_signature',
    description: 'portal.check_app_access() function signature — all 3 apps call this RPC',
    // Detect ALTER FUNCTION or CREATE OR REPLACE FUNCTION on check_app_access
    // with a DIFFERENT parameter list than (target_app_id text)
    pattern: /create\s+or\s+replace\s+function\s+portal\.check_app_access\s*\(/i,
    // When this pattern matches, run the signature validator
    type: 'signature_check',
    allowedSignature: '(target_app_id text)',
  },
  {
    id: 'drop_check_app_access',
    description: 'Dropping portal.check_app_access() breaks all 3 downstream apps immediately',
    pattern: /drop\s+function.*check_app_access/i,
    type: 'block',
  },
  {
    id: 'drop_portal_app_access',
    description: 'Dropping portal.app_access table breaks all app access gating',
    pattern: /drop\s+table.*portal\.app_access/i,
    type: 'block',
  },
  {
    id: 'drop_portal_profiles',
    description: 'Dropping portal.profiles breaks WildTrack member lookups',
    pattern: /drop\s+table.*portal\.profiles/i,
    type: 'block',
  },
  {
    id: 'drop_on_auth_user_created',
    description: 'Dropping on_auth_user_created trigger breaks profile auto-creation for all apps',
    pattern: /drop\s+trigger.*on_auth_user_created/i,
    type: 'block',
  },
  {
    id: 'alter_portal_profiles_column',
    description: 'Removing/renaming columns from portal.profiles breaks WildTrack display_name lookups',
    pattern: /alter\s+table\s+portal\.profiles\s+drop\s+column/i,
    type: 'block',
  },
  {
    id: 'alter_app_access_column',
    description: 'Removing/renaming columns from portal.app_access breaks access gating everywhere',
    pattern: /alter\s+table\s+portal\.app_access\s+drop\s+column/i,
    type: 'block',
  },
];

// Exit codes: 0 = clean, 1 = violations found, 2 = usage error
```

**Exit behaviour required by success criterion 1:**
- Altering `portal.check_app_access()` signature → blocking error + `process.exit(1)`
- Dropping any protected surface → blocking error + `process.exit(1)`
- Clean migration → summary line + `process.exit(0)`

**Signature detection detail:** The script cannot fully parse SQL, but it can detect when `CREATE OR REPLACE FUNCTION portal.check_app_access` appears in a migration, extract the argument list with a regex, and compare it against the known-good signature `(target_app_id text)`. If the argument list differs, block. This is the hardest check to implement correctly — document the regex approach and its limitations (e.g., whitespace variations).

### Pattern 3: SEC-01 — Bootstrap Fallback Gated by NODE_ENV

**What:** The `accessInfraMissing` block in `checkAppAccess()` returns `{ hasAccess: true, role: 'admin' }` when the portal schema/RPC is unreachable. This is a production security bypass. The fix gates it behind `process.env.NODE_ENV !== 'production'`.

**Current state (confirmed by reading source):**

| App | File | Current Behaviour | Needs Fix? |
|-----|------|------------------|-----------|
| portal | `src/lib/check-access.ts` line 34–36 | Returns `{ hasAccess: true, role: 'admin' }` unconditionally | **YES** |
| WildTrack | `src/lib/check-access.ts` line 34–36 | Returns `{ hasAccess: true, role: 'admin' }` unconditionally | **YES** |
| Fire App | `src/lib/check-access.ts` line 36–44 | Already fail-closed: returns `{ hasAccess: false, role: null }` + logs warn | No |
| Trap Monitor | `src/lib/check-access.ts` line 36–44 | Already fail-closed: returns `{ hasAccess: false, role: null }` + logs warn | No |

**Fix pattern (based on Fire App/Trap Monitor's already-correct approach):**

```typescript
// Replace the current portal and WildTrack bootstrap fallback block:
if (accessInfraMissing) {
  return { hasAccess: true, role: "admin" };  // REMOVE THIS
}

// With fail-closed + dev-only bootstrap:
if (accessInfraMissing) {
  if (process.env.NODE_ENV !== 'production') {
    // Development only: allow access while portal schema is being provisioned.
    // This path MUST NOT execute in production.
    console.warn('[check-access] portal schema unavailable — dev bootstrap active');
    return { hasAccess: true, role: "admin" };
  }
  // Production: fail closed. Portal must be reachable.
  console.warn(JSON.stringify({
    level: 'warn',
    msg: 'portal_access_check_unavailable',
    app_id: appId,
    error: errorMessage,
    ts: new Date().toISOString(),
  }));
  return { hasAccess: false, role: null };
}
```

**Verification:** After applying the fix, a production build (`NODE_ENV=production node -e "..."`) must confirm the fallback branch is unreachable. Next.js sets `NODE_ENV=production` automatically for `next build` and `next start`.

### Anti-Patterns to Avoid

- **Ad-hoc dashboard SQL on the shared Supabase project:** Downstream app schemas were historically applied via the Supabase dashboard, bypassing migration files. PROTECTED_SURFACES.md and CLAUDE.md in Trap Monitor must make this explicit — all schema changes require a migration file.
- **Live DB connection in db-check.cjs:** The script must work without credentials. A script that requires `SUPABASE_SERVICE_ROLE_KEY` cannot run in a fresh developer clone or a restricted CI environment.
- **Renaming live DB migration records:** Do not UPDATE `supabase_migrations.schema_migrations` to match renamed local files. Document the divergence instead.
- **Cross-repo db-check.cjs copies:** The script lives in `portal/scripts/` only. Downstream apps reference the PROTECTED_SURFACES.md documentation. Only portal runs db-check.cjs (portal owns the migrations source of truth per MIGR-01).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL syntax parsing for db-check | Full SQL parser | Targeted regex patterns on known protected identifiers | SQL parsers are complex, have deps, and are overkill for checking 8-10 specific forbidden patterns |
| Schema documentation | Auto-generation from live DB | Hand-authored from migration SQL | Requires no live DB; migration files are source of truth; human-readable narrative is more useful than raw schema dump |
| Migration version tracking | Custom version table | Existing Supabase CLI tracking + local filename convention | Don't replace or duplicate what Supabase already manages |

---

## Runtime State Inventory

This phase involves file renames and documentation creation. It does NOT touch live data. However, the migration filename rename has one runtime state consideration.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `supabase_migrations.schema_migrations` — live Supabase DB records the old filenames (`001_portal_app_access`, `002_admin_policies`) | Do NOT rename in DB. Add comment header to renamed files noting original name. Divergence is acceptable and documented. |
| Live service config | None — no service reads migration filenames at runtime | None |
| OS-registered state | None | None |
| Secrets/env vars | None changed by this phase | None |
| Build artifacts | None — no compiled outputs depend on migration filenames | None |

---

## Common Pitfalls

### Pitfall 1: Supabase CLI Migration Filename Tracking
**What goes wrong:** Developer renames `001_portal_app_access.sql` to `portal_001_app_access.sql`, then runs `supabase db push` or `supabase migration up`. Supabase CLI treats the renamed file as a new migration (different name = not applied yet) and tries to apply it again against the live DB, causing duplicate-object errors.
**Why it happens:** Supabase tracks applied migrations by exact filename in `supabase_migrations.schema_migrations`.
**How to avoid:** Rename files locally but do NOT run `supabase db push` or `supabase migration up` after renaming existing files. Only run those commands for genuinely new migrations with the new naming convention. Document this in a comment at the top of each renamed file: `-- Originally: 001_portal_app_access.sql (applied 2025-xx-xx)`.
**Warning signs:** `supabase db push` output showing existing migrations as "not applied."

### Pitfall 2: db-check.cjs Regex False Positives on SQL Comments
**What goes wrong:** A migration comment like `-- This migration does NOT drop portal.check_app_access()` triggers the DROP detection regex.
**Why it happens:** Simple substring/regex matching doesn't distinguish SQL statement text from comments.
**How to avoid:** Strip SQL line comments (`-- ...`) and block comments (`/* ... */`) before running pattern matching. Add a comment-stripping preprocessing step to db-check.cjs.
**Warning signs:** db-check.cjs blocking on a migration file that clearly does not violate any surface.

### Pitfall 3: NODE_ENV Check Not Available in Edge Runtime
**What goes wrong:** If `checkAppAccess()` is ever called from a Next.js Edge Runtime route (e.g., middleware), `process.env.NODE_ENV` may behave differently or the `process` global may be restricted.
**Why it happens:** Next.js Edge Runtime is not Node.js — it's a subset.
**How to avoid:** The portal's `checkAppAccess()` is called only from Server Components and Server Actions (confirmed by reading the codebase), never from middleware. `process.env.NODE_ENV` is safe to use. Document this constraint in the code comment.
**Warning signs:** TypeScript error: `Cannot find name 'process'` in an edge-runtime file.

### Pitfall 4: Trap Monitor Has No CLAUDE.md
**What goes wrong:** An AI agent working in `Trap Monitor/frontend/` has no project-specific safety rules. It may inadvertently modify shared surfaces that affect the other apps.
**Why it happens:** Trap Monitor was developed before the CLAUDE.md convention was established.
**How to avoid:** Create `Trap Monitor/frontend/CLAUDE.md` as part of CONV-01. Use the portal CLAUDE.md as the template. The Trap Monitor CLAUDE.md must specifically document `public.organisations` and `public.org_members` as owned by WildTrack.
**Warning signs:** AI agent in Trap Monitor modifying `public.organisations` columns without a cross-app impact check.

### Pitfall 5: db-check.cjs Checking function signature with Whitespace Variations
**What goes wrong:** Regex for `portal.check_app_access(target_app_id text)` fails to match valid SQL like `portal.check_app_access( target_app_id  text )` (extra spaces).
**Why it happens:** SQL is whitespace-flexible; regex is literal.
**How to avoid:** Normalise whitespace in the extracted argument list before comparison: `signature.replace(/\s+/g, ' ').trim()`.
**Warning signs:** db-check reports "signature OK" for a migration that clearly changes the argument name.

---

## Code Examples

### db-check.cjs: Complete Structure

```javascript
#!/usr/bin/env node
// scripts/db-check.cjs
// Cross-app Supabase migration safety check — static analysis only.
// Usage: node scripts/db-check.cjs <migration.sql> [migration2.sql ...]
// Exit: 0 = clean, 1 = violations found, 2 = usage error

'use strict';
const fs = require('fs');
const path = require('path');

// ── Strip SQL comments before pattern matching ─────────────────────────────
function stripComments(sql) {
  // Strip block comments /* ... */
  let stripped = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Strip line comments -- ...
  stripped = stripped.replace(/--[^\n]*/g, ' ');
  return stripped;
}

// ── Normalise whitespace ───────────────────────────────────────────────────
function normalise(sql) {
  return stripComments(sql).replace(/\s+/g, ' ').toLowerCase();
}

// ── Protected surface checks ───────────────────────────────────────────────
const CHECKS = [
  {
    id: 'drop_check_app_access',
    message: 'BLOCKED: Dropping portal.check_app_access() breaks all 3 downstream apps (WildTrack, Fire, Trap Monitor).',
    test: (sql) => /drop\s+function.*portal\.check_app_access/.test(sql),
  },
  {
    id: 'signature_change_check_app_access',
    message: 'BLOCKED: portal.check_app_access() signature changed. All 3 downstream apps call rpc("check_app_access", { target_app_id }). Signature must remain (target_app_id text).',
    test: (sql) => {
      // Detect a CREATE OR REPLACE FUNCTION for check_app_access
      const match = sql.match(/create\s+or\s+replace\s+function\s+portal\.check_app_access\s*\(([^)]*)\)/);
      if (!match) return false; // Not redefining this function — OK
      const signature = match[1].replace(/\s+/g, ' ').trim();
      return signature !== 'target_app_id text';
    },
  },
  {
    id: 'drop_portal_app_access',
    message: 'BLOCKED: Dropping portal.app_access breaks access gating in all 3 downstream apps.',
    test: (sql) => /drop\s+table.*portal\.app_access/.test(sql),
  },
  {
    id: 'drop_portal_profiles',
    message: 'BLOCKED: Dropping portal.profiles breaks WildTrack member lookups and all profile queries.',
    test: (sql) => /drop\s+table.*portal\.profiles/.test(sql),
  },
  {
    id: 'drop_portal_apps',
    message: 'BLOCKED: Dropping portal.apps breaks the app registry queried by all consuming apps.',
    test: (sql) => /drop\s+table.*portal\.apps/.test(sql),
  },
  {
    id: 'drop_on_auth_user_created',
    message: 'BLOCKED: Dropping on_auth_user_created trigger breaks portal.profiles auto-creation for every new signup across all apps.',
    test: (sql) => /drop\s+trigger.*on_auth_user_created/.test(sql),
  },
  {
    id: 'drop_column_profiles',
    message: 'BLOCKED: Removing columns from portal.profiles. WildTrack queries display_name and email. Removing either breaks member lookups.',
    test: (sql) => /alter\s+table\s+portal\.profiles\s+drop\s+column/.test(sql),
  },
  {
    id: 'drop_column_app_access',
    message: 'BLOCKED: Removing columns from portal.app_access. All apps depend on user_id, app_id, and role columns for access gating.',
    test: (sql) => /alter\s+table\s+portal\.app_access\s+drop\s+column/.test(sql),
  },
];

// ── Main ───────────────────────────────────────────────────────────────────
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/db-check.cjs <migration.sql> [...]');
  process.exit(2);
}

let violations = 0;

for (const file of files) {
  const absPath = path.resolve(file);
  if (!fs.existsSync(absPath)) {
    console.error(`ERROR: File not found: ${absPath}`);
    process.exit(2);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  const sql = normalise(raw);

  const fileViolations = [];
  for (const check of CHECKS) {
    if (check.test(sql)) {
      fileViolations.push(check);
    }
  }

  if (fileViolations.length > 0) {
    console.error(`\ndb-check FAILED: ${path.basename(file)}`);
    for (const v of fileViolations) {
      console.error(`  [${v.id}] ${v.message}`);
    }
    violations += fileViolations.length;
  } else {
    console.log(`db-check OK: ${path.basename(file)}`);
  }
}

if (violations > 0) {
  console.error(`\n${violations} violation(s) found. Migration blocked.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
process.exit(0);
```

### SEC-01 Fix: checkAppAccess in portal and WildTrack

```typescript
// Replace the unconditional bootstrap fallback:
// BEFORE (current portal/WildTrack):
if (accessInfraMissing) {
  return { hasAccess: true, role: "admin" };
}

// AFTER — SEC-01 fix:
if (accessInfraMissing) {
  if (process.env.NODE_ENV !== 'production') {
    // Development only: bootstrap while portal schema is being provisioned.
    // This branch MUST NOT execute in production. Verified: Next.js sets
    // NODE_ENV=production for next build and next start.
    return { hasAccess: true, role: "admin" };
  }
  // Production: fail closed.
  console.warn(JSON.stringify({
    level: 'warn',
    msg: 'portal_access_check_unavailable',
    app_id: appId,
    error: errorMessage,
    ts: new Date().toISOString(),
  }));
  return { hasAccess: false, role: null };
}
```

---

## Protected Surfaces Inventory

This is the authoritative inventory for `PROTECTED_SURFACES.md`. Derived from reading all four CLAUDE.md files and all migration SQL.

### Portal Schema (owned by portal repo)

| Surface | Type | Columns / Signature | Consumers | Breakage if Changed |
|---------|------|-------------------|-----------|---------------------|
| `portal.app_access` | Table | `id`, `user_id`, `app_id`, `role`, `granted_by`, `granted_at` | WildTrack, Fire, Trap Monitor | Access gating breaks for all three apps |
| `portal.profiles` | Table | `id`, `display_name`, `email`, `full_name`, `avatar_url`, `organisation`, `created_at`, `updated_at` | WildTrack (display_name, email), all apps (id FK) | WildTrack member lookups break |
| `portal.apps` | Table | `id`, `name`, `description`, `url`, `icon`, `created_at` | All apps (registry) | App registry queries fail |
| `portal.check_app_access(target_app_id text)` | RPC function | Returns `table(has_access boolean, user_role text)` | WildTrack, Fire, Trap Monitor | All three apps' access gating fails immediately |
| `portal.is_admin()` | Function | Returns `boolean` | portal admin UI | Admin actions break (lower risk — portal only) |
| `portal.handle_new_user()` | Trigger function | Inserts into portal.profiles on auth.users INSERT | All apps (new user signups) | Profile not created on signup across all apps |
| `on_auth_user_created` | Trigger | AFTER INSERT on auth.users | All apps | Signup profile creation silently broken |

### Public Schema (WildTrack-owned, Trap Monitor dependent)

| Surface | Type | Owner | Consumers | Breakage if Changed |
|---------|------|-------|-----------|---------------------|
| `public.organisations` | Table | WildTrack | Trap Monitor (units.org_id FK) | Trap Monitor org FK breaks on CASCADE changes |
| `public.org_members` | Table | WildTrack | Trap Monitor (`trap_can_*` functions query it) | Trap Monitor access checks fail |
| `public.is_org_member(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor RLS policies using this function break |
| `public.is_org_admin(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor admin checks break |
| `public.can_org_edit(p_org_id uuid, p_user_id uuid)` | Function | WildTrack | Trap Monitor | Trap Monitor edit permission checks break |

### Naming Collision Risk

| Collision | App A | App B | Risk |
|-----------|-------|-------|------|
| `public.update_updated_at()` | WildTrack | Fire App (also defines this) | `CREATE OR REPLACE` in either app silently overwrites the other's version if logic differs |
| Enum names | WildTrack (`org_role`, `org_type`) | Fire App (`user_role`) | Cannot have same name in same schema — currently distinct names, but must be guarded |

---

## Schema Documentation Map

Full schema docs go in `portal/docs/schema/`. Content derived from migration SQL (no live DB dump needed):

| File | Source Migrations | Key Tables |
|------|------------------|------------|
| `portal/docs/schema/portal.md` | `portal/supabase/migrations/portal_001_*.sql`, `portal_002_*.sql` | portal.apps, portal.app_access, portal.profiles, all RPCs, all triggers |
| `portal/docs/schema/wildtrack.md` | `camera-trap-dashboard/supabase/migrations/001–007` | organisations, org_members, projects, project_members, sites, species, observations, detection_histories |
| `portal/docs/schema/fire.md` | `fire-app/supabase/migrations/001–008` | organization (singular), project, user_project, burn_plan, fire_season, fire_scar, analysis_zone, sentinel_imagery_cache |
| `portal/docs/schema/trap-monitor.md` | `Trap Monitor/frontend/scripts/verify-shared-db-impact.cjs` (verifies units, events, commands, notifications, org_members RLS) | units, events, commands, notifications (no migrations directory — ad-hoc) |

**Trap Monitor special case:** Trap Monitor has no `supabase/migrations/` directory. Its schema was applied via the Supabase dashboard (confirmed: only `scripts/verify-shared-db-impact.cjs` exists, no SQL migration files). Schema documentation must be reconstructed from the verification script and the check-access.ts file. This is a known gap — document it as a risk in `trap-monitor.md`.

---

## RLS Policy Audit Summary

### portal schema (from migration files)

| Table | Policy Name | Operation | Condition |
|-------|-------------|-----------|-----------|
| portal.apps | `apps_read_all` | SELECT | `true` (public read) |
| portal.app_access | `app_access_read_own` | SELECT | `auth.uid() = user_id` |
| portal.app_access | `app_access_read_admin` | SELECT | `portal.is_admin()` |
| portal.app_access | `app_access_insert_admin` | INSERT | `portal.is_admin()` |
| portal.app_access | `app_access_delete_admin` | DELETE | `portal.is_admin()` |
| portal.app_access | `app_access_update_admin` | UPDATE | `portal.is_admin()` |
| portal.profiles | `profiles_read_own` | SELECT | `auth.uid() = id` |
| portal.profiles | `profiles_update_own` | UPDATE | `auth.uid() = id` |
| portal.profiles | `profiles_insert_own` | INSERT | `auth.uid() = id` |
| portal.profiles | `profiles_read_admin` | SELECT | `portal.is_admin()` |

**Note:** `002_admin_policies.sql` redefines `app_access_insert_admin` and `app_access_delete_admin` using `portal.is_admin()` (security definer, avoids recursion). The original versions in `001_portal_app_access.sql` use a direct subquery on `portal.app_access` — this creates a recursive policy. The `002` migration fixes this by replacing with the security-definer function. Both policies with the same name exist — Supabase allows this (policies are additive), but the intent is that `002` supersedes `001`'s insert/delete policies. Document this in MIGR-06 audit: the original non-definer policies should be dropped (a future migration, not this phase).

### WildTrack public schema (summary from migration 001 onward)
RLS enabled on all tables. Policies use `is_org_member()`, `is_org_admin()`, `can_org_edit()` helper functions. No cross-app risk from WildTrack RLS changes as long as helper function signatures are preserved.

### Fire App (summary)
RLS enabled on all tables. Policies use `auth.uid()` and `user_project` membership checks. Isolated to Fire App tables — no cross-app risk.

### Trap Monitor (summary from verify-shared-db-impact.cjs)
Uses `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()` functions in public schema. These query `public.org_members` (WildTrack-owned). This is the cross-app coupling point documented in WildTrack's CLAUDE.md.

---

## Validation Architecture

nyquist_validation is enabled. Portal has no test framework currently (no vitest.config, no jest.config, no test scripts in package.json). The SEC-01 fix is the only code change with testable behaviour. Trap Monitor already has a vitest test for this exact behaviour (`src/lib/check-access.test.ts`) that serves as the reference implementation.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed in portal) — consistent with Trap Monitor and Fire App |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run src/lib/check-access.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|-----------|-----------|-------------------|-------------|
| SEC-01 | Bootstrap fallback absent in production: `NODE_ENV=production` path returns `{ hasAccess: false, role: null }` for infra errors | unit | `npx vitest run src/lib/check-access.test.ts` | ❌ Wave 0 |
| SEC-01 | Bootstrap fallback present in dev: `NODE_ENV=development` path returns `{ hasAccess: true, role: 'admin' }` for infra errors | unit | `npx vitest run src/lib/check-access.test.ts` | ❌ Wave 0 |
| MIGR-02 | db-check.cjs exits non-zero for migration altering check_app_access signature | unit | `node scripts/db-check.cjs tests/fixtures/bad-signature.sql && exit 1 \|\| exit 0` | ❌ Wave 0 |
| MIGR-02 | db-check.cjs exits 0 for clean migration | unit | `node scripts/db-check.cjs tests/fixtures/clean-migration.sql` | ❌ Wave 0 |
| MIGR-01, MIGR-04 | All migration files in portal/supabase/migrations/ follow namespace prefix scheme | smoke (manual ls check) | Manual | N/A |
| MIGR-03, MIGR-05, MIGR-06, CONV-01, CONV-02 | Documentation files exist and contain required sections | smoke (manual) | Manual | N/A |

**Note on WildTrack SEC-01:** WildTrack also needs the SEC-01 fix but has no test infrastructure (no vitest, no jest). The test for WildTrack's fix should be added alongside the fix, following the same pattern as the portal test. However, installing vitest in WildTrack is outside Phase 1 scope (it belongs to Phase 2 monorepo setup). For Phase 1, verify the WildTrack fix manually by inspecting the conditional and confirming `NODE_ENV` behaviour.

### Sampling Rate
- Per task commit: `npx vitest run src/lib/check-access.test.ts` (portal only, ~2 seconds)
- Per wave merge: `npx vitest run` (portal full suite, after vitest installed)
- Phase gate: All manual smoke checks green + vitest green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` and `@vitest/coverage-v8` packages — not in portal package.json: `npm install --save-dev vitest @vitest/coverage-v8`
- [ ] `vitest.config.ts` — needs creation in portal root
- [ ] `src/lib/check-access.test.ts` — unit tests for SEC-01 fix (modelled on Trap Monitor's existing test)
- [ ] `tests/fixtures/bad-signature.sql` — fixture for db-check.cjs test
- [ ] `tests/fixtures/clean-migration.sql` — fixture for db-check.cjs test

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | db-check.cjs | ✓ | v24.14.0 | — |
| npm | vitest install (Wave 0) | ✓ | bundled with Node 24 | — |
| Supabase CLI | Migration rename tracking info only | Not verified | — | Document divergence in file headers instead |
| Live Supabase project | Schema docs for Trap Monitor | Not required | — | Reconstruct from verify-shared-db-impact.cjs |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Supabase CLI: Not needed for this phase — migration files are renamed locally only, no `supabase db push` runs.

---

## Open Questions

1. **Does Trap Monitor have a CLAUDE.md at all?**
   - What we know: `ls` of `Trap Monitor/frontend/` shows no CLAUDE.md.
   - What's unclear: Is there a CLAUDE.md in the repo root (one level above `frontend/`)?
   - Recommendation: Check `Trap Monitor/` parent directory. If absent at both levels, create in `frontend/`.

2. **Trap Monitor schema: are there SQL migration files we haven't found?**
   - What we know: `Trap Monitor/frontend/` has no `supabase/migrations/` directory. Only `scripts/verify-shared-db-impact.cjs`.
   - What's unclear: Whether the Trap Monitor schema was fully applied ad-hoc via dashboard, or if there are migration files elsewhere.
   - Recommendation: Run `find "Trap Monitor/" -name "*.sql"` before writing `trap-monitor.md`. If no SQL found, document schema from the verification script's table names.

3. **Are the duplicate RLS policy names in portal a live issue?**
   - What we know: `001_portal_app_access.sql` creates `app_access_insert_admin` and `app_access_delete_admin` as direct-subquery policies. `002_admin_policies.sql` creates policies with the same names using `portal.is_admin()`. Supabase applies both migrations but policies with the same name conflict.
   - What's unclear: Whether Supabase silently replaced the first or errored — and whether the live DB has one policy or two (or errored on migration 002).
   - Recommendation: Document in MIGR-06 audit. Fixing the duplicate policies is a v2 migration task (outside Phase 1 scope). The live DB likely applied both, and the second `CREATE POLICY` with the same name would have failed — which means `002_admin_policies.sql` partially applied. This is a pre-existing concern, not a Phase 1 risk.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `portal/supabase/migrations/001_portal_app_access.sql` — complete schema inventory
- Direct file reads: `portal/supabase/migrations/002_admin_policies.sql` — admin RLS policies
- Direct file reads: `portal/src/lib/check-access.ts` — confirmed bootstrap fallback location and exact code
- Direct file reads: `camera-trap-dashboard/src/lib/check-access.ts` — confirmed same bootstrap fallback
- Direct file reads: `fire-app/src/lib/check-access.ts` — confirmed already fail-closed
- Direct file reads: `Trap Monitor/frontend/src/lib/check-access.ts` — confirmed already fail-closed
- Direct file reads: All four CLAUDE.md files — confirmed schema ownership boundaries
- Direct file reads: `camera-trap-dashboard/supabase/migrations/001_foundation.sql` — WildTrack schema
- Direct file reads: `fire-app/supabase/migrations/001_initial_schema.sql` — Fire App schema
- Direct file reads: `Trap Monitor/frontend/scripts/verify-shared-db-impact.cjs` — Trap Monitor table inventory
- Direct file reads: `Trap Monitor/frontend/src/lib/check-access.test.ts` — reference test implementation for SEC-01

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — pre-existing analysis confirming the bootstrap fallback as a documented security concern

### Tertiary (LOW confidence)
- Inference from directory listing: Trap Monitor has no CLAUDE.md — confirmed by `ls` of `Trap Monitor/frontend/` showing no CLAUDE.md

---

## Project Constraints (from CLAUDE.md)

The following directives from `portal/CLAUDE.md` apply to all Phase 1 work. The planner must verify every task complies.

| Directive | Phase 1 Impact |
|-----------|---------------|
| Never hardcode secrets | db-check.cjs must not require any credentials |
| TypeScript strict | check-access.ts fix must typecheck with `tsc --noEmit` |
| Tailwind v4 CSS-based config | Not relevant to Phase 1 |
| Named exports only (except page/layout) | db-check.cjs is .cjs (CommonJS) — not subject to TS named export rule |
| Server Components by default | SEC-01 fix is in a shared utility — no component changes |
| Never touch portal.check_app_access() signature | db-check.cjs enforces this; no phase 1 task should alter this function |
| Never touch public.organisations, org_members, public.organization, public.user_project | No Phase 1 task touches these |
| Cross-App Impact Checklist | Must be applied before writing any migration (even renaming has migration tracking implications) |
| Never ALTER tables/functions outside portal schema without approval | db-check.cjs script documents why; no phase 1 task crosses this boundary |

---

## Metadata

**Confidence breakdown:**
- Protected surfaces inventory: HIGH — derived directly from reading migration SQL and CLAUDE.md files
- db-check.cjs design: HIGH — pattern confirmed by existing Trap Monitor script
- SEC-01 fix pattern: HIGH — confirmed by reading Fire App and Trap Monitor's already-correct implementation
- Migration filename rename risk: HIGH — Supabase CLI tracking behaviour is well-documented
- Trap Monitor schema docs: MEDIUM — no migration files found; must reconstruct from verify script
- Duplicate RLS policy names: MEDIUM — inferred from reading migration files; live DB state not verified

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable domain; no fast-moving dependencies)
