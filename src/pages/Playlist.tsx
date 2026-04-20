import { useNavigate, useParams } from "react-router-dom";
import { useLibrary } from "@/contexts/LibraryContext";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Music2, Play, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const Playlist = () => {
  const { id } = useParams<{ id: string }>();
  const { playlists, deletePlaylist, renamePlaylist } = useLibrary();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Playlist not found.</p>
      </div>
    );
  }

  const idx = playlists.findIndex((p) => p.id === id);

  return (
    <div>
      <div className={cn("px-4 sm:px-8 pt-12 pb-8", `bg-vibe-${(idx % 6) + 1}`)}>
        <div className="flex items-end gap-6 max-w-screen-xl mx-auto">
          {playlist.cover ? (
            <img src={playlist.cover} alt="" className="h-32 w-32 sm:h-44 sm:w-44 rounded-lg object-cover shadow-card" />
          ) : (
            <div className="flex h-32 w-32 sm:h-44 sm:w-44 items-center justify-center rounded-lg bg-black/30 shadow-card">
              <Music2 className="h-16 w-16 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Playlist</p>
            <h1 className="mt-1 truncate text-3xl sm:text-5xl font-extrabold text-white">{playlist.name}</h1>
            <p className="mt-2 text-sm text-white/80">{playlist.tracks.length} songs</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-screen-xl mx-auto">
        <div className="mb-4 flex items-center gap-2">
          <Button
            size="lg"
            className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90 shadow-glow"
            disabled={playlist.tracks.length === 0}
            onClick={() => playlist.tracks[0] && playTrack(playlist.tracks[0], playlist.tracks)}
          >
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const name = prompt("Rename playlist", playlist.name);
              if (name?.trim()) renamePlaylist(playlist.id, name.trim());
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this playlist?")) {
                deletePlaylist(playlist.id);
                navigate("/library");
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {playlist.tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracks yet. Add songs from search or any track menu.</p>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((t, i) => (
              <TrackRow key={`${t.id}-${i}`} track={t} index={i} queue={playlist.tracks} showIndex />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;
