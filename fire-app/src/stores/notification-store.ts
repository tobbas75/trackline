import { create } from "zustand";

export type NotificationType = "info" | "warning" | "success" | "error" | "hotspot";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  /** Optional link to navigate to */
  href?: string;
  /** Source of the notification (e.g. "DEA Hotspots", "System") */
  source?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/** Generate a simple unique ID */
function genId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Mock notifications for development */
const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    type: "hotspot",
    title: "New hotspot detected",
    message: "VIIRS hotspot detected within project boundary — confidence 95%, FRP 42 MW.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    href: "/hotspots",
    source: "DEA Hotspots",
  },
  {
    id: "n-2",
    type: "hotspot",
    title: "3 new hotspots in buffer zone",
    message: "3 VIIRS detections within 50km buffer. Nearest is 12km NE of project boundary.",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    read: false,
    href: "/hotspots",
    source: "DEA Hotspots",
  },
  {
    id: "n-3",
    type: "warning",
    title: "High fire danger forecast",
    message: "BOM forecast: Very High fire danger for Tiwi Islands tomorrow. Consider suspending aerial operations.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    href: "/map",
    source: "BOM Weather",
  },
  {
    id: "n-4",
    type: "success",
    title: "ACCU period submitted",
    message: "Reporting period 2024-25 successfully submitted to CER. Reference: SB-2025-001.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    href: "/carbon",
    source: "Carbon",
  },
  {
    id: "n-5",
    type: "info",
    title: "NAFI fire scars updated",
    message: "15 new fire scar polygons imported for October 2025. Total: 2,340 ha EDS, 180 ha LDS.",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read: true,
    href: "/fire-history",
    source: "NAFI",
  },
  {
    id: "n-6",
    type: "info",
    title: "New team member joined",
    message: "Mary Johnson (ranger) has been added to the Tiwi Islands project.",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    read: true,
    source: "System",
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,

  addNotification: (notification) => {
    const newNotif: AppNotification = {
      ...notification,
      id: genId(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id) =>
    set((state) => {
      const notif = state.notifications.find((n) => n.id === id);
      if (!notif || notif.read) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: state.unreadCount - 1,
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notif = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.read ? state.unreadCount - 1 : state.unreadCount,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
