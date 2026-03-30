# WildTrack — Camera Trap Data Management

A camera trap data management and analytics platform for ranger teams, national parks, researchers, Indigenous land managers, and conservation groups.

## Features

- Organise projects within team workspaces with role-based access (Admin, Member, Viewer)
- Manage camera trap deployment sites with coordinates, dates, and an interactive map
- Species registry with Atlas of Living Australia (ALA) integration for taxonomy, conservation status, and images
- Import CSV data from TimeLapse, AddaxAI, or any generic format with smart column auto-detection
- Analytics: detection rates, activity patterns, species accumulation, diversity indices
- Generate detection history matrices for occupancy modelling and export as CSV
- Publish projects for public access or keep them private

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **UI:** shadcn/ui + Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL, RLS, GoTrue)
- **State:** Zustand
- **Maps:** react-leaflet + OpenStreetMap
- **External API:** Atlas of Living Australia (ALA)

## Getting Started

```bash
# Install dependencies
npm install

# Start Supabase (Docker must be running)
supabase start

# Start Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test Accounts (Local Dev)

- `test@wildtrack.dev` / `password123` — Owner of Tiwi, Admin of Kakadu
- `ranger@wildtrack.dev` / `password123` — Member of Tiwi

## Deployment

- Deploy Next.js to [Vercel](https://vercel.com): `vercel deploy`
- Create a Supabase project at [supabase.com](https://supabase.com)
- Set environment variables in Vercel project settings
- Run `supabase db push` to apply migrations to remote

See `NOTES_FOR_TOBY.md` for detailed deployment notes.

## AI Development Instructions

AI agents (Claude Code, GitHub Copilot) should read these files before making changes:

- `CLAUDE.md` — project working instructions and security rules
- `ARCHITECTURE.md` — system structure and boundaries
- `DOMAIN_RULES.md` — business invariants and calculations
- `REPO_MAP.md` — folder layout and sensitive areas

Global behaviour rules: `C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`
