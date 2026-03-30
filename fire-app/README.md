# Fire Project System

Fire management platform for Indigenous ranger groups on the Tiwi Islands (NT, Australia). Manages savanna fire carbon methodology compliance, fire scar mapping, burn planning, vegetation analysis, and Sentinel-2 satellite imagery.

## Tech Stack

Next.js 15 (App Router) | TypeScript | Tailwind | shadcn/ui | Supabase | Zustand | MapLibre GL | Sharp

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in credentials
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See `.env.local.example` for required variables:
- **Supabase**: project URL, anon key, service role key
- **CDSE**: Copernicus Data Space OAuth2 client credentials (for Sentinel-2 imagery)

## Project Structure

```
src/
  app/(app)/        # Authenticated pages (map, burn plans, carbon, etc.)
  app/api/          # API routes (sentinel, hotspots, NAFI, weather)
  components/map/   # MapLibre map + layer controls
  hooks/            # Data fetching hooks
  lib/              # Utilities, CDSE client, image processing
  stores/           # Zustand state stores
```

## Documentation

- [Architecture & File Map](docs/architecture.md)
- [Data Flow: How Fire Scars Drive Everything](docs/data-flow.md)
- [Sentinel-2 Imagery System](docs/sentinel-imagery-system.md)

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm test          # Run tests (Vitest)
npx tsc --noEmit  # Type-check
```

### Data Processing

```bash
# Process NAFI fire scar shapefiles into GeoJSON (offline, one-time)
npm run firescars:process

# Download newest current-year NAFI zip, extract, and refresh local GeoJSON
npm run firescars:update-current
```

#### Daily Automation (Windows Task Scheduler)

```powershell
schtasks /Create /SC DAILY /TN "FireApp Update Current Fire Scar" /TR "pwsh -NoProfile -ExecutionPolicy Bypass -Command \"Set-Location 'C:\Users\tobyw\OneDrive\Projects\Software code GITs\Fire project system\fire-app'; npm run firescars:update-current\"" /ST 06:00
```

Optional environment variables:

- `FIRE_SCAR_DATA_DIR` to override source shapefile folder
- `FIRE_SCAR_LOOKBACK_YEARS` to control how many years back to search if current year zip is not yet published

## Database

Supabase migrations in `supabase/migrations/` (001-006). Apply via Supabase CLI:

```bash
supabase db push
```

## AI Development Instructions

AI agents (Claude Code, GitHub Copilot) should read these files before making changes:

- `CLAUDE.md` — project working instructions and critical security rules
- `ARCHITECTURE.md` — system structure and boundaries
- `DOMAIN_RULES.md` — business invariants and calculations
- `REPO_MAP.md` — folder layout and sensitive areas

Global behaviour rules: `C:\Users\tobyw\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`
