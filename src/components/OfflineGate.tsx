import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";

/**
 * When the device is offline, force the user to the /downloads page
 * (which lists locally-saved songs from IndexedDB) instead of showing
 * a broken online view. Restores the previous path once back online.
 */
export function OfflineGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastOnlinePath, setLastOnlinePath] = useState<string>(location.pathname);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Track last "good" route so we can restore it after reconnecting.
  useEffect(() => {
    if (online && location.pathname !== "/downloads") {
      setLastOnlinePath(location.pathname + location.search);
    }
  }, [online, location.pathname, location.search]);

  // On offline: redirect to downloads (only routes that need network).
  useEffect(() => {
    if (!online && location.pathname !== "/downloads") {
      navigate("/downloads", { replace: true });
    }
  }, [online, location.pathname, navigate]);

  // On reconnect: bounce user back to what they were viewing before.
  useEffect(() => {
    if (online && location.pathname === "/downloads" && lastOnlinePath && lastOnlinePath !== "/downloads") {
      // Small delay so the "back online" banner is visible.
      const t = window.setTimeout(() => navigate(lastOnlinePath, { replace: true }), 800);
      return () => window.clearTimeout(t);
    }
  }, [online, location.pathname, lastOnlinePath, navigate]);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed top-2 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground shadow-lg animate-fade-in"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You're offline · showing your downloads
    </div>
  );
}
