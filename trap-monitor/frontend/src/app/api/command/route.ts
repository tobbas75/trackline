import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import { getServerEnv, publicEnv } from "@/lib/env";

const VALID_COMMANDS = ["STATUS", "GPS", "ARM", "DISARM", "RESET", "SETPIN", "SETGPS", "SETHOUR", "QUEUE", "VERSION"];

// In-memory rate limiter — LRU auto-evicts stale entries to prevent memory leaks on Vercel
const rateLimiter = new LRUCache<string, number[]>({
  max: 500,        // Track up to 500 unique IPs
  ttl: 60_000,     // Auto-expire entries after 60 seconds
});

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60_000; // 60 seconds
  const maxRequests = 10;
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < window);
  recent.push(now);
  rateLimiter.set(ip, recent);
  return recent.length > maxRequests;
}

export async function POST(req: NextRequest) {
  // SEC-01: PIN guard — getServerEnv() ensures DEFAULT_CMD_PIN is set (fail-closed)
  const senv = getServerEnv();
  const pin = senv.DEFAULT_CMD_PIN;

  const supabase = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    senv.SUPABASE_SERVICE_ROLE_KEY,
  );

  // SEC-03: Rate limiting — per-IP, 10 requests per 60 seconds
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { unitId, command } = await req.json();
  if (!unitId || !command) {
    return NextResponse.json({ error: "Missing unitId or command" }, { status: 400 });
  }

  const cmdName = command.split(" ")[0].toUpperCase();
  if (!VALID_COMMANDS.includes(cmdName)) {
    return NextResponse.json({ error: `Invalid command: ${cmdName}` }, { status: 400 });
  }

  // Get unit SMS number
  const { data: unit } = await supabase
    .from("units")
    .select("phone_id")
    .eq("id", unitId)
    .single();

  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  const smsText = `${pin} ${command} #${unitId}`;

  // Send via Telstra Messaging API
  const telstraResp = await fetch("https://messages.telstra.com/v2/messages/sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${senv.TELSTRA_API_TOKEN}`,
    },
    body: JSON.stringify({
      to: [unit.phone_id],
      body: smsText,
    }),
  });

  if (!telstraResp.ok) {
    const err = await telstraResp.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  // Log command to DB — handle insert errors (ERR-01 fix)
  const { error: logError } = await supabase.from("commands").insert({
    unit_id: unitId,
    command: smsText,
    sent_by: "dashboard",
  });
  if (logError) {
    console.error(JSON.stringify({
      level: "error",
      msg: "command_log_insert_failed",
      actor: "dashboard",
      unit_id: unitId,
      error: logError.message,
      ts: new Date().toISOString(),
    }));
  }

  // SEC-04: Audit logging — structured JSON with actor identity
  console.log(JSON.stringify({
    level: "info",
    msg: "command_dispatched",
    actor: "dashboard",
    unit_id: unitId,
    command: cmdName,
    ts: new Date().toISOString(),
  }));

  return NextResponse.json({ ok: true, command: smsText, logged: !logError });
}
