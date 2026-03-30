"use client";

import { useEffect, useState, useCallback } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true, // Default to true; updated in useEffect after hydration
    isUpdateAvailable: false,
    registration: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isSupported: true,
      isOnline: navigator.onLine,
    }));

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration: reg,
        }));

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });

    // Listen for sync messages from SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        // Could dispatch a toast or update state
      }
    });

    // Online/offline listeners
    const goOnline = () =>
      setState((prev) => ({ ...prev, isOnline: true }));
    const goOffline = () =>
      setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const update = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [state.registration]);

  const requestSync = useCallback(async () => {
    if (state.registration && "sync" in state.registration) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (state.registration as any).sync.register("sync-operations");
      } catch {
        // Background Sync not supported in all browsers
      }
    }
  }, [state.registration]);

  return {
    ...state,
    update,
    requestSync,
  };
}
