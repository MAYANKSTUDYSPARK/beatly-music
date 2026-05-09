import { useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track } from "@/lib/music-api";

interface Episode {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  episodeUrl: string;
  artworkUrl600?: string;
  artworkUrl160?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
}

const TOPICS = [
  "Tech", "Business", "Comedy", "Motivation", "True Crime",
  "Science", "Health", "News", "Bollywood", "Education",
];

async function fetchEpisodes(term: string): Promise<Episode[]> {
  const url = `https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&limit=40&term=${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export default function Podcasts() {
  const [topic, setTopic] = useState("Tech");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEpisodes(query.trim() || topic).then((list) => {
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [topic, query]);

  const playEpisode = (ep: Episode) => {
    const track: Track = {
      id: `pod-${ep.trackId}`,
      title: ep.trackName,
      artist: ep.artistName || ep.collectionName,
      duration: Math.round((ep.trackTimeMillis || 0) / 1000),
      thumbnail: ep.artworkUrl600 || ep.artworkUrl160 || "",
    };
    // Inject the audio URL directly via a custom track id mapping
    // We'll use the audio URL as id prefix decoded by player; simplest approach:
    // open the audio in a new tab fallback if our player can't stream it.
    (track as Track & { streamOverride?: string }).streamOverride = ep.episodeUrl;
    playTrack(track);
    // Backup: also set audio src directly so it plays immediately
    setTimeout(() => {
      const audio = document.querySelector("audio");
      if (audio && ep.episodeUrl) {
        audio.src = ep.episodeUrl;
        audio.play().catch(() => undefined);
      }
    }, 100);
  };

  return (
    <div className="min-h-full">
      <div className="px-4 sm:px-6 pt-6 pb-10 space-y-6 max-w-screen-2xl mx-auto">
        <header>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <Mic className="h-8 w-8 text-primary" /> Podcasts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Free podcasts — auto-updated daily.</p>
        </header>

        <Input
          placeholder="Search podcasts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Button
              key={t}
              variant={topic === t && !query ? "default" : "secondary"}
              size="sm"
              onClick={() => { setTopic(t); setQuery(""); }}
            >
              {t}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No episodes found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((ep) => (
              <button
                key={ep.trackId}
                onClick={() => playEpisode(ep)}
                className="flex gap-3 rounded-xl bg-card/60 p-3 text-left hover:bg-secondary/60 transition-smooth"
              >
                <img
                  src={ep.artworkUrl160 || ep.artworkUrl600}
                  alt={ep.trackName}
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold">{ep.trackName}</div>
                  <div className="truncate text-xs text-muted-foreground mt-0.5">{ep.collectionName}</div>
                  {ep.releaseDate && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(ep.releaseDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
