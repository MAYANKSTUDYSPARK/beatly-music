import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArtist, type ArtistResult } from "@/lib/music-api";
import { TrackRow } from "@/components/music/TrackRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, Shuffle, Music2 } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

const Artist = () => {
  const { name } = useParams<{ name: string }>();
  const decoded = decodeURIComponent(name ?? "");
  const [artist, setArtist] = useState<ArtistResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, toggleShuffle, shuffle } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArtist(decoded)
      .then((a) => { if (!cancelled) { setArtist(a); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [decoded]);

  return (
    <div>
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {artist?.thumbnail ? (
          <img src={artist.thumbnail} alt="" className="h-full w-full object-cover blur-xl scale-110" />
        ) : (
          <div className="h-full w-full bg-vibe-1" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 sm:px-8 pb-6 max-w-screen-xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Artist</p>
          <h1 className="mt-1 text-3xl sm:text-6xl font-extrabold text-white drop-shadow">
            {decoded}
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-screen-xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Button
            size="lg"
            className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90 shadow-glow"
            disabled={!artist?.topTracks.length}
            onClick={() => artist?.topTracks[0] && playTrack(artist.topTracks[0], artist.topTracks)}
          >
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleShuffle} className={shuffle ? "text-primary" : ""}>
            <Shuffle className="h-5 w-5" />
          </Button>
        </div>

        <h2 className="mb-3 text-xl font-bold">Popular</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : artist?.topTracks.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Music2 className="h-10 w-10 mb-2" />
            <p>No tracks found.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {artist?.topTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queue={artist.topTracks} showIndex />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Artist;
