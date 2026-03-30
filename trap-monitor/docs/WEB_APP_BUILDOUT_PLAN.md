# Web App Build-out Plan — Trap Monitor

Created: 2026-03-10

## Overview

Five phases to take the dashboard from functional prototype to field-ready application.
Each phase builds on the previous — do not skip.

```
Phase 0 (Seeder) → Phase 1 (Filters) → Phase 2 (Unit Detail) → Phase 3 (Notifications) → Phase 4 (Mobile)
```

---

## Phase 0 — Test Data Seeder

**Goal:** Generate realistic time-series data so every subsequent phase can be developed against a populated database.

### What It Does

A standalone Node.js script that seeds the database directly via Supabase REST API (service role key). No edge function required.

Generates:
- **8 units** with realistic names (e.g. "Ridge Track Alpha", "Creek Crossing Beta")
- **30 days of backdated events** per unit:
  - Daily HEALTH checks (battery draining 1-3%/day, solar OK/FAULT cycling)
  - Random TRAP CAUGHT events (2-5 per unit over 30 days)
  - LOW BATT alerts when battery drops below 20%
  - GPS positions clustered around configurable coordinates with slight drift
- **Commands** in the `commands` table (STATUS, GPS requests)
- Varied unit states: some caught (unacknowledged), some offline (old `last_seen`), some low battery, some disarmed

### Files

| Action | File |
|--------|------|
| Create | `tools/seed-test-data.js` |

### Config

Environment variables (or hardcoded for local dev):
- `SUPABASE_URL` — project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (never commit)
- `ORG_ID` — target organization ID

### Verification

- Run `node tools/seed-test-data.js`
- Open dashboard → units appear with varied statuses
- Map shows markers in different colors
- Event feed populated with 30 days of history

---

## Phase 1 — Dashboard Enhancements

**Goal:** Filter, search, and sort units. Add map legend.

### Changes

#### 1. Extract shared types → `frontend/src/lib/types.ts`

Move `Unit` and `TrapEvent` interfaces out of `dashboard/page.tsx`. Add:

```typescript
export type UnitStatus = 'caught' | 'offline' | 'lowbatt' | 'disarmed' | 'normal';

export function getUnitStatus(unit: Unit, events: TrapEvent[]): UnitStatus {
  const recentCaught = events.find(
    e => e.unit_id === unit.id && e.trap_caught && !e.acknowledged
  );
  if (recentCaught) return 'caught';
  if (!unit.last_seen || Date.now() - new Date(unit.last_seen).getTime() > 26 * 3600000)
    return 'offline';
  if ((unit.battery_pct ?? 100) <= 20) return 'lowbatt';
  if (unit.armed === false) return 'disarmed';
  return 'normal';
}
```

#### 2. Sidebar filter/search/sort → `dashboard/page.tsx`

New state:
- `statusFilter: UnitStatus | 'all'` — filter pills at top of sidebar
- `searchQuery: string` — text input matching unit name/ID
- `sortKey: 'last_seen' | 'battery_pct' | 'name'` — sort dropdown

Compute `filteredUnits` via `useMemo`:
1. Filter by status using `getUnitStatus()`
2. Filter by search (case-insensitive substring on `unit.name` and `unit.id`)
3. Sort by selected key

UI: filter pills with count badges, search input, sort dropdown — all above the unit list.

#### 3. Map legend → `MapView.tsx`

Positioned overlay (bottom-right corner) showing:
- 🔴 Red = Caught (pulsing)
- 🟢 Green = Normal
- ⚪ Gray = Offline (>26h)
- 🟡 Amber = Low Battery (<20%)
- 🟣 Purple = Disarmed

Collapsible via a small toggle.

### Files

| Action | File |
|--------|------|
| Create | `frontend/src/lib/types.ts` |
| Modify | `frontend/src/app/dashboard/page.tsx` |
| Modify | `frontend/src/components/map/MapView.tsx` |

### Dependencies

None — all client-side filtering on already-loaded data.

### Verification

- Each filter pill shows correct count and filters the list
- Search narrows results in real time
- Sort reorders the list
- Map legend visible, colors match markers

---

## Phase 2 — Unit Detail Page + Charts

**Goal:** Dedicated page per unit with event history, command log, battery chart, and focused map.

### New Route

`/dashboard/units/[unitId]` — client-side page that:
1. Fetches unit by ID + subscribes to realtime updates
2. Fetches paginated events (`triggered_at DESC`, 20 per page)
3. Fetches commands for this unit

### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Back to Dashboard    Unit Name    Status Badge│
├──────────────────────┬──────────────────────────┤
│                      │                          │
│   Mini Map (40%)     │  Battery Chart (60%)     │
│   Single marker      │  Line chart over time    │
│                      │  Reference lines at      │
│                      │  20% and 10%             │
├──────────────────────┴──────────────────────────┤
│  Stats Row: Battery | Solar | FW | Armed | GPS  │
├─────────────────────────────────────────────────┤
│  Event History Table (paginated)                │
│  Columns: Time | Type | Battery | Solar | GPS  │
│  + "Load more" button                          │
├─────────────────────────────────────────────────┤
│  Command History Table                          │
│  Columns: Time | Command | Response | Sent By  │
└─────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| `BatteryChart.tsx` | Recharts line chart — battery % over time with threshold lines |
| `MiniMap.tsx` | Single-marker Leaflet map, zoom 14-16 |
| `map-icons.ts` | Extracted shared icon definitions (used by MapView + MiniMap) |

### Navigation

- `UnitCard` in sidebar gets a "Details →" link to `/dashboard/units/${unit.id}`
- Detail page has "← Back to Dashboard" link

### Files

| Action | File |
|--------|------|
| Create | `frontend/src/app/dashboard/units/[unitId]/page.tsx` |
| Create | `frontend/src/components/charts/BatteryChart.tsx` |
| Create | `frontend/src/components/map/MiniMap.tsx` |
| Create | `frontend/src/components/map/map-icons.ts` |
| Modify | `frontend/src/app/dashboard/page.tsx` (add detail link) |
| Modify | `frontend/src/components/map/MapView.tsx` (use shared icons) |

### Dependencies

```
npm install recharts
```

Dynamic import with `ssr: false` (recharts uses browser APIs).

### Verification

- Click unit in sidebar → navigates to detail page
- Mini map shows correct marker position
- Battery chart renders with historical data from seeder
- Event table paginates correctly
- Command table shows sent commands
- Back link returns to dashboard
- Realtime updates reflect on detail page

---

## Phase 3 — Notifications

**Goal:** Alert operators when traps fire or units go offline. In-app bell + email.

### Database Changes — Migration `006_notification_preferences.sql`

```sql
-- Notification preferences per user per org
create table if not exists notification_preferences (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  org_id        uuid not null references organisations(id) on delete cascade,
  trap_catch    boolean default true,
  unit_offline  boolean default true,
  low_battery   boolean default true,
  email_enabled boolean default false,
  email_address text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, org_id)
);

alter table notification_preferences enable row level security;

create policy "Users manage own preferences"
  on notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Extend notifications table for in-app use
alter table notifications add column if not exists user_id uuid references auth.users(id);
alter table notifications add column if not exists read boolean default false;
alter table notifications add column if not exists read_at timestamptz;
alter table notifications add column if not exists title text;
alter table notifications add column if not exists body text;

-- Enable realtime on notifications
alter publication supabase_realtime add table notifications;
```

### Components

| Component | Purpose |
|-----------|---------|
| `NotificationBell.tsx` | Header bell icon with unread count, dropdown panel, mark-as-read |
| Notification settings page | Toggle switches for alert types + email config |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notifications` | GET | Unread notifications for current user |
| `/api/notifications` | PATCH | Mark notification(s) as read |
| `/api/notifications/preferences` | GET | User's preferences for current org |
| `/api/notifications/preferences` | PUT | Update preferences |

### Notification Triggers

1. **Trap caught** — `ingest-sms` inserts notification rows after TRAP event
2. **Low battery** — `ingest-sms` inserts notification rows after ALERT event
3. **Unit offline** — pg_cron job (hourly) checks for `last_seen > 26h`, deduplicates

### Files

| Action | File |
|--------|------|
| Create | `backend/supabase/migrations/006_notification_preferences.sql` |
| Create | `frontend/src/components/notifications/NotificationBell.tsx` |
| Create | `frontend/src/app/dashboard/settings/notifications/page.tsx` |
| Create | `frontend/src/app/api/notifications/route.ts` |
| Create | `frontend/src/app/api/notifications/preferences/route.ts` |
| Modify | `frontend/src/app/dashboard/page.tsx` (add bell to header) |
| Modify | `backend/supabase/functions/ingest-sms/index.ts` (trigger notifications) |

### Dependencies

Email service (Resend or similar) — configured via env vars. In-app notifications work without email.

### Verification

- Seed a TRAP CAUGHT event → bell shows unread count
- Click bell → dropdown shows notification
- Click notification → marks as read
- Settings page → toggle preferences
- Disable trap alerts → no notification on next trap event
- Email delivery (if configured)

---

## Phase 4 — Mobile Responsiveness

**Goal:** Make the dashboard usable on phones and tablets for field operators.

### Layout Strategy

- **Desktop (md+):** Current layout — fixed sidebar + map
- **Mobile (<md):** Full-screen map with slide-in sidebar overlay

### Changes

| Area | Desktop | Mobile |
|------|---------|--------|
| Sidebar | Fixed `w-80`, always visible | Hidden, slide-in overlay via hamburger |
| Map | `flex-1` alongside sidebar | Full screen, sidebar overlays |
| Header | Full badges + buttons | Compact, hamburger menu |
| Unit cards | Current size | Larger tap targets (min 44px) |
| Detail page | Side-by-side map + chart | Stacked vertically |

### CSS Additions

- Slide-in animation for sidebar (`transform: translateX`)
- Backdrop overlay (semi-transparent)
- Touch target sizing utilities

### Files

| Action | File |
|--------|------|
| Modify | `frontend/src/app/dashboard/page.tsx` (responsive layout, hamburger) |
| Modify | `frontend/src/components/map/MapView.tsx` (touch improvements) |
| Modify | `frontend/src/app/dashboard/units/[unitId]/page.tsx` (stack on mobile) |
| Modify | `frontend/src/components/notifications/NotificationBell.tsx` (mobile dropdown) |
| Modify | `frontend/src/app/globals.css` (animations) |

### Dependencies

None — Tailwind responsive utilities only.

### Verification

- Chrome DevTools at 375px: sidebar hidden, hamburger visible
- Tap hamburger: sidebar slides in
- Tap outside: sidebar closes
- Map fills viewport on mobile
- Detail page stacks vertically
- All buttons have adequate tap targets (44px minimum)

---

## Risk Notes

1. **Phase 3 migration** creates `notification_preferences` in `public` schema — no name collision with WildTrack/Fire App (verified)
2. **Recharts** adds ~200KB gzipped — mitigated by dynamic import on detail page only
3. **Offline detection** via hourly cron may produce one false-positive if unit comes back between checks — acceptable
4. **Email delivery** requires external service config — in-app notifications work independently
5. **Phase 4 must be done last** — it touches all UI files from earlier phases
