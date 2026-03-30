# Code Conventions

**Analysis Date:** 2026-03-23

## TypeScript Configuration

**File:** `frontend/tsconfig.json`
- Target: ES2017
- Strict mode: enabled
- Module resolution: bundler
- JSX: react-jsx
- Isolated modules: enabled
- Path alias: `@/*` → `./src/*`

## Naming Patterns

### Files
- **Components:** PascalCase — `Navigation.tsx`, `BatteryChart.tsx`, `ContrastToggle.tsx`
- **API routes:** `route.ts` in directory-based routing (`api/command/route.ts`)
- **Utilities:** camelCase — `check-access.ts`, `push.ts`
- **Supabase clients:** descriptive — `client.ts`, `server.ts`
- **Firmware:** lowercase — `config.h`, `messages.h`, `main.cpp`

### Variables & Functions
- **Frontend:** camelCase — `formatRelativeTime`, `getUnitStatus`, `isOffline`
- **Firmware:** camelCase functions, UPPER_SNAKE_CASE constants — `GPS_MOVE_THRESHOLD_M`, `DEFAULT_UNIT_ID`

### Types
- **Interfaces:** PascalCase with `Props` suffix — `NavigationProps`, `BatteryChartProps`
- **Domain types:** PascalCase — `Unit`, `TrapEvent`, `UnitStatus`
- **Enums (firmware):** PascalCase values — `WAKE_TRAP`, `STATE_SLEEP`

## Import Organization

Standard order observed across frontend:
```typescript
"use client";                                    // 1. Directive
import { useState, useEffect } from "react";     // 2. React
import Link from "next/link";                     // 3. Next.js
import { createClient } from "@/lib/supabase/client"; // 4. @/ aliases
import type { Unit } from "@/lib/types";          // 5. Types
```

## Component Patterns

**Client components** use `"use client"` directive at top:
```typescript
"use client";

interface NavigationProps {
  orgId?: string;
  orgName?: string;
  unitCount?: number;
  caughtCount?: number;
}

export default function Navigation({
  orgId,
  orgName,
  unitCount = 0,
  caughtCount = 0,
}: NavigationProps) { ... }
```

**Dynamic imports** for SSR-incompatible libraries:
```typescript
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false, loading: () => <div>Loading chart...</div> },
);
```

## Styling

- **Tailwind CSS v4** — all styling via utility classes
- **CSS custom properties** for theming: `bg-(--tm-panel)`, `text-(--tm-text)`, `border-(--tm-border)`
- **No CSS modules** or styled-components
- **Conditional classes** via template literals or clsx

## Error Handling (API Routes)

**Pattern 1: Auth guard + try/catch**
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.from("notifications")...
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Pattern 2: Input validation first**
```typescript
const { unitId, command } = await req.json();
if (!unitId || !command) {
  return NextResponse.json({ error: "Missing unitId or command" }, { status: 400 });
}
```

**Pattern 3: Retry with collision handling**
```typescript
for (let attempt = 0; attempt < 5; attempt += 1) {
  const { data, error } = await supabase.from("organisations")...
  if (!error && data) { org = data; break; }
  if (error?.code !== "23505") break; // Only retry unique violations
}
```

**Response format:** Always `{ error: "message" }` with appropriate HTTP status

## Database Access

**Server-side** (API routes):
```typescript
const supabase = await createClient(); // from @/lib/supabase/server
```

**Client-side** (components):
```typescript
const supabase = createClient(); // from @/lib/supabase/client
```

**Query pattern:**
```typescript
const { data, error } = await supabase
  .from("notifications")
  .select("*")
  .eq("read", false)
  .order("sent_at", { ascending: false })
  .limit(10);
```

**Realtime subscriptions:**
```typescript
const channel = supabase
  .channel("notifications:user")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
  }, (payload) => { ... })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

## Firmware (C++) Conventions

**Config as defines** (`config.h`):
```c
#define DEFAULT_UNIT_ID       "TRAP_001"
#define GPS_MOVE_THRESHOLD_M  50.0f
#define HEALTH_HOUR           6
#define SMS_RETRY_COUNT       5
```

**State machine pattern** (`main.cpp`):
```cpp
enum WakeReason { WAKE_TRAP, WAKE_RTC_HEALTH, WAKE_RTC_RETRY, WAKE_BOOT };
enum State { STATE_WAKE_ASSESS, STATE_COMPOSE_MSG, STATE_GPS_CHECK, ... STATE_SLEEP };
```

**Structs for messages** (`messages.h`):
```cpp
struct EventMessage {
  String type;
  String unitId;
  String timestamp;
  int retryAttempts = 0;
  bool trapCaught = false;
  float lat = 0.0;
};
```

**Include guards:** `#pragma once`

## localStorage Pattern

```typescript
const STORAGE_KEY = "tm-theme";
const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
localStorage.setItem(STORAGE_KEY, next);
```

## Feature Detection / Graceful Degradation

```typescript
const accessInfraMissing = errorMessage.includes("check_app_access") || ...;
if (accessInfraMissing) {
  return { hasAccess: true, role: "admin" }; // Fallback for bootstrap
}
```

---

*Conventions analysis: 2026-03-23*
