# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5.4 - Frontend (Next.js) and backend (Edge Functions)
- C++ (PlatformIO) - Embedded firmware for ESP32-S3
- SQL (PostgreSQL) - Database schema and Supabase migrations

**Secondary:**
- JavaScript - Configuration files (postcss.config.js, tailwind.config.js)

## Runtime

**Environment:**
- Node.js 20.x (inferred from dependencies)
- Deno - Supabase Edge Functions runtime
- ESP32-S3 Dev Kit C1 - Embedded device runtime (Arduino framework)

**Package Manager:**
- npm - Frontend package management
- lockfile: `frontend/package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Frontend framework (App Router)
- React 19.2.3 - UI library
- Supabase JS 2.98.0 - Backend-as-a-service client
- Supabase SSR 0.9.0 - Server-side Supabase client for Next.js

**Testing:**
- Not detected

**Build/Dev:**
- TypeScript 5.4 - Type checking
- Tailwind CSS 4.0.0 - Utility-first CSS framework
- PostCSS 8.4.0 - CSS transformation
- PlatformIO - Embedded build and upload tool
- ESLint 9.0.0 - Code linting (via next lint)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.98.0 - Database client and realtime subscriptions
- @supabase/ssr 0.9.0 - Server-side auth and cookie management
- next 16.1.6 - React framework with App Router
- web-push 3.6.7 - Web Push API notifications (server-side)

**UI/Mapping:**
- leaflet 1.9.4 - Interactive maps (client-side)
- @types/leaflet 1.9.12 - TypeScript definitions for Leaflet
- recharts 3.8.0 - React charting library (battery, event trends)
- clsx 2.1.0 - Conditional CSS class utility

**Firmware:**
- TinyGPSPlus 1.0.3 - NMEA GPS parsing for u-blox M10
- ArduinoJson 7.0.0 - JSON serialization
- RTClib 2.1.4 - RTC (real-time clock) support
- DallasTemperature 3.11.0 - Temperature sensor interface
- Adafruit BME280 Library 2.2.4 - Environmental sensor
- Adafruit Unified Sensor 1.1.14 - Sensor abstraction layer

**Infrastructure:**
- recharts 3.8.0 - Realtime battery and health metrics visualization
- @tailwindcss/postcss 4.0.0 - Tailwind CSS PostCSS plugin

## Configuration

**Environment:**
- `.env.local` (gitignored) - Local development secrets
- `.env.example` - Template with all required variables
- Variables required:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-side database access (secret)
  - `NEXT_PUBLIC_APP_URL` - Application base URL (dev/prod)
  - `TELSTRA_API_TOKEN` - Telstra Messaging API bearer token (secret)
  - `TELSTRA_CLIENT_ID` - Telstra OAuth client ID
  - `TELSTRA_CLIENT_SECRET` - Telstra OAuth secret
  - `DEFAULT_CMD_PIN` - Device command PIN (must match firmware config.h)
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Web Push public key
  - `VAPID_PRIVATE_KEY` - Web Push private key (secret)
  - `VAPID_EMAIL` - Web Push contact email
  - `DEVICE_TIMEZONE` - Device reporting timezone (default: Australia/Sydney)

**Build:**
- `frontend/tsconfig.json` - TypeScript strict mode, strict:true, @/* path alias
- `frontend/next.config.ts` - Minimal Next.js config (reactStrictMode: true)
- `frontend/postcss.config.js` - Tailwind CSS postcss plugin
- `firmware/platformio.ini` - ESP32-S3 board, Arduino framework, library dependencies
- `frontend/tailwind.config.js.backup` - Tailwind theme extending

## Platform Requirements

**Development:**
- Node.js 20.x
- npm
- PlatformIO CLI (for firmware builds)
- Deno (for local Edge Function testing)
- Git

**Production:**
- Vercel (Frontend hosting) - Auto-deploys from main branch
- Supabase (Backend-as-a-service) - Project ID: kwmtzwglbaystskubgyt
- ESP32-S3 hardware running PlatformIO firmware
- External SMS gateway: Telstra Messaging API

---

*Stack analysis: 2026-03-23*
