# Trackline Portal — Architecture

## Overview

Trackline is a conservation technology portal serving as the public-facing website and shared authentication gateway for a suite of field-grade conservation tools deployed across remote Australia.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Free Tier)                    │
│  ┌─────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ Portal  │  │  WildTrack  │  │   Fire System    │    │
│  │ (this)  │  │ (separate)  │  │   (separate)     │    │
│  └────┬────┘  └──────┬──────┘  └────────┬─────────┘    │
│       │              │                   │              │
└───────┼──────────────┼───────────────────┼──────────────┘
        │              │                   │
        ▼              ▼                   ▼
   ┌──────────────────────────────────────────────┐
   │         Supabase (Shared Project)            │
   │  ┌────────┐  ┌─────────┐  ┌──────────────┐  │
   │  │  Auth  │  │   RLS   │  │  PostgreSQL   │  │
   │  │(GoTrue)│  │Policies │  │   Database    │  │
   │  └────────┘  └─────────┘  └──────────────┘  │
   └──────────────────────────────────────────────┘
```

## Portal Responsibilities

1. **Public landing page** — showcase Trackline tools and mission
2. **Shared authentication** — login/signup via Supabase GoTrue
3. **User routing** — direct authenticated users to the appropriate app
4. **Contact form** — handle inbound enquiries

## Deployment Strategy

- **Cost:** $0 on free tiers (Vercel + Supabase)
- **Scaling:** Upgrade Supabase to Pro ($25/mo) when free limits hit
- **Independence:** Each app deploys separately — one app's issues don't affect others
- **Shared auth:** One Supabase project means one login across all apps

## Folder Structure

```
portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts + grain
│   │   ├── page.tsx            # Landing page (all sections)
│   │   └── globals.css         # Tailwind v4 theme + custom styles
│   ├── components/
│   │   ├── header.tsx          # Fixed nav with mobile menu
│   │   ├── hero.tsx            # Full-height hero with tagline
│   │   ├── projects.tsx        # Project showcase cards
│   │   ├── about.tsx           # Mission + values grid
│   │   ├── approach.tsx        # 4-step process
│   │   ├── contact.tsx         # Contact form + details
│   │   └── footer.tsx          # Minimal footer
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts       # Browser Supabase client
│   │       └── server.ts       # Server Supabase client
│   └── middleware.ts           # Session refresh on every request
├── .env.local.example          # Required env vars template
├── CLAUDE.md                   # AI agent instructions
└── ARCHITECTURE.md             # This file
```

## Design Decisions

### Between23-inspired aesthetic
- Earthy colour palette (red dust, ochre, eucalypt, stone)
- Grain texture overlay for tactile feel
- DM Serif Display for headings, Poppins for body
- Subtle animations (fade-up on scroll)
- Clean whitespace, no clutter

### Shared Supabase
- Single project = single bill, shared auth
- Each app uses schema-level or table-level isolation
- RLS policies enforce per-app data boundaries
- Portal manages user profiles and app access

### Static-first
- Landing page is fully static (SSG)
- No client-side data fetching on public pages
- Auth pages will use client components when added
