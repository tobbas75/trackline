# Trackline UI Rules

Opinionated reference for all Trackline apps. Follow these rules in portal, WildTrack, Fire System, and Trap Monitor.

---

## Design Principles

- Earthy, minimal, clean — Between23 aesthetic
- DM Serif Display for headings, Poppins for body
- Generous whitespace, tight typography
- Rounded corners: `rounded-sm` (2px) only — no `rounded-lg` or `rounded-xl`
- Grain texture overlay via `.grain` class on the layout root

---

## Colour System

All tokens are CSS variables defined in `packages/ui/tokens.css` and available as Tailwind utilities.

| Token           | CSS variable            | Hex       | Use case                        |
|-----------------|-------------------------|-----------|---------------------------------|
| `red-dust`      | `--color-red-dust`      | `#b5452a` | Primary CTA, branding, links    |
| `red-dust-light`| `--color-red-dust-light`| `#d4664a` | Hover states, active accents    |
| `ochre`         | `--color-ochre`         | `#c9913a` | Contact sections, highlights    |
| `ochre-light`   | `--color-ochre-light`   | `#daa94e` | Ochre hover/active              |
| `eucalypt`      | `--color-eucalypt`      | `#4a7c59` | Nature/success, green badges    |
| `eucalypt-light`| `--color-eucalypt-light`| `#5d9b6f` | Eucalypt hover/active           |
| `sky`           | `--color-sky`           | `#5b8fa8` | Info/technology badges          |
| `stone-50`      | `--color-stone-50`      | `#faf8f6` | Page background                 |
| `stone-100`     | `--color-stone-100`     | `#f5f0eb` | Card/panel backgrounds          |
| `stone-200`     | `--color-stone-200`     | `#e8e0d8` | Borders, dividers, muted fills  |
| `stone-300`     | `--color-stone-300`     | `#d4c8bc` | Subtle borders                  |
| `stone-400`     | `--color-stone-400`     | `#8a8580` | Muted/disabled text             |
| `stone-500`     | `--color-stone-500`     | `#6b5e54` | Secondary text                  |
| `stone-700`     | `--color-stone-700`     | `#3d3530` | Body text (dark-ish)            |
| `stone-900`     | `--color-stone-900`     | `#1a1412` | Primary text, headings          |

**Semantic aliases** (also in tokens.css):

| Alias              | Maps to         | Use case                  |
|--------------------|-----------------|---------------------------|
| `background`       | `stone-50`      | Page / root background    |
| `foreground`       | `stone-900`     | Default text              |
| `muted`            | `stone-200`     | Subtle fills              |
| `muted-foreground` | `stone-400`     | Placeholder / helper text |
| `accent`           | `red-dust`      | Primary accent colour     |
| `accent-light`     | `red-dust-light`| Accent hover              |

---

## Typography

### Fonts

- Display headings: `font-[family-name:var(--font-dm-serif)]` or `font-display`
- Body text: default (Poppins, injected by next/font as `--font-poppins`)
- Section labels: `text-xs font-semibold tracking-widest uppercase text-red-dust`

### Size scale

| Context          | Class(es)                              |
|------------------|----------------------------------------|
| Section label    | `text-xs tracking-widest uppercase`    |
| Body / captions  | `text-sm`                              |
| Card headings    | `text-base font-semibold`              |
| Sub-headings     | `text-xl` or `text-2xl`               |
| Page headings    | `text-3xl` to `text-5xl` (display)    |

### Display heading pattern

```tsx
<h1 className="font-[family-name:var(--font-dm-serif)] text-4xl text-stone-900">
  Heading
</h1>
```

---

## Layout

- Max content width: `max-w-5xl` (dashboard) · `max-w-6xl` (marketing/landing)
- Container: `mx-auto px-6`
- Header padding: `px-6 py-4`
- Main content sections: `px-6 py-12` or `px-6 py-16`
- Card grid: `grid gap-6 sm:grid-cols-2 lg:grid-cols-3`
- Vertical section rhythm: `space-y-12` or `space-y-16`

### Breakpoints

| Name | Width  | Use case                           |
|------|--------|------------------------------------|
| `sm` | 640px  | Single-column → two-column splits  |
| `md` | 768px  | Tablet layout adjustments          |
| `lg` | 1024px | Full desktop grid (3 columns etc.) |

---

## Components (from @trackline/ui)

Import from `@trackline/ui`:

```tsx
import { Button, Card, CardHeader, CardBody, Badge, Avatar, cn } from "@trackline/ui";
```

### Button

```tsx
<Button variant="primary" size="md">Save changes</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost">Learn more</Button>
```

Variants: `primary` (red-dust fill) · `secondary` (stone border) · `ghost` (no border/bg)
Sizes: `sm` · `md`

### Card

```tsx
<Card hover>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

`hover` prop adds lift shadow on mouse-over. Use for interactive/clickable cards.

### Badge

```tsx
<Badge variant="primary">Admin</Badge>
<Badge variant="eucalypt">Active</Badge>
<Badge variant="ochre">Pending</Badge>
<Badge variant="sky">API</Badge>
<Badge>Default</Badge>
```

Variants: `default` · `primary` · `ochre` · `eucalypt` · `sky`

### Avatar

```tsx
<Avatar name="Toby Barton" size="md" />
<Avatar name="Jane" size="sm" />
```

Sizes: `sm` (24px) · `md` (32px) · `lg` (40px). Shows initials when no image provided.

### cn utility

```tsx
import { cn } from "@trackline/ui";

<div className={cn("base-class", isActive && "active-class", className)}>
```

Use `cn()` for all conditional class merging. Do not use template literals for class logic.

---

## Utility Classes (from tokens.css)

| Class                  | Effect                                     |
|------------------------|--------------------------------------------|
| `.grain`               | Fixed noise texture overlay (pseudo-el)    |
| `.dust-line`           | Horizontal gradient divider                |
| `.img-zoom`            | Smooth scale(1.04) on hover                |
| `.animate-fade-up`     | Fade-in + translateY animation             |
| `.animation-delay-100` | 0.1s delay (up to `.animation-delay-500`) |

---

## Conventions

- Server Components by default — `"use client"` only for event handlers and hooks
- Named exports only (except Next.js `page.tsx` / `layout.tsx`)
- Icons: `lucide-react` only — no other icon library
- No inline styles — Tailwind classes only
- No `rounded-lg`, `rounded-xl`, `rounded-2xl` — use `rounded-sm` max
- Import paths: `@/*` for app-internal · `@trackline/ui` for shared components

---

## Integration Checklist

When adding @trackline/ui to an app:

1. Add `"@trackline/ui": "workspace:*"` to `package.json` dependencies
2. Add `"@trackline/ui"` to `transpilePackages` in `next.config.ts`
3. Add `@source "path/to/packages/ui/src"` in `globals.css` (required for Tailwind v4 purging)
4. For Trackline-themed apps: add `@import "path/to/packages/ui/tokens.css"` before app styles
5. For shadcn apps (camera-trap-dashboard, fire-app): `@source` only — no token import
