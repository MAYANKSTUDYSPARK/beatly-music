import { useLibrary } from "@/contexts/LibraryContext";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Heart, Play, Shuffle } from "lucide-react";

const Liked = () => {
  const { liked } = useLibrary();
  const { playTrack, toggleShuffle, shuffle } = usePlayer();

  return (
    <div>
      <div className="bg-gradient-vibe-3 px-4 sm:px-8 pt-12 pb-8">
        <div className="flex items-end gap-6 max-w-screen-xl mx-auto">
          <div className="flex h-32 w-32 sm:h-44 sm:w-44 items-center justify-center rounded-lg bg-gradient-vibe-3 shadow-card">
            <Heart className="h-16 w-16 sm:h-20 sm:w-20 fill-white text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Playlist</p>
            <h1 className="mt-1 text-3xl sm:text-5xl font-extrabold text-white">Liked Songs</h1>
            <p className="mt-2 text-sm text-white/80">{liked.length} songs</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-screen-xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <Button
            size="lg"
            className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90 shadow-glow"
            disabled={liked.length === 0}
            onClick={() => liked[0] && playTrack(liked[0], liked)}
          >
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleShuffle} className={shuffle ? "text-primary" : ""}>
            <Shuffle className="h-5 w-5" />
          </Button>
        </div>
        {liked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No liked songs yet. Tap the ♥ on any track.</p>
        ) : (
          <div className="space-y-1">
            {liked.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queue={liked} showIndex />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Liked;
