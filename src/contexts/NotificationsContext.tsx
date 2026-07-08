import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

async function showNativeNotification(title: string, body?: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return false;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: Date.now() % 2147483647, title, body, schedule: { at: new Date(Date.now() + 250) } }],
    });
    return true;
  } catch {
    return false;
  }
}

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  image?: string;
  timestamp: number;
  read: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  clear: () => void;
  systemPermission: NotificationPermission | "unsupported";
  requestSystemPermission: () => Promise<void>;
  // PWA install
  canInstall: boolean;
  installPromptEvent: BeforeInstallPromptEvent | null;
  triggerInstall: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const MAX_NOTIFICATIONS = 30;
const HOURLY_REMINDER_KEY = "beatly:last-hourly-reminder";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [systemPermission, setSystemPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Capture beforeinstallprompt for PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const push = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const note: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [note, ...prev].slice(0, MAX_NOTIFICATIONS));

    // In-app toast
    toast(n.title, { description: n.body });

    // System/native notification outside the app UI when permission is granted.
    showNativeNotification(n.title, n.body).then((shown) => {
      if (shown || !("Notification" in window) || Notification.permission !== "granted") return;
      try {
        new Notification(n.title, { body: n.body, icon: n.image, silent: true });
      } catch {
        // ignore — some browsers require service worker for notifications
      }
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const requestSystemPermission = useCallback(async () => {
    const nativeShown = await showNativeNotification("BeatVerse is ready 🎧", "Song updates, play controls and music reminders are enabled.");
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.requestPermissions();
        toast.success("BeatVerse notifications enabled");
        return;
      }
    } catch {
      // continue with browser notification permission
    }
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setSystemPermission(result);
    if (result === "granted") {
      toast.success("BeatVerse notifications enabled");
      if (nativeShown) return;
      try {
        new Notification("BeatVerse is ready 🎧", {
          body: "Song updates, play controls and music reminders are enabled.",
          icon: "/icon-512.png",
          silent: true,
        });
      } catch {
        // ignore notification restrictions
      }
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const last = Number(localStorage.getItem(HOURLY_REMINDER_KEY) || "0");
      if (Date.now() - last < 60 * 60 * 1000) return;
      localStorage.setItem(HOURLY_REMINDER_KEY, String(Date.now()));
      const title = "BeatVerse Mix is waiting 🎶";
      const body = "Free songs, trending playlists and podcasts are ready to play.";
      setNotifications((prev) => [{
        id: `${Date.now()}-hourly`, title, body, image: "/icon-512.png", timestamp: Date.now(), read: false,
      }, ...prev].slice(0, MAX_NOTIFICATIONS));
      try {
        new Notification(title, { body, icon: "/icon-512.png", silent: true });
      } catch {
        toast(title, { description: body });
      }
    };
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installEvent) {
      toast("Already installed or not available on this browser");
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      toast.success("BeatVerse installed! 🎉");
      setInstallEvent(null);
    }
  }, [installEvent]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications, unreadCount, push, markAllRead, clear,
    systemPermission, requestSystemPermission,
    canInstall: !!installEvent, installPromptEvent: installEvent, triggerInstall,
  }), [notifications, unreadCount, push, markAllRead, clear, systemPermission, requestSystemPermission, installEvent, triggerInstall]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
}
