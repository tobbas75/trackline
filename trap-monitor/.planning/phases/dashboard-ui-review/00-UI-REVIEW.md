# Dashboard UI Review

**Audited:** 2026-03-24
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md exists)
**Screenshots:** Not captured (no dev server detected on ports 3000, 5173, or 8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Domain-specific CTAs are strong; some generic labels ("ACK", "Cancel", "Save") and abbreviation choices reduce clarity |
| 2. Visuals | 3/4 | Clear visual hierarchy with status color coding; only 1 aria-label in entire dashboard, emoji-only buttons lack accessibility |
| 3. Color | 4/4 | Fully tokenized design system with light/dark themes; accent usage is well-distributed across meaningful interaction points |
| 4. Typography | 3/4 | Consistent heading/body scale; three arbitrary font sizes (text-[10px], text-[11px]) and mixed weight usage (font-bold vs font-semibold) on similar elements |
| 5. Spacing | 3/4 | Standard Tailwind scale used consistently; three arbitrary tracking values and minor inconsistencies in section padding |
| 6. Experience Design | 3/4 | Loading states on every page; empty states well handled; missing error boundaries, no confirmation for destructive commands (ARM/DISARM), no disabled state on command buttons |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Missing aria-labels on emoji-only and icon-only buttons** -- Screen reader users cannot determine the purpose of map legend toggle, notification bell, mobile nav buttons, or command buttons (STATUS/GPS/ARM/DISARM) -- Add `aria-label` attributes to all buttons that rely on emoji or short acronyms as their only label. Only one `aria-label="Close"` exists in the entire dashboard (`dashboard/page.tsx:133`).

2. **No confirmation dialog for destructive commands (ARM/DISARM)** -- A user can accidentally disarm a trap or send commands with a single tap, which has real-world consequences for wildlife monitoring -- Wrap `sendCommand` calls for ARM/DISARM in a confirmation dialog; consider also adding a brief disabled/loading state on command buttons after click to prevent double-sends.

3. **Hardcoded hex colors in BatteryChart.tsx bypass the design token system** -- The battery chart uses 14 hardcoded hex values (`#ef4444`, `#22c55e`, `#374151`, etc.) that will not respond to dark/light theme changes, creating a visual inconsistency -- Replace hardcoded colors with CSS custom property references (e.g., `var(--tm-danger)`, `var(--tm-accent)`) using Recharts' support for CSS variables in style props.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- CTAs are domain-specific and action-oriented: "Start Field Check", "Create Organization", "Open Details", "Start Check"
- Loading states use contextual messages: "Loading trap network...", "Preparing field check mode...", "Loading preferences..."
- Empty states are descriptive: "Create an organization to start monitoring your traps", "Add your first trap unit to start monitoring", "No units available for this organization and filter"
- The "all clear" banner is excellent UX: "All clear -- {N} traps armed and reporting normally" (dashboard/page.tsx:192)
- Relative time formatting is user-friendly: "just now", "5m ago", "3h ago"

**Issues:**
- `ACK` button label (dashboard/page.tsx:139, EventList.tsx:64) is jargon -- should be "Acknowledge" (which IS used on cards/page.tsx:385, creating inconsistency)
- `Unack` label in unit detail event table (units/[unitId]/page.tsx:295) is unclear abbreviation -- should be "Unacknowledged" or a status badge
- "Cancel" used on notifications settings page (notifications/page.tsx:415) without specifying what is being cancelled
- `Save Preferences` prefixed with a checkmark emoji on a button that has not saved yet (notifications/page.tsx:409) -- the checkmark implies completion before the action
- "Pending Sync {N}" (dashboard/page.tsx:96) reads as a label, not a status -- consider "Pending: {N} syncs" or "{N} changes pending sync"
- `FAULT` for solar status (dashboard/page.tsx:144, units/[unitId]/page.tsx:156,216) is terse -- "Solar Fault" or "Panel Issue" would be clearer for field users

### Pillar 2: Visuals (3/4)

**Strengths:**
- Clear visual hierarchy: page title (text-2xl/3xl) > section headers (text-xs uppercase) > body content
- Status-coded stat cards on dashboard provide immediate visual scanning (caught=red, offline=gray, warning=amber)
- Selected unit card has a distinct panel treatment with rounded-2xl, shadow-2xl, and backdrop blur
- Mobile bottom tab bar provides touch-friendly navigation with 16px height targets
- Fleet battery distribution bar (UnitGrid.tsx:245-298) is an effective at-a-glance visualization
- Cards view (cards/page.tsx) uses aspect-square cards with status-as-background-color for instant visual recognition

**Issues:**
- Only ONE aria-label in the entire dashboard codebase: `aria-label="Close"` on dashboard/page.tsx:133
- Map legend toggle button uses emoji-only label (`<button>clipboard emoji</button>`) with only a `title` attribute (MapView.tsx:138-139) -- needs aria-label
- Notification bell button has `title="Notifications"` but no aria-label (NotificationBell.tsx:109)
- Mobile nav buttons use emoji + text-xs labels but the interactive area (the button/link itself) has no aria-label
- Contrast toggle button (ContrastToggle.tsx:33-34) has `title` but no aria-label
- Command buttons in unit detail popup display raw command strings ("STATUS", "GPS", "DISARM") -- consider adding descriptive text or icons
- The unit detail popup on mobile uses `position: fixed` with `z-1100` which is a non-standard z-index -- works but may conflict with other overlays

### Pillar 3: Color (4/4)

**Strengths:**
- Fully tokenized design system using CSS custom properties (--tm-*) with 35+ semantic tokens
- Complete light and dark theme support via `[data-theme="dark"]` selector
- Semantic color mapping is excellent: danger (red), warning (amber), offline (slate), ok (green), accent (forest green)
- Status colors are consistent across all views: caught=--tm-danger, offline=--tm-offline, lowbatt=--tm-warning, normal=--tm-accent
- 60/30/10 color distribution is well-maintained: bg/panel (60%), text/muted/border (30%), accent/status (10%)
- No use of raw Tailwind color classes (bg-red-500, etc.) in dashboard components -- all use custom properties
- The `getStatusColor()` function in types.ts uses raw Tailwind colors (bg-red-500, bg-gray-500, etc.) but this function is not imported in any audited dashboard file

**Issues (minor, not impacting score):**
- BatteryChart.tsx contains 14 hardcoded hex colors (#ef4444, #22c55e, #374151, #9ca3af, #1f2937, #4b5563, #d1d5db, #dc2626) that will not respond to theme changes
- MiniMap.tsx:51 has a hardcoded background color `#1a1a2e` for the Leaflet container
- MapView.tsx:89 has inline style with hardcoded `color:#ef4444` in popup HTML template
- These are Leaflet/Recharts integration constraints but should be addressed for full theme consistency

### Pillar 4: Typography (3/4)

**Strengths:**
- Three-tier font family system: heading (serif), body (sans-serif), mono (monospace) defined in globals.css
- `font-heading` class used consistently for page titles and unit names
- `font-mono` used appropriately for unit IDs and command text
- Section labels use consistent pattern: `text-xs font-semibold uppercase tracking-wide text-(--tm-muted)`

**Font size distribution across dashboard files:**
- text-xs: High frequency (labels, status badges, metadata)
- text-sm: High frequency (body text, buttons, descriptions)
- text-lg: Moderate (loading messages, stat values, unit names)
- text-xl: Low (unit detail heading, nav header, notification heading)
- text-2xl: Low (page titles)
- text-3xl: Low (stat card numbers, welcome headings)
- text-5xl/text-6xl: Used only for decorative emoji in loading/empty states
- **Total distinct sizes: 8** (above the 4-size guideline, but justified by the information density of a monitoring dashboard)

**Issues:**
- Three arbitrary font sizes used outside Tailwind scale:
  - `text-[10px]` in UnitGrid.tsx:97 and UnitGrid.tsx:292 (fleet battery bar labels)
  - `text-[11px]` in UnitGrid.tsx:229 (status label in compact unit card)
  - These break the type scale -- use `text-xs` (12px) instead for consistency
- Mixed weight usage on similar elements: cards/page.tsx uses `font-bold` on card titles (line 349) and CTA buttons (line 207), while dashboard/page.tsx uses `font-semibold` for the equivalent elements (lines 66, 88) -- standardize to one weight per element type
- Three different tracking values for section headers: `tracking-[0.12em]`, `tracking-[0.14em]`, `tracking-[0.16em]` (UnitGrid.tsx:46,97,127,229) -- should consolidate to one value (suggest `tracking-wider` or a single custom value)

### Pillar 5: Spacing (3/4)

**Strengths:**
- Consistent use of Tailwind spacing scale throughout: p-4, px-3, py-2, gap-2, gap-3, gap-4, space-y-2
- Responsive padding with md: breakpoints: `px-4 py-4 md:px-6` (dashboard/page.tsx:79)
- Card/panel padding is consistent at p-4 or p-3 across components
- Grid gaps use standard values: gap-2, gap-3, gap-4, gap-6
- Section spacing uses mt-3, mt-4, mt-6 in a logical progression

**Issues:**
- Arbitrary tracking values (noted in typography): `tracking-[0.12em]`, `tracking-[0.14em]`, `tracking-[0.16em]` -- three different custom values for the same visual intent
- Minor inconsistency in page-level padding:
  - dashboard/page.tsx: `px-4 py-4 md:px-6` (line 79)
  - field-check/page.tsx: `px-4 py-5 md:px-6` (line 276)
  - units/[unitId]/page.tsx: `p-6` (line 189)
  - cards/page.tsx: `p-6` (line 267)
  - Suggest standardizing on one page padding pattern
- Button padding varies between pages:
  - Primary buttons: `px-8 py-3` (dashboard CTA), `px-5 py-2.5` (field-check CTA), `px-3 py-2` (dashboard header actions)
  - These serve different contexts (hero CTA vs header action) so variation is partially justified
- No arbitrary pixel/rem spacing values found outside of tracking -- this is good

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **Loading states**: Every page has a branded loading state with contextual message and animation
  - dashboard/page.tsx:33-44 -- "Loading trap network..."
  - cards/page.tsx:174-185 -- "Loading trap network..."
  - field-check/page.tsx:241-251 -- "Preparing field check mode..."
  - units/[unitId]/page.tsx:116-123 -- "Loading unit..."
  - notifications/page.tsx:177-191 -- "Loading preferences..."
- **Empty states**: Comprehensive coverage
  - No orgs: Welcome message + CTA to create org (dashboard, cards, field-check)
  - No units: "No Units Yet" + CTA to add unit (cards/page.tsx:287-303)
  - No commands: "No commands sent" (units/[unitId]/page.tsx:340-344)
  - No matching filter results: Descriptive message (field-check/page.tsx:380-383)
  - All clear state: Positive confirmation banner (dashboard/page.tsx:188-195)
- **Realtime updates**: Supabase realtime subscriptions on events and units tables for live data
- **Offline support**: Field check page caches unit data in localStorage, shows cached-data banner, tracks pending sync count
- **Disabled states**: Save and push toggle buttons show disabled state during async operations (notifications/page.tsx:325,406)
- **Stale data warning**: Unit detail page shows amber warning banner when data >12h old (units/[unitId]/page.tsx:176-185)
- **Pagination**: Event history supports "load more" with count tracking (units/[unitId]/page.tsx:306-313)

**Issues:**
- **No error boundaries**: No `ErrorBoundary` component found anywhere in the dashboard. If a component throws during render, the entire page crashes with React's default error screen
- **No confirmation for destructive commands**: ARM/DISARM commands fire immediately on click (dashboard/page.tsx:154). Confirmation dialogs exist in org/unit management pages (orgs/page.tsx:36, orgs/[orgId]/units/page.tsx:73) but not for field commands
- **No loading/disabled state on command buttons**: When STATUS, GPS, or ARM/DISARM is clicked, there is no visual feedback that the command was sent (dashboard/page.tsx:153-155). The `sendCommand` function fires an async fetch but does not update any UI state
- **Acknowledge button has no feedback**: After clicking ACK, the event is updated optimistically in state but there is no loading indicator or success confirmation (dashboard/page.tsx:139, useDashboardData.ts:236-244)
- **No error handling for sendCommand**: The `sendCommand` function in useDashboardData.ts:247-253 does not handle fetch errors or show any error feedback to the user
- **orgLoadError displayed but not dismissible**: Error message in dashboard/page.tsx:59-62 shows but cannot be dismissed or retried
- **Cards page duplicates auth/data logic**: cards/page.tsx reimplements auth checking, org loading, and realtime subscriptions instead of using `useDashboardData` hook -- this means error handling and offline support are inconsistent between the two views

---

## Files Audited

- `frontend/src/app/dashboard/page.tsx` -- Main dashboard (map + unit grid + stats)
- `frontend/src/app/dashboard/layout.tsx` -- Auth guard layout
- `frontend/src/app/dashboard/cards/page.tsx` -- Cards grid view
- `frontend/src/app/dashboard/units/[unitId]/page.tsx` -- Unit detail view
- `frontend/src/app/dashboard/field-check/page.tsx` -- Field check mode
- `frontend/src/app/dashboard/settings/notifications/page.tsx` -- Notification settings
- `frontend/src/components/dashboard/OrgSelector.tsx` -- Org selector dropdown
- `frontend/src/components/dashboard/EventList.tsx` -- Event list feed
- `frontend/src/components/dashboard/UnitGrid.tsx` -- Unit grid sidebar with filters
- `frontend/src/components/map/MapView.tsx` -- Leaflet map view
- `frontend/src/components/Navigation.tsx` -- Sidebar + mobile bottom tab navigation
- `frontend/src/hooks/useDashboardData.ts` -- Dashboard data hook
- `frontend/src/lib/types.ts` -- Shared types and utility functions
- `frontend/src/app/globals.css` -- Design tokens and CSS custom properties
