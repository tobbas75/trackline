# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript 5.x - Full codebase (strict mode enabled)

**Secondary:**
- JavaScript - Config files (ESLint, PostCSS)

## Runtime

**Environment:**
- Node.js (implicit from package.json, no specific version pinned)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present in repository)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full application framework with App Router
- React 19.2.3 - UI library and rendering engine
- React DOM 19.2.3 - DOM-specific React methods

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
  - Config approach: `@theme inline` in `src/app/globals.css` (CSS-based, no tailwind.config.ts file)
  - PostCSS plugin: `@tailwindcss/postcss` 4.x

**Testing:**
- No testing framework detected (no Jest, Vitest, or test runner configuration present)

**Build/Dev:**
- TypeScript 5.x - Compilation and type checking
- ESLint 9.x - Linting
  - Config: `eslint.config.mjs` (flat config format)
  - Presets: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- PostCSS - CSS transformation pipeline

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.98.0 - Supabase client for authentication and database access
- `@supabase/ssr` 0.9.0 - SSR-specific Supabase utilities for secure cookie-based session management
  - Used in `src/lib/supabase/server.ts` and `src/middleware.ts`

**UI Components:**
- `lucide-react` 0.577.0 - Lightweight icon library

**Fonts:**
- `DM_Serif_Display` - Google Font for display headings (loaded via next/font)
- `Poppins` - Google Font for body text (loaded via next/font)

## Configuration

**Environment:**
- Method: `.env.local` (local only, not committed)
- Template: `.env.local.example` provides reference structure
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key for browser access (public)
  - `NEXT_PUBLIC_APP_URL` - Application base URL for callbacks and links (default: http://localhost:3001)

**Build:**
- `next.config.ts` - Next.js configuration (currently empty with default settings)
- `tsconfig.json` - TypeScript compiler options
  - Path aliases: `@/*` → `./src/*`
  - Strict mode enabled
  - ES2017 target, esnext module resolution

**Linting & Formatting:**
- `eslint.config.mjs` - ESLint configuration (flat config format, Next.js presets)
- No Prettier configuration detected

**PostCSS:**
- `postcss.config.mjs` - Minimal PostCSS setup for Tailwind

## Platform Requirements

**Development:**
- Node.js (version unspecified, typically 18+ recommended for Next.js 16)
- npm (version unspecified)
- Git

**Production:**
- Deployment target: Vercel (mentioned in CLAUDE.md as free tier)
- Framework supports Node.js, Edge Runtime, or Serverless

## Dev Scripts

**Available npm scripts:**
```bash
npm run dev        # Next.js development server (default port 3000, overridden to 3001 in config)
npm run build      # Build application for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking (--noEmit)
npm run check      # Full validation: typecheck + lint + build
```

## Notable Omissions

- No database driver libraries (data access only via Supabase SDK)
- No testing framework or test runner
- No authentication library beyond Supabase
- No state management library (managed via Supabase and Next.js server components)
- No API client wrapper (direct Supabase SDK usage)

---

*Stack analysis: 2026-03-29*
