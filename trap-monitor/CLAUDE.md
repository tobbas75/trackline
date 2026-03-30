# Project AI Instructions — Trap Monitor

This file defines project-specific development rules for all AI agents (Claude Code, GitHub Copilot).

Global behaviour rules come from:

`C:\Users\tobyw\OneDrive\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

Copilot-specific instructions are in `.github/copilot-instructions.md`. Keep both files aligned.


# Supabase Project

**Shared Project:** `landmanager`

Trap Monitor, WildTrack, Fire App, and other Trackline projects all share the **same Supabase project** (`landmanager`). When linking locally or deploying:

```bash
npx supabase link --project-ref kwmtzwglbaystskubgyt
```

Project ID: `kwmtzwglbaystskubgyt`
Organization: `elbiiiwqqswnjmdmyfcg`

---

# Critical Security Rules
These are non-negotiable. Global rules at the path above have full detail.

Never:
- hardcode API keys, tokens, or secrets
- commit `.env`, `.env.local`, or credential files
- expose tokens to client-side code
- run destructive commands (`rm -rf`, `git reset --hard`, `DROP TABLE`) without explicit approval
- call external APIs over HTTP — HTTPS only
- concatenate user input into SQL queries or shell commands

If a secret appears in code, stop and warn the user immediately.

# Confidence Calibration — Non-Negotiable

This project includes hardware, firmware, and PCB design. Overconfident AI language has directly caused mistakes (wrong BOM parts, unverified specs treated as fact).

Agents must:
- **Never state component specs, part numbers, pinouts, or voltages as fact** unless verified from a datasheet this session
- **Never present suggestions as settled decisions** — say "I'd suggest" or "one option", not "we should" or "the correct approach is"
- **Distinguish confirmed decisions from things merely discussed** when summarising
- **Say what you checked and what you didn't** when reviewing hardware docs, BOMs, or schematics
- **Prefix with confidence level** when stakes are high (hardware, cost, security)

If you are unsure, say so. Being wrong and confident is worse than being wrong and honest.

# Expectations

Agents must:

- read relevant files before editing
- follow existing architecture
- make the smallest safe change
- scan impact before modifying shared code
- verify behaviour before completion

# Code Behaviour

Prefer:

- editing existing files
- reusing existing helpers
- preserving interfaces

Avoid:

- unrelated refactors
- speculative abstractions
- bypassing validation or architecture layers

# Required Reads

Before making significant changes, AI agents should read:

- `ARCHITECTURE.md` — system structure and layer boundaries
- `DOMAIN_RULES.md` — business invariants, SMS formats, state machine rules
- `REPO_MAP.md` — folder layout and sensitive areas

# Project-Specific Rules

## Firmware (C++ / PlatformIO)
- All tunable parameters go in `firmware/src/config.h` — never scatter magic numbers
- New modem drivers must implement `IModem.h` interface and register in `ModemFactory.h`
- SMS messages must stay within 160-char limit
- Deep sleep is the default state — minimize wake time for battery life
- Use LittleFS for persistent storage — never use SPIFFS

## Backend (Supabase / Deno)
- Edge Functions run on Deno — use Deno-compatible imports
- All database access uses Supabase service role key (server-side only)
- RLS policies are enforced — new tables must have RLS enabled
- SMS parsing must handle multiple telco webhook formats (Telstra, Twilio)

## Frontend (Next.js / React)
- Next.js App Router — not Pages Router
- Tailwind CSS for all styling — no CSS modules or styled-components
- Supabase JS client for data access and realtime subscriptions
- Leaflet.js for mapping — no Google Maps dependency
- All API calls to external services go through `/api/` routes — never from client

## Cross-Cutting
- All monetary/measurement values use appropriate precision (no floating point for critical values)
- Environment variables for all secrets — loaded via `.env.local` (gitignored)
- TypeScript strict mode in frontend and backend

# Shared Database Rules — CRITICAL

All Trackline apps share **one Supabase project**. Trap Monitor depends on shared tables owned by other projects. Careless changes here can break WildTrack, and changes in WildTrack can break Trap Monitor.

## Trap Monitor Owns (this project may CREATE, ALTER, DROP)

- **Tables:** `units`, `events`, `commands`, `notifications`
- **Functions:** `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()`, `get_user_orgs()`
- **All RLS policies** on units, events, commands, notifications

## Shared Tables — Trap Monitor READS but does NOT OWN

### `public.organisations` — owned by WildTrack
- `units.org_id` has a FK → `organisations(id) ON DELETE CASCADE`
- Trap Monitor reads `id`, `name`, `description`, `slug`, `created_at` columns
- Trap Monitor INSERTs into `organisations` when creating new orgs (via `/api/orgs` POST)
- **Never ALTER or DROP this table** — WildTrack owns the DDL
- **Never add columns** to this table from Trap Monitor migrations — request changes via WildTrack

### `public.org_members` — owned by WildTrack
- Trap Monitor's `trap_can_*` functions query this table for access checks
- Trap Monitor INSERTs into `org_members` when adding org owners (via `/api/orgs` POST)
- Trap Monitor reads `org_id`, `user_id`, `role` columns
- **Never ALTER this table** from Trap Monitor
- **Never CREATE or DROP RLS policies on `org_members`** from Trap Monitor — this caused breakage before (migration 005 hotfix)
- The `role` values `'owner'`, `'admin'`, `'member'`, `'viewer'` are defined by WildTrack — do not add new values

### `is_org_member()` / `is_org_admin()` — shared with WildTrack
- Both WildTrack and Trap Monitor have defined these functions
- **Never change the function signature** `(p_org_id uuid, p_user_id uuid) → boolean`
- Use `CREATE OR REPLACE` if updating — never `DROP FUNCTION` then `CREATE`
- Ensure logic remains: simple EXISTS check on `org_members` table

## Portal Schema — READ ONLY from this project

- `portal.app_access` — Trap Monitor calls `check_app_access('trap_monitor')` for access gating
- `portal.check_app_access()` — consumed via RPC
- **Never CREATE, ALTER, or DROP anything in the `portal` schema** from this project

## Never Touch from This Project

- `public.organization` (singular) — owned by Fire App
- `public.user_project` — owned by Fire App
- `public.projects` — owned by WildTrack
- `public.project_members` — owned by WildTrack
- WildTrack domain tables: `sites`, `species`, `observations`, `csv_uploads`, `column_mapping_templates`, `detection_histories`, `detection_history_rows`
- Fire App domain tables: `fire_scar`, `burn_plan`, `burn_execution`, `fire_season`, `sentinel_scene`, `vegetation_analysis`, etc.
- WildTrack enums: `org_type`, `org_role`, `project_role`, `upload_type`, `upload_status`
- Fire App enums: `user_role`, `burn_season`, `burn_plan_status`, `fire_scar_source`, etc.
- `create_organisation()`, `soft_delete_organisation()` — owned by WildTrack
- `can_org_edit()`, `project_org_id()` — owned by WildTrack

## Rules for Schema Changes

1. **Never ALTER `organisations` or `org_members`** — these are owned by WildTrack
2. **Never CREATE or DROP RLS policies on `org_members`** — coordinate with WildTrack. Past policy changes broke both apps.
3. **Never create tables or functions** that collide with WildTrack or Fire App names (see "Never Touch" lists above)
4. When writing new `trap_can_*` functions, always use `SECURITY DEFINER` and grant to `authenticated` only
5. All new tables must have RLS enabled
6. Trap Monitor's `units` table depends on `organisations` — if WildTrack changes that table, Trap Monitor breaks
7. The edge function `ingest-sms` uses `service_role` — never expose this key to the frontend

## Cross-App Impact Checklist

Before any migration change, verify:
- [ ] Does this modify `org_members` in any way? → STOP. Owned by WildTrack.
- [ ] Does this modify `organisations` in any way? → STOP. Owned by WildTrack.
- [ ] Does this redefine `is_org_member()` or `is_org_admin()`? → Ensure compatible with WildTrack's version
- [ ] Does this create new functions in `public` schema? → Check name collisions across all apps
- [ ] Does this change the `units` table FK to `organisations`? → Verify WildTrack hasn't changed that table

# Deployment

## Frontend — Vercel (Hobby Plan)

- **Auto-deploys** on push to `main` from the `frontend/` directory
- **Vercel project** is configured via the dashboard (not `vercel.json` rootDirectory)
- Push to `main` → Vercel builds → live at production URL

### Git Commit Rules for Deployment

- **Never include `Co-Authored-By` in commit messages** — Vercel Hobby plan treats it as a second collaborator and blocks the deployment with "no git user associated with the commit"
- Keep commits to a single author only
- **Git identity must be** `tobbas75 <toby.w.barton@gmail.com>` — Vercel matches commit author email to the GitHub account. If the email doesn't match, the deploy is blocked.

### Quick Deploy Workflow

```bash
git add <files>
git commit -m "feat: description of change"
git push origin main
```

Vercel picks it up automatically. No manual deploy step needed.

## Backend — Supabase

- Edge Functions: `npx supabase functions deploy <function-name>`
- Migrations: `npx supabase db push`
- Link first: `npx supabase link --project-ref kwmtzwglbaystskubgyt`

# Reporting

When work is complete provide:

- what changed
- why it changed
- files modified
- verification performed
- any risks or assumptions
