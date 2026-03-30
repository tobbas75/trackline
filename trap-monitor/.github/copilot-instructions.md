# Copilot Instructions

This repository uses a centralized AI development system.

Before making significant changes, read:

- `CLAUDE.md` — project working instructions and critical security rules
- `ARCHITECTURE.md` — system structure and boundaries
- `DOMAIN_RULES.md` — business invariants and calculations
- `REPO_MAP.md` — folder layout and sensitive areas

Global behaviour rules:
`C:\Users\tobyw\OneDrive\AI Global rules\rules\GLOBAL_AI_CODING_RULES.md`

## Critical Security Rules

Never:
- hardcode API keys, tokens, or secrets
- commit .env or credential files
- expose tokens to client-side code
- run destructive commands without explicit approval
- call external APIs over HTTP — HTTPS only
- concatenate user input into SQL queries or shell commands

If a secret appears in code, stop and warn the user immediately.

## Project Context

This is an SMS-based IoT trap monitoring system with three independent layers:

- **Firmware** (C++ / PlatformIO / ESP32-S3) — state machine, deep sleep, SMS via SIM7080G
- **Backend** (Supabase / Deno Edge Functions) — SMS webhook ingestion, PostgreSQL + PostGIS
- **Frontend** (Next.js App Router / Tailwind / Leaflet) — real-time dashboard with map

## Key Constraints

- SMS messages must fit within 160 characters
- SMS format in firmware (`messages.h`) must match parser in backend (`ingest-sms/index.ts`)
- All modem drivers must implement `IModem.h` interface
- All tunable parameters belong in `firmware/src/config.h`
- Database tables must have RLS enabled
- Frontend API calls to external services go through `/api/` routes only
- Deep sleep is the default firmware state — minimize wake time

## Confidence Calibration — Non-Negotiable

This project includes hardware, firmware, and PCB design. Overconfident AI language has directly caused mistakes.

- Never state component specs, part numbers, pinouts, or voltages as fact unless verified from a datasheet this session
- Never present suggestions as settled decisions — say "I'd suggest", not "we should"
- Distinguish confirmed decisions from things merely discussed
- Say what you checked and what you didn't when reviewing hardware docs
- Prefix with confidence level when stakes are high

If you are unsure, say so. Being wrong and confident is worse than being wrong and honest.

## Expectations

- Read relevant files before editing
- Follow existing architecture
- Make the smallest safe change
- Scan impact before modifying shared code
- Verify behaviour before completion
