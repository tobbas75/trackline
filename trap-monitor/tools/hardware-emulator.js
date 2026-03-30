#!/usr/bin/env node
/**
 * Hardware Emulator — Trap Monitor
 *
 * Simulates a fleet of ESP32 trap units with a visual web UI.
 * Zero dependencies — uses only Node.js built-in modules.
 *
 * Usage:
 *   node tools/hardware-emulator.js --org-id <uuid>
 *   node tools/hardware-emulator.js --org-id <uuid> --speed 5 --port 3333
 *
 * Automatically loads frontend/.env.local for Supabase credentials.
 *
 * Opens a browser dashboard at http://localhost:3333 with:
 *   - Live fleet status grid (all 8 units)
 *   - One-click buttons to trigger trap, battery drain, solar fault, etc.
 *   - Real-time event log
 *   - Auto-simulation with pause/resume
 */

const http = require("http");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── Auto-load frontend/.env.local ────────────────────────────────────────────
// So you can just run: node tools/hardware-emulator.js --org-id <uuid>
const envPath = path.resolve(__dirname, "..", "frontend", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (name) => {
    const eq = args.find((a) => a.startsWith(`${name}=`));
    if (eq) return eq.slice(name.length + 1);
    const idx = args.indexOf(name);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  return {
    orgId: get("--org-id"),
    speed: parseInt(get("--speed") || "1", 10),
    port: parseInt(get("--port") || "3333", 10),
    help: args.includes("--help") || args.includes("-h"),
    noBrowser: args.includes("--no-browser"),
  };
}

const cli = parseArgs(process.argv);

if (cli.help) {
  console.log(`
Trap Monitor Hardware Emulator (Web UI)

Usage:
  npx dotenv -e frontend/.env.local -- node tools/hardware-emulator.js --org-id <uuid>

Options:
  --org-id <uuid>   Organization UUID (required)
  --speed N         Speed multiplier (default 1)
  --port N          HTTP port (default 3333)
  --no-browser      Don't auto-open browser
  --help            Show this help

Environment:
  SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ORG_ID (fallback for --org-id)
`);
  process.exit(0);
}

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kwmtzwglbaystskubgyt.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = cli.orgId || process.env.ORG_ID;
const SPEED = Math.max(1, cli.speed || 1);
const PORT = cli.port;

if (!SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY not set.");
  console.error("Tip: npx dotenv -e frontend/.env.local -- node tools/hardware-emulator.js --org-id <uuid>");
  process.exit(1);
}
if (!ORG_ID) {
  console.error("Error: --org-id <uuid> or ORG_ID env var required.");
  process.exit(1);
}

// ── Fleet ────────────────────────────────────────────────────────────────────

const FLEET = [
  { id: "TRAP_001", name: "Ridge Track Alpha",       lat: -12.4567, lng: 130.890, phone: "+61400111001" },
  { id: "TRAP_002", name: "Creek Crossing Beta",     lat: -12.4600, lng: 130.885, phone: "+61400111002" },
  { id: "TRAP_003", name: "North Gate Charlie",      lat: -12.4500, lng: 130.900, phone: "+61400111003" },
  { id: "TRAP_004", name: "South Paddock Delta",     lat: -12.4700, lng: 130.875, phone: "+61400111004" },
  { id: "TRAP_005", name: "East Fence Echo",         lat: -12.4400, lng: 130.910, phone: "+61400111005" },
  { id: "TRAP_006", name: "West Ridge Foxtrot",      lat: -12.4800, lng: 130.865, phone: "+61400111006" },
  { id: "TRAP_007", name: "Central Checkpoint Golf", lat: -12.4550, lng: 130.895, phone: "+61400111007" },
  { id: "TRAP_008", name: "Hidden Valley Hotel",     lat: -12.4650, lng: 130.880, phone: "+61400111008" },
];

const units = FLEET.map((def) => ({
  ...def,
  battery_pct: 70 + Math.floor(Math.random() * 25),
  solar_ok: true,
  armed: true,
  firmware_ver: "1.2.3",
  last_seen: new Date().toISOString(),
  trapped: false,
}));

let paused = false;
let eventCount = 0;
const eventLog = []; // { ts, type, unitId, detail }

// ── SSE clients ──────────────────────────────────────────────────────────────

const sseClients = new Set();

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

function pushState() {
  broadcast({ type: "state", units, paused, eventCount, log: eventLog.slice(-60) });
}

// ── Supabase REST ────────────────────────────────────────────────────────────

async function supabasePost(table, rows, options = {}) {
  const params = new URLSearchParams();
  if (options.onConflict) params.set("on_conflict", options.onConflict);
  const query = params.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  };
  if (options.upsert) headers.Prefer = "resolution=merge-duplicates,return=representation";

  const res = await fetch(url, {
    method: "POST", headers,
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table} POST ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function supabasePatch(table, match, updates) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) params.set(k, `eq.${v}`);
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "return=representation",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table} PATCH ${res.status}: ${text}`);
  }
}

// ── Event generators ─────────────────────────────────────────────────────────

function gpsDrift(lat, lng) {
  return { lat: lat + (Math.random() - 0.5) * 0.001, lng: lng + (Math.random() - 0.5) * 0.001 };
}

function fmtDeviceTime() {
  const n = new Date();
  return `${String(n.getDate()).padStart(2,"0")}/${String(n.getMonth()+1).padStart(2,"0")}/${String(n.getFullYear()).slice(2)} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
}

function randomUnit() { return units[Math.floor(Math.random() * units.length)]; }

function addLog(type, unit, detail) {
  const entry = { ts: new Date().toISOString(), type, unitId: unit.id, unitName: unit.name, detail };
  eventLog.push(entry);
  if (eventLog.length > 200) eventLog.shift();
  console.log(`  [${new Date().toLocaleTimeString()}] ${type.padEnd(6)} ${unit.id} — ${detail}`);
}

async function upsertUnit(unit) {
  await supabasePost("units", {
    id: unit.id, name: unit.name, org_id: ORG_ID, phone_id: unit.phone,
    last_lat: unit.lat, last_lng: unit.lng, last_seen: unit.last_seen,
    firmware_ver: unit.firmware_ver, battery_pct: unit.battery_pct,
    solar_ok: unit.solar_ok, armed: unit.armed,
  }, { upsert: true, onConflict: "id" });
}

async function insertEvent(row) {
  await supabasePost("events", {
    unit_id: row.unit_id, event_type: row.event_type, triggered_at: row.triggered_at,
    battery_pct: row.battery_pct ?? null, solar_ok: row.solar_ok ?? true,
    fw_version: row.fw_version ?? null, lat: row.lat ?? null, lng: row.lng ?? null,
    gps_stale: row.gps_stale ?? false, trap_caught: row.trap_caught ?? false,
    acknowledged: false, raw_sms: row.raw_sms ?? null, signal_rssi: row.signal_rssi ?? null,
  });
  eventCount++;
}

async function sendHealthCheck(unit) {
  const now = new Date().toISOString();
  unit.last_seen = now;
  unit.battery_pct = Math.max(0, Math.round(unit.battery_pct - Math.random() * 1.5 - 0.5));
  if (Math.random() < 0.05) unit.solar_ok = !unit.solar_ok;
  const gps = gpsDrift(unit.lat, unit.lng);
  const raw = `HEALTH #${unit.id} | ${fmtDeviceTime()} | Bt:${unit.battery_pct}% Sol:${unit.solar_ok?"OK":"FAULT"} FW:${unit.firmware_ver} | EMPTY`;
  await upsertUnit(unit);
  await insertEvent({ unit_id: unit.id, event_type: "HEALTH", triggered_at: now,
    battery_pct: unit.battery_pct, solar_ok: unit.solar_ok, fw_version: unit.firmware_ver,
    lat: gps.lat, lng: gps.lng, raw_sms: raw });
  addLog("HEALTH", unit, `Bt:${unit.battery_pct}% Sol:${unit.solar_ok?"OK":"FAULT"}`);
  pushState();
}

async function sendTrapEvent(unit) {
  const now = new Date().toISOString();
  unit.last_seen = now;
  unit.trapped = true;
  const gps = gpsDrift(unit.lat, unit.lng);
  unit.lat = gps.lat; unit.lng = gps.lng;
  const raw = `TRAP #${unit.id} | CAUGHT | ${fmtDeviceTime()} | GPS ${gps.lat.toFixed(4)},${gps.lng.toFixed(4)}`;
  await upsertUnit(unit);
  await insertEvent({ unit_id: unit.id, event_type: "TRAP", triggered_at: now,
    battery_pct: unit.battery_pct, solar_ok: unit.solar_ok, fw_version: unit.firmware_ver,
    lat: gps.lat, lng: gps.lng, trap_caught: true, raw_sms: raw });
  addLog("TRAP", unit, `CAUGHT at ${gps.lat.toFixed(4)},${gps.lng.toFixed(4)}`);
  pushState();
}

async function sendBatteryAlert(unit, pct) {
  const now = new Date().toISOString();
  unit.last_seen = now; unit.battery_pct = pct;
  const crit = pct < 10;
  const raw = crit
    ? `ALERT #${unit.id} | CRIT BATT ${pct}% SHUTTING DOWN | Solar:${unit.solar_ok?"OK":"FAULT"} | ${fmtDeviceTime()}`
    : `ALERT #${unit.id} | LOW BATT ${pct}% | Solar:${unit.solar_ok?"OK":"FAULT"} | ${fmtDeviceTime()}`;
  await upsertUnit(unit);
  await insertEvent({ unit_id: unit.id, event_type: "ALERT", triggered_at: now,
    battery_pct: pct, solar_ok: unit.solar_ok, raw_sms: raw });
  addLog("ALERT", unit, `${crit?"CRIT":"LOW"} BATT ${pct}%`);
  pushState();
}

async function toggleSolar(unit) {
  unit.solar_ok = !unit.solar_ok; unit.last_seen = new Date().toISOString();
  await upsertUnit(unit);
  addLog("SOLAR", unit, unit.solar_ok ? "OK" : "FAULT");
  pushState();
}

async function toggleArmed(unit) {
  unit.armed = !unit.armed; unit.last_seen = new Date().toISOString();
  await upsertUnit(unit);
  addLog("ARM", unit, unit.armed ? "ARMED" : "DISARMED");
  pushState();
}

async function simulateOffline(unit) {
  const past = new Date(Date.now() - 27 * 3600 * 1000).toISOString();
  unit.last_seen = past;
  await supabasePatch("units", { id: unit.id }, { last_seen: past });
  addLog("OFFLINE", unit, "Simulated offline (27h ago)");
  pushState();
}

async function resetAll() {
  for (const u of units) {
    u.battery_pct = 70 + Math.floor(Math.random() * 25);
    u.solar_ok = true; u.armed = true; u.trapped = false;
    u.last_seen = new Date().toISOString();
    await upsertUnit(u);
  }
  addLog("RESET", units[0], "All units reset to healthy");
  pushState();
}

async function setBattery(unit, pct) {
  unit.battery_pct = pct; unit.last_seen = new Date().toISOString();
  await upsertUnit(unit);
  if (pct <= 20) await sendBatteryAlert(unit, pct);
  else { addLog("BATT", unit, `Set to ${pct}%`); pushState(); }
}

// ── Auto-simulation ──────────────────────────────────────────────────────────

let healthTimer, randomTimer;

function startAuto() {
  healthTimer = setInterval(async () => {
    if (paused) return;
    const count = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const u = randomUnit();
      try {
        await sendHealthCheck(u);
        if (u.battery_pct <= 20) await sendBatteryAlert(u, u.battery_pct);
      } catch (e) { console.error(`  Health error: ${e.message}`); }
    }
  }, 30000 / SPEED);

  randomTimer = setInterval(async () => {
    if (paused) return;
    if (Math.random() < 0.15) {
      const u = randomUnit();
      if (u.armed && !u.trapped) {
        try { await sendTrapEvent(u); } catch (e) { console.error(`  Trap error: ${e.message}`); }
      }
    }
  }, 15000 / SPEED);
}

// ── Action router ────────────────────────────────────────────────────────────

async function handleAction(action, unitIdx) {
  const unit = unitIdx != null ? units[unitIdx] : randomUnit();
  switch (action) {
    case "trap":        await sendTrapEvent(unit); break;
    case "health":      await sendHealthCheck(unit); break;
    case "health_all":  for (const u of units) await sendHealthCheck(u); break;
    case "low_batt":    await setBattery(unit, 12 + Math.floor(Math.random() * 8)); break;
    case "crit_batt":   await setBattery(unit, 3 + Math.floor(Math.random() * 6)); break;
    case "solar":       await toggleSolar(unit); break;
    case "arm":         await toggleArmed(unit); break;
    case "offline":     await simulateOffline(unit); break;
    case "fire_all":    for (const u of units) { if (u.armed) await sendTrapEvent(u); } break;
    case "reset":       await resetAll(); break;
    case "pause":       paused = !paused; pushState(); break;
    case "set_batt":    await setBattery(unit, unitIdx != null ? 100 : 50); break;
    default: break;
  }
}

// ── HTTP Server + embedded UI ────────────────────────────────────────────────

const HTML = /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trap Monitor — Hardware Emulator</title>
<style>
  :root {
    --bg: #0f1117; --panel: #1a1d27; --border: #2a2d3a; --text: #e4e6ed;
    --muted: #7a7f92; --accent: #3b82f6; --red: #ef4444; --amber: #f59e0b;
    --green: #22c55e; --purple: #a855f7; --gray: #6b7280;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--text); min-height: 100vh; }

  .header { background: var(--panel); border-bottom: 1px solid var(--border);
    padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header h1 span { color: var(--accent); }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
    border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); }
  .badge.running { border-color: #166534; background: #14532d30; color: var(--green); }
  .badge.paused { border-color: #92400e; background: #78350f30; color: var(--amber); }
  .badge .dot { width: 8px; height: 8px; border-radius: 50%; }
  .badge.running .dot { background: var(--green); animation: pulse 2s infinite; }
  .badge.paused .dot { background: var(--amber); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .stats { display: flex; gap: 8px; flex-wrap: wrap; }
  .stat { padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
    border: 1px solid var(--border); background: var(--panel); }
  .stat.events { color: var(--accent); }
  .stat.speed { color: var(--muted); }

  .main { display: grid; grid-template-columns: 1fr 340px; gap: 0; min-height: calc(100vh - 64px); }
  @media (max-width: 900px) { .main { grid-template-columns: 1fr; } }

  .fleet { padding: 20px; overflow-y: auto; }
  .fleet h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--muted); margin-bottom: 12px; font-weight: 700; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }

  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
    padding: 16px; transition: border-color 0.2s; }
  .card.caught { border-color: var(--red); background: #7f1d1d15; }
  .card.offline { border-color: var(--gray); opacity: 0.7; }
  .card.lowbatt { border-color: var(--amber); background: #78350f10; }

  .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .card-head .name { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
  .dot-status { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .card-head .uid { font-size: 11px; color: var(--muted); font-family: monospace; }

  .card-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .metric { text-align: center; }
  .metric .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--muted); margin-bottom: 2px; }
  .metric .value { font-size: 18px; font-weight: 700; }
  .metric .value.ok { color: var(--green); }
  .metric .value.warn { color: var(--amber); }
  .metric .value.crit { color: var(--red); }
  .metric .value.off { color: var(--gray); }
  .metric .value.purple { color: var(--purple); }

  .batt-bar { height: 6px; border-radius: 3px; background: var(--border); margin-bottom: 12px; overflow: hidden; }
  .batt-bar .fill { height: 100%; border-radius: 3px; transition: width 0.5s, background 0.3s; }

  .card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .btn { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--bg); color: var(--text); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .btn:hover { background: var(--border); border-color: var(--accent); }
  .btn:active { transform: scale(0.96); }
  .btn.danger { border-color: #991b1b; color: var(--red); }
  .btn.danger:hover { background: #7f1d1d30; border-color: var(--red); }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.primary:hover { background: #2563eb; }

  .sidebar { border-left: 1px solid var(--border); background: var(--panel);
    display: flex; flex-direction: column; overflow: hidden; }
  @media (max-width: 900px) { .sidebar { border-left: none; border-top: 1px solid var(--border); max-height: 50vh; } }

  .sidebar h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--muted); padding: 16px 16px 8px; font-weight: 700; flex-shrink: 0; }

  .global-actions { padding: 8px 16px 16px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
    border-bottom: 1px solid var(--border); }

  .log-feed { flex: 1; overflow-y: auto; padding: 8px 12px; }
  .log-entry { padding: 6px 8px; border-radius: 8px; margin-bottom: 4px; font-size: 12px;
    border: 1px solid transparent; display: flex; gap: 8px; align-items: flex-start; }
  .log-entry:hover { background: var(--bg); }
  .log-entry .icon { flex-shrink: 0; font-size: 14px; }
  .log-entry .body { flex: 1; min-width: 0; }
  .log-entry .ts { color: var(--muted); font-size: 10px; font-family: monospace; }
  .log-entry .msg { color: var(--text); word-break: break-word; }
  .log-entry.TRAP { border-color: #7f1d1d50; background: #7f1d1d10; }
  .log-entry.ALERT { border-color: #78350f50; background: #78350f10; }

  .toast { position: fixed; bottom: 20px; right: 20px; background: var(--accent);
    color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
    opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 100; }
  .toast.show { opacity: 1; }

  .connecting { display: flex; align-items: center; justify-content: center; height: 100vh;
    font-size: 18px; color: var(--muted); flex-direction: column; gap: 12px; }
  .connecting .spinner { width: 32px; height: 32px; border: 3px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>

<div id="app" class="connecting">
  <div class="spinner"></div>
  <div>Connecting to emulator...</div>
</div>

<div id="toast" class="toast"></div>

<script>
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let state = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

async function action(name, idx) {
  try {
    const params = new URLSearchParams({ action: name });
    if (idx != null) params.set('unit', idx);
    const res = await fetch('/api/action?' + params);
    if (!res.ok) toast('Error: ' + (await res.text()));
  } catch (e) { toast('Network error'); }
}

function relTime(iso) {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return Math.floor(ms/60000) + 'm ago';
  if (ms < 86400000) return Math.floor(ms/3600000) + 'h ago';
  return Math.floor(ms/86400000) + 'd ago';
}

function unitStatus(u) {
  const ms = u.last_seen ? Date.now() - new Date(u.last_seen).getTime() : Infinity;
  if (u.trapped) return 'caught';
  if (ms > 26*3600000) return 'offline';
  if (u.battery_pct <= 20) return 'lowbatt';
  if (!u.armed) return 'disarmed';
  return 'normal';
}

function statusColor(s) {
  return { caught:'var(--red)', offline:'var(--gray)', lowbatt:'var(--amber)',
    disarmed:'var(--purple)', normal:'var(--green)' }[s] || 'var(--green)';
}

function battColor(pct) {
  if (pct <= 10) return 'var(--red)';
  if (pct <= 20) return 'var(--amber)';
  return 'var(--green)';
}

function battClass(pct) {
  if (pct <= 10) return 'crit';
  if (pct <= 20) return 'warn';
  return 'ok';
}

function logIcon(type) {
  return { TRAP:'\\u{1F534}', HEALTH:'\\u{1F49A}', ALERT:'\\u26A0\\uFE0F',
    SOLAR:'\\u2600\\uFE0F', ARM:'\\u{1F6E1}\\uFE0F', OFFLINE:'\\u{1F4E1}',
    RESET:'\\u{1F504}', BATT:'\\u{1F50B}' }[type] || '\\u2022';
}

function render() {
  if (!state) return;
  const { units: uu, paused, eventCount, log } = state;

  app.innerHTML = \`
    <div class="header">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <h1><span>\\u{1FAA4}</span> Trap Monitor <span>Hardware Emulator</span></h1>
        <div class="badge \${paused ? 'paused' : 'running'}">
          <div class="dot"></div>
          \${paused ? 'Paused' : 'Simulating'}
        </div>
      </div>
      <div class="stats">
        <div class="stat events">Events: \${eventCount}</div>
        <div class="stat speed">\${SPEED}x speed</div>
      </div>
    </div>
    <div class="main">
      <div class="fleet">
        <h2>Fleet Status — \${uu.length} Units</h2>
        <div class="grid">
          \${uu.map((u, i) => {
            const st = unitStatus(u);
            const sc = statusColor(st);
            return \`
            <div class="card \${st}">
              <div class="card-head">
                <div>
                  <div class="name">
                    <div class="dot-status" style="background:\${sc};\${st==='caught'?'animation:pulse 1.5s infinite':''}"></div>
                    \${u.name}
                  </div>
                  <div class="uid">\${u.id} &middot; \${st.charAt(0).toUpperCase()+st.slice(1)}</div>
                </div>
              </div>
              <div class="card-metrics">
                <div class="metric">
                  <div class="label">Battery</div>
                  <div class="value \${battClass(u.battery_pct)}">\${u.battery_pct}%</div>
                </div>
                <div class="metric">
                  <div class="label">Solar</div>
                  <div class="value \${u.solar_ok ? 'ok' : 'crit'}">\${u.solar_ok ? 'OK' : 'FAULT'}</div>
                </div>
                <div class="metric">
                  <div class="label">Armed</div>
                  <div class="value \${u.armed ? 'ok' : 'purple'}">\${u.armed ? 'Yes' : 'No'}</div>
                </div>
                <div class="metric">
                  <div class="label">Last Seen</div>
                  <div class="value \${st==='offline'?'off':''}" style="font-size:13px">\${relTime(u.last_seen)}</div>
                </div>
              </div>
              <div class="batt-bar"><div class="fill" style="width:\${u.battery_pct}%;background:\${battColor(u.battery_pct)}"></div></div>
              <div class="card-actions">
                <button class="btn danger" onclick="action('trap',\${i})">Trigger Trap</button>
                <button class="btn" onclick="action('health',\${i})">Health Check</button>
                <button class="btn" onclick="action('low_batt',\${i})">Low Batt</button>
                <button class="btn" onclick="action('crit_batt',\${i})">Crit Batt</button>
                <button class="btn" onclick="action('solar',\${i})">Toggle Solar</button>
                <button class="btn" onclick="action('arm',\${i})">Toggle Arm</button>
                <button class="btn" onclick="action('offline',\${i})">Go Offline</button>
              </div>
            </div>\`;
          }).join('')}
        </div>
      </div>
      <div class="sidebar">
        <h2>Global Controls</h2>
        <div class="global-actions">
          <button class="btn primary" onclick="action('health_all')">Health All</button>
          <button class="btn danger" onclick="action('fire_all')">Fire All Traps</button>
          <button class="btn" onclick="action('reset')">Reset Fleet</button>
          <button class="btn" onclick="action('pause')">\${paused ? '\\u25B6 Resume' : '\\u23F8 Pause'}</button>
        </div>
        <h2>Event Log</h2>
        <div class="log-feed">
          \${(log || []).slice().reverse().map(e => \`
            <div class="log-entry \${e.type}">
              <div class="icon">\${logIcon(e.type)}</div>
              <div class="body">
                <div class="msg"><strong>\${e.unitId}</strong> — \${e.detail}</div>
                <div class="ts">\${new Date(e.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
  \`;
}

const SPEED = ${SPEED};

// SSE connection
function connect() {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    state = JSON.parse(e.data);
    render();
  };
  es.onerror = () => {
    es.close();
    setTimeout(connect, 2000);
  };
}
connect();

// Re-render every 10s to update relative timestamps
setInterval(() => { if (state) render(); }, 10000);
</script>
</body>
</html>`;

// ── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // SSE endpoint
  if (url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    sseClients.add(res);
    pushState();
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // Action endpoint
  if (url.pathname === "/api/action") {
    const actionName = url.searchParams.get("action");
    const unitIdx = url.searchParams.has("unit") ? parseInt(url.searchParams.get("unit")) : null;
    try {
      await handleAction(actionName, unitIdx);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(e.message);
    }
    return;
  }

  // Serve the UI
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML);
});

// ── Init & Launch ────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("=".repeat(60));
  console.log("  Trap Monitor — Hardware Emulator");
  console.log("=".repeat(60));
  console.log(`  Supabase:  ${SUPABASE_URL}`);
  console.log(`  Org ID:    ${ORG_ID}`);
  console.log(`  Speed:     ${SPEED}x`);
  console.log(`  Units:     ${units.length}`);
  console.log("");

  // Init fleet
  console.log("  Initializing fleet...");
  for (const u of units) {
    u.last_seen = new Date().toISOString();
    try {
      await upsertUnit(u);
      console.log(`    ${u.id} registered`);
    } catch (e) {
      console.error(`    FAILED ${u.id}: ${e.message}`);
      throw e;
    }
  }
  console.log("  Sending initial health checks...");
  for (const u of units) {
    try {
      await sendHealthCheck(u);
    } catch (e) {
      console.error(`    FAILED health ${u.id}: ${e.message}`);
      throw e;
    }
  }
  console.log("  Fleet online.\n");

  // Start auto-simulation
  startAuto();

  // Start HTTP server
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`  Dashboard: ${url}`);
    console.log("  Press Ctrl+C to stop.\n");

    // Auto-open browser
    if (!cli.noBrowser) {
      const cmd = process.platform === "win32" ? `start ${url}`
        : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
      exec(cmd, () => {});
    }
  });
}

main().catch((e) => { console.error(`\n  Fatal: ${e.message}\n${e.stack}\n`); process.exit(1); });
