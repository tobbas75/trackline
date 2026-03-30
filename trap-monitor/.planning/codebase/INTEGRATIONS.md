# External Integrations

**Analysis Date:** 2026-03-23

## Supabase (Database + Auth + Edge Functions)

**Project:** `landmanager` (shared with WildTrack, Fire App)
**Project ID:** `kwmtzwglbaystskubgyt`

### Database (PostgreSQL)

**Client Config:**
- Browser: `frontend/src/lib/supabase/client.ts` — `createBrowserClient()`
- Server: `frontend/src/lib/supabase/server.ts` — `createServerClient()` with cookie handling
- Edge: `backend/supabase/functions/ingest-sms/index.ts` — `createClient()` with service role

**Tables Owned by Trap Monitor:**
- `units` — Current trap state (location, battery, firmware, armed status)
- `events` — Event history (TRAP, HEALTH, ALERT types)
- `commands` — SMS command log
- `notifications` — Push notification delivery tracking
- `push_subscriptions` — Web Push subscriptions per user/org
- `notification_preferences` — User notification settings per org

**Shared Tables (read-only):**
- `organisations` — owned by WildTrack (FK from `units.org_id`)
- `org_members` — owned by WildTrack (queried by `trap_can_*` functions)
- `portal.app_access` — access gating via `check_app_access('trap_monitor')`

**Realtime:** Published on `events`, `units`, `notifications` tables

### Authentication

- Supabase Auth (email/password, OAuth, SSO)
- Middleware: `frontend/src/middleware.ts`
- Auth routes: `/auth/callback`, `/auth/signout`
- RLS enforced on all tables
- Helper functions: `trap_can_view_org()`, `trap_can_edit_org()`, `trap_can_admin_org()`

### Edge Functions

- **`ingest-sms`** — Parses incoming SMS webhooks, upserts unit state, inserts events
- Deploy: `npx supabase functions deploy ingest-sms`
- Uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Telstra Messaging API

**File:** `frontend/src/app/api/command/route.ts`
**Endpoint:** `https://messages.telstra.com/v2/messages/sms`
**Method:** POST with Bearer token
**Purpose:** Send SMS commands to trap units

**Env vars:**
- `TELSTRA_API_TOKEN` (required)
- `TELSTRA_CLIENT_ID` (optional)
- `TELSTRA_CLIENT_SECRET` (optional)

## SMS Webhooks (Telstra + Twilio)

**Handler:** `backend/supabase/functions/ingest-sms/index.ts`
**URL:** `https://[project].supabase.co/functions/v1/ingest-sms`
**Content Types:** `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`

**Provider field mapping:**
- Telstra: `text`, `from`
- Twilio: `Body`, `From`

**SMS formats parsed:**
```
TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42
TRAP #UNIT_001 | CAUGHT | 14/03/26 06:42 | GPS -12.4567,130.8901
HEALTH #UNIT_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY
ALERT #UNIT_001 | LOW BATT 19% | Solar:FAULT | 14/03/26 14:22
```

## Web Push Notifications

**Files:**
- `frontend/src/lib/push.ts` — subscription management
- `frontend/src/app/api/push/notify/route.ts` — send notifications
- `frontend/src/app/api/push/subscribe/route.ts` — store/remove subscriptions
- `frontend/public/sw.js` — service worker

**Env vars:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public)
- `VAPID_PRIVATE_KEY` (server-side)
- `VAPID_EMAIL` (contact email)
- Generate: `npx web-push generate-vapid-keys`

**Trigger:** `/api/push/notify` called by Supabase webhook or `ingest-sms` edge function
**Auth:** Optional `SUPABASE_WEBHOOK_SECRET` header

## OpenStreetMap / Leaflet

**Files:** `frontend/src/components/map/MapView.tsx`, `MiniMap.tsx`
**Tile URL:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
**Library:** Leaflet v1.9.4 (CDN)
**No API key required**

## Deployment

### Vercel (Frontend)
- Auto-deploys on push to `main`
- Config: `vercel.json` — `{ buildCommand: "npm run build", framework: "nextjs" }`
- Hobby plan — single author commits only (no `Co-Authored-By`)

### Supabase (Backend)
- Link: `npx supabase link --project-ref kwmtzwglbaystskubgyt`
- Migrate: `npx supabase db push`
- Deploy: `npx supabase functions deploy <name>`

## API Routes

All in `frontend/src/app/api/`:

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/command` | POST | Service role | Send SMS command via Telstra |
| `/api/orgs` | GET | Authenticated | List user's organizations |
| `/api/orgs` | POST | Authenticated | Create new organization |
| `/api/orgs/[orgId]` | DELETE | Authenticated (owner) | Delete organization |
| `/api/orgs/[orgId]/units` | GET | Authenticated | List units in org |
| `/api/orgs/[orgId]/units` | POST | Authenticated | Create new unit |
| `/api/orgs/[orgId]/units/[unitId]` | DELETE | Authenticated | Delete unit |
| `/api/notifications` | GET | Authenticated | Fetch notifications |
| `/api/notifications` | PATCH | Authenticated | Mark as read |
| `/api/notifications/preferences` | GET/PUT | Authenticated | Notification preferences |
| `/api/push/notify` | POST | Webhook secret | Send push notifications |
| `/api/push/subscribe` | POST/DELETE | Authenticated | Manage push subscriptions |

## Environment Variables

| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Private server key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | For push | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server | For push | Web Push private key |
| `VAPID_EMAIL` | Server | For push | Push service contact |
| `TELSTRA_API_TOKEN` | Server | Yes | Telstra SMS bearer token |
| `TELSTRA_CLIENT_ID` | Server | No | Telstra client ID |
| `TELSTRA_CLIENT_SECRET` | Server | No | Telstra client secret |
| `DEFAULT_CMD_PIN` | Server | No | Command PIN (default: 0000) |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | App base URL |
| `SUPABASE_WEBHOOK_SECRET` | Server | No | Webhook auth (optional) |
| `DEVICE_TIMEZONE` | Edge | No | SMS timestamp parsing (default: Australia/Sydney) |

---

*Integration analysis: 2026-03-23*
