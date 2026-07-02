import { NavLink } from "react-router-dom";
import { Home, Search, Flame, Download, Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/PlayerContext";

type MobileNavItem =
  | { to: string; label: string; icon: typeof Home; end?: boolean }
  | { href: string; label: string; icon: typeof Send };

const items: MobileNavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/podcasts", label: "Podcasts", icon: Mic },
  { href: "https://telegram.me/scholarversepro_network", label: "TG", icon: Send },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/downloads", label: "Saved", icon: Download },
];

export function MobileNav() {
  const { current } = usePlayer();
  return (
    <nav
      className={cn(
        "fixed inset-x-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 backdrop-blur-xl md:hidden",
        current ? "bottom-[88px]" : "bottom-0"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => (
        "href" in item ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-primary transition-smooth"
            aria-label="Join Telegram"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </a>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-smooth",
                isActive && "text-primary"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        )
      ))}
    </nav>
  );
}
