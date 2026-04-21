import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Show login dialog. Returns a promise that resolves when user is signed in or dialog closed. */
  requireAuth: (reason?: string) => boolean;
  /** State to control the global login dialog. */
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
  loginReason: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginReason, setLoginReason] = useState("");

  useEffect(() => {
    // Set up listener FIRST, then check session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Login failed", { description: String((result.error as Error)?.message ?? result.error) });
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome to Beatly 🎵");
      setShowLogin(false);
    } catch (e) {
      toast.error("Login failed", { description: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast("Logged out");
  }, []);

  const requireAuth = useCallback((reason = "Login to play music"): boolean => {
    if (user) return true;
    setLoginReason(reason);
    setShowLogin(true);
    return false;
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user, session, loading, signInWithGoogle, signOut, requireAuth,
    showLogin, setShowLogin, loginReason,
  }), [user, session, loading, signInWithGoogle, signOut, requireAuth, showLogin, loginReason]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
