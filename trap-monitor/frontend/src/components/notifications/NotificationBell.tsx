"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: number;
  title: string;
  body: string;
  read: boolean;
  sent_at: string;
  event_id?: number;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load unread notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("read", false)
          .order("sent_at", { ascending: false })
          .limit(10);

        if (!error && data) {
          setNotifications(data as Notification[]);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications:user")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "read=eq.false",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.length;

  const markAsRead = async (id: number) => {
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("read", false);

    setNotifications([]);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded hover:bg-(--tm-panel-soft) transition-colors"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-(--tm-danger) text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-(--tm-panel) border border-(--tm-border) rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-(--tm-border) flex items-center justify-between">
            <h2 className="text-sm font-semibold text-(--tm-text)">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-(--tm-muted) hover:text-(--tm-text)"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-(--tm-muted)">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-(--tm-muted) text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-(--tm-border) hover:bg-(--tm-panel-soft) transition-colors cursor-pointer group"
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-(--tm-text)">
                        {notif.title}
                      </h3>
                      <p className="text-xs text-(--tm-muted) mt-1">{notif.body}</p>
                      <div className="text-xs text-(--tm-muted) mt-2">
                        {new Date(notif.sent_at).toLocaleString("en-AU")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      className="text-(--tm-muted) hover:text-(--tm-text) opacity-0 group-hover:opacity-100 transition-all"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
