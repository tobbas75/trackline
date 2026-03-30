# Dashboard Integration Guide

Each Trackline dashboard (WildTrack, Fire System, Trap Monitor) must check the user's app access before allowing entry. This is how the per-app access control works.

## How it works

```
User logs in (shared Supabase auth)
       │
       ▼
Portal shows only the apps they have access to
       │
       ▼
User clicks "Open WildTrack"
       │
       ▼
WildTrack app checks portal.app_access table
       │
       ├── has access → show dashboard
       └── no access  → redirect to /no-access
```

## Integration steps for each dashboard

### 1. Add the access check function

Copy this into your app's `src/lib/check-access.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

type AppRole = "viewer" | "member" | "admin";

export async function checkAppAccess(
  supabase: SupabaseClient,
  appId: string
): Promise<{ hasAccess: boolean; role: AppRole | null }> {
  const { data, error } = await supabase.rpc("check_app_access", {
    target_app_id: appId,
  });

  if (error || !data || data.length === 0) {
    return { hasAccess: false, role: null };
  }

  return {
    hasAccess: data[0].has_access,
    role: data[0].user_role as AppRole,
  };
}
```

### 2. Check access in your layout or middleware

In your app's authenticated layout (e.g. `src/app/(dashboard)/layout.tsx`):

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAppAccess } from "@/lib/check-access";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check portal access — use your app's ID
  const { hasAccess } = await checkAppAccess(supabase, "wildtrack");
  // or "fire" for Fire System
  // or "trap_monitor" for Trap Monitor

  if (!hasAccess) redirect("/no-access");

  return <>{children}</>;
}
```

### 3. Use the role for feature gating

```typescript
const { hasAccess, role } = await checkAppAccess(supabase, "wildtrack");

// role is "viewer" | "member" | "admin"
// Use this to control what the user can do within the app
if (role === "viewer") {
  // Read-only access
}
```

## App IDs

| App ID         | Dashboard      |
|----------------|----------------|
| `wildtrack`    | WildTrack      |
| `fire`         | Fire System    |
| `trap_monitor` | Trap Monitor   |

## Granting access

Access is managed from the portal by users with `admin` role on any app. In the Supabase dashboard or via SQL:

```sql
-- Grant a user access to WildTrack as a member
insert into portal.app_access (user_id, app_id, role, granted_by)
values ('user-uuid-here', 'wildtrack', 'member', 'admin-uuid-here');
```

## RLS enforcement

The `portal.app_access` table has RLS enabled:
- Users can only see their own access records
- Only admins can grant/revoke access
- The `portal.check_app_access()` function uses `security definer` so it works even when the user can't directly query other users' access
