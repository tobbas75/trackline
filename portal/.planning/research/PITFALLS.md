# Pitfalls Research

**Domain:** Multi-app conservation portal — monorepo governance, shared Supabase, shared component library
**Researched:** 2026-03-29
**Confidence:** HIGH (verified against actual codebase state + current sources)

---

## Critical Pitfalls

### Pitfall 1: Running `supabase db push` from Multiple Repos Against the Same Project

**What goes wrong:**
Each app currently has its own `supabase/` directory. If WildTrack, Fire App, and the portal all independently run `supabase db push` against the shared Supabase project, they each maintain their own local migration history file (`supabase/.migrations`). When app A pushes migrations 001-007 and app B independently pushes its 001-008, the Supabase project's migration history table (`supabase_migrations.schema_migrations`) ends up with conflicting entries. Supabase CLI detects this as a "remote database's migration history is not in sync" error, and subsequent pushes from either repo fail. Recovery requires manually editing the `schema_migrations` table in production — a dangerous operation.

**Why it happens:**
The Supabase CLI is designed around a 1-repo-to-1-project relationship. Multiple repos pointing at the same project ID each think they own the migration history. This is the most common cause of the "migration history mismatch" error in shared-database teams.

**How to avoid:**
Designate the portal repo as the **sole source of migration pushes** for the shared project. All other apps (WildTrack, Fire, Trap Monitor) must never run `supabase db push` directly. They create migration SQL files and submit them for inclusion in the portal's `supabase/migrations/` folder. The portal's `package.json` is the only place with a `db:push` script. Document this with a `CONTRIBUTING.md` notice and add a `db:check` script in each downstream app that exits with an error if the user tries to run push from there.

**Warning signs:**
- Any downstream app's `package.json` contains a `supabase db push` script
- A downstream app has a `supabase/.temp/` directory (sign of local Supabase CLI usage)
- CI logs from WildTrack or Fire App show Supabase CLI commands

**Phase to address:**
Migration governance phase — establish the "portal owns push" rule before any workspace setup begins. This must be Rule #1 in the shared CONTRIBUTING.md.

---

### Pitfall 2: Migration Timestamp Collision Between Apps

**What goes wrong:**
Supabase migrations are ordered by filename prefix (e.g., `20240101120000_` timestamp format, or sequential `001_`, `002_`). The portal currently uses sequential numbering (`001_`, `002_`). WildTrack has `001_foundation.sql` through `007_fix_detection_histories_trigger.sql`. Fire App has `001_initial_schema.sql` through `008_fire_scar_uploads.sql`. If any of these filenames are ever copied into a centralized folder, the filename collision is immediate and silent — Supabase may apply the wrong migration or skip an existing one.

**Why it happens:**
Each repo was developed independently with no coordination on migration naming. Simple sequential numbering (001, 002...) feels natural per-repo but becomes ambiguous when centralized.

**How to avoid:**
Switch the centralized migration folder to a **namespaced prefix scheme** before adding any app migrations: `portal_001_`, `wildtrack_001_`, `fire_001_`, `trap_001_`. Existing portal migrations get renamed as the first action of the centralization phase. Downstream app migrations that have already been applied to production are documented in `docs/schema/` as reference-only (not re-run); only new migrations go through the centralized folder with the namespaced prefix.

**Warning signs:**
- Any two migration files share the same numeric prefix after centralization
- A PR adds a new migration file and the CI check does not validate uniqueness of filenames

**Phase to address:**
Migration governance phase — the naming scheme must be settled before the first cross-app migration is written. A CI step that checks for filename uniqueness in `supabase/migrations/` prevents regression.

---

### Pitfall 3: Breaking `portal.check_app_access()` Return Shape

**What goes wrong:**
All three downstream apps call `portal.check_app_access(target_app_id)` via `supabase.rpc()` and expect a result row with exactly two columns: `has_access boolean` and `user_role text`. If a migration changes the function to return a third column, rename `user_role` to `role`, or changes the function signature, the downstream TypeScript types desync silently. The RPC still succeeds (Supabase returns extra or missing columns without error), but `data[0].user_role` returns `undefined` instead of `'admin'`/`'viewer'`/`'member'`. Every user gets `{ hasAccess: true, role: null }` — the access check passes but role-based UI breaks. Or worse: `{ hasAccess: false, role: null }` and users are locked out.

**Why it happens:**
The function is defined in the portal's migration but consumed by three external codebases. There is no compile-time enforcement of the contract. It is the most dangerous surface in the shared schema.

**How to avoid:**
1. Add `check_app_access` to `PROTECTED_SURFACES.md` with the exact current signature and return columns documented.
2. The cross-app check script (`db-check.cjs`) must parse any migration SQL that touches this function and block the PR with an explicit error.
3. If the function signature genuinely must change, create a **new function** (`check_app_access_v2`) and migrate consumers one at a time before deprecating the old one.
4. Write a test in the portal's test suite (even a simple SQL assertion) that verifies the return shape has not changed.

**Warning signs:**
- A migration contains `CREATE OR REPLACE FUNCTION portal.check_app_access`
- A PR modifies `portal.app_access` column names (which the function reads)
- A downstream app's CI starts showing `role: null` in access check logs

**Phase to address:**
Migration governance phase — the protected surfaces manifest must exist before the first post-unification migration is written. The check script is the enforcement mechanism.

---

### Pitfall 4: `on_auth_user_created` Trigger Breaks New Signups Across All Apps

**What goes wrong:**
The `portal.handle_new_user()` trigger fires on `auth.users` INSERT — meaning every new signup across all four Trackline apps goes through this trigger. If a migration alters `portal.profiles` in a way that causes the INSERT inside `handle_new_user()` to fail (column constraint violation, missing default, type mismatch), **all new user signups fail across all four apps** simultaneously. The trigger failure is silent from the app's perspective — Supabase GoTrue returns a generic signup error with no hint that the trigger is the cause.

**Why it happens:**
Trigger failures in `SECURITY DEFINER` functions are notoriously hard to debug because the error is swallowed by the auth layer. Adding a NOT NULL column without a DEFAULT to `portal.profiles` is the most common accidental trigger-breaker.

**How to avoid:**
1. Add `on_auth_user_created` to `PROTECTED_SURFACES.md`.
2. Any `ALTER TABLE portal.profiles ADD COLUMN` must use a `DEFAULT` value, always. Document this as a hard rule.
3. After any migration that touches `portal.profiles` or `handle_new_user()`, run a manual signup test against staging before deploying to production.
4. The cross-app check script should flag any `ALTER TABLE portal.profiles` that adds a column without `DEFAULT` or that drops a column.
5. Never modify the trigger body without explicit cross-app impact review documented in the PR.

**Warning signs:**
- A migration adds a NOT NULL column to `portal.profiles` without DEFAULT
- New user test fails with a generic 500 from Supabase Auth
- A migration drops or renames a column that `handle_new_user()` references by name

**Phase to address:**
Migration governance phase. The protected surfaces manifest and check script are the prevention. The staging test is the verification.

---

### Pitfall 5: Workspace Root `node_modules` Hoisting Breaks Individual App Builds on Vercel

**What goes wrong:**
When npm/pnpm workspaces are initialized at the `LandManagment Website/` parent, the package manager hoists shared dependencies to the root `node_modules/`. Vercel's build for each app sets its "Root Directory" to the app's subfolder (e.g., `portal/`). Vercel only uploads files within the Root Directory to its build environment. If a shared package is hoisted to the parent `node_modules/`, Vercel cannot find it — the build fails with `Cannot find module '@trackline/ui'`.

**Why it happens:**
The workspace root sits outside the Vercel project's configured Root Directory. Vercel needs the entire monorepo tree to resolve workspace symlinks, but by default it only reads from Root Directory downwards.

**How to avoid:**
Each app's Vercel project must have its Root Directory set to the **monorepo root** (`LandManagment Website/`), not the app subfolder. The build command is then set per-app: `cd portal && npm run build` (or use `vercel.json` with `"buildCommand"` in the app's directory). Alternatively, use a custom install command that navigates to the monorepo root: `cd .. && npm install`. The "Ignored Build Step" must be configured with `git diff HEAD^ HEAD --quiet ./portal` to prevent all 4 apps rebuilding on every push.

**Warning signs:**
- Vercel build logs show `Cannot find module` for any `@trackline/*` package
- A Vercel project's Root Directory is set to an app subdirectory (portal/, fire-app/, etc.)
- Build succeeds locally but fails on Vercel

**Phase to address:**
Monorepo workspace setup phase — Vercel configuration must be updated for each app as part of workspace initialization, not after. Test each app's Vercel build before proceeding to the next phase.

---

### Pitfall 6: Shared Component Library Creates Hard Coupling Before Apps Are Ready

**What goes wrong:**
`packages/ui` is introduced and consumed by the portal first. Then a component is refactored — say, the `Button` variant API changes. Because all 4 apps depend on `workspace:*` (always latest), the next time any downstream app installs or rebuilds, the import breaks. With 4 apps on different build cycles, a breaking change in `packages/ui` can silently fail a downstream app's next Vercel deployment, not the one that made the change. The person deploying Fire App next week has no idea the portal team changed a prop name yesterday.

**Why it happens:**
`workspace:*` pins to local latest with no versioning signal. Breaking changes are only caught when the consuming app's TypeScript compiler runs — which happens at install/build time, not at the moment of change.

**How to avoid:**
1. Start with the portal as the only consumer of `packages/ui` during initial development. Only extend to downstream apps once the API has been stable for at least one full milestone.
2. Export types from `packages/ui/index.ts` explicitly. The TypeScript boundary at the consuming app is the contract enforcement — if it compiles across all apps, the API is stable.
3. Run `npm run typecheck` across all workspace packages as part of the monorepo root CI check before merging any `packages/ui` change.
4. Treat `packages/ui` component prop interfaces as public API: deprecate before removing, add optional before making required.

**Warning signs:**
- A `packages/ui` PR does not run typecheck against all consuming apps
- A downstream app's CI has not run since `packages/ui` was last changed
- A component's props are changed without checking all usages across the workspace with `grep`

**Phase to address:**
Shared component library phase — establish the root-level typecheck command before introducing any shared components. The CI gate is the prevention.

---

### Pitfall 7: `@/*` Path Alias Collision Across Workspace Packages

**What goes wrong:**
All four apps currently define `"paths": { "@/*": ["./src/*"] }` in their respective `tsconfig.json`. A shared `packages/ui` package also needs a path alias. If `packages/ui` also uses `@/*`, TypeScript resolves it relative to the package's own `src/` — fine in isolation. But when any app imports from `packages/ui`, and that file internally imports `@/components/something`, TypeScript tries to resolve `@/` relative to the consuming app's `src/`, not the package's `src/`. This causes "cannot find module" errors that only appear after the workspace symlink is established, not during package development.

**Why it happens:**
Path aliases are resolved relative to the `tsconfig.json` that defines them. Workspace packages are compiled in the context of the consuming app's tsconfig, not their own. The `@/` alias is too generic and collides across boundaries.

**How to avoid:**
Shared workspace packages (`packages/ui`, `packages/eslint-config`, `packages/portal-client`) must use a **scoped path alias**: `@trackline/ui/*` maps to `./src/*` in that package's tsconfig. Apps keep their own `@/*` alias unchanged. The shared `tsconfig.base.json` only defines compiler options, not path aliases — those remain per-app.

**Warning signs:**
- `packages/ui/tsconfig.json` defines `"@/*"` as a path alias
- TypeScript errors appear in consuming apps that mention package-internal file paths
- `tsc --noEmit` passes per-app but fails at the workspace root level

**Phase to address:**
Monorepo workspace setup phase — get the tsconfig base right before adding any packages. Fix the alias scheme before the first shared package is published internally.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copying `check-access.ts` into each app instead of `packages/portal-client` | Faster to start, no workspace package complexity | 4 diverging copies, each with its own bugs and type drift — already happened across 3 apps | Never for new code. The existing copies should be replaced in the component library phase |
| Documenting downstream schemas manually without `supabase db dump` | Easier than setting up CLI for each app | Docs drift from reality; future migrations reference wrong column names | Acceptable for v1 docs if flagged as "needs verification" |
| Using `npm run check` per-app instead of a workspace-root check command | No new tooling needed | CI misses cross-package type errors; a `packages/ui` change only fails when the consuming app deploys | Never — root-level typecheck is cheap and prevents silent regressions |
| Skipping `Ignored Build Step` on Vercel | Simpler Vercel config | All 4 apps rebuild on every push; free tier build minutes are consumed; deploys slow | Only during initial workspace setup while verifying builds work at all |
| Adding migration SQL directly in the Supabase dashboard UI | Fastest one-off fix | Creates schema drift — migration files don't match what's in production; `supabase db push` will fail or skip the change | Never in production. Local dashboard use only, then export to a migration file before applying |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase `db push` from monorepo | Running push from the app's own directory picks up only that app's `supabase/config.toml` and project ID; the shared project ID may differ | Set `SUPABASE_PROJECT_ID` in the workspace root `.env` and always push from the portal directory |
| Supabase `gen types` across apps | Each app generates types against the full shared schema, including other apps' tables; generated types are polluted with irrelevant types | Generate per-app with schema filter: `--schema portal,public` — then each app only gets types for its own schema. Or accept the full shared types as a known overhead for now |
| Vercel `NEXT_PUBLIC_*` env vars | Each Vercel project needs its own env vars set; they do not inherit from a "monorepo root" Vercel project | Set env vars individually per Vercel project. Use Vercel's "Environment Variables" per project. A shared `.env.example` in the workspace root documents what each app needs |
| npm workspace symlinks on Windows | `node_modules/@trackline/ui` is a symlink to `../../packages/ui`; some Windows tools (older Jest, some bundlers) do not follow symlinks correctly | Use pnpm instead of npm if symlink resolution problems appear — pnpm uses hard links by default. Or add `experimental.esmExternals` to each app's `next.config.ts` |
| Supabase `SECURITY DEFINER` functions | `portal.is_admin()` and `portal.check_app_access()` are `SECURITY DEFINER` — they run as the function owner, bypassing the calling user's RLS. A migration that changes the owner of the `portal` schema can silently break these functions | Always keep functions in the `portal` schema owned by the same role. Never `ALTER SCHEMA portal OWNER TO` without testing all RPC calls |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policies on `portal.app_access` that call `portal.is_admin()` (itself a query) | Every `SELECT` on `app_access` runs a subquery; admin panel page load runs 3-4 queries each with this overhead | Index `portal.app_access(user_id, role)`; `is_admin()` already uses `SECURITY DEFINER` which bypasses RLS on the inner query — acceptable at this scale | Noticeable at ~500+ concurrent admin sessions; not a concern for Trackline's user count |
| Calling `supabase.schema('portal').from('app_access')` without schema cache invalidation | Stale PostgREST schema cache returns 404 for portal schema queries after schema changes | After any migration that changes portal schema, run `supabase functions serve` cache refresh or wait for the 5-minute auto-refresh | Immediately after deployment of a new migration |
| `npm install` at workspace root installing all 4 apps' dependencies together | Slow local installs; the combined `node_modules` for 4 Next.js apps is large | Accept this as the cost of monorepo. Use `--workspace portal` for portal-only installs | Never truly "breaks" — just slow |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding a new `portal.app_access` RLS policy that conflicts with an existing one | Multiple permissive policies on the same table combine with OR logic — a new over-broad policy inadvertently grants access to all rows | Run Supabase's lint advisors (`lint=0006_multiple_permissive_policies`) after every migration. Review all policies on `portal.app_access` together as a set, not individually |
| Shared `packages/ui` components that accept `dangerouslySetInnerHTML` without sanitization | XSS across all 4 apps simultaneously if one shared component is vulnerable | Never add `dangerouslySetInnerHTML` to shared components. Mark it as a banned pattern in the shared ESLint config (`no-danger` rule in `eslint-config-next`) |
| Workspace-level `.env` file committed to git | All 4 apps' Supabase keys, API tokens, and secrets exposed in one file | Workspace root `.env.example` only. Each app's `.env.local` stays in `.gitignore`. Never add a workspace-root `.env` to git |
| The `check_app_access` bootstrap fallback (`return { hasAccess: true, role: 'admin' }` when the function is missing) | All users get admin access if the portal schema is misconfigured | The fallback exists for local development only. Remove it or gate it behind `NODE_ENV === 'development'` before any production migration. Currently exists in all 3 downstream `check-access.ts` files — must be audited in the governance phase |
| Granting `SELECT` on `portal.profiles` to `anon` role | Public visibility of user emails and display names | The current RLS only allows authenticated users to read their own profile. Do not add `anon` grants when extending profiles for cross-app lookups |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Deploying all 4 apps simultaneously when a shared component changes | If the component has a bug, all 4 apps break at once; users have no fallback | Deploy portal first, validate, then deploy downstream apps one at a time in order of criticality |
| Removing the `check_app_access` bootstrap fallback without a staged rollout | If the portal schema migration fails silently, all downstream app users are locked out immediately | Test the RPC response from each downstream app before removing the fallback. Keep a deployment runbook: (1) deploy migration, (2) verify RPC, (3) remove fallback per app |
| Dashboard app switcher showing all apps even when `portal.apps.url` is null | User clicks "Open" on WildTrack and goes to a blank URL | Gate the "Open" button on `url !== null`. Existing cards should already do this — verify during the status indicator migration |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Workspace setup:** Workspace `package.json` exists and `npm install` runs — but have all 4 Vercel projects been updated to use the monorepo root as their build root? Verify each Vercel project's Root Directory setting.
- [ ] **Shared tsconfig:** `tsconfig.base.json` exists and each app `extends` it — but does `tsc --noEmit` still pass in all 4 apps individually? Run typecheck per-app, not just at the workspace root.
- [ ] **Centralized migrations:** Migration files moved to `portal/supabase/migrations/` — but has `supabase db push` been run and verified against the actual remote schema? The local migration file existing does not mean it has been applied.
- [ ] **Cross-app check script:** `db-check.cjs` exists — but is it wired to a pre-commit hook or CI step? A script that is not automatically invoked provides no protection.
- [ ] **`packages/ui` shared:** Components export from `packages/ui` — but does each consuming app pass `npm run typecheck` after the workspace link? TypeScript path resolution issues only surface when the consuming app's `tsc` runs.
- [ ] **`packages/portal-client`:** Package exports `checkAppAccess` — but have the 3 downstream apps' existing `src/lib/check-access.ts` copies been removed? If both exist, the app may use the old copy silently.
- [ ] **RLS audit:** Policies have been reviewed — but have they been tested with a real non-admin user session? RLS is easy to verify as admin (bypasses RLS) but the test must be as a plain authenticated user.
- [ ] **CLAUDE.md in all repos:** Files exist — but have they been read by an AI agent in each repo to confirm the paths referenced (global rules file) still exist at the stated locations?

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Migration history mismatch between repos | HIGH | 1. Do not run any more `db push` commands. 2. Run `supabase db remote commit` from the portal to regenerate migration history from the live schema. 3. Delete stale migration entries from `supabase_migrations.schema_migrations` via Supabase SQL editor (one-time manual fix). 4. Establish the "portal owns push" rule immediately. |
| `check_app_access()` signature changed — downstream apps broken | HIGH | 1. Deploy a new `check_app_access_v2()` function with the old signature immediately. 2. Update downstream apps to call `check_app_access_v2` (or revert the migration). 3. Do not drop the old function until all apps are updated and deployed. |
| `on_auth_user_created` trigger fails — signups broken | CRITICAL | 1. Immediately patch the trigger function to remove the failing operation. 2. `CREATE OR REPLACE FUNCTION portal.handle_new_user()` with the fix — this applies instantly, no migration file needed for an emergency fix (but add to migration file after). 3. Test a new signup immediately after the patch. 4. Manually create profiles for any users who signed up during the outage. |
| Workspace symlinks break Vercel build for one app | MEDIUM | 1. Check Vercel project's Root Directory setting — should be monorepo root, not app folder. 2. Add `"transpilePackages": ["@trackline/ui"]` to the app's `next.config.ts`. 3. Verify the workspace symlink exists locally with `ls -la node_modules/@trackline`. |
| `packages/ui` breaking change locks out downstream app | LOW | 1. Revert the `packages/ui` change. 2. Add a typecheck step to the CI that runs against all consuming apps before merging any `packages/ui` PR. 3. Re-introduce the change with a backwards-compatible prop addition first. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Multi-repo `db push` conflict | Phase 1: Migration governance — establish portal-only push rule, document in CONTRIBUTING.md | Each downstream app's `package.json` has no Supabase push script |
| Migration filename collision | Phase 1: Migration governance — adopt namespaced prefix scheme before centralizing | `ls supabase/migrations/` shows no duplicate numeric prefixes across app namespaces |
| `check_app_access()` signature broken | Phase 1: Migration governance — add to PROTECTED_SURFACES.md and implement `db-check.cjs` | CI blocks any PR touching the function; return shape test passes |
| `on_auth_user_created` trigger broken | Phase 1: Migration governance — document in PROTECTED_SURFACES.md; add `DEFAULT` rule | Manual signup test passes after any `portal.profiles` migration |
| Vercel workspace root misconfiguration | Phase 2: Monorepo workspace setup — update Vercel Root Directory for all 4 projects | All 4 Vercel builds succeed from the monorepo root; test build logs show no workspace resolution errors |
| `@/*` path alias collision | Phase 2: Monorepo workspace setup — define scoped aliases in packages before linking | `tsc --noEmit` passes in all 4 apps after workspace initialization |
| Shared component API coupling | Phase 3: Shared component library — portal-only consumer during development; downstream after stabilisation | `npm run typecheck` at workspace root runs against all apps and passes before any `packages/ui` PR merges |
| Bootstrap fallback `role: 'admin'` in production | Phase 1 or 2 — audit and gate behind `NODE_ENV !== 'production'` | Grep confirms fallback is absent from production builds of all 3 downstream apps |

---

## Sources

- Existing codebase audit: `portal/supabase/migrations/001_portal_app_access.sql`, `camera-trap-dashboard/src/lib/check-access.ts`, `fire-app/src/lib/check-access.ts`, `trap-monitor-dashboard/src/lib/check-access.ts`, all 4 `package.json` files, all 4 `tsconfig.json` files, `portal/ARCHITECTURE.md`
- Supabase migration conflicts: [Migration History Mismatch Discussion](https://github.com/orgs/supabase/discussions/40721), [Out-of-Order Migrations](https://www.answeroverflow.com/m/1390969498290487377), [Database Migrations | Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)
- Supabase RLS cross-schema: [Restricting Access on Auth, Storage, Realtime Schemas (April 2025)](https://github.com/orgs/supabase/discussions/34270), [RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- Vercel monorepo deployments: [Understanding Monorepos | Vercel Academy](https://vercel.com/academy/production-monorepos/understanding-monorepos), [Monorepos FAQ](https://vercel.com/docs/monorepos/monorepo-faq), [Deploy Both Apps | Vercel Academy](https://vercel.com/academy/production-monorepos/deploy-both-apps)
- npm workspace hoisting and build issues: [npm Workspaces Monorepo Guide](https://earthly.dev/blog/npm-workspaces-monorepo/), [Workspaces and Monorepos in Package Managers](https://nesbitt.io/2026/01/18/workspaces-and-monorepos-in-package-managers.html)
- TypeScript path alias collisions: [TypeScript paths in monorepo — Turborepo Discussion](https://github.com/vercel/turborepo/discussions/620), [Managing TypeScript Packages in Monorepos | Nx Blog](https://nx.dev/blog/managing-ts-packages-in-monorepos)
- Shared component coupling: [Monorepo Architecture 2025](https://feature-sliced.design/blog/frontend-monorepo-explained), [Decoupling Dependencies in Monorepos](https://www.zocdoc.com/techblog/monorepo-magic-escaping-version-hell-by-decoupling-dependencies/)

---

*Pitfalls research for: Trackline Portal — v1.0 Unification milestone*
*Researched: 2026-03-29*
