import { useEffect, useState } from "react";
import { searchTracks, getTrending, type Track } from "@/lib/music-api";
import { TrackCard } from "@/components/music/TrackCard";
import { TrackRow } from "@/components/music/TrackRow";
import { useLibrary } from "@/contexts/LibraryContext";
import { Skeleton } from "@/components/ui/skeleton";

const HERO_QUERIES = [
  "Top Hindi songs 2024",
  "Punjabi hits",
  "BTS Korean",
  "Arijit Singh",
  "English pop top",
  "Lofi chill India",
];

const Home = () => {
  const [trending, setTrending] = useState<Track[]>([]);
  const [hindi, setHindi] = useState<Track[]>([]);
  const [punjabi, setPunjabi] = useState<Track[]>([]);
  const [kpop, setKpop] = useState<Track[]>([]);
  const [english, setEnglish] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { recent } = useLibrary();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [t, h, p, k, e] = await Promise.all([
        getTrending("IN"),
        searchTracks("Top Bollywood hits 2024", 12),
        searchTracks("Top Punjabi songs", 12),
        searchTracks("BTS Blackpink K-pop hits", 12),
        searchTracks("Top English songs 2024", 12),
      ]);
      if (cancelled) return;
      setTrending(t);
      setHindi(h);
      setPunjabi(p);
      setKpop(k);
      setEnglish(e);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-full bg-gradient-hero">
      <div className="px-4 sm:px-6 pt-6 pb-10 space-y-10 max-w-screen-2xl mx-auto">
        <header>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off — millions of tracks await.</p>
        </header>

        {/* Vibe shortcuts */}
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HERO_QUERIES.map((q, i) => (
              <a
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className={`group relative flex h-16 items-center overflow-hidden rounded-xl bg-vibe-${(i % 6) + 1} px-4 hover:scale-[1.02] transition-bounce`}
              >
                <span className="text-sm font-bold text-white drop-shadow">{q}</span>
              </a>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <Section title="Recently played" tracks={recent.slice(0, 12)} />
        )}

        <Section title="Trending in India" tracks={trending} loading={loading && trending.length === 0} />
        <Section title="Bollywood hits" tracks={hindi} loading={loading && hindi.length === 0} />
        <Section title="Punjabi vibes" tracks={punjabi} loading={loading && punjabi.length === 0} />
        <Section title="K-Pop & global" tracks={kpop} loading={loading && kpop.length === 0} />
        <Section title="English top charts" tracks={english} loading={loading && english.length === 0} />
      </div>
    </div>
  );
};

function Section({ title, tracks, loading }: { title: string; tracks: Track[]; loading?: boolean }) {
  return (
    <section className="animate-fade-in">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tracks found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tracks.map((t) => (
            <TrackCard key={t.id} track={t} queue={tracks} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Home;
