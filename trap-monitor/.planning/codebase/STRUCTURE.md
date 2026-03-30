# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
trap-monitor/
├── firmware/                   # ESP32-S3 firmware (C++ / PlatformIO)
│   ├── platformio.ini          # Build config + library dependencies
│   └── src/
│       ├── main.cpp            # State machine entry point
│       ├── config.h            # All tunable parameters + pin assignments
│       ├── messages.h          # SMS composition (TRAP, HEALTH, ALERT formats)
│       ├── commands.h          # Inbound SMS command parser (PIN + 9 commands)
│       ├── gps.h               # u-blox M10 NMEA parsing + movement detection
│       ├── power.h             # Battery ADC + solar charge sensing
│       ├── sensors.h           # GPIO + sensor initialization
│       ├── storage.h           # LittleFS config persistence + message queue
│       ├── leds.h              # LED status patterns (3 LEDs)
│       └── hal/                # Hardware Abstraction Layer
│           ├── IModem.h        # Interface (all modem drivers implement)
│           ├── ModemFactory.h  # Returns concrete driver based on config
│           └── modems/
│               ├── EG800Q.h    # Active: Quectel EG800Q-EU (LTE CAT-1bis, D2C)
│               ├── SIM7080G.h  # Legacy: NB-IoT/LTE-M (reference)
│               ├── BG95.h      # Stub: Quectel BG95
│               └── RedCap5G.h  # Stub: Future 5G RedCap
│
├── backend/                    # Supabase backend (Deno / TypeScript)
│   └── supabase/
│       ├── migrations/         # Database schema (SQL)
│       │   ├── 001_initial_schema.sql           # units, events, commands, notifications + RLS
│       │   ├── 002_organizations_and_multitenancy.sql  # org_id FK + trap_can_* functions
│       │   ├── 005_shared_db_org_members_hotfix.sql    # Hotfix for shared org_members policies
│       │   ├── 006_notification_preferences.sql        # User notification settings
│       │   ├── 007_field_check_sessions.sql            # Offline field check sessions
│       │   ├── 008_push_subscriptions.sql              # Web push notifications
│       │   └── README.md                               # Migration docs
│       └── functions/
│           └── ingest-sms/
│               └── index.ts    # Edge Function: webhook handler, SMS parser, DB insert
│
├── frontend/                   # Next.js dashboard (React / Tailwind / Leaflet)
│   ├── .env.example            # Required env vars (copy to .env.local)
│   ├── package.json            # Dependencies + scripts
│   ├── next.config.js          # Next.js config
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── tsconfig.json            # TypeScript config
│   ├── public/                  # Static assets
│   └── src/
│       ├── app/                # App Router (Next.js 14+)
│       │   ├── page.tsx        # Root page (redirects to /orgs or /dashboard)
│       │   ├── layout.tsx       # Root layout (auth middleware)
│       │   ├── globals.css      # Global Tailwind styles
│       │   ├── auth/            # Authentication routes
│       │   │   ├── callback/route.ts    # OAuth callback (Supabase Auth)
│       │   │   └── signout/route.ts     # Logout handler
│       │   ├── login/page.tsx   # Login form (magic link or OAuth)
│       │   ├── no-access/page.tsx       # 403 page (not in org)
│       │   ├── orgs/            # Organization management
│       │   │   ├── page.tsx     # List user's orgs
│       │   │   ├── new/page.tsx # Create new org + units
│       │   │   └── [orgId]/units/page.tsx  # List org's units
│       │   ├── dashboard/       # Main dashboard
│       │   │   ├── page.tsx     # Unit list + map view + event feed
│       │   │   ├── layout.tsx   # Dashboard layout (sidebar + nav)
│       │   │   ├── cards/page.tsx          # Card-based view (alternative layout)
│       │   │   ├── field-check/page.tsx    # Offline field check mode
│       │   │   ├── units/[unitId]/page.tsx # Unit detail page (events + commands)
│       │   │   └── settings/
│       │   │       └── notifications/page.tsx  # Notification preferences
│       │   └── api/             # Backend routes (nextjs handlers)
│       │       ├── command/route.ts       # POST send SMS command to device
│       │       ├── orgs/route.ts          # GET/POST organizations
│       │       ├── orgs/[orgId]/route.ts  # GET/PATCH org details
│       │       ├── orgs/[orgId]/units/route.ts         # GET/POST units in org
│       │       ├── orgs/[orgId]/units/[unitId]/route.ts # GET/PATCH unit details
│       │       ├── notifications/route.ts                # GET/POST notification settings
│       │       ├── notifications/preferences/route.ts    # User notification pref
│       │       └── push/
│       │           ├── subscribe/route.ts  # POST web push subscription
│       │           └── notify/route.ts     # POST send push notification
│       ├── lib/                # Shared utilities
│       │   ├── types.ts        # TypeScript interfaces (Unit, TrapEvent, UnitStatus)
│       │   ├── check-access.ts # RPC: check_app_access('trap_monitor')
│       │   ├── push.ts         # Web push notification helpers
│       │   └── supabase/
│       │       ├── client.ts   # Supabase JS client (browser)
│       │       └── server.ts   # Supabase server client (API routes)
│       ├── components/         # React components
│       │   ├── Navigation.tsx   # Top nav + org selector
│       │   ├── ContrastToggle.tsx  # Accessibility toggle
│       │   ├── map/
│       │   │   ├── MapView.tsx  # Leaflet map with trap markers + event popups
│       │   │   ├── MiniMap.tsx  # Compact map for unit detail
│       │   │   └── map-icons.ts # Marker icons by status
│       │   ├── charts/
│       │   │   └── BatteryChart.tsx  # Battery trend graph
│       │   └── notifications/
│       │       └── NotificationCenter.tsx  # Push notification UI
│       └── middleware.ts       # Supabase auth session refresh
│
├── tools/                      # Development utilities
│   └── simulate-sms.js         # Test SMS generator (POST to local Edge Function)
│
├── docs/                       # Documentation (not code)
│   └── [various architecture docs]
│
├── .vscode/                    # Editor config
│   ├── settings.json           # VSCode settings
│   ├── tasks.json              # Build/deploy tasks
│   └── launch.json             # Debug config
│
├── ARCHITECTURE.md             # System design overview
├── DOMAIN_RULES.md             # Business invariants + SMS spec
├── REPO_MAP.md                 # Quick file guide
├── CLAUDE.md                   # AI agent instructions + security rules
├── README.md                   # Project overview
└── package.json                # Root workspace (not used, each tier has own)
```

## Directory Purposes

**`firmware/src/`:**
- Purpose: Embedded device firmware entry point and modules
- Contains: State machine orchestration, modem drivers, message composition, GPS parsing, power management, command parsing
- Key files: `main.cpp` (8-state machine), `config.h` (all tunable params), `hal/` (modem abstraction), `messages.h` (SMS format spec)

**`firmware/src/hal/`:**
- Purpose: Isolate modem-specific code behind a common interface
- Contains: IModem.h interface, ModemFactory.h dispatcher, concrete modem drivers in `modems/`
- Pattern: Strategy pattern — factory returns correct driver; firmware never imports modem-specific headers

**`backend/supabase/migrations/`:**
- Purpose: Database schema as code; versioned, applied in order
- Contains: Table definitions, RLS policies, functions, indexes
- Key files: `001_initial_schema.sql` (core tables), `002_organizations_and_multitenancy.sql` (org scoping), `006_notification_preferences.sql` (settings)

**`backend/supabase/functions/ingest-sms/`:**
- Purpose: Stateless webhook handler for incoming SMS
- Contains: SMS parser (regex), database INSERT logic, realtime publication
- Key file: `index.ts` (parses TRAP/HEALTH/ALERT, upserts unit, inserts event)

**`frontend/src/app/`:**
- Purpose: Next.js App Router (modern Next.js 14+ structure)
- Contains: Page components, API routes, auth callbacks
- Layout: Grouped by feature (auth, orgs, dashboard, api)

**`frontend/src/app/dashboard/`:**
- Purpose: Main dashboard pages
- Contains: Unit list + map (`page.tsx`), unit detail (`units/[unitId]/`), offline field check (`field-check/`), settings
- Key file: `page.tsx` (realtime subscriptions, unit filtering, map rendering)

**`frontend/src/app/api/`:**
- Purpose: Next.js API routes (backend for frontend)
- Contains: Command dispatch, org management, unit CRUD, notification settings
- Pattern: Each route handles single resource; validates input, calls Supabase with service role

**`frontend/src/lib/`:**
- Purpose: Shared TypeScript utilities
- Contains: Type definitions, Supabase client wrappers, access control helpers
- Key file: `types.ts` (Unit, TrapEvent interfaces; getUnitStatus logic)

**`frontend/src/components/`:**
- Purpose: Reusable React components
- Contains: Navigation, map view, charts, notifications
- Key files: `map/MapView.tsx` (Leaflet), `charts/BatteryChart.tsx` (Chart.js)

## Key File Locations

**Entry Points:**
- `firmware/src/main.cpp` — Device firmware state machine
- `backend/supabase/functions/ingest-sms/index.ts` — SMS webhook handler
- `frontend/src/app/dashboard/page.tsx` — Main dashboard page
- `frontend/src/app/page.tsx` — Root page (redirects based on auth)

**Configuration:**
- `firmware/src/config.h` — All firmware tunable parameters (pins, thresholds, timeouts)
- `backend/supabase/migrations/` — Database schema and RLS policies
- `frontend/.env.local` (gitignored) — Supabase URL/keys, Telstra token

**Core Logic:**
- `firmware/src/messages.h` — SMS composition (format strings must match backend parser)
- `firmware/src/commands.h` — Inbound SMS command parser (PIN validation + 9 commands)
- `firmware/src/hal/IModem.h` — Modem interface contract
- `backend/supabase/functions/ingest-sms/index.ts` — SMS parser (must match firmware format)
- `frontend/src/lib/types.ts` — Unit and TrapEvent types; getUnitStatus logic

**Testing:**
- `tools/simulate-sms.js` — Generate test SMS payloads, POST to Edge Function
- Firmware test output captured via Serial (VSCode debug terminal)

**Authentication & Authorization:**
- `frontend/src/middleware.ts` — Refresh Supabase session before each request
- `frontend/src/app/layout.tsx` — Root auth check (redirect to login if not authenticated)
- `backend/supabase/migrations/002_organizations_and_multitenancy.sql` — RLS policies (trap_can_view_org, trap_can_edit_org, trap_can_admin_org)
- `frontend/src/lib/check-access.ts` — Check if user can access 'trap_monitor' app via portal.check_app_access()

## Naming Conventions

**Files:**

- Firmware: kebab-case or lowercase headers (`.h`), all-caps constants in files (e.g., `GPS_TIMEOUT_S`)
- Example: `firmware/src/messages.h`, `firmware/src/config.h`, `firmware/src/hal/IModem.h`

- Backend: kebab-case migrations, index.ts for Edge Functions
- Example: `001_initial_schema.sql`, `ingest-sms/index.ts`

- Frontend: PascalCase components (`.tsx`), camelCase utilities (`.ts`), kebab-case routes and folders
- Example: `MapView.tsx`, `check-access.ts`, `/dashboard/field-check/page.tsx`

**Directories:**

- Firmware: lowercase with underscores (e.g., `hal/modems/`)
- Frontend: kebab-case for routes and feature folders (e.g., `/field-check/`, `/push/`)
- Backend: kebab-case (e.g., `ingest-sms/`)

**Types/Interfaces:**

- Frontend: PascalCase (e.g., `Unit`, `TrapEvent`, `UnitStatus`)
- Firmware: PascalCase for classes/enums (e.g., `IModem`, `State`, `WakeReason`)
- Backend: camelCase in TypeScript, snake_case in SQL schema

## Where to Add New Code

**New Feature (e.g., geofence alerts):**
- Firmware: Add logic to `messages.h` (compose alert), `main.cpp` (trigger condition in state machine)
- Backend: Add column to events table (migration), update parser in `ingest-sms/index.ts`
- Frontend: Add field to TrapEvent type (`lib/types.ts`), display in dashboard/event detail

**New Command (e.g., "SLEEP N" — force sleep hours):**
- Firmware: Add case in `commands.h` (parse + execute), respond with confirm SMS
- Frontend: Add button to dashboard/unit detail, POST to `/api/command` with command string
- Backend: No change needed (command is pass-through; device handles parsing and execution)

**New Component/Module:**
- Implementation: `frontend/src/components/[feature]/ComponentName.tsx`
- Styling: Use Tailwind CSS classNames (no CSS modules)
- Exports: Named exports from component file

**Utilities & Helpers:**
- Shared: `frontend/src/lib/[feature].ts` (camelCase, no index exports)
- Supabase wrappers: `frontend/src/lib/supabase/` (client.ts for browser, server.ts for API routes)

**API Routes:**
- Pattern: `frontend/src/app/api/[resource]/route.ts` (or `[id]/route.ts` for detail)
- Each route: Single resource, validate input, use service role for writes, return JSON
- Example: `/api/orgs` (GET list, POST create), `/api/orgs/[orgId]` (GET, PATCH), `/api/orgs/[orgId]/units/[unitId]` (GET, PATCH)

**Database Migrations:**
- File: `backend/supabase/migrations/NNN_descriptive_name.sql`
- Pattern: Always use `if not exists` for idempotence; include RLS policy drops/creates
- Run: `npx supabase db push`

## Special Directories

**`firmware/src/hal/modems/`:**
- Purpose: Modem driver implementations
- Generated: No
- Committed: Yes
- How to add: Create `firmware/src/hal/modems/YourModem.h`, implement IModem interface, register in ModemFactory.h, set MODEM_MODEL in config.h

**`backend/supabase/migrations/`:**
- Purpose: Database schema versioning
- Generated: No (manually created)
- Committed: Yes
- How to add: Create new file `NNN_name.sql`, increment number sequentially, include DROP + CREATE for idempotence

**`frontend/.env.local` (gitignored):**
- Purpose: Environment secrets (Supabase keys, Telstra token)
- Generated: Copy from `.env.example`, fill in values
- Committed: NO — .env.local is in .gitignore
- Required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELSTRA_API_TOKEN, DEFAULT_CMD_PIN

**`tools/`:**
- Purpose: Development utilities (not part of production builds)
- Generated: No
- Committed: Yes
- Use: `node simulate-sms.js` to send test SMS payloads to local Edge Function

---

*Structure analysis: 2026-03-23*
