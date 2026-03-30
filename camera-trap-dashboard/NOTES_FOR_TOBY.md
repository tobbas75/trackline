# Notes for Toby — Setup Required Tonight

## Nothing blocking right now
All Phase 1-7 development uses local Supabase (Docker) and free/unauthenticated APIs. No API keys needed for development.

## When deploying to production (post-development):

### Supabase (Required)
- Create a Supabase project at https://supabase.com
- Update `.env.local` with production URL, anon key, and service role key
- Run `supabase db push` to apply migrations to remote

### ALA (Atlas of Living Australia) — No key needed
- ALA APIs are free and unauthenticated
- Species search, taxonomy, conservation status all work without a key
- We proxy through our API routes for caching

### Maps — No key needed
- Using react-leaflet with OpenStreetMap tiles (free, no API key)
- ALA WMS layers are also free

### Domain & Hosting (When ready)
- Vercel deployment: `vercel deploy`
- Custom domain: configure in Vercel dashboard
- Set environment variables in Vercel project settings

### Optional Future Services
- **Supabase Storage**: Already included in Supabase project (for CSV uploads)
- **Email (for invitations)**: Supabase includes basic email via GoTrue. For custom templates, configure SMTP in Supabase dashboard.

## Test Accounts (Local Dev)
- `test@wildtrack.dev` / `password123` — Owner of Tiwi, Admin of Kakadu
- `ranger@wildtrack.dev` / `password123` — Member of Tiwi

## Running Locally
```bash
# Start Supabase (Docker must be running)
supabase start

# Start Next.js dev server
npm run dev
```
