# Domain Rules — Trap Monitor

This file defines business logic invariants.

Agents must preserve these rules when modifying domain logic.

# Core Invariants

## SMS Format Rules
- All outbound SMS must fit within 160 characters (single SMS segment)
- SMS format: `TYPE #UNIT_ID | DETAILS | TIMESTAMP`
- Timestamps use AU format: `DD/MM/YY HH:MM`
- GPS coordinates are optional — only included if unit moved beyond threshold
- Stale GPS (last-known position reused) must be flagged with `*` suffix

## Message Types

| Type | Format | When |
|------|--------|------|
| Trap alert | `TRAP #ID \| CAUGHT \| DD/MM/YY HH:MM` | Reed switch triggers |
| Trap + GPS | `TRAP #ID \| CAUGHT \| timestamp \| GPS lat,lng` | Trigger + unit moved |
| Health check | `HEALTH #ID \| timestamp \| Bt:NN% Sol:OK FW:x.x \| EMPTY/CAUGHT` | Daily scheduled |
| Low battery | `ALERT #ID \| LOW BATT NN% \| Solar:OK \| timestamp` | Battery < 20% |
| Critical battery | `ALERT #ID \| CRIT BATT NN% SHUTTING DOWN \| timestamp` | Battery < 10% |

## SMS Parsing (Backend)
- Parser must handle both Telstra and Twilio webhook formats
- Unit ID extracted by `#` prefix pattern
- Timestamps parsed from DD/MM/YY HH:MM → ISO 8601 (default AEST timezone)
- Unknown SMS formats should be stored as raw events, not rejected

# State Machine Rules

## Firmware States (strict ordering)

```
WAKE_ASSESS → COMPOSE_MSG → GPS_CHECK → MODEM_INIT → SEND_MSG → CMD_LISTEN → MODEM_OFF → DEEP_SLEEP
```

- States must execute in order — no skipping except on critical failure
- Critical battery (< 10%) sends last-gasp SMS then forces shutdown — no command listen
- Failed sends queue message to LittleFS for retry (max 50 messages, max 5 retries per message)
- Retry interval: 5 minutes between attempts

## Wake Reasons (mutually exclusive per cycle)

| Reason | Trigger | Priority |
|--------|---------|----------|
| TRAP | Reed switch GPIO interrupt | Highest — immediate alert |
| HEALTH | RTC alarm at configured hour | Normal — daily check-in |
| RETRY | Queued messages waiting | Normal — clear backlog |
| BOOT | Power-on / reset | Initial setup only |

## Unit Status Determination (Frontend)

| Status | Condition | Visual |
|--------|-----------|--------|
| Caught | `trap_caught = true` AND not acknowledged | Red, pulsing marker |
| Normal | Armed, recently seen, adequate battery | Green marker |
| Offline | No contact for > 26 hours | Gray marker |
| Low battery | Battery < 20% | Amber marker |
| Disarmed | `armed = false` | Purple marker |

# Command Authentication

- All inbound commands require 4-digit PIN prefix
- PIN is validated against `DEFAULT_CMD_PIN` in firmware config
- Invalid PIN → command silently ignored (no response SMS)
- Default PIN "0000" must be changed before deployment

## Command Set

| Command | Effect | Response |
|---------|--------|----------|
| STATUS | Force health report | Full health SMS |
| GPS | Get current location | GPS coordinates SMS |
| ARM | Enable trap alerts | Confirmation SMS |
| DISARM | Suppress alerts | Confirmation SMS |
| RESET | Reboot MCU | Unit restarts |
| SETGPS N | Set movement threshold (meters) | Confirmation |
| SETHOUR N | Set health check hour (0-23) | Confirmation |
| QUEUE | Check unsent count | Queue depth SMS |
| VERSION | Get firmware version | Version string SMS |

# Power Management Rules

- Deep sleep is the default state — all wake cycles must return to sleep
- Battery thresholds: 20% = low warning, 10% = critical shutdown
- Battery pack: 2S LiFePO4, 7.2V nominal, 3.6–2.8V per cell usable range
- Solar detection via current sense ADC — reports OK/FAULT
- GPS timeout: 5 minutes max — abandon if no fix
- Command listen window: 60 seconds after sending — then modem off
- Polling interval: every 4 hours even without events (heartbeat)

# GPS Rules

- Movement threshold default: 50 meters
- GPS included in SMS only if unit moved beyond threshold since last known position
- Stale GPS (fix older than current cycle) marked with `*`
- GPS timeout: 300 seconds — if no fix, send message without coordinates
- Coordinates stored as decimal degrees (lat, lng)

# Database Rules

- PostGIS extension required for spatial queries
- RLS must be enabled on all tables
- Service role (Edge Functions) can INSERT — never expose service key to client
- Authenticated users can SELECT all data + INSERT commands
- `units` table upserted on every inbound SMS (latest state always current)
- `events` table is append-only history — never update or delete events
- All timestamps stored as UTC in database
