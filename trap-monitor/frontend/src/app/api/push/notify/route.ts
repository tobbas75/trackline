import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getServerEnv, publicEnv } from "@/lib/env";

export interface PushPayload {
  orgId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * POST /api/push/notify
 * Called by Supabase webhook (or ingest-sms edge function) when a trap fires.
 * Body: { orgId, title, body, url?, tag? }
 *
 * Secure with SUPABASE_WEBHOOK_SECRET in env — set as Authorization header.
 */
export async function POST(req: NextRequest) {
  const senv = getServerEnv();

  // SEC-02: Webhook secret — getServerEnv() ensures secret is set (fail-closed)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${senv.SUPABASE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: PushPayload = await req.json();
  if (!payload.orgId || !payload.title) {
    return NextResponse.json({ error: "Missing orgId or title" }, { status: 400 });
  }

  // Configure VAPID per-request (safe for build-time — env vars only available at runtime)
  // Generate keys: npx web-push generate-vapid-keys
  // Add to .env.local: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
  webpush.setVapidDetails(
    senv.VAPID_EMAIL,
    publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    senv.VAPID_PRIVATE_KEY,
  );

  // Import supabase server client with service role for reading subscriptions
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    senv.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("org_id", payload.orgId);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "trap-alert",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushPayload,
      ),
    ),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  // SEC-04: Audit logging — structured JSON with actor identity
  console.log(JSON.stringify({
    level: "info",
    msg: "push_notifications_sent",
    actor: "webhook",
    org_id: payload.orgId,
    sent: sent,
    total: subs.length,
    ts: new Date().toISOString(),
  }));

  return NextResponse.json({ ok: true, sent, total: subs.length });
}
