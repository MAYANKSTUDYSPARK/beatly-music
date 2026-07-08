import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

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

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("beatly:install-dismissed", "1");
  };

  return (
    <div className="fixed inset-x-3 top-3 z-[60] md:left-auto md:right-3 md:w-[380px] animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-4 shadow-glow ring-1 ring-primary/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-white">Install BeatVerse App 🎵</div>
            <div className="mt-0.5 text-xs text-white/85">
              Free music + podcasts · offline downloads · no ads. One tap to install.
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-white text-primary hover:bg-white/90 font-bold shadow-md"
                onClick={async () => {
                  await evt.prompt();
                  await evt.userChoice;
                  setEvt(null);
                }}
              >
                <Download className="mr-1.5 h-4 w-4" /> Install now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={dismiss}
              >
                Later
              </Button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
