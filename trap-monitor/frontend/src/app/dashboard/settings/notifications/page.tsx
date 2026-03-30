"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navigation from "@/components/Navigation";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscriptionState,
  isPushSupported,
} from "@/lib/push";

const supabase = createClient();

interface NotificationPreferences {
  id: number;
  user_id: string;
  org_id: string;
  trap_catch: boolean;
  unit_offline: boolean;
  low_battery: boolean;
  email_enabled: boolean;
  email_address: string | null;
  created_at: string;
  updated_at: string;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [pushState, setPushState] = useState<
    "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading"
  >("loading");
  const [pushWorking, setPushWorking] = useState(false);

  // Get current org from dashboard or default
  useEffect(() => {
    async function loadPreferences() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch all orgs
        const orgsRes = await fetch("/api/orgs");
        const orgsData = await orgsRes.json();
        if (Array.isArray(orgsData)) {
          setOrgs(orgsData);
        }

        // Try to get org from localStorage or default to first
        let currentOrgId = localStorage.getItem("currentOrgId");
        if (!currentOrgId && Array.isArray(orgsData) && orgsData.length > 0) {
          currentOrgId = orgsData[0].id;
        }

        if (!currentOrgId) {
          setLoading(false);
          return;
        }

        setOrgId(currentOrgId);

        // Fetch preferences
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .eq("org_id", currentOrgId)
          .single();

        if (data) {
          setPrefs(data as NotificationPreferences);
        } else if (error && error.code === "PGRST116") {
          // Not found - create default
          const { data: newPrefs } = await supabase
            .from("notification_preferences")
            .insert({
              user_id: user.id,
              org_id: currentOrgId,
              trap_catch: true,
              unit_offline: true,
              low_battery: true,
              email_enabled: false,
            })
            .select()
            .single();

          if (newPrefs) {
            setPrefs(newPrefs as NotificationPreferences);
          }
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [router]);

  // Load push subscription state after org is known
  useEffect(() => {
    if (!orgId) return;
    getPushSubscriptionState().then(setPushState);
  }, [orgId]);

  const handlePushToggle = async () => {
    if (!orgId) return;
    setPushWorking(true);
    try {
      if (pushState === "subscribed") {
        await unsubscribeFromPush();
        setPushState("unsubscribed");
      } else {
        const result = await subscribeToPush(orgId);
        if (result.ok) {
          setPushState("subscribed");
        } else {
          setMessage({ type: "error", text: result.error ?? "Failed to enable push" });
        }
      }
    } finally {
      setPushWorking(false);
    }
  };

  const handleSave = async () => {
    if (!prefs || !orgId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update({
          trap_catch: prefs.trap_catch,
          unit_offline: prefs.unit_offline,
          low_battery: prefs.low_battery,
          email_enabled: prefs.email_enabled,
          email_address: prefs.email_address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prefs.id);

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Preferences saved successfully" });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="flex flex-col h-screen bg-(--tm-bg)">
        <Navigation orgName="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔔</div>
            <div className="text-(--tm-accent) animate-pulse">
              Loading preferences...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentOrg = orgs.find((o) => o.id === orgId);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-(--tm-bg)">
      <Navigation orgId={orgId || undefined} orgName={currentOrg?.name} />

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 bg-(--tm-panel) border-b border-(--tm-border) p-4 z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-(--tm-accent)">
              🔔 Notification Settings
            </h1>
            <p className="text-(--tm-muted) text-sm mt-1">
              Control how you want to be alerted about trap events
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-4">
          {/* Message */}
          {message && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
                message.type === "success"
                  ? "border-(--tm-ok-border) bg-(--tm-ok-soft) text-(--tm-ok-text)"
                  : "border-(--tm-danger-border) bg-(--tm-danger-soft) text-(--tm-danger)"
              }`}
            >
              {message.type === "success" ? "✓" : "⚠️"} {message.text}
            </div>
          )}

          {/* In-App Notifications */}
          <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-(--tm-text) mb-4">In-App Alerts</h2>
            <p className="text-(--tm-muted) text-sm mb-5">
              These alerts appear in the app notification panel
            </p>

            <div className="space-y-4">
              {/* Trap Catch */}
              <label className="flex items-start gap-4 p-4 bg-(--tm-panel-soft) rounded-lg cursor-pointer hover:bg-(--tm-bg-subtle) transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.trap_catch}
                  onChange={(e) =>
                    setPrefs({ ...prefs, trap_catch: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-(--tm-accent) mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-bold text-(--tm-text)">
                    🔴 Trap Caught Alerts
                  </div>
                  <div className="text-sm text-(--tm-muted) mt-1">
                    Get notified immediately when a trap catches an animal
                  </div>
                </div>
              </label>

              {/* Unit Offline */}
              <label className="flex items-start gap-4 p-4 bg-(--tm-panel-soft) rounded-lg cursor-pointer hover:bg-(--tm-bg-subtle) transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.unit_offline}
                  onChange={(e) =>
                    setPrefs({ ...prefs, unit_offline: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-(--tm-accent) mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-bold text-(--tm-text)">
                    ⚠️ Offline Alerts
                  </div>
                  <div className="text-sm text-(--tm-muted) mt-1">
                    Alert when a unit hasn&apos;t communicated for 26+ hours
                  </div>
                </div>
              </label>

              {/* Low Battery */}
              <label className="flex items-start gap-4 p-4 bg-(--tm-panel-soft) rounded-lg cursor-pointer hover:bg-(--tm-bg-subtle) transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.low_battery}
                  onChange={(e) =>
                    setPrefs({ ...prefs, low_battery: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-(--tm-accent) mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-bold text-(--tm-text)">
                    🔋 Low Battery Alerts
                  </div>
                  <div className="text-sm text-(--tm-muted) mt-1">
                    Alert when any unit&apos;s battery drops below 20%
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-(--tm-text)">📲 Push Notifications</h2>
                <p className="text-(--tm-muted) text-sm mt-1">
                  Get instant alerts on this device — even when the app is closed
                </p>
              </div>
            </div>

            {pushState === "unsupported" && (
              <p className="text-sm text-(--tm-muted) mt-3">
                Push notifications are not supported in this browser.
              </p>
            )}

            {pushState === "denied" && (
              <p className="text-sm text-(--tm-warning) mt-3">
                ⚠️ Notification permission was denied. Please enable it in your
                browser settings and reload.
              </p>
            )}

            {(pushState === "subscribed" || pushState === "unsubscribed") && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handlePushToggle}
                  disabled={pushWorking}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
                    pushState === "subscribed"
                      ? "bg-(--tm-danger-soft) hover:opacity-80 text-(--tm-danger) border border-(--tm-danger-border)"
                      : "bg-(--tm-accent) hover:bg-(--tm-accent-strong) text-white"
                  }`}
                >
                  {pushWorking
                    ? "Working..."
                    : pushState === "subscribed"
                      ? "Disable push on this device"
                      : "Enable push on this device"}
                </button>
                {pushState === "subscribed" && (
                  <span className="text-sm text-(--tm-ok-text)">
                    ✓ Push enabled on this device
                  </span>
                )}
              </div>
            )}

            {pushState === "loading" && (
              <p className="text-sm text-(--tm-muted) mt-3 animate-pulse">
                Checking push status...
              </p>
            )}

            <p className="text-xs text-(--tm-muted) mt-3">
              Push subscriptions are per-device. Enable on each device separately.
            </p>
          </div>

          {/* Email Notifications */}
          <div className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-(--tm-text)">📧 Email Notifications</h2>
                <p className="text-(--tm-muted) text-sm mt-1">
                  Get alerts via email as well
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={(e) =>
                    setPrefs({ ...prefs, email_enabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-(--tm-accent) cursor-pointer"
                />
                <span className="font-medium text-(--tm-text-secondary)">
                  {prefs.email_enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {prefs.email_enabled && (
              <div className="mt-4">
                <label className="block text-sm font-bold text-(--tm-muted) mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={prefs.email_address || ""}
                  onChange={(e) =>
                    setPrefs({ ...prefs, email_address: e.target.value })
                  }
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus) transition-colors"
                />
                <p className="text-xs text-(--tm-muted) mt-2">
                  Emails will be sent to this address when alerts occur
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) disabled:opacity-50 rounded-lg font-bold text-white transition-colors"
            >
              {saving ? "Saving..." : "✓ Save Preferences"}
            </button>
            <button
              onClick={() => router.back()}
              className="px-8 py-3 bg-(--tm-panel-soft) hover:bg-(--tm-bg-subtle) rounded-lg font-bold text-(--tm-text) transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
