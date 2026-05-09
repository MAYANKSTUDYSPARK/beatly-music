import { Send } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

const TG_URL = "https://telegram.me/scholarversepro_network";

export function TelegramFab() {
  const { current } = usePlayer();
  return (
    <a
      href={TG_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join us on Telegram"
      className={cn(
        "fixed right-3 z-40 flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-semibold",
        "bg-[#229ED9] text-white shadow-lg hover:scale-105 active:scale-95 transition-bounce",
        // raise above mobile nav (64px) + player (88px) when present
        current ? "bottom-[160px] md:bottom-[110px]" : "bottom-[80px] md:bottom-6"
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Send className="h-4 w-4 fill-current" />
      <span className="hidden sm:inline">Join Telegram</span>
      <span className="sm:hidden">Telegram</span>
    </a>
  );
}
