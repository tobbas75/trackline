import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "@/stores/notification-store";

describe("notification-store", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  it("starts with empty state after reset", () => {
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications).toHaveLength(0);
    expect(unreadCount).toBe(0);
  });

  it("adds a notification and increments unread count", () => {
    useNotificationStore.getState().addNotification({
      type: "hotspot",
      title: "Test hotspot",
      message: "VIIRS detection",
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.notifications[0].read).toBe(false);
    expect(state.notifications[0].title).toBe("Test hotspot");
  });

  it("prepends new notifications (newest first)", () => {
    const { addNotification } = useNotificationStore.getState();
    addNotification({ type: "info", title: "First", message: "m" });
    addNotification({ type: "info", title: "Second", message: "m" });

    const state = useNotificationStore.getState();
    expect(state.notifications[0].title).toBe("Second");
    expect(state.notifications[1].title).toBe("First");
  });

  it("marks a notification as read and decrements unread count", () => {
    useNotificationStore.getState().addNotification({
      type: "info",
      title: "Test",
      message: "m",
    });
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().markRead(id);

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it("does not decrement below zero when marking already-read", () => {
    useNotificationStore.getState().addNotification({
      type: "info",
      title: "Test",
      message: "m",
    });
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().markRead(id);
    useNotificationStore.getState().markRead(id);

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("marks all notifications as read", () => {
    const { addNotification, markAllRead } = useNotificationStore.getState();
    addNotification({ type: "info", title: "A", message: "m" });
    addNotification({ type: "warning", title: "B", message: "m" });
    useNotificationStore.getState().markAllRead();

    const state = useNotificationStore.getState();
    state.notifications.forEach((n) => expect(n.read).toBe(true));
    expect(state.unreadCount).toBe(0);
  });

  it("removes a notification", () => {
    useNotificationStore.getState().addNotification({
      type: "info",
      title: "To remove",
      message: "m",
    });
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().removeNotification(id);

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("decrements unreadCount when removing an unread notification", () => {
    useNotificationStore.getState().addNotification({
      type: "info",
      title: "Unread",
      message: "m",
    });
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().removeNotification(id);

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("does not change unreadCount when removing a read notification", () => {
    const { addNotification } = useNotificationStore.getState();
    addNotification({ type: "info", title: "Read one", message: "m" });
    addNotification({ type: "info", title: "Unread one", message: "m" });

    const readId = useNotificationStore.getState().notifications[1].id;
    useNotificationStore.getState().markRead(readId);
    useNotificationStore.getState().removeNotification(readId);

    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it("clears all notifications", () => {
    const { addNotification } = useNotificationStore.getState();
    addNotification({ type: "info", title: "A", message: "m" });
    addNotification({ type: "info", title: "B", message: "m" });
    useNotificationStore.getState().clearAll();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });
});
