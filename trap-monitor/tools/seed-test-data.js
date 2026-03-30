/**
 * Test Data Seeder — Trap Monitor
 *
 * Generates realistic 30-day time-series data for dashboard development.
 * Uses Supabase REST API (service role key).
 *
 * Usage:
 *   ORG_ID=<uuid> SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=<key> node tools/seed-test-data.js
 *   node tools/seed-test-data.js --org-id <uuid>
 *   node tools/seed-test-data.js --org-id <uuid> --dry-run
 *
 * Environment Variables:
 *   SUPABASE_URL — e.g. http://localhost:54321 (local) or https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — never commit this; use from Supabase console
 *   ORG_ID — UUID of target organization (required)
 *
 * CLI Options:
 *   --org-id <uuid>   Override ORG_ID from env
 *   --dry-run         Generate data and print counts without writing to DB
 *   --help            Print usage
 *
 * To load from .env.local, use a tool like dotenv-cli:
 *   npx dotenv -e backend/.env.local -- node tools/seed-test-data.js
 */

function parseCliArgs(argv) {
  const args = argv.slice(2);

  const getValue = (name) => {
    const eqPrefix = `${name}=`;
    const inline = args.find((arg) => arg.startsWith(eqPrefix));
    if (inline) return inline.slice(eqPrefix.length);

    const idx = args.indexOf(name);
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];

    return undefined;
  };

  return {
    orgId: getValue('--org-id'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  node tools/seed-test-data.js --org-id <uuid> [--dry-run]');
  console.log('  ORG_ID=<uuid> SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node tools/seed-test-data.js');
}

const cli = parseCliArgs(process.argv);

if (cli.help) {
  printUsage();
  process.exit(0);
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = cli.orgId || process.env.ORG_ID;
const DRY_RUN = cli.dryRun;

if (!DRY_RUN && !SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}
if (!ORG_ID) {
  console.error('❌ ORG_ID not set. Usage: node tools/seed-test-data.js --org-id <uuid>');
  process.exit(1);
}

// ── Data Generation ──────────────────────────────────────────────────────────

const UNIT_NAMES = [
  { id: 'TRAP_001', name: 'Ridge Track Alpha', lat: -12.4567, lng: 130.8900 },
  { id: 'TRAP_002', name: 'Creek Crossing Beta', lat: -12.4600, lng: 130.8850 },
  { id: 'TRAP_003', name: 'North Gate Charlie', lat: -12.4500, lng: 130.9000 },
  { id: 'TRAP_004', name: 'South Paddock Delta', lat: -12.4700, lng: 130.8750 },
  { id: 'TRAP_005', name: 'East Fence Echo', lat: -12.4400, lng: 130.9100 },
  { id: 'TRAP_006', name: 'West Ridge Foxtrot', lat: -12.4800, lng: 130.8650 },
  { id: 'TRAP_007', name: 'Central Checkpoint Golf', lat: -12.4550, lng: 130.8950 },
  { id: 'TRAP_008', name: 'Hidden Valley Hotel', lat: -12.4650, lng: 130.8800 },
];

function randomBattery() {
  return Math.floor(Math.random() * 40) + 40; // 40-80%
}

function randomGPS(baseLat, baseLng) {
  // Slight drift: ±0.001 degrees (≈100m)
  return {
    lat: baseLat + (Math.random() - 0.5) * 0.002,
    lng: baseLng + (Math.random() - 0.5) * 0.002,
  };
}

function generateEvents(unitId, baseLat, baseLng, count) {
  const events = [];
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  for (let day = 30; day >= 1; day--) {
    const dayStart = now - day * dayMs + Math.random() * 6 * 3600 * 1000;

    // Daily health check at a semi-consistent offset
    events.push({
      unit_id: unitId,
      event_type: 'HEALTH',
      triggered_at: new Date(dayStart).toISOString(),
      battery_pct: randomBattery(),
      solar_ok: Math.random() > 0.15, // 15% chance of fault
      signal_rssi: Math.floor(Math.random() * 40) - 120,
      fw_version: '1.2.3',
      gps_stale: Math.random() > 0.8,
      trap_caught: false,
      acknowledged: true,
    });

    // Random trap events (2-5 per unit over 30 days, ≈15% of days)
    if (Math.random() < 0.15) {
      const gps = randomGPS(baseLat, baseLng);
      const trapTime = dayStart + Math.random() * dayMs;
      events.push({
        unit_id: unitId,
        event_type: 'TRAP',
        triggered_at: new Date(trapTime).toISOString(),
        battery_pct: randomBattery(),
        solar_ok: Math.random() > 0.1,
        signal_rssi: Math.floor(Math.random() * 40) - 120,
        fw_version: '1.2.3',
        lat: gps.lat,
        lng: gps.lng,
        gps_stale: false,
        trap_caught: true,
        // Some are acknowledged, some unacknowledged (for recent ones)
        acknowledged: trapTime < now - 2 * dayMs,
        ack_at: trapTime < now - 2 * dayMs ? new Date(trapTime + 3600000).toISOString() : null,
      });
    }

    // Low battery alerts (10% chance)
    if (Math.random() < 0.1) {
      const alertTime = dayStart + Math.random() * dayMs;
      events.push({
        unit_id: unitId,
        event_type: 'ALERT',
        triggered_at: new Date(alertTime).toISOString(),
        battery_pct: Math.floor(Math.random() * 15) + 8, // 8-23%
        solar_ok: Math.random() > 0.3,
        signal_rssi: Math.floor(Math.random() * 40) - 120,
        fw_version: '1.2.3',
        gps_stale: Math.random() > 0.6,
        trap_caught: false,
        acknowledged: alertTime < now - dayMs,
      });
    }
  }

  return events;
}

function generateCommands(unitId, count = 3) {
  const commands = [];
  const now = Date.now();
  const commands_list = ['STATUS', 'GPS', 'ARM', 'DISARM', 'CONFIG'];

  for (let i = 0; i < count; i++) {
    const sentTime = now - Math.random() * 7 * 24 * 3600 * 1000; // Last 7 days
    commands.push({
      unit_id: unitId,
      command: commands_list[Math.floor(Math.random() * commands_list.length)],
      sent_at: new Date(sentTime).toISOString(),
      response: 'OK',
      response_at: new Date(sentTime + 10000).toISOString(),
      sent_by: 'operator@example.com',
    });
  }

  return commands;
}

// ── API Helpers ──────────────────────────────────────────────────────────────

async function apiCall(method, table, body, options = {}) {
  const params = new URLSearchParams();
  if (options.onConflict) {
    params.set('on_conflict', options.onConflict);
  }

  const query = params.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
  };

  if (options.upsert) {
    headers.Prefer = 'resolution=merge-duplicates,return=representation';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${response.status}: ${text}`);
    }

    if (!text) {
      return [];
    }

    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${table} ${method}: ${err.message}`);
  }
}

async function insertBatch(table, rows, options = {}) {
  if (rows.length === 0) return;

  if (DRY_RUN) {
    console.log(`  [dry-run] Would insert ${rows.length} rows into ${table}...`);
    return;
  }

  console.log(`  Inserting ${rows.length} rows into ${table}...`);
  await apiCall('POST', table, rows, options);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('='.repeat(70));
  console.log('  Trap Monitor — Test Data Seeder');
  console.log(`  URL: ${SUPABASE_URL}`);
  console.log(`  Org: ${ORG_ID}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log('='.repeat(70));

  try {
    // 1. Create units
    console.log('\n📟 Creating units...');
    const units = UNIT_NAMES.map((def, index) => ({
      id: def.id,
      name: def.name,
      org_id: ORG_ID,
      last_lat: def.lat,
      last_lng: def.lng,
      last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString(),
      firmware_ver: '1.2.3',
      battery_pct: randomBattery(),
      solar_ok: Math.random() > 0.15,
      armed: Math.random() > 0.1, // 10% chance of disarmed
      phone_id: `+6140011${String(index + 1).padStart(4, '0')}`,
    }));

    await insertBatch('units', units, { upsert: true, onConflict: 'id' });
    console.log(`  ✅ ${units.length} units created`);

    // 2. Create events (30 days per unit)
    console.log('\n📊 Creating events...');
    let allEvents = [];
    for (const unit of units) {
      const events = generateEvents(unit.id, unit.last_lat, unit.last_lng);
      allEvents = allEvents.concat(events);
    }

    // PostgREST bulk insert requires all objects in the array to share the same keys.
    const eventDefaults = {
      lat: null,
      lng: null,
      gps_stale: false,
      trap_caught: false,
      acknowledged: false,
      ack_at: null,
    };
    allEvents = allEvents.map((evt) => ({ ...eventDefaults, ...evt }));

    console.log(`  Generated ${allEvents.length} events (${(allEvents.length / units.length).toFixed(1)} per unit)`);

    // Insert in batches of 100
    for (let i = 0; i < allEvents.length; i += 100) {
      const batch = allEvents.slice(i, i + 100);
      await insertBatch('events', batch);
    }
    console.log(`  ✅ ${allEvents.length} events inserted`);

    // 3. Create commands
    console.log('\n⌨️  Creating commands...');
    let allCommands = [];
    for (const unit of units) {
      const commands = generateCommands(unit.id);
      allCommands = allCommands.concat(commands);
    }
    await insertBatch('commands', allCommands);
    console.log(`  ✅ ${allCommands.length} commands inserted`);

    // Stats
    console.log('\n' + '='.repeat(70));
    console.log('  ✅ Seeding complete!');
    console.log('='.repeat(70));
    console.log(`\n  Summary:\n`);
    console.log(`  • Units: ${units.length}`);
    console.log(`  • Events: ${allEvents.length}`);
    console.log(`  • Commands: ${allCommands.length}`);
    const trapEvents = allEvents.filter((e) => e.event_type === 'TRAP');
    const alertEvents = allEvents.filter((e) => e.event_type === 'ALERT');
    console.log(`\n  Event breakdown:\n`);
    console.log(`  • TRAP events: ${trapEvents.length}`);
    console.log(`  • ALERT events: ${alertEvents.length}`);
    console.log(`  • HEALTH checks: ${allEvents.length - trapEvents.length - alertEvents.length}`);
    console.log('\n');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
