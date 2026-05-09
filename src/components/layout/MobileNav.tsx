import { NavLink } from "react-router-dom";
import { Home, Search, Library, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/contexts/PlayerContext";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/podcasts", label: "Podcasts", icon: Mic },
  { to: "/library", label: "Library", icon: Library },
];

export function MobileNav() {
  const { current } = usePlayer();
  return (
    <nav
      className={cn(
        "fixed inset-x-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur-xl md:hidden",
        current ? "bottom-[88px]" : "bottom-0"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => (
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
      ))}
    </nav>
  );
}
