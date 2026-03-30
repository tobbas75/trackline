# Project Research Summary

**Project:** Trackline Portal — v1.0 Unification
**Domain:** Multi-app monorepo unification — 4 Next.js apps, shared Supabase, shared component library
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

The Trackline v1.0 Unification milestone takes four independently-developed Next.js 16 apps that already share a single Supabase project and converts them into a properly governed monorepo. The recommended approach is pnpm workspaces at the `LandManagment Website/` parent directory — no files move, no apps merge. Two shared packages are created (`@trackline/ui` for components and tokens, `@trackline/supabase-config` for Supabase client factories and the `checkAppAccess` utility) and consumed by each app via `transpilePackages` in `next.config.ts`, avoiding any build pipeline in the shared packages themselves. Shared TypeScript and ESLint config packages enforce consistent conventions across all four apps.

The recommended approach defers Turborepo and Nx — both add overhead that doesn't pay off until CI caching becomes a genuine pain point. The component library is intentionally minimal at first (Button, Card, Badge) and must not use shadcn wrappers because Portal and Trap Monitor have no shadcn dependency. Design tokens are shared as a CSS import (`packages/ui/tokens.css`) which works cleanly with Tailwind v4's CSS-first configuration. All four apps already use the same token architecture, making this straightforward.

The single largest risk in this milestone is the shared Supabase project. Three protected surfaces — `portal.check_app_access()`, `portal.profiles`, and the `on_auth_user_created` trigger — are called by all four apps and must never be modified carelessly. A migration governance framework (PROTECTED_SURFACES.md manifest + `db-check.cjs` pre-push script + portal-only `db push` rule) must be established before any other unification work begins. If this governance is skipped, a routine schema change can silently break new user signups across all four apps simultaneously — with no obvious error from the Supabase Auth layer.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, TypeScript strict, Tailwind v4, Supabase, Vercel) is validated and unchanged. This milestone adds pnpm v10 workspaces as the glue layer. The `pnpm catalogs` feature in pnpm 9.5+ allows all four apps to pin shared dependency versions (React 19, Supabase JS, Tailwind, TypeScript, lucide-react, clsx, tailwind-merge) in a single `pnpm-workspace.yaml` entry — eliminating version drift without any extra tooling. Vercel independent deployments from a monorepo are handled by setting each Vercel project's Root Directory to the monorepo root and providing a custom `installCommand` that navigates there; each app still deploys independently.

Tailwind v4 has one known monorepo rough edge: automatic content scanning does not cross package boundaries. Each app's `globals.css` must include `@source "../../packages/ui/src/**/*"` or Tailwind will purge shared component classes in production builds. This is the single most likely cause of "works in dev, broken in prod" for the component library.

**Core technologies:**
- `pnpm workspaces ^10.x`: Link 4 apps + shared packages — catalogs feature pins versions once for all packages
- `packages/@trackline/ui` (raw TSX, no build): Shared components + design tokens — `transpilePackages` in Next.js compiles it at the app level
- `packages/@trackline/supabase-config` (raw TSX, no build): Shared Supabase client factories and `checkAppAccess` — same transpile pattern
- `packages/tsconfig` + `packages/eslint-config`: Shared compiler and lint rules — single source of truth for strictness
- `supabase` CLI (portal-only): Migration push, type generation — portal is the sole migration authority

### Expected Features

The portal itself (landing page, auth, dashboard, admin panel) is complete and not being modified. This milestone is entirely developer-facing infrastructure.

**Must have (table stakes) — without these the unification goal is not achieved:**
- Monorepo workspace root (`pnpm-workspace.yaml` at `LandManagment Website/`) — structural foundation for everything
- Shared `tsconfig.base.json` + ESLint config — prevents silent TypeScript and lint divergence across apps
- Centralized migration folder (`portal/supabase/migrations/`) with namespaced prefixes per app — one `db push` to rule them all
- Cross-app impact check script (`db-check.cjs`) + `PROTECTED_SURFACES.md` manifest — the sole protection against breaking all four apps with one migration
- Schema documentation for all apps — reverse-engineer and document what WildTrack, Fire, and Trap Monitor have applied via the dashboard
- Shared design token CSS (`packages/ui/tokens.css`) — single brand token source before components reference them
- Shared component library core (Button, Card, Badge) — eliminates diverging duplicates across apps
- `packages/portal-client` with `checkAppAccess` — replaces 3 diverging hand-copied `check-access.ts` files

**Should have (differentiators):**
- App status indicators (`portal.apps.status` column) — surface outages on the dashboard without downstream app changes
- Root-level `db:types` script — one command to regenerate TypeScript types for all apps
- `CLAUDE.md` in all 4 repos + GSD initialized — propagates shared conventions to AI agents working in downstream apps

**Defer (v1.x after workspace is stable):**
- Dashboard app switcher UX upgrade — functional version exists; polish after workspace is confirmed
- Turborepo — only add if CI build times become a genuine pain point (unlikely at 4 apps)
- Full shadcn component parity across apps — large effort, uncertain gain, Portal and Trap Monitor don't use shadcn

### Architecture Approach

The workspace root (`LandManagment Website/`) becomes the monorepo root with a `pnpm-workspace.yaml` pointing to all four app directories and the new `packages/` folder. No existing files move. The portal remains the migration authority — its `supabase/migrations/` directory is the single canonical migration sequence for all four apps, with filenames namespaced by app (`portal_NNN_`, `wildtrack_NNN_`, `fire_NNN_`, `trap_NNN_`). The two shared packages ship raw TypeScript source; `transpilePackages` in each app's `next.config.ts` handles compilation. The only runtime contract between portal and satellite apps is `portal.check_app_access()` via Supabase RPC — no direct HTTP calls between apps.

**Major components:**
1. `pnpm-workspace.yaml` + root `package.json` — workspace glue; declares all packages; hosts shared devDeps
2. `packages/@trackline/ui` — shared React components (raw TSX) + `tokens.css`; consumed via `transpilePackages`
3. `packages/@trackline/supabase-config` — `checkAppAccess()`, client/server factories, shared AppId/AppRole types
4. `packages/tsconfig` + `packages/eslint-config` — compiler and lint convention packages
5. `portal/supabase/migrations/` — central migration store with namespace-prefixed filenames for all app schemas
6. `db-check.cjs` + `PROTECTED_SURFACES.md` — pre-push migration safety enforcement

### Critical Pitfalls

1. **Multiple repos pushing migrations to the same Supabase project** — creates irreconcilable migration history. Portal must be the ONLY repo that runs `supabase db push`. Establish this as Rule #1 before any workspace setup, documented in `CONTRIBUTING.md` with a blocking script in downstream app `package.json`.

2. **Migration filename collisions when centralizing** — each app independently used `001_`, `002_` sequential naming. Adopt the namespaced prefix scheme (`portal_001_`, `wildtrack_001_`, etc.) BEFORE copying any app migrations into the central folder.

3. **`portal.check_app_access()` return shape breakage** — all three satellite apps deserialize this RPC response. Changing a column name or adding a column silently returns `undefined` for expected fields, potentially locking out all users. Any change must be treated as a breaking API change; document and enforce in `PROTECTED_SURFACES.md`.

4. **`on_auth_user_created` trigger failure breaks all signups** — if any migration adds a NOT NULL column to `portal.profiles` without a DEFAULT value, the trigger fails silently and no user can sign up across any of the four apps. Rule: every `ALTER TABLE portal.profiles ADD COLUMN` must have a DEFAULT.

5. **Vercel build failure from workspace hoisting** — if a Vercel project's Root Directory is set to an app subdirectory (not the monorepo root), it cannot resolve workspace symlinks and builds fail with "Cannot find module @trackline/ui". Every Vercel project must be reconfigured to use the monorepo root as Root Directory during workspace setup.

---

## Implications for Roadmap

Based on combined research, the dependency graph is clear: migration governance must precede workspace setup, workspace setup must precede shared packages, and shared packages must precede downstream app consumption. The following four-phase structure is recommended.

### Phase 1: Migration Governance

**Rationale:** The shared Supabase project is the most dangerous surface in this milestone. Three protected surfaces (`check_app_access`, `portal.profiles`, `on_auth_user_created`) can each silently break all four apps. Governance tooling must exist before any workspace tooling is introduced — you cannot add safety rails after the train is moving.

**Delivers:** PROTECTED_SURFACES.md manifest, `db-check.cjs` pre-push validation script, namespaced migration filename scheme, `CONTRIBUTING.md` with portal-only push rule, schema documentation for all apps, `CLAUDE.md` in downstream repos.

**Addresses:** Table-stakes features: centralized migration folder, cross-app impact check, schema documentation, CLAUDE.md in all 4 repos.

**Avoids:** Multi-repo `db push` conflict (Pitfall 1), migration filename collision (Pitfall 2), `check_app_access()` breakage (Pitfall 3), trigger breakage (Pitfall 4).

**Research flag:** Standard patterns — well-documented, no phase-level research needed.

---

### Phase 2: Monorepo Workspace Setup

**Rationale:** Once migration governance is in place, the workspace root can be established. This is purely structural — creating `pnpm-workspace.yaml`, shared tsconfig/eslint packages, and updating Vercel project configurations. No shared runtime code yet; the risk here is configuration, not logic.

**Delivers:** `pnpm-workspace.yaml` at monorepo root, `packages/tsconfig`, `packages/eslint-config`, root `package.json` with workspace scripts, all 4 apps updated to extend shared configs, all 4 Vercel projects reconfigured with monorepo root as Root Directory.

**Uses:** pnpm v10 catalogs feature for version pinning, shared ESLint v9 flat config package pattern.

**Avoids:** Vercel workspace hoisting failure (Pitfall 5), `@/*` path alias collision (Pitfall 7), workspace install from app directory (Architecture Anti-Pattern 1).

**Research flag:** Standard patterns — pnpm workspace docs are HIGH confidence, Next.js `transpilePackages` is well-documented. No deep research needed.

---

### Phase 3: Shared Design Tokens and Component Library

**Rationale:** Tokens must be extracted and validated before any component references them. Start with Portal as the sole consumer; only extend to downstream apps after the API has been stable. The Tailwind v4 `@source` directive for cross-package scanning is a known rough edge that needs explicit verification in each app.

**Delivers:** `packages/@trackline/ui` with `tokens.css` and core components (Button, Card, Badge), each app's `globals.css` updated with `@import "@trackline/ui/tokens.css"` and `@source` directive, `transpilePackages` added to each `next.config.ts`, root-level typecheck CI command covering all workspace packages.

**Implements:** Architecture Pattern 2 (source-first shared components), Pattern 3 (CSS tokens via CSS import).

**Avoids:** Tailwind v4 production purge of shared component classes (critical — requires `@source` directive), shared component API coupling before API is stable (Pitfall 6), design token duplication and drift (Anti-Pattern 3).

**Research flag:** The Tailwind v4 `@source` cross-package behavior has MEDIUM confidence — verify with a test build in each app before declaring this phase complete.

---

### Phase 4: Shared Supabase Config and Portal Client

**Rationale:** The `checkAppAccess` utility exists as three diverging copies in the satellite apps. Centralizing it into `packages/@trackline/supabase-config` is the final unification step and should come after the workspace is proven stable. Replacing live code in three production apps carries the highest deployment risk of any phase.

**Delivers:** `packages/@trackline/supabase-config` (client/server factories, `checkAppAccess`, shared types), old `src/lib/check-access.ts` removed from all 3 satellite apps, bootstrap fallback (`return { hasAccess: true, role: 'admin' }`) gated behind `NODE_ENV !== 'production'` in all consuming apps, root-level `db:types` script.

**Implements:** Architecture Pattern 1 (workspace-protocol linking), Architecture boundary: Portal ↔ Satellite apps via RPC only.

**Avoids:** Bootstrap fallback security hole in production (Security Pitfall 4), stale `check-access.ts` copies coexisting with new package (Pitfall checklist item), `check_app_access()` type desync (Pitfall 3 — now enforced by shared TypeScript types).

**Research flag:** Standard patterns for the package structure; deployment sequencing (deploy migration first, verify RPC, then remove fallback per app) needs a written runbook before execution.

---

### Phase Ordering Rationale

- **Governance before structure:** Pitfalls 1–4 are all "governance" failures that can cause production incidents. Establishing rules and tooling before touching workspace config means there is never a window where the protection is absent.
- **Workspace structure before shared code:** `transpilePackages` and workspace symlinks must exist and be Vercel-verified before any `@trackline/*` import is added to an app. Adding the import before the workspace is wired breaks every app simultaneously.
- **Tokens before components:** Components reference token CSS variables. If the import is absent, components silently have no styles in production. This order enforces the dependency.
- **Portal-first for component library:** Portal is the owner of the shared packages. Validating that Portal builds, renders, and deploys correctly with the new shared packages before wiring in satellite apps reduces blast radius if something is wrong.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (deployment sequencing):** The rollout order for removing the bootstrap fallback across three independently-deployed apps needs a written runbook. The failure mode (all users locked out) is high-severity.

Phases with standard patterns (no phase research needed):
- **Phase 1:** Supabase migration docs are authoritative; the check script pattern is a custom Node.js script with no novel dependencies.
- **Phase 2:** pnpm workspace and Next.js `transpilePackages` are well-documented with HIGH-confidence sources.
- **Phase 3:** Well-understood — with the exception of the Tailwind v4 `@source` cross-package behavior which should be tested early in the phase rather than at the end.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | pnpm v10, Next.js transpilePackages, and ESLint v9 flat config are HIGH confidence from official docs. Tailwind v4 `@source` cross-package behavior is MEDIUM — known issue but exact behavior depends on package resolution path depth |
| Features | HIGH | Core features read directly from the existing codebase. Downstream app dependency audit was direct file reads. Feature dependencies verified against actual `package.json` files |
| Architecture | HIGH | Existing codebase read directly this session; patterns verified against pnpm and Next.js official docs. Vercel monorepo config is MEDIUM — community-confirmed, not fully documented in official Vercel docs |
| Pitfalls | HIGH | Pitfalls verified against actual codebase state + current Supabase and Vercel sources. The bootstrap fallback security issue was found by reading the actual downstream app source files |

**Overall confidence:** HIGH

### Gaps to Address

- **Tailwind v4 `@source` exact path syntax:** The `@source "../../packages/ui/src/**/*"` path is based on a verified GitHub issue but the exact relative path depends on each app's depth from the workspace root. Verify early in Phase 3 with a production build test before rolling to all 4 apps.

- **Downstream app schema reconstruction:** WildTrack, Fire App, and Trap Monitor have no migration files — their schemas were applied via the Supabase dashboard or `db push` from now-lost directories. Schema documentation in Phase 1 requires running `supabase db dump` against the live project and reverse-engineering what each app owns. The exact state of these schemas is unverified from code alone.

- **Vercel `installCommand` path depth:** The `cd ../..` in the Vercel `installCommand` example assumes a fixed directory depth. The actual apps live at varying depths (`portal/`, `Fire project system/fire-app/`, `Trap Monitor/frontend/`). Each app's `vercel.json` needs its path verified against the actual directory structure at workspace root setup time.

- **Windows symlink behavior with pnpm:** The pitfalls research flagged that some Windows tools do not follow symlinks correctly. The environment is Windows 11. pnpm hard-links rather than symlinks by default, which mitigates this — but this should be confirmed with a test install on the actual development machine before declaring Phase 2 complete.

---

## Sources

### Primary (HIGH confidence)
- pnpm.io/workspaces — workspace protocol, catalog feature
- nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages — transpilePackages
- supabase.com/docs/guides/deployment/database-migrations — migration management
- GitHub: tailwindlabs/tailwindcss #13136 — v4 @source cross-package requirement
- Existing codebase (all 4 repos read directly this session) — dependency audit, schema state, existing patterns

### Secondary (MEDIUM confidence)
- Vercel monorepo deployment docs — Root Directory + installCommand pattern
- pnpm blog 2025 — v10 feature summary
- Multiple community sources on ESLint v9 flat config shared packages
- WebSearch: Next.js transpilePackages shared component library without build step

### Tertiary (LOW confidence)
- WebSearch: Supabase CLI current version 2026 — version number needs re-verification at install time
- Community examples for Vercel + pnpm workspaces — exact `vercel.json` config, needs per-app path verification

---

*Research completed: 2026-03-29*
*Ready for roadmap: yes*
