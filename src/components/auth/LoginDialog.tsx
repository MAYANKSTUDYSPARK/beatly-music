import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/beatly-logo.png";

export function LoginDialog() {
  const { showLogin, setShowLogin, signInWithGoogle, loginReason } = useAuth();

  return (
    <Dialog open={showLogin} onOpenChange={setShowLogin}>
      <DialogContent className="max-w-sm border-border bg-card">
        <DialogHeader className="items-center text-center">
          <img src={logo} alt="Beatly" width={56} height={56} className="mb-2" loading="lazy" />
          <DialogTitle className="text-2xl">Sign in to Beatly</DialogTitle>
          <DialogDescription className="text-center">
            {loginReason || "Login to play 100M+ songs free"}
          </DialogDescription>
        </DialogHeader>

        <Button
          onClick={signInWithGoogle}
          className="mt-2 w-full gap-3 bg-foreground text-background hover:bg-foreground/90 h-12 text-base font-medium"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          By continuing, you agree to enjoy free unlimited music streaming.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.3l-6.4-5.4c-2.1 1.6-4.7 2.6-7.5 2.6-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.4 5.4C41.4 36.5 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
