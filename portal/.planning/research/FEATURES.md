# Feature Research

**Domain:** Multi-app conservation portal — monorepo governance, shared UI, centralized SQL management
**Researched:** 2026-03-29
**Confidence:** HIGH (core features verified against existing codebase + current sources)

---

## Context: What Already Exists

The following are confirmed built and working — they are NOT part of this milestone:

- Public landing page (hero, projects, about, approach, contact)
- Shared Supabase auth (signup / login / signout / session refresh)
- `portal.app_access` table with viewer / member / admin roles
- `portal.check_app_access()` RPC called by all 3 downstream apps
- `portal.profiles` table auto-created on signup
- Admin panel: grant / revoke / update role per user per app
- Dashboard app switcher (basic cards, role badge, external link)
- 2 portal migrations in `supabase/migrations/`

This milestone adds: monorepo workspace, shared component library, centralized SQL management, shared conventions.

---

## Feature Landscape

### Table Stakes (Users / Developers Expect These)

Features that any reasonable multi-app portal unification must include. Missing these = the goal of "one codebase to govern all" is not achieved.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Monorepo workspace root** | Without it, apps are disconnected silos — no shared deps, no shared scripts | MEDIUM | npm/pnpm workspaces at `LandManagment Website/` parent; each app stays as its own package. Existing repos do NOT move. |
| **Shared `tsconfig.base.json`** | Each app currently has its own tsconfig. Without a shared base, strictness drifts silently. | LOW | Root-level `tsconfig.base.json`; each app's `tsconfig.json` extends it. One canonical strict TypeScript setting for all 4 apps. |
| **Shared ESLint config package** | Without it, each app's linting rules diverge over time. Already a problem: 3 apps have eslint configs, 1 does not. | LOW | `packages/eslint-config/` workspace package; each app extends it. ESLint v9 flat config compatible. |
| **Shared component library** | Dashboard, portal, and potentially other apps share UI primitives (buttons, cards, badges, layout). Duplicating them causes divergence. | HIGH | `packages/ui/` workspace package. Key exports: Button, Card, Badge, Avatar, AppSwitcher. Must handle Tailwind v4 token inheritance — tokens are CSS-variable-based, not config-based. |
| **Centralized migration folder** | Portal already owns the shared schema (`portal.*`). Other apps have no migrations at all. Without a single location, schema history is scattered. | MEDIUM | All SQL lives in `portal/supabase/migrations/`. Other apps document their schema in `docs/schema/`. Migrations numbered sequentially (`001_`, `002_`, ...). |
| **Cross-app impact check tooling** | The `on_auth_user_created` trigger, `check_app_access()` RPC, and `portal.profiles` columns are called by all 3 downstream apps. A migration that silently breaks these is a production incident. | MEDIUM | A Node.js script (not an external tool) that parses new migration SQL and checks for prohibited patterns: `DROP TABLE portal.*`, `ALTER TABLE portal.profiles DROP COLUMN`, changes to `check_app_access` signature. Runs as a pre-commit hook or `npm run db:check`. |
| **Schema documentation for all apps** | WildTrack has `public.organisations`, `public.org_members`, etc. Fire has `public.organization`, `public.user_project`. Trap Monitor has its own tables. None of this is documented in the portal. | MEDIUM | Markdown files in `portal/docs/schema/` — one per app. Generated from `supabase gen types` output + manual annotation. Not auto-generated infrastructure — just maintained docs. |
| **`CLAUDE.md` in all 4 repos** | Portal already has one. WildTrack and Fire App have one. Trap Monitor does not. Without it, AI agents in each repo don't know the shared conventions. | LOW | Template-based. Each repo gets a CLAUDE.md that references the global rules and the project-specific stack/constraints. |
| **GSD installed in all 4 repos** | Portal already uses GSD. For the convention to propagate, all 4 repos need `.planning/` initialized. | LOW | `gsd init` equivalent per repo. Portal can document the standard. No code dependency. |

### Differentiators (Competitive Advantage)

Features that make this unification meaningfully better than "just symlink some files."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Migration safety script with cross-app manifest** | Most shared-DB projects just hope nobody breaks the shared schema. A manifest file listing all protected RPCs / columns makes the check automatable and reviewable. | MEDIUM | `portal/supabase/PROTECTED_SURFACES.md` + a companion `db-check.cjs` script. The manifest is human-readable and version-controlled. Any new migration runs through the check before merge. |
| **Design token propagation via CSS variables** | Tailwind v4 uses CSS `@theme` — tokens are CSS custom properties, not JS objects. A shared token file (`packages/ui/tokens.css`) can be imported into each app's `globals.css`, giving all apps identical color, spacing, and typography primitives without a build step. | MEDIUM | No build pipeline needed. Each app does `@import "../../../packages/ui/tokens.css"` in globals.css. Works with Tailwind v4's CSS-based config. |
| **App status indicators on dashboard** | Currently dashboard cards link out unconditionally. Adding a per-app `status` field to `portal.apps` (active / maintenance / down) lets the portal surface outages without code changes in downstream apps. | LOW | One `ALTER TABLE portal.apps ADD COLUMN status text DEFAULT 'active'` migration. Dashboard reads it. No RPC change. Cross-app safe. |
| **Shared `check-access.ts` utility as workspace package** | Currently each app must copy `docs/DASHBOARD_INTEGRATION.md` and hand-write the check. A workspace package (`packages/portal-client`) exports the typed `checkAppAccess()` function, removing the copy-paste pattern. | MEDIUM | `packages/portal-client/` — single file, zero runtime dependencies beyond `@supabase/supabase-js`. All 3 downstream apps depend on it via `workspace:*`. |
| **Unified `db:types` script via workspace root** | Fire App already has `supabase gen types typescript` in its package.json. WildTrack and Trap Monitor don't. A root-level `npm run db:types` generates types for all apps in one command. | LOW | Root `package.json` script that runs `supabase gen types` for each app package. Requires each app's `SUPABASE_PROJECT_ID` in env. Single source of truth for generated types. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Turborepo / Nx build orchestration** | "Monorepos need a build tool" — sounds professional, seen everywhere | Apps deploy independently to Vercel. Turborepo adds significant config, a new mental model, and build caching that only pays off when you're running full builds frequently. The apps are Next.js — Vercel already caches builds. Total overhead > benefit at this scale. | Plain npm/pnpm workspaces. Use `--workspace` flag for targeted installs. Add Turborepo only if build times become a genuine pain point after unification. |
| **Merging apps into a monolith** | "One deployment is simpler" | The apps have deeply divergent dependencies (MapLibre, Turf.js, web-push, shadcn vs raw Radix). Merging them risks dependency conflicts, bundle size explosion, and defeats the independent-deployment requirement stated in PROJECT.md. | Keep 4 separate Vercel deployments. Monorepo workspace gives shared code without shared runtime. |
| **Custom migration runner (replacing Supabase CLI)** | "We need more control" | Supabase CLI already handles migration ordering, remote apply, and type generation. A custom runner would need to replicate this. The cross-app check is an additive script ON TOP of Supabase CLI, not a replacement for it. | `supabase db push` with a pre-flight safety script. Don't replace the tool — augment it. |
| **Automated RLS policy generation from code** | "AI can write RLS for us" | RLS policies are security-critical. Auto-generated policies have a history of being overly permissive or missing edge cases (e.g., `WITH CHECK` clauses). The audit deliverable is documentation + manual review, not automation. | Write an RLS audit checklist (PITFALLS.md territory). Review manually. Document current policies. Fix gaps explicitly. |
| **Per-app Supabase projects for isolation** | "Shared DB is risky" | Supabase free tier allows 2 active projects. We have 4 apps. Splitting would cost ~$100/month on Pro tier. The current schema-level isolation with RLS is the right architecture for the budget constraint. | Keep shared project. Enforce isolation via schemas, RLS, and the cross-app manifest. |
| **Version-pinning shared component library with changelog** | "We need semver for `packages/ui`" | At this scale (1 team, 4 apps, private monorepo) semver adds release ceremony with zero user-facing benefit. All apps in the workspace consume `workspace:*` — they always get the latest. | Use workspace protocol (`workspace:*`). Breaking changes are caught by TypeScript at the consuming app boundary. If it compiles, it works. |

---

## Feature Dependencies

```
[Monorepo workspace root]
    └──enables──> [Shared tsconfig.base.json]
    └──enables──> [Shared ESLint config package]
    └──enables──> [Shared component library (packages/ui)]
    └──enables──> [Shared portal-client package]
    └──enables──> [Root-level db:types script]

[Shared component library]
    └──requires──> [Design token propagation via CSS variables]
        (tokens must exist before components can reference them)

[Centralized migration folder]
    └──enables──> [Cross-app impact check script]
    └──enables──> [Schema documentation]

[Cross-app impact check script]
    └──requires──> [Migration safety manifest (PROTECTED_SURFACES.md)]

[App status indicators]
    └──requires──> [Centralized migration folder]
        (adds a column via migration — must be tracked in the central folder)

[CLAUDE.md in all 4 repos]
    └──independent (no technical dependency, pure convention)

[GSD installed in all 4 repos]
    └──independent (no technical dependency)
```

### Dependency Notes

- **Monorepo workspace requires coordination before anything else:** npm workspaces must exist at the parent directory before any `workspace:*` package reference works. This is Phase 1.
- **Component library requires tokens first:** If `packages/ui` imports token CSS variables that don't exist yet in the consuming app, all styles break. Tokens must be extracted and validated in apps before components reference them.
- **Migration folder must precede the safety script:** The check script reads from a specific migrations path. Centralizing migrations is a prerequisite.
- **App status column is low-risk but must go through the central migration folder:** Even a one-line `ADD COLUMN` must be tracked sequentially.

---

## MVP Definition

This is a subsequent milestone on a working system, so "MVP" means: minimum additions to achieve the stated unification goal.

### Launch With (v1 — this milestone)

- [ ] **Monorepo workspace root** — the structural foundation everything else requires
- [ ] **Shared `tsconfig.base.json` + ESLint config** — lowest effort, immediate value, catches drift
- [ ] **`CLAUDE.md` in all 4 repos** — installs shared coding conventions; no code risk
- [ ] **Centralized migration folder** — move the existing 2 portal migrations; document the policy
- [ ] **Cross-app impact check script** — protects the 3 surfaces that break all downstream apps
- [ ] **Schema documentation (all apps)** — markdown in `portal/docs/schema/`; no code change required
- [ ] **Shared design token CSS** — extract `globals.css` tokens into `packages/ui/tokens.css`
- [ ] **Shared component library (core primitives)** — Button, Card, Badge only; not full component parity
- [ ] **`packages/portal-client` with `checkAppAccess`** — eliminates copy-paste in 3 downstream apps

### Add After Validation (v1.x)

- [ ] **App status indicators** — small migration + UI update; add once workspace is stable
- [ ] **Root-level `db:types` script** — convenience; add after workspace tooling is confirmed working
- [ ] **GSD installed in all 4 repos** — useful but not blocking; add once conventions are stable
- [ ] **Dashboard app switcher upgrade** — last-mile UX polish; functional version already exists

### Future Consideration (v2+)

- [ ] **Turborepo** — only if cold build times on CI become painful (unlikely at this scale)
- [ ] **Full shadcn component parity across apps** — WildTrack and Fire App use shadcn; harmonizing would be large effort for uncertain gain
- [ ] **Automated RLS policy generation** — out of scope; keep manual + documented

---

## Feature Prioritization Matrix

| Feature | Developer Value | Implementation Cost | Priority |
|---------|----------------|---------------------|----------|
| Monorepo workspace root | HIGH | MEDIUM | P1 |
| Shared tsconfig + ESLint | HIGH | LOW | P1 |
| CLAUDE.md in all 4 repos | HIGH | LOW | P1 |
| Centralized migration folder | HIGH | LOW | P1 |
| Cross-app impact check script | HIGH | MEDIUM | P1 |
| Schema documentation | MEDIUM | MEDIUM | P1 |
| Shared design token CSS | HIGH | LOW | P1 |
| Shared component library (core) | MEDIUM | HIGH | P1 |
| `packages/portal-client` | MEDIUM | LOW | P1 |
| App status indicators | LOW | LOW | P2 |
| Root-level `db:types` script | LOW | LOW | P2 |
| GSD in all 4 repos | MEDIUM | LOW | P2 |
| Dashboard app switcher upgrade | LOW | MEDIUM | P2 |
| Full component harmonization | LOW | HIGH | P3 |
| Turborepo | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone to deliver its stated goal
- P2: Should have, add when core is stable
- P3: Nice to have, future consideration

---

## Observations from Codebase Audit

These are factual findings from reading the 4 repos — relevant to feature feasibility:

**Dependency divergence is real:**
- Portal: raw Tailwind v4, no shadcn, no Radix
- WildTrack: shadcn + Radix + Tailwind v4
- Fire App: shadcn + Radix + Tailwind v4
- Trap Monitor: raw Tailwind v4, no shadcn

A shared component library that works across all 4 must export unstyled or Tailwind-class-based components, not shadcn wrappers. shadcn components from WildTrack/Fire App cannot be re-exported into Portal or Trap Monitor without shadcn being installed there too.

**Testing infrastructure diverges:**
- Portal: no tests
- WildTrack: no tests (vitest not in package.json)
- Fire App: vitest + testing-library (full setup)
- Trap Monitor: vitest + testing-library (full setup)

A shared `packages/eslint-config` will need a variant that handles test files (vitest globals) and one that doesn't.

**Migration management gap is significant:**
- Only portal has `supabase/migrations/` (2 files)
- WildTrack, Fire App, Trap Monitor have no migration files at all
- This means their schemas were applied manually or via Supabase dashboard
- Schema documentation for downstream apps requires reading Supabase dashboard directly or using `supabase db dump`

**Tailwind token architecture is consistent (good news):**
- All 4 apps use Tailwind v4 with CSS-based config
- Tokens can genuinely be shared as a CSS import — no JS config to reconcile

---

## Sources

- Existing codebase read: `portal/package.json`, `camera-trap-dashboard/package.json`, `fire-app/package.json`, `trap-monitor-dashboard/package.json`, `portal/ARCHITECTURE.md`, `camera-trap-dashboard/ARCHITECTURE.md`, `portal/supabase/migrations/001_portal_app_access.sql`, `portal/docs/DASHBOARD_INTEGRATION.md`, `portal/src/app/(protected)/dashboard/page.tsx`, `portal/src/app/(protected)/dashboard/admin/admin-panel.tsx`
- Monorepo workspace patterns: [Getting Started with Monorepos 2025](https://toxigon.com/mastering-monorepos-organizing-component-nextjs-libraries-and-projects-with-npm-workspaces), [Complete Monorepo Guide: pnpm + Workspace](https://jsdev.space/complete-monorepo-guide/)
- Shared TypeScript/ESLint config: [Sharing Configurations Within a Monorepo](https://dev.to/mbarzeev/sharing-configurations-within-a-monorepo-42bn), [ESLint in a Monorepo](https://gregory-gerard.dev/articles/eslint-in-a-monorepo)
- Supabase migration management: [Database Migrations | Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations), [Local Development with Schema Migrations](https://supabase.com/docs/guides/local-development/overview)
- Migration safety tooling: [Atlas pre-flight validation](https://atlasgo.io/), [pgroll zero-downtime migrations](https://github.com/xataio/pgroll)
- RLS audit: [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Developer portal patterns: [What is a developer portal? 2025](https://getdx.com/blog/developer-portals/)

---

*Feature research for: Trackline Portal — v1.0 Unification milestone*
*Researched: 2026-03-29*
