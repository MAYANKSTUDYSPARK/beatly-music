import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("beatly:install-dismissed") === "1");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || dismissed) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-xl bg-card border border-border shadow-card px-3 py-2 animate-fade-in">
      <Download className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium">Install Beatly</span>
      <Button
        size="sm"
        className="h-7 bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
      >
        Install
      </Button>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem("beatly:install-dismissed", "1"); }}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
