import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

    // System notification (if permitted & page hidden)
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState === "hidden"
    ) {
      try {
        new Notification(n.title, { body: n.body, icon: n.image, silent: true });
      } catch {
        // ignore — some browsers require service worker for notifications
      }
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const requestSystemPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setSystemPermission(result);
    if (result === "granted") toast.success("Notifications enabled");
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installEvent) {
      toast("Already installed or not available on this browser");
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      toast.success("Beatly installed! 🎉");
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
