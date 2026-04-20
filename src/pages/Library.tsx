import { Link } from "react-router-dom";
import { useLibrary } from "@/contexts/LibraryContext";
import { Heart, Music2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Library = () => {
  const { playlists, liked, createPlaylist } = useLibrary();

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Your library</h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const name = prompt("Playlist name");
            if (name?.trim()) createPlaylist(name.trim());
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <Link
          to="/liked"
          className="group rounded-xl bg-card/40 hover:bg-card p-3 transition-smooth"
        >
          <div className="flex aspect-square items-center justify-center rounded-lg bg-gradient-vibe-3 shadow-card">
            <Heart className="h-12 w-12 fill-white text-white" />
          </div>
          <div className="mt-3">
            <div className="font-semibold">Liked Songs</div>
            <div className="text-xs text-muted-foreground">{liked.length} songs</div>
          </div>
        </Link>

        {playlists.map((p, i) => (
          <Link
            key={p.id}
            to={`/playlist/${p.id}`}
            className="group rounded-xl bg-card/40 hover:bg-card p-3 transition-smooth"
          >
            {p.cover ? (
              <img src={p.cover} alt="" className="aspect-square w-full rounded-lg object-cover shadow-card" />
            ) : (
              <div className={cn("flex aspect-square items-center justify-center rounded-lg shadow-card", `bg-vibe-${(i % 6) + 1}`)}>
                <Music2 className="h-12 w-12 text-white" />
              </div>
            )}
            <div className="mt-3">
              <div className="truncate font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.tracks.length} songs</div>
            </div>
          </Link>
        ))}
      </div>

      {playlists.length === 0 && liked.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Your library is empty. Like songs or create a playlist to get started.
        </p>
      )}
    </div>
  );
};

export default Library;
