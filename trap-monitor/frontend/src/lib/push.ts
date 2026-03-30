/**
 * Client-side Web Push subscription helper.
 *
 * Setup required:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Add to .env.local:
 *    NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
 *    VAPID_PRIVATE_KEY=<privateKey>
 *    VAPID_EMAIL=mailto:you@example.com
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  orgId: string,
): Promise<{ ok: boolean; error?: string }> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, error: "VAPID key not configured" };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: "Service worker not supported" };

  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, orgId }),
    });

    return res.ok ? { ok: true } : { ok: false, error: "Failed to save subscription" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await fetch("/api/push/subscribe", { method: "DELETE" });
  }
}

export async function getPushSubscriptionState(): Promise<
  "unsupported" | "denied" | "subscribed" | "unsubscribed"
> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return "unsubscribed";

  const sub = await reg.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
