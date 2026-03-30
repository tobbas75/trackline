#!/usr/bin/env node
// scripts/db-check.cjs
// Cross-app Supabase migration safety check — static analysis only.
// Usage: node scripts/db-check.cjs <migration.sql> [migration2.sql ...]
// Exit: 0 = clean, 1 = violations found, 2 = usage error
//
// No npm dependencies — only Node.js built-ins (fs, path).
// Runs in any environment with Node.js >= 14. No Supabase credentials required.
//
// Protected surfaces: portal.check_app_access(), portal.app_access,
// portal.profiles, portal.apps, on_auth_user_created trigger.
// Consuming apps: WildTrack, Fire System, Trap Monitor (all call the same RPC).

'use strict';
const fs = require('fs');
const path = require('path');

// ── Strip SQL comments before pattern matching ─────────────────────────────
// Prevents false positives from commented-out SQL like:
//   -- DROP TABLE portal.app_access  (should NOT trigger)
function stripComments(sql) {
  // Strip block comments /* ... */
  let stripped = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Strip line comments -- ...
  stripped = stripped.replace(/--[^\n]*/g, ' ');
  return stripped;
}

// ── Normalise whitespace and case ─────────────────────────────────────────
function normalise(sql) {
  return stripComments(sql).replace(/\s+/g, ' ').toLowerCase();
}

// ── Protected surface checks ───────────────────────────────────────────────
// Each check has:
//   id      — matches the surface ID in PROTECTED_SURFACES.md
//   message — human-readable blocking message (printed on violation)
//   test    — function(normalisedSql: string): boolean
//
// Check IDs correspond to PROTECTED_SURFACES.md surface identifiers.
const CHECKS = [
  {
    id: 'drop_check_app_access',
    message: 'BLOCKED: Dropping portal.check_app_access() breaks all 3 downstream apps (WildTrack, Fire, Trap Monitor).',
    test: (sql) => /drop\s+function.*portal\.check_app_access/.test(sql),
  },
  {
    // Detect CREATE OR REPLACE FUNCTION portal.check_app_access(...) with
    // a signature other than the required (target_app_id text).
    // Whitespace in the argument list is normalised before comparison.
    // Limitation: does not detect ALTER FUNCTION renaming — use drop_check_app_access for that.
    id: 'signature_change_check_app_access',
    message: 'BLOCKED: portal.check_app_access() signature changed. All 3 downstream apps call rpc("check_app_access", { target_app_id }). Signature must remain (target_app_id text).',
    test: (sql) => {
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
  console.error('Usage: node scripts/db-check.cjs <migration.sql> [migration2.sql ...]');
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
