import { NavLink } from "react-router-dom";
import { Home, Search, Library, Heart, Music2, Plus, Mic, Flame, Download } from "lucide-react";
import { useLibrary } from "@/contexts/LibraryContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/podcasts", label: "Podcasts", icon: Mic },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/library", label: "Library", icon: Library },
];

export function Sidebar() {
  const { playlists, liked, createPlaylist } = useLibrary();

  return (
    <aside className="hidden md:flex h-full w-64 flex-col gap-2 p-2">
      <div className="flex flex-col gap-1 rounded-2xl bg-card/60 p-3">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Music2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">BeatVerse</span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-smooth",
                isActive && "text-foreground bg-secondary"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-card/60 p-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your library</span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => {
              const name = prompt("Playlist name");
              if (name?.trim()) createPlaylist(name.trim());
            }}
            aria-label="New playlist"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          <NavLink
            to="/liked"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/60 transition-smooth",
                isActive && "bg-secondary"
              )
            }
          >
            <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-vibe-3">
              <Heart className="h-5 w-5 fill-current text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">Liked Songs</div>
              <div className="text-xs text-muted-foreground">{liked.length} songs</div>
            </div>
          </NavLink>
          {playlists.map((p, i) => (
            <NavLink
              key={p.id}
              to={`/playlist/${p.id}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/60 transition-smooth",
                  isActive && "bg-secondary"
                )
              }
            >
              {p.cover ? (
                <img src={p.cover} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className={cn("flex h-10 w-10 items-center justify-center rounded", `bg-vibe-${(i % 6) + 1}`)}>
                  <Music2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.tracks.length} songs</div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
